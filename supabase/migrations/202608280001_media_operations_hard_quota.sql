begin;

alter table public.profiles
  add column media_quota_bytes bigint not null default 524288000,
  add constraint profiles_media_quota_bytes_check check (media_quota_bytes between 0 and 1099511627776);

alter table public.invitations
  add column media_quota_bytes bigint not null default 209715200,
  add column gallery_media_quota integer not null default 30,
  add constraint invitations_media_quota_bytes_check check (media_quota_bytes between 0 and 1099511627776),
  add constraint invitations_gallery_media_quota_check check (gallery_media_quota between 0 and 500);

alter table public.invitation_media
  add column media_purpose text not null default 'legacy',
  add column quota_reserved_bytes bigint not null default 0,
  add constraint invitation_media_purpose_check check (media_purpose in ('legacy','couple','gallery'));

create or replace function public.image_media_quota_reservation(
  p_original_bytes bigint,
  p_width_px integer,
  p_height_px integer
) returns bigint
language plpgsql immutable set search_path = '' as $$
declare
  v_target integer;
  v_width integer;
  v_height integer;
  v_total bigint := p_original_bytes;
begin
  if p_original_bytes not between 1 and 10485760 or p_width_px <= 0 or p_height_px <= 0 then
    raise exception 'invalid_media_quota_reservation' using errcode = '22023';
  end if;
  foreach v_target in array array[400, 900, 1600] loop
    v_width := least(p_width_px, v_target);
    v_height := greatest(1, round(p_height_px::numeric * v_width / p_width_px)::integer);
    -- Reserve a conservative RGBA-sized ceiling plus encoder overhead. Actual
    -- WebP bytes replace this reservation only after verified finalization.
    v_total := v_total + least(10485760::bigint, v_width::bigint * v_height::bigint * 4 + 65536);
  end loop;
  return v_total;
end $$;

update public.invitation_media m
set quota_reserved_bytes = case
  when m.status = 'deleted' then 0
  when m.status = 'ready' and v.variant_count = 3 and v.variant_bytes > 0
    then m.size_bytes + v.variant_bytes
  else public.image_media_quota_reservation(m.size_bytes, m.width_px, m.height_px)
end
from (
  select media_id, count(*) filter (where size_bytes is not null) as variant_count,
         coalesce(sum(size_bytes), 0)::bigint as variant_bytes
  from public.invitation_media_variants
  group by media_id
) v
where v.media_id = m.id;

update public.invitation_media
set quota_reserved_bytes = case
  when status = 'deleted' then 0
  else public.image_media_quota_reservation(size_bytes, width_px, height_px)
end
where quota_reserved_bytes = 0;

alter table public.invitation_media
  add constraint invitation_media_quota_reserved_bytes_check check (
    (status = 'deleted' and quota_reserved_bytes = 0) or
    (status <> 'deleted' and quota_reserved_bytes > 0)
  );

drop index public.invitation_media_active_content_unique;
create unique index invitation_media_active_content_unique
  on public.invitation_media (invitation_id, content_sha256, media_purpose)
  where content_sha256 is not null and status in ('uploading','processing','ready');

create table public.owner_media_quota_usage (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  active_bytes bigint not null default 0 check (active_bytes >= 0),
  active_media_count integer not null default 0 check (active_media_count >= 0),
  updated_at timestamptz not null default now()
);

create table public.invitation_media_quota_usage (
  invitation_id uuid primary key references public.invitations(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  active_bytes bigint not null default 0 check (active_bytes >= 0),
  active_media_count integer not null default 0 check (active_media_count >= 0),
  active_gallery_count integer not null default 0 check (active_gallery_count >= 0),
  updated_at timestamptz not null default now(),
  unique (invitation_id, owner_id)
);

insert into public.owner_media_quota_usage (owner_id, active_bytes, active_media_count)
select p.id, coalesce(sum(m.quota_reserved_bytes) filter (where m.status <> 'deleted'), 0)::bigint,
       count(m.id) filter (where m.status <> 'deleted')::integer
from public.profiles p
left join public.invitation_media m on m.owner_id = p.id
group by p.id;

insert into public.invitation_media_quota_usage (invitation_id, owner_id, active_bytes, active_media_count, active_gallery_count)
select i.id, i.owner_id,
       coalesce(sum(m.quota_reserved_bytes) filter (where m.status <> 'deleted'), 0)::bigint,
       count(m.id) filter (where m.status <> 'deleted')::integer,
       count(m.id) filter (where m.status <> 'deleted' and m.media_purpose = 'gallery')::integer
from public.invitations i
left join public.invitation_media m on m.invitation_id = i.id
group by i.id, i.owner_id;

alter table public.owner_media_quota_usage enable row level security;
alter table public.invitation_media_quota_usage enable row level security;
revoke all on public.owner_media_quota_usage from public, anon, authenticated;
revoke all on public.invitation_media_quota_usage from public, anon, authenticated;
grant select on public.owner_media_quota_usage to service_role;
grant select on public.invitation_media_quota_usage to service_role;

create or replace function public.enforce_invitation_media_quota() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := coalesce(new.owner_id, old.owner_id);
  v_invitation uuid := coalesce(new.invitation_id, old.invitation_id);
  v_old_active boolean := tg_op <> 'INSERT' and old.status <> 'deleted';
  v_new_active boolean := tg_op <> 'DELETE' and new.status <> 'deleted';
  v_old_bytes bigint := 0;
  v_new_bytes bigint := 0;
  v_old_count integer := 0;
  v_new_count integer := 0;
  v_old_gallery integer := 0;
  v_new_gallery integer := 0;
  v_owner_limit bigint;
  v_invitation_limit bigint;
  v_gallery_limit integer;
  v_owner_usage public.owner_media_quota_usage%rowtype;
  v_invitation_usage public.invitation_media_quota_usage%rowtype;
  v_actual_bytes bigint;
begin
  if tg_op = 'UPDATE' and (
    new.owner_id is distinct from old.owner_id or
    new.invitation_id is distinct from old.invitation_id or
    new.media_purpose is distinct from old.media_purpose
  ) then
    raise exception 'media_quota_identity_immutable' using errcode = '23514';
  end if;

  if tg_op <> 'DELETE' then
    if new.quota_reserved_bytes <= 0 and new.status <> 'deleted' then
      new.quota_reserved_bytes := public.image_media_quota_reservation(new.size_bytes, new.width_px, new.height_px);
    end if;
    if new.status = 'deleted' then
      new.quota_reserved_bytes := 0;
    elsif tg_op = 'UPDATE' and new.status = 'ready' and old.status = 'processing' then
      select new.size_bytes + coalesce(sum(v.size_bytes), 0) into v_actual_bytes
      from public.invitation_media_variants v
      where v.media_id = new.id and v.status = 'ready';
      if v_actual_bytes <= new.size_bytes or v_actual_bytes > old.quota_reserved_bytes then
        raise exception 'media_quota_reservation_exceeded' using errcode = '23514';
      end if;
      new.quota_reserved_bytes := v_actual_bytes;
    end if;
  end if;

  if v_old_active then
    v_old_bytes := old.quota_reserved_bytes;
    v_old_count := 1;
    v_old_gallery := case when old.media_purpose = 'gallery' then 1 else 0 end;
  end if;
  if v_new_active then
    v_new_bytes := new.quota_reserved_bytes;
    v_new_count := 1;
    v_new_gallery := case when new.media_purpose = 'gallery' then 1 else 0 end;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('ngaturi-media-quota:' || v_owner::text, 0));

  select p.media_quota_bytes into v_owner_limit
  from public.profiles p where p.id = v_owner;
  select i.media_quota_bytes, i.gallery_media_quota into v_invitation_limit, v_gallery_limit
  from public.invitations i where i.id = v_invitation and i.owner_id = v_owner;
  if v_owner_limit is null or v_invitation_limit is null then
    raise exception 'media_quota_owner_or_invitation_missing' using errcode = '23503';
  end if;

  insert into public.owner_media_quota_usage (owner_id) values (v_owner) on conflict do nothing;
  insert into public.invitation_media_quota_usage (invitation_id, owner_id)
  values (v_invitation, v_owner) on conflict do nothing;
  select * into v_owner_usage from public.owner_media_quota_usage where owner_id = v_owner for update;
  select * into v_invitation_usage from public.invitation_media_quota_usage where invitation_id = v_invitation for update;

  if v_owner_usage.active_bytes - v_old_bytes + v_new_bytes > v_owner_limit then
    raise exception 'media_user_quota_exceeded' using errcode = 'P0001',
      detail = format('used=%s requested=%s limit=%s', v_owner_usage.active_bytes, greatest(0, v_new_bytes - v_old_bytes), v_owner_limit);
  end if;
  if v_invitation_usage.active_bytes - v_old_bytes + v_new_bytes > v_invitation_limit then
    raise exception 'media_invitation_quota_exceeded' using errcode = 'P0001',
      detail = format('used=%s requested=%s limit=%s', v_invitation_usage.active_bytes, greatest(0, v_new_bytes - v_old_bytes), v_invitation_limit);
  end if;
  if v_invitation_usage.active_gallery_count - v_old_gallery + v_new_gallery > v_gallery_limit then
    raise exception 'media_gallery_quota_exceeded' using errcode = 'P0001',
      detail = format('used=%s requested=%s limit=%s', v_invitation_usage.active_gallery_count, greatest(0, v_new_gallery - v_old_gallery), v_gallery_limit);
  end if;

  update public.owner_media_quota_usage set
    active_bytes = active_bytes - v_old_bytes + v_new_bytes,
    active_media_count = active_media_count - v_old_count + v_new_count,
    updated_at = now()
  where owner_id = v_owner;
  update public.invitation_media_quota_usage set
    active_bytes = active_bytes - v_old_bytes + v_new_bytes,
    active_media_count = active_media_count - v_old_count + v_new_count,
    active_gallery_count = active_gallery_count - v_old_gallery + v_new_gallery,
    updated_at = now()
  where invitation_id = v_invitation;

  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger invitation_media_hard_quota
before insert or update or delete on public.invitation_media
for each row execute function public.enforce_invitation_media_quota();

drop function public.prepare_image_media_upload(uuid,uuid,uuid,text,text,bigint,integer,integer,text,text,text,jsonb);
create function public.prepare_image_media_upload(
  p_media_id uuid,
  p_invitation_id uuid,
  p_client_upload_id uuid,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes bigint,
  p_width_px integer,
  p_height_px integer,
  p_sha256 text,
  p_alt_text text,
  p_original_path text,
  p_variants jsonb,
  p_media_purpose text
) returns table(media_id uuid, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_existing uuid;
  v_prefix text;
begin
  if v_owner is null or not exists (select 1 from public.profiles p where p.id = v_owner and p.status = 'active') then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.invitations i where i.id = p_invitation_id and i.owner_id = v_owner) then
    raise exception 'invitation_not_owned' using errcode = '42501';
  end if;
  if p_media_purpose not in ('couple','gallery') then
    raise exception 'invalid_media_purpose' using errcode = '22023';
  end if;
  if p_mime_type not in ('image/jpeg','image/png','image/webp','image/avif') or p_size_bytes not between 1 and 10485760 then
    raise exception 'invalid_image_file' using errcode = '22023';
  end if;
  if p_width_px not between 1 and 12000 or p_height_px not between 1 and 12000 or p_width_px::bigint * p_height_px::bigint > 40000000 then
    raise exception 'invalid_image_dimensions' using errcode = '22023';
  end if;
  if p_sha256 !~ '^[0-9a-f]{64}$' or char_length(btrim(p_alt_text)) not between 1 and 240 or char_length(btrim(p_original_filename)) not between 1 and 180 then
    raise exception 'invalid_image_metadata' using errcode = '22023';
  end if;
  if jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) <> 3 or
     (select count(distinct item->>'key') from jsonb_array_elements(p_variants) item where item->>'key' in ('thumbnail','medium','large')) <> 3 then
    raise exception 'invalid_image_variants' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_variants) item
    where (item->>'targetWidth')::integer <> least(p_width_px, case item->>'key' when 'thumbnail' then 400 when 'medium' then 900 else 1600 end)
       or (item->>'targetHeight')::integer <> greatest(1, round(p_height_px::numeric * least(p_width_px, case item->>'key' when 'thumbnail' then 400 when 'medium' then 900 else 1600 end) / p_width_px)::integer)
  ) then
    raise exception 'invalid_variant_dimensions' using errcode = '22023';
  end if;

  select m.id into v_existing from public.invitation_media m
  where m.owner_id = v_owner and m.invitation_id = p_invitation_id and m.client_upload_id = p_client_upload_id;
  if v_existing is null then
    select m.id into v_existing from public.invitation_media m
    where m.invitation_id = p_invitation_id and m.content_sha256 = p_sha256
      and m.media_purpose = p_media_purpose and m.status in ('uploading','processing','ready')
    order by m.created_at limit 1;
  end if;
  if v_existing is not null then
    return query select v_existing, true;
    return;
  end if;

  v_prefix := v_owner::text || '/' || p_invitation_id::text || '/' || p_media_id::text || '/';
  if p_original_path !~ ('^' || v_prefix || 'original/[0-9a-f-]+\.(jpg|png|webp|avif)$') or
     exists (select 1 from jsonb_array_elements(p_variants) item where item->>'path' !~ ('^' || v_prefix || 'variants/(thumbnail|medium|large)-[0-9a-f-]+\.webp$')) then
    raise exception 'unsafe_storage_path' using errcode = '22023';
  end if;

  insert into public.invitation_media (
    id, invitation_id, owner_id, storage_path, mime_type, size_bytes, alt_text, status,
    client_upload_id, original_filename, content_sha256, width_px, height_px,
    media_purpose, quota_reserved_bytes
  ) values (
    p_media_id, p_invitation_id, v_owner, p_original_path, p_mime_type, p_size_bytes, btrim(p_alt_text), 'uploading',
    p_client_upload_id, btrim(p_original_filename), p_sha256, p_width_px, p_height_px,
    p_media_purpose, public.image_media_quota_reservation(p_size_bytes, p_width_px, p_height_px)
  );

  insert into public.invitation_media_variants (media_id, variant_key, storage_path, target_width_px, target_height_px)
  select p_media_id, item->>'key', item->>'path', (item->>'targetWidth')::integer, (item->>'targetHeight')::integer
  from jsonb_array_elements(p_variants) item;
  return query select p_media_id, false;
exception when unique_violation then
  select m.id into v_existing from public.invitation_media m
  where m.invitation_id = p_invitation_id and (
    m.client_upload_id = p_client_upload_id or
    (m.content_sha256 = p_sha256 and m.media_purpose = p_media_purpose and m.status in ('uploading','processing','ready'))
  ) order by m.created_at limit 1;
  if v_existing is null then raise; end if;
  return query select v_existing, true;
end $$;

create table public.media_cleanup_run_lock (
  lock_name text primary key check (lock_name = 'image-media'),
  lock_token uuid,
  holder_id uuid,
  acquired_at timestamptz,
  locked_until timestamptz,
  check ((lock_token is null and holder_id is null and acquired_at is null and locked_until is null) or
         (lock_token is not null and holder_id is not null and acquired_at is not null and locked_until is not null))
);
insert into public.media_cleanup_run_lock(lock_name) values ('image-media');
alter table public.media_cleanup_run_lock enable row level security;
revoke all on public.media_cleanup_run_lock from public, anon, authenticated;

create function public.acquire_image_media_cleanup_run_lock(p_holder_id uuid, p_lease_timeout interval default interval '30 minutes')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_token uuid := gen_random_uuid();
begin
  if p_holder_id is null or p_lease_timeout < interval '1 minute' or p_lease_timeout > interval '24 hours' then
    raise exception 'invalid_media_cleanup_run_lock_options' using errcode = '22023';
  end if;
  update public.media_cleanup_run_lock set
    lock_token = v_token, holder_id = p_holder_id, acquired_at = now(), locked_until = now() + p_lease_timeout
  where lock_name = 'image-media' and (lock_token is null or locked_until <= now());
  if not found then return null; end if;
  return v_token;
end $$;

create function public.release_image_media_cleanup_run_lock(p_lock_token uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.media_cleanup_run_lock set
    lock_token = null, holder_id = null, acquired_at = null, locked_until = null
  where lock_name = 'image-media' and lock_token = p_lock_token;
  return found;
end $$;

create or replace view public.invitation_media_storage_usage
with (security_invoker = true) as
select
  q.owner_id,
  q.invitation_id,
  q.active_media_count,
  count(*) filter (where m.status = 'ready')::integer as ready_media_count,
  coalesce(sum(case when m.status = 'ready' then m.quota_reserved_bytes else 0 end), 0)::bigint as ready_bytes,
  coalesce(sum(case when m.status in ('uploading','processing') then m.quota_reserved_bytes else 0 end), 0)::bigint as reserved_upload_bytes,
  q.active_bytes,
  q.active_gallery_count
from public.invitation_media_quota_usage q
left join public.invitation_media m on m.invitation_id = q.invitation_id
group by q.owner_id, q.invitation_id, q.active_media_count, q.active_bytes, q.active_gallery_count;

revoke update (media_quota_bytes) on public.profiles from authenticated;
revoke update (media_quota_bytes, gallery_media_quota) on public.invitations from authenticated;
revoke all on function public.image_media_quota_reservation(bigint,integer,integer) from public, anon, authenticated;
revoke all on function public.enforce_invitation_media_quota() from public, anon, authenticated;
revoke all on function public.prepare_image_media_upload(uuid,uuid,uuid,text,text,bigint,integer,integer,text,text,text,jsonb,text) from public, anon, authenticated;
revoke all on function public.acquire_image_media_cleanup_run_lock(uuid,interval) from public, anon, authenticated;
revoke all on function public.release_image_media_cleanup_run_lock(uuid) from public, anon, authenticated;
revoke all on public.media_cleanup_run_lock from public, anon, authenticated;

grant execute on function public.prepare_image_media_upload(uuid,uuid,uuid,text,text,bigint,integer,integer,text,text,text,jsonb,text) to authenticated;
grant execute on function public.acquire_image_media_cleanup_run_lock(uuid,interval) to service_role;
grant execute on function public.release_image_media_cleanup_run_lock(uuid) to service_role;

commit;
