begin;

create table public.invitation_rsvps (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  client_submission_id uuid not null,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  guest_name text not null check (char_length(guest_name) between 2 and 100),
  attendance_status text not null check (attendance_status in ('attending','not_attending')),
  guest_count smallint not null check (
    (attendance_status = 'attending' and guest_count between 1 and 10) or
    (attendance_status = 'not_attending' and guest_count = 0)
  ),
  note text check (note is null or char_length(note) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (invitation_id, client_submission_id)
);

create index invitation_rsvps_invitation_created_idx
  on public.invitation_rsvps (invitation_id, created_at desc, id desc);
create index invitation_rsvps_invitation_status_idx
  on public.invitation_rsvps (invitation_id, attendance_status);

create table public.invitation_rsvp_rate_limits (
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  scope text not null check (scope in ('source','invitation')),
  rate_key text not null,
  window_started_at timestamptz not null,
  submission_count integer not null check (submission_count > 0),
  updated_at timestamptz not null default now(),
  primary key (invitation_id, scope, rate_key),
  check (
    (scope = 'source' and rate_key ~ '^[0-9a-f]{64}$') or
    (scope = 'invitation' and rate_key = 'global')
  )
);

alter table public.invitation_rsvps enable row level security;
alter table public.invitation_rsvp_rate_limits enable row level security;
revoke all on public.invitation_rsvps from public, anon, authenticated;
revoke all on public.invitation_rsvp_rate_limits from public, anon, authenticated;

create function public.consume_invitation_rsvp_rate_limit(
  p_invitation_id uuid,
  p_scope text,
  p_rate_key text,
  p_limit integer,
  p_window interval
) returns void language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if p_scope not in ('source','invitation') or p_limit not between 1 and 1000 or
     p_window < interval '1 minute' or p_window > interval '1 day' then
    raise exception 'invalid_rsvp_rate_limit_options' using errcode = '22023';
  end if;

  insert into public.invitation_rsvp_rate_limits (
    invitation_id, scope, rate_key, window_started_at, submission_count, updated_at
  ) values (
    p_invitation_id, p_scope, p_rate_key, now(), 1, now()
  )
  on conflict (invitation_id, scope, rate_key) do update set
    window_started_at = case
      when public.invitation_rsvp_rate_limits.window_started_at <= now() - p_window then now()
      else public.invitation_rsvp_rate_limits.window_started_at
    end,
    submission_count = case
      when public.invitation_rsvp_rate_limits.window_started_at <= now() - p_window then 1
      else public.invitation_rsvp_rate_limits.submission_count + 1
    end,
    updated_at = now()
  where public.invitation_rsvp_rate_limits.window_started_at <= now() - p_window
     or public.invitation_rsvp_rate_limits.submission_count < p_limit
  returning submission_count into v_count;

  if v_count is null then
    raise exception 'rsvp_rate_limited' using errcode = 'P0001';
  end if;
end $$;

create function public.submit_public_invitation_rsvp(
  p_invitation_id uuid,
  p_client_submission_id uuid,
  p_guest_name text,
  p_attendance_status text,
  p_guest_count integer,
  p_note text,
  p_source_hash text
) returns table(rsvp_id uuid, submitted_at timestamptz, idempotent boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := regexp_replace(btrim(coalesce(p_guest_name, '')), '[[:space:]]+', ' ', 'g');
  v_note text := nullif(regexp_replace(btrim(coalesce(p_note, '')), '[[:space:]]+', ' ', 'g'), '');
  v_request_hash text;
  v_existing_hash text;
begin
  if not exists (
    select 1
    from public.invitations i
    join public.profiles p on p.id = i.owner_id and p.status = 'active'
    where i.id = p_invitation_id and i.status = 'published' and i.published_at is not null
    for share of i
  ) then
    raise exception 'rsvp_invitation_not_available' using errcode = 'P0002';
  end if;
  if p_client_submission_id is null or p_source_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_rsvp_submission_identity' using errcode = '22023';
  end if;
  if char_length(v_name) not between 2 and 100 or
     p_attendance_status not in ('attending','not_attending') or
     (p_attendance_status = 'attending' and p_guest_count not between 1 and 10) or
     (p_attendance_status = 'not_attending' and p_guest_count <> 0) or
     char_length(coalesce(v_note, '')) > 500 then
    raise exception 'invalid_rsvp_submission' using errcode = '22023';
  end if;

  v_request_hash := encode(extensions.digest(convert_to(concat_ws(
    chr(31), v_name, p_attendance_status, p_guest_count::text, coalesce(v_note, '')
  ), 'UTF8'), 'sha256'), 'hex');

  select r.id, r.created_at, r.request_hash
  into rsvp_id, submitted_at, v_existing_hash
  from public.invitation_rsvps r
  where r.invitation_id = p_invitation_id and r.client_submission_id = p_client_submission_id;
  if rsvp_id is not null then
    if v_existing_hash is distinct from v_request_hash then
      raise exception 'rsvp_idempotency_conflict' using errcode = '23505';
    end if;
    idempotent := true;
    return next;
    return;
  end if;

  begin
    delete from public.invitation_rsvp_rate_limits
    where invitation_id = p_invitation_id and updated_at < now() - interval '7 days';
    perform public.consume_invitation_rsvp_rate_limit(
      p_invitation_id, 'invitation', 'global', 100, interval '10 minutes'
    );
    perform public.consume_invitation_rsvp_rate_limit(
      p_invitation_id, 'source', p_source_hash, 5, interval '10 minutes'
    );

    insert into public.invitation_rsvps (
      invitation_id, client_submission_id, request_hash, guest_name,
      attendance_status, guest_count, note
    ) values (
      p_invitation_id, p_client_submission_id, v_request_hash, v_name,
      p_attendance_status, p_guest_count, v_note
    ) returning id, created_at into rsvp_id, submitted_at;
    idempotent := false;
    return next;
    return;
  exception when unique_violation then
    select r.id, r.created_at, r.request_hash
    into rsvp_id, submitted_at, v_existing_hash
    from public.invitation_rsvps r
    where r.invitation_id = p_invitation_id and r.client_submission_id = p_client_submission_id;
    if rsvp_id is null then raise; end if;
    if v_existing_hash is distinct from v_request_hash then
      raise exception 'rsvp_idempotency_conflict' using errcode = '23505';
    end if;
    idempotent := true;
    return next;
    return;
  end;
end $$;

create function public.get_owned_invitation_rsvp_summary(
  p_owner_id uuid,
  p_invitation_id uuid
) returns table(
  attending bigint,
  not_attending bigint,
  attending_guest_count bigint,
  total_responses bigint
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.invitations i
    join public.profiles p on p.id = i.owner_id and p.status = 'active'
    where i.id = p_invitation_id and i.owner_id = p_owner_id
  ) then
    raise exception 'rsvp_owner_access_denied' using errcode = '42501';
  end if;
  return query
  select
    count(*) filter (where r.attendance_status = 'attending')::bigint,
    count(*) filter (where r.attendance_status = 'not_attending')::bigint,
    coalesce(sum(r.guest_count) filter (where r.attendance_status = 'attending'), 0)::bigint,
    count(*)::bigint
  from public.invitation_rsvps r
  where r.invitation_id = p_invitation_id;
end $$;

create function public.list_owned_invitation_rsvps(
  p_owner_id uuid,
  p_invitation_id uuid,
  p_limit integer default 100,
  p_offset integer default 0
) returns table(
  id uuid,
  guest_name text,
  attendance_status text,
  guest_count smallint,
  note text,
  created_at timestamptz
) language plpgsql stable security definer set search_path = '' as $$
begin
  if p_limit not between 1 and 100 or p_offset not between 0 and 100000 then
    raise exception 'invalid_rsvp_list_options' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.invitations i
    join public.profiles p on p.id = i.owner_id and p.status = 'active'
    where i.id = p_invitation_id and i.owner_id = p_owner_id
  ) then
    raise exception 'rsvp_owner_access_denied' using errcode = '42501';
  end if;
  return query
  select r.id, r.guest_name, r.attendance_status, r.guest_count, r.note, r.created_at
  from public.invitation_rsvps r
  where r.invitation_id = p_invitation_id
  order by r.created_at desc, r.id desc
  limit p_limit offset p_offset;
end $$;

revoke all on function public.consume_invitation_rsvp_rate_limit(uuid,text,text,integer,interval) from public, anon, authenticated, service_role;
revoke all on function public.submit_public_invitation_rsvp(uuid,uuid,text,text,integer,text,text) from public, anon, authenticated;
revoke all on function public.get_owned_invitation_rsvp_summary(uuid,uuid) from public, anon, authenticated;
revoke all on function public.list_owned_invitation_rsvps(uuid,uuid,integer,integer) from public, anon, authenticated;
grant execute on function public.submit_public_invitation_rsvp(uuid,uuid,text,text,integer,text,text) to service_role;
grant execute on function public.get_owned_invitation_rsvp_summary(uuid,uuid) to service_role;
grant execute on function public.list_owned_invitation_rsvps(uuid,uuid,integer,integer) to service_role;

commit;
