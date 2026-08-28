begin;

alter table public.invitation_media
  add column lifecycle_state_changed_at timestamptz not null default now(),
  add column attempt_count integer not null default 0,
  add column last_attempt_at timestamptz,
  add column next_attempt_at timestamptz,
  add column cleanup_failure_reason text,
  add column cleanup_claim_token uuid,
  add column cleanup_worker_id uuid,
  add column cleanup_claimed_at timestamptz,
  add column reference_checked_at timestamptz,
  add column orphan_detected_at timestamptz,
  add column orphan_confirmed_at timestamptz,
  add column delete_reason text,
  add column deleted_at timestamptz,
  add constraint invitation_media_attempt_count_check check (attempt_count between 0 and 20),
  add constraint invitation_media_cleanup_failure_reason_check check (cleanup_failure_reason is null or char_length(cleanup_failure_reason) <= 1000),
  add constraint invitation_media_delete_reason_check check (
    delete_reason is null or delete_reason in ('owner_request','upload_timeout','processing_timeout','failed_upload','ready_orphan')
  ),
  add constraint invitation_media_cleanup_claim_check check (
    (cleanup_claim_token is null and cleanup_worker_id is null and cleanup_claimed_at is null) or
    (cleanup_claim_token is not null and cleanup_worker_id is not null and cleanup_claimed_at is not null)
  ),
  add constraint invitation_media_orphan_confirmation_check check (orphan_confirmed_at is null or orphan_detected_at is not null),
  add constraint invitation_media_deleted_at_check check (status <> 'deleted' or deleted_at is not null);

update public.invitation_media
set lifecycle_state_changed_at = coalesce(delete_requested_at, ready_at, updated_at, created_at);

alter table public.invitation_media_variants
  drop constraint invitation_media_variants_status_check,
  add constraint invitation_media_variants_status_check
    check (status in ('uploading','processing','ready','failed','delete_pending','deleted'));

create index invitation_media_cleanup_queue_idx
  on public.invitation_media (status, next_attempt_at, cleanup_claimed_at, lifecycle_state_changed_at)
  where status in ('uploading','processing','failed','delete_pending');

create index invitation_media_orphan_recheck_idx
  on public.invitation_media (reference_checked_at, orphan_detected_at, ready_at)
  where status = 'ready';

create or replace function public.track_invitation_media_state_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    new.lifecycle_state_changed_at = now();
  end if;
  return new;
end $$;

create trigger media_lifecycle_state_changed
before update on public.invitation_media
for each row execute function public.track_invitation_media_state_change();

create or replace function public.invitation_content_references_media(p_content jsonb, p_media_id uuid) returns boolean
language sql immutable parallel safe set search_path = '' as $$
  select coalesce(jsonb_path_exists(
    p_content,
    '$.** ? (@ == $mediaId)',
    jsonb_build_object('mediaId', p_media_id::text)
  ), false)
$$;

revoke all on function public.invitation_content_references_media(jsonb,uuid) from public;

create or replace function public.enforce_ready_invitation_media_references() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (tg_op = 'INSERT' or new.content is distinct from old.content) and exists (
    select 1
    from public.invitation_media m
    where m.invitation_id = new.id
      and m.status <> 'ready'
      and public.invitation_content_references_media(new.content, m.id)
  ) then
    raise exception 'invitation_references_non_ready_media' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger invitations_enforce_ready_media
before insert or update on public.invitations
for each row execute function public.enforce_ready_invitation_media_references();

create or replace function public.request_image_media_deletion(
  p_invitation_id uuid,
  p_media_id uuid,
  p_expected_invitation_updated_at timestamptz
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_content jsonb;
  v_updated_at timestamptz;
  v_status text;
begin
  select m.status into v_status
  from public.invitation_media m
  where m.id = p_media_id and m.invitation_id = p_invitation_id and m.owner_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active')
  for update;
  if v_status is null then raise exception 'deletable_media_not_found' using errcode = 'P0002'; end if;

  select i.content, i.updated_at into v_content, v_updated_at
  from public.invitations i
  where i.id = p_invitation_id and i.owner_id = auth.uid()
  for update;
  if v_content is null then raise exception 'invitation_not_owned' using errcode = '42501'; end if;
  if v_updated_at is distinct from p_expected_invitation_updated_at then
    raise exception 'stale_invitation_version' using errcode = '40001';
  end if;
  if public.invitation_content_references_media(v_content, p_media_id) then
    raise exception 'media_still_referenced' using errcode = '23514';
  end if;

  if v_status in ('ready','failed') then
    update public.invitation_media set
      status = 'delete_pending',
      delete_requested_at = now(),
      delete_reason = 'owner_request',
      attempt_count = 0,
      last_attempt_at = null,
      next_attempt_at = now(),
      cleanup_failure_reason = null,
      cleanup_claim_token = null,
      cleanup_worker_id = null,
      cleanup_claimed_at = null,
      reference_checked_at = now(),
      orphan_confirmed_at = coalesce(orphan_confirmed_at, case when orphan_detected_at is null then null else now() end)
    where id = p_media_id;
  elsif v_status <> 'delete_pending' then
    raise exception 'deletable_media_not_found' using errcode = 'P0002';
  end if;

  update public.invitation_media_variants
  set status = 'delete_pending'
  where media_id = p_media_id and status <> 'deleted';
end $$;

create or replace function public.reconcile_image_media_lifecycle(
  p_batch_size integer default 100,
  p_upload_timeout interval default interval '2 hours',
  p_processing_timeout interval default interval '1 hour',
  p_failed_retention interval default interval '24 hours',
  p_ready_orphan_grace interval default interval '7 days',
  p_reference_recheck_interval interval default interval '1 hour'
) returns table(
  scanned integer,
  timed_out integer,
  failed_queued integer,
  temporary_orphans integer,
  confirmed_orphans integer,
  references_restored integer
) language plpgsql security definer set search_path = '' as $$
declare
  v_media public.invitation_media%rowtype;
  v_content jsonb;
  v_referenced boolean;
begin
  if p_batch_size not between 1 and 500 or
     p_upload_timeout < interval '0 seconds' or p_processing_timeout < interval '0 seconds' or
     p_failed_retention < interval '0 seconds' or p_ready_orphan_grace < interval '0 seconds' or
     p_reference_recheck_interval < interval '0 seconds' then
    raise exception 'invalid_media_reconciliation_options' using errcode = '22023';
  end if;

  scanned := 0;
  timed_out := 0;
  failed_queued := 0;
  temporary_orphans := 0;
  confirmed_orphans := 0;
  references_restored := 0;

  for v_media in
    select m.*
    from public.invitation_media m
    where
      (m.status = 'uploading' and m.lifecycle_state_changed_at <= now() - p_upload_timeout) or
      (m.status = 'processing' and m.lifecycle_state_changed_at <= now() - p_processing_timeout) or
      (m.status = 'failed' and m.lifecycle_state_changed_at <= now() - p_failed_retention) or
      (m.status = 'delete_pending' and (m.reference_checked_at is null or m.reference_checked_at <= now() - p_reference_recheck_interval)) or
      (m.status = 'ready' and (
        m.reference_checked_at is null or
        m.reference_checked_at <= now() - p_reference_recheck_interval or
        (m.orphan_detected_at is not null and m.orphan_detected_at <= now() - p_ready_orphan_grace)
      ))
    order by coalesce(m.reference_checked_at, '-infinity'::timestamptz), m.lifecycle_state_changed_at, m.id
    for update skip locked
    limit p_batch_size
  loop
    scanned := scanned + 1;
    select i.content into v_content
    from public.invitations i
    where i.id = v_media.invitation_id
    for share;
    v_referenced := public.invitation_content_references_media(v_content, v_media.id);

    if v_media.status = 'ready' then
      if v_referenced then
        update public.invitation_media set
          reference_checked_at = now(),
          orphan_detected_at = null,
          orphan_confirmed_at = null,
          cleanup_failure_reason = null
        where id = v_media.id;
      elsif v_media.orphan_detected_at is null then
        update public.invitation_media set
          reference_checked_at = now(),
          orphan_detected_at = now(),
          orphan_confirmed_at = null
        where id = v_media.id;
        temporary_orphans := temporary_orphans + 1;
      elsif v_media.orphan_detected_at <= now() - p_ready_orphan_grace then
        update public.invitation_media set
          status = 'delete_pending',
          delete_requested_at = now(),
          delete_reason = 'ready_orphan',
          reference_checked_at = now(),
          orphan_confirmed_at = now(),
          next_attempt_at = now(),
          cleanup_failure_reason = null
        where id = v_media.id;
        update public.invitation_media_variants set status = 'delete_pending'
        where media_id = v_media.id and status <> 'deleted';
        confirmed_orphans := confirmed_orphans + 1;
      else
        update public.invitation_media set reference_checked_at = now() where id = v_media.id;
      end if;

    elsif v_media.status in ('uploading','processing') then
      if v_referenced then
        update public.invitation_media set
          reference_checked_at = now(),
          cleanup_failure_reason = 'Media belum READY tetapi masih direferensikan; cleanup ditahan.'
        where id = v_media.id;
      else
        update public.invitation_media set
          status = 'failed',
          failure_reason = case v_media.status
            when 'uploading' then 'Upload image melewati batas waktu.'
            else 'Processing image melewati batas waktu.'
          end,
          delete_reason = case v_media.status
            when 'uploading' then 'upload_timeout'
            else 'processing_timeout'
          end,
          reference_checked_at = now(),
          cleanup_failure_reason = null,
          next_attempt_at = now() + p_failed_retention
        where id = v_media.id;
        update public.invitation_media_variants set status = 'failed'
        where media_id = v_media.id and status in ('uploading','processing');
        timed_out := timed_out + 1;
      end if;

    elsif v_media.status = 'failed' then
      if v_referenced then
        update public.invitation_media set
          reference_checked_at = now(),
          cleanup_failure_reason = 'FAILED media masih direferensikan; cleanup ditahan.'
        where id = v_media.id;
      else
        update public.invitation_media set
          status = 'delete_pending',
          delete_requested_at = now(),
          delete_reason = coalesce(v_media.delete_reason, 'failed_upload'),
          reference_checked_at = now(),
          next_attempt_at = now(),
          cleanup_failure_reason = null
        where id = v_media.id;
        update public.invitation_media_variants set status = 'delete_pending'
        where media_id = v_media.id and status <> 'deleted';
        failed_queued := failed_queued + 1;
      end if;

    elsif v_media.status = 'delete_pending' then
      if v_referenced then
        if v_media.attempt_count = 0 and v_media.cleanup_claim_token is null and v_media.delete_reason in ('owner_request','ready_orphan') then
          update public.invitation_media set
            status = 'ready',
            delete_requested_at = null,
            delete_reason = null,
            reference_checked_at = now(),
            orphan_detected_at = null,
            orphan_confirmed_at = null,
            next_attempt_at = null,
            cleanup_failure_reason = 'Reference terbaru membatalkan delete sebelum Storage cleanup.'
          where id = v_media.id;
          update public.invitation_media_variants set status = 'ready'
          where media_id = v_media.id and status = 'delete_pending';
          references_restored := references_restored + 1;
        else
          update public.invitation_media set
            reference_checked_at = now(),
            next_attempt_at = null,
            cleanup_failure_reason = 'Reference terdeteksi setelah cleanup dimulai; perlu rekonsiliasi manual.'
          where id = v_media.id;
        end if;
      else
        update public.invitation_media set reference_checked_at = now() where id = v_media.id;
      end if;
    end if;
  end loop;

  return next;
end $$;

create or replace function public.claim_image_media_cleanup(
  p_worker_id uuid,
  p_batch_size integer default 25,
  p_lease_timeout interval default interval '10 minutes',
  p_max_attempts integer default 8
) returns table(
  media_id uuid,
  invitation_id uuid,
  original_path text,
  variant_paths text[],
  claim_token uuid,
  attempt_count integer
) language plpgsql security definer set search_path = '' as $$
declare
  v_media public.invitation_media%rowtype;
  v_content jsonb;
  v_token uuid;
begin
  if p_worker_id is null or p_batch_size not between 1 and 100 or p_lease_timeout <= interval '0 seconds' or p_max_attempts not between 1 and 20 then
    raise exception 'invalid_media_cleanup_claim_options' using errcode = '22023';
  end if;

  for v_media in
    select m.*
    from public.invitation_media m
    where m.status = 'delete_pending'
      and m.attempt_count < p_max_attempts
      and (m.next_attempt_at is null or m.next_attempt_at <= now())
      and (m.cleanup_claim_token is null or m.cleanup_claimed_at <= now() - p_lease_timeout)
    order by coalesce(m.next_attempt_at, m.delete_requested_at, m.created_at), m.id
    for update skip locked
    limit p_batch_size
  loop
    select i.content into v_content
    from public.invitations i
    where i.id = v_media.invitation_id
    for share;

    if public.invitation_content_references_media(v_content, v_media.id) then
      update public.invitation_media set
        cleanup_claim_token = null,
        cleanup_worker_id = null,
        cleanup_claimed_at = null,
        next_attempt_at = null,
        reference_checked_at = now(),
        cleanup_failure_reason = 'Claim cleanup ditolak karena media kembali direferensikan.'
      where id = v_media.id;
      continue;
    end if;

    v_token := gen_random_uuid();
    update public.invitation_media set
      cleanup_claim_token = v_token,
      cleanup_worker_id = p_worker_id,
      cleanup_claimed_at = now(),
      attempt_count = v_media.attempt_count + 1,
      last_attempt_at = now(),
      next_attempt_at = null,
      reference_checked_at = now(),
      cleanup_failure_reason = null
    where id = v_media.id;

    media_id := v_media.id;
    invitation_id := v_media.invitation_id;
    original_path := v_media.storage_path;
    select coalesce(array_agg(v.storage_path order by
      case v.variant_key when 'thumbnail' then 1 when 'medium' then 2 else 3 end), array[]::text[])
    into variant_paths
    from public.invitation_media_variants v
    where v.media_id = v_media.id;
    claim_token := v_token;
    attempt_count := v_media.attempt_count + 1;
    return next;
  end loop;
end $$;

create or replace function public.complete_image_media_cleanup(
  p_media_id uuid,
  p_claim_token uuid
) returns text language plpgsql security definer set search_path = '' as $$
declare
  v_media public.invitation_media%rowtype;
  v_content jsonb;
begin
  select m.* into v_media
  from public.invitation_media m
  where m.id = p_media_id
  for update;
  if v_media.id is null then raise exception 'media_not_found' using errcode = 'P0002'; end if;
  if v_media.status = 'deleted' then return 'deleted'; end if;
  if v_media.status <> 'delete_pending' or v_media.cleanup_claim_token is distinct from p_claim_token then
    raise exception 'media_cleanup_claim_mismatch' using errcode = '40001';
  end if;

  select i.content into v_content
  from public.invitations i
  where i.id = v_media.invitation_id
  for share;
  if public.invitation_content_references_media(v_content, v_media.id) then
    update public.invitation_media set
      status = 'failed',
      cleanup_claim_token = null,
      cleanup_worker_id = null,
      cleanup_claimed_at = null,
      next_attempt_at = null,
      reference_checked_at = now(),
      cleanup_failure_reason = 'Reference terdeteksi setelah object cleanup; metadata ditahan untuk rekonsiliasi manual.'
    where id = v_media.id;
    update public.invitation_media_variants set status = 'failed'
    where media_id = v_media.id and status <> 'deleted';
    return 'reference_blocked';
  end if;

  if exists (
    select 1 from storage.objects o
    where o.bucket_id = 'invitation-media' and (
      o.name = v_media.storage_path or exists (
        select 1 from public.invitation_media_variants v
        where v.media_id = v_media.id and v.storage_path = o.name
      )
    )
  ) then
    raise exception 'storage_objects_remaining' using errcode = '55000';
  end if;

  update public.invitation_media set
    status = 'deleted',
    deleted_at = now(),
    cleanup_claim_token = null,
    cleanup_worker_id = null,
    cleanup_claimed_at = null,
    next_attempt_at = null,
    cleanup_failure_reason = null,
    reference_checked_at = now()
  where id = v_media.id;
  update public.invitation_media_variants set status = 'deleted'
  where media_id = v_media.id;
  return 'deleted';
end $$;

create or replace function public.fail_image_media_cleanup(
  p_media_id uuid,
  p_claim_token uuid,
  p_reason text,
  p_max_attempts integer default 8
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_media public.invitation_media%rowtype;
  v_delay_seconds integer;
begin
  if p_max_attempts not between 1 and 20 then raise exception 'invalid_media_cleanup_max_attempts' using errcode = '22023'; end if;
  select m.* into v_media
  from public.invitation_media m
  where m.id = p_media_id
  for update;
  if v_media.id is null then raise exception 'media_not_found' using errcode = 'P0002'; end if;
  if v_media.status = 'deleted' then return false; end if;
  if v_media.status <> 'delete_pending' or v_media.cleanup_claim_token is distinct from p_claim_token then
    raise exception 'media_cleanup_claim_mismatch' using errcode = '40001';
  end if;

  v_delay_seconds := least(3600, (30 * power(2, greatest(0, least(v_media.attempt_count - 1, 7))))::integer);
  update public.invitation_media set
    cleanup_claim_token = null,
    cleanup_worker_id = null,
    cleanup_claimed_at = null,
    last_attempt_at = now(),
    next_attempt_at = case when v_media.attempt_count >= p_max_attempts then null else now() + make_interval(secs => v_delay_seconds) end,
    cleanup_failure_reason = left(coalesce(nullif(btrim(p_reason),''),'Storage cleanup gagal.'), 1000)
  where id = v_media.id;
  return v_media.attempt_count < p_max_attempts;
end $$;

create or replace view public.invitation_media_storage_usage
with (security_invoker = true) as
select
  m.owner_id,
  m.invitation_id,
  count(*) filter (where m.status <> 'deleted')::integer as active_media_count,
  count(*) filter (where m.status = 'ready')::integer as ready_media_count,
  coalesce(sum(case when m.status = 'ready' then m.size_bytes + coalesce(v.variant_bytes, 0) else 0 end), 0)::bigint as ready_bytes,
  coalesce(sum(case when m.status in ('uploading','processing') then m.size_bytes else 0 end), 0)::bigint as reserved_upload_bytes
from public.invitation_media m
left join lateral (
  select sum(mv.size_bytes)::bigint as variant_bytes
  from public.invitation_media_variants mv
  where mv.media_id = m.id and mv.status = 'ready'
) v on true
group by m.owner_id, m.invitation_id;

create or replace function public.get_image_media_cleanup_metrics(p_max_attempts integer default 8) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'statusCounts', coalesce((
      select jsonb_object_agg(s.status, s.total)
      from (select m.status, count(*)::integer as total from public.invitation_media m group by m.status order by m.status) s
    ), '{}'::jsonb),
    'temporaryOrphans', (select count(*) from public.invitation_media m where m.status = 'ready' and m.orphan_detected_at is not null and m.orphan_confirmed_at is null),
    'confirmedOrphans', (select count(*) from public.invitation_media m where m.orphan_confirmed_at is not null and m.status in ('delete_pending','deleted')),
    'claimed', (select count(*) from public.invitation_media m where m.cleanup_claim_token is not null),
    'retryExhausted', (select count(*) from public.invitation_media m where m.status = 'delete_pending' and m.attempt_count >= p_max_attempts and m.cleanup_claim_token is null),
    'readyBytes', coalesce((select sum(u.ready_bytes) from public.invitation_media_storage_usage u), 0)
  )
$$;

-- Supabase's default privileges grant new functions to anon/authenticated
-- explicitly, so revoking only PUBLIC would still expose SECURITY DEFINER RPCs.
revoke all on function public.reconcile_image_media_lifecycle(integer,interval,interval,interval,interval,interval) from public, anon, authenticated;
revoke all on function public.claim_image_media_cleanup(uuid,integer,interval,integer) from public, anon, authenticated;
revoke all on function public.complete_image_media_cleanup(uuid,uuid) from public, anon, authenticated;
revoke all on function public.fail_image_media_cleanup(uuid,uuid,text,integer) from public, anon, authenticated;
revoke all on function public.get_image_media_cleanup_metrics(integer) from public, anon, authenticated;
revoke all on public.invitation_media_storage_usage from public, anon, authenticated;

grant execute on function public.reconcile_image_media_lifecycle(integer,interval,interval,interval,interval,interval) to service_role;
grant execute on function public.claim_image_media_cleanup(uuid,integer,interval,integer) to service_role;
grant execute on function public.complete_image_media_cleanup(uuid,uuid) to service_role;
grant execute on function public.fail_image_media_cleanup(uuid,uuid,text,integer) to service_role;
grant execute on function public.get_image_media_cleanup_metrics(integer) to service_role;
grant select on public.invitation_media_storage_usage to service_role;

commit;
