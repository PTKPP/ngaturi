begin;

alter table public.invitation_media
  alter column status drop default,
  alter column status type text using status::text;

drop type public.media_status;

alter table public.invitation_media
  add constraint invitation_media_status_check check (status in ('pending','uploading','processing','ready','failed','delete_pending','deleted')),
  alter column status set default 'uploading',
  add column client_upload_id uuid,
  add column original_filename text,
  add column content_sha256 text,
  add column width_px integer,
  add column height_px integer,
  add column failure_reason text,
  add column ready_at timestamptz,
  add column delete_requested_at timestamptz,
  add constraint invitation_media_original_filename_check check (original_filename is null or char_length(original_filename) between 1 and 180),
  add constraint invitation_media_sha256_check check (content_sha256 is null or content_sha256 ~ '^[0-9a-f]{64}$'),
  add constraint invitation_media_dimensions_check check (
    (width_px is null and height_px is null) or
    (width_px between 1 and 12000 and height_px between 1 and 12000 and width_px::bigint * height_px::bigint <= 40000000)
  ),
  add constraint invitation_media_failure_reason_check check (failure_reason is null or char_length(failure_reason) <= 500);

update public.invitation_media
set
  status = case status when 'pending' then 'failed' when 'deleted' then 'delete_pending' else status end,
  original_filename = coalesce(original_filename, 'legacy-image'),
  failure_reason = case when status = 'pending' then 'Legacy upload tidak pernah difinalisasi.' else failure_reason end,
  ready_at = case when status = 'ready' then updated_at else ready_at end,
  delete_requested_at = case when status = 'deleted' then updated_at else delete_requested_at end;

alter table public.invitation_media
  alter column original_filename set not null;

create unique index invitation_media_client_upload_unique
  on public.invitation_media (owner_id, invitation_id, client_upload_id)
  where client_upload_id is not null;

create unique index invitation_media_active_content_unique
  on public.invitation_media (invitation_id, content_sha256)
  where content_sha256 is not null and status in ('uploading','processing','ready');

create table public.invitation_media_variants (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.invitation_media(id) on delete cascade,
  variant_key text not null check (variant_key in ('thumbnail','medium','large')),
  storage_path text not null unique,
  mime_type text not null default 'image/webp' check (mime_type = 'image/webp'),
  target_width_px integer not null check (target_width_px between 1 and 1600),
  target_height_px integer not null check (target_height_px between 1 and 12000),
  width_px integer,
  height_px integer,
  size_bytes bigint,
  status text not null default 'uploading' check (status in ('uploading','processing','ready','failed','delete_pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (media_id, variant_key),
  check ((width_px is null and height_px is null and size_bytes is null) or (width_px > 0 and height_px > 0 and size_bytes > 0 and size_bytes <= 10485760))
);

create index invitation_media_variants_media_idx on public.invitation_media_variants (media_id, variant_key);
create trigger media_variants_touch before update on public.invitation_media_variants for each row execute function public.touch_updated_at();
alter table public.invitation_media_variants enable row level security;

create policy media_variants_read_owner on public.invitation_media_variants for select to authenticated
using (exists (select 1 from public.invitation_media m where m.id = media_id and m.owner_id = auth.uid()));

revoke all on public.invitation_media_variants from anon, authenticated;
grant select on public.invitation_media_variants to authenticated;
revoke insert, update, delete on public.invitation_media from authenticated;
revoke update (storage_path, mime_type, size_bytes, alt_text, status) on public.invitation_media from authenticated;

create or replace function public.prepare_image_media_upload(
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
  p_variants jsonb
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
    where m.invitation_id = p_invitation_id and m.content_sha256 = p_sha256 and m.status in ('uploading','processing','ready')
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
    client_upload_id, original_filename, content_sha256, width_px, height_px
  ) values (
    p_media_id, p_invitation_id, v_owner, p_original_path, p_mime_type, p_size_bytes, btrim(p_alt_text), 'uploading',
    p_client_upload_id, btrim(p_original_filename), p_sha256, p_width_px, p_height_px
  );

  insert into public.invitation_media_variants (media_id, variant_key, storage_path, target_width_px, target_height_px)
  select p_media_id, item->>'key', item->>'path', (item->>'targetWidth')::integer, (item->>'targetHeight')::integer
  from jsonb_array_elements(p_variants) item;

  return query select p_media_id, false;
exception when unique_violation then
  select m.id into v_existing from public.invitation_media m
  where m.invitation_id = p_invitation_id and (
    m.client_upload_id = p_client_upload_id or
    (m.content_sha256 = p_sha256 and m.status in ('uploading','processing','ready'))
  ) order by m.created_at limit 1;
  if v_existing is null then raise; end if;
  return query select v_existing, true;
end $$;

create or replace function public.begin_image_media_processing(p_invitation_id uuid, p_media_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_status text;
begin
  update public.invitation_media set status = 'processing', failure_reason = null
  where id = p_media_id and invitation_id = p_invitation_id and owner_id = auth.uid() and status = 'uploading'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active')
  returning status into v_status;
  if v_status is null then
    select status into v_status from public.invitation_media where id = p_media_id and invitation_id = p_invitation_id and owner_id = auth.uid()
      and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active');
  end if;
  if v_status not in ('processing','ready') then raise exception 'media_not_uploading' using errcode = '23514'; end if;
  update public.invitation_media_variants set status = 'processing' where media_id = p_media_id and status = 'uploading';
  return v_status;
end $$;

create or replace function public.complete_image_media_processing(p_invitation_id uuid, p_media_id uuid, p_objects jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_media public.invitation_media%rowtype;
  v_item jsonb;
  v_variant public.invitation_media_variants%rowtype;
  v_object storage.objects%rowtype;
begin
  select * into v_media from public.invitation_media
  where id = p_media_id and invitation_id = p_invitation_id and owner_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active') for update;
  if v_media.id is null then raise exception 'media_not_found' using errcode = 'P0002'; end if;
  if v_media.status = 'ready' then return v_media.id; end if;
  if v_media.status <> 'processing' then raise exception 'media_not_processing' using errcode = '23514'; end if;
  if jsonb_typeof(p_objects) <> 'array' or jsonb_array_length(p_objects) <> 4 or
     (select count(distinct item->>'key') from jsonb_array_elements(p_objects) item where item->>'key' in ('original','thumbnail','medium','large')) <> 4 then
    raise exception 'incomplete_image_objects' using errcode = '22023';
  end if;

  select * into v_object from storage.objects where bucket_id = 'invitation-media' and name = v_media.storage_path;
  if v_object.id is null or coalesce(v_object.metadata->>'mimetype', v_object.metadata->>'contentType', '') <> v_media.mime_type or
     coalesce(v_object.metadata->>'size','0')::bigint <> v_media.size_bytes or
     not exists (select 1 from jsonb_array_elements(p_objects) item where item->>'key' = 'original' and
       (item->>'sizeBytes')::bigint = v_media.size_bytes and (item->>'width')::integer = v_media.width_px and (item->>'height')::integer = v_media.height_px) then
    raise exception 'original_object_mismatch' using errcode = '23514';
  end if;

  for v_item in select item from jsonb_array_elements(p_objects) item where item->>'key' <> 'original' loop
    select * into v_variant from public.invitation_media_variants where media_id = p_media_id and variant_key = v_item->>'key' for update;
    select * into v_object from storage.objects where bucket_id = 'invitation-media' and name = v_variant.storage_path;
    if v_variant.id is null or v_object.id is null or coalesce(v_object.metadata->>'mimetype', v_object.metadata->>'contentType', '') <> 'image/webp' or
       coalesce(v_object.metadata->>'size','0')::bigint <> (v_item->>'sizeBytes')::bigint or
       (v_item->>'width')::integer <> v_variant.target_width_px or (v_item->>'height')::integer <> v_variant.target_height_px then
      raise exception 'variant_object_mismatch' using errcode = '23514';
    end if;
    update public.invitation_media_variants set
      width_px = (v_item->>'width')::integer,
      height_px = (v_item->>'height')::integer,
      size_bytes = (v_item->>'sizeBytes')::bigint,
      status = 'ready'
    where id = v_variant.id;
  end loop;

  update public.invitation_media set status = 'ready', ready_at = now(), failure_reason = null where id = p_media_id;
  return p_media_id;
end $$;

create or replace function public.fail_image_media_upload(p_invitation_id uuid, p_media_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.invitation_media set status = 'failed', failure_reason = left(coalesce(nullif(btrim(p_reason),''),'Upload image gagal.'),500)
  where id = p_media_id and invitation_id = p_invitation_id and owner_id = auth.uid() and status in ('uploading','processing')
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active');
  if not found then raise exception 'media_not_pending' using errcode = '23514'; end if;
  update public.invitation_media_variants set status = 'failed' where media_id = p_media_id and status in ('uploading','processing');
end $$;

create or replace function public.update_image_media_alt(p_invitation_id uuid, p_media_id uuid, p_alt_text text) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if char_length(btrim(p_alt_text)) not between 1 and 240 then raise exception 'invalid_alt_text' using errcode = '22023'; end if;
  update public.invitation_media set alt_text = btrim(p_alt_text)
  where id = p_media_id and invitation_id = p_invitation_id and owner_id = auth.uid() and status = 'ready'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active');
  if not found then raise exception 'ready_media_not_found' using errcode = 'P0002'; end if;
  return p_media_id;
end $$;

create or replace function public.request_image_media_deletion(
  p_invitation_id uuid,
  p_media_id uuid,
  p_expected_invitation_updated_at timestamptz
) returns void language plpgsql security definer set search_path = '' as $$
declare v_content jsonb; v_updated_at timestamptz;
begin
  select content, updated_at into v_content, v_updated_at from public.invitations
  where id = p_invitation_id and owner_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active') for update;
  if v_content is null then raise exception 'invitation_not_owned' using errcode = '42501'; end if;
  if v_updated_at is distinct from p_expected_invitation_updated_at then raise exception 'stale_invitation_version' using errcode = '40001'; end if;
  if jsonb_path_exists(v_content, '$.** ? (@ == $mediaId)', jsonb_build_object('mediaId', p_media_id::text)) then
    raise exception 'media_still_referenced' using errcode = '23514';
  end if;
  update public.invitation_media set status = 'delete_pending', delete_requested_at = now()
  where id = p_media_id and invitation_id = p_invitation_id and owner_id = auth.uid() and status in ('ready','failed');
  if not found and not exists (
    select 1 from public.invitation_media where id = p_media_id and invitation_id = p_invitation_id and owner_id = auth.uid() and status = 'delete_pending'
  ) then raise exception 'deletable_media_not_found' using errcode = 'P0002'; end if;
  update public.invitation_media_variants set status = 'delete_pending' where media_id = p_media_id;
end $$;

create or replace function public.get_published_invitation_media(p_invitation_id uuid)
returns table(id uuid, alt_text text)
language sql stable security definer set search_path = '' as $$
  select m.id, m.alt_text
  from public.invitation_media m
  join public.invitations i on i.id = m.invitation_id and i.status = 'published'
  where m.invitation_id = p_invitation_id and m.status = 'ready'
    and jsonb_path_exists(i.content, '$.** ? (@ == $mediaId)', jsonb_build_object('mediaId', m.id::text))
  order by m.created_at
$$;

revoke all on function public.prepare_image_media_upload(uuid,uuid,uuid,text,text,bigint,integer,integer,text,text,text,jsonb) from public;
revoke all on function public.begin_image_media_processing(uuid,uuid) from public;
revoke all on function public.complete_image_media_processing(uuid,uuid,jsonb) from public;
revoke all on function public.fail_image_media_upload(uuid,uuid,text) from public;
revoke all on function public.update_image_media_alt(uuid,uuid,text) from public;
revoke all on function public.request_image_media_deletion(uuid,uuid,timestamptz) from public;
revoke all on function public.get_published_invitation_media(uuid) from public;
grant execute on function public.prepare_image_media_upload(uuid,uuid,uuid,text,text,bigint,integer,integer,text,text,text,jsonb) to authenticated;
grant execute on function public.begin_image_media_processing(uuid,uuid) to authenticated;
grant execute on function public.complete_image_media_processing(uuid,uuid,jsonb) to authenticated;
grant execute on function public.fail_image_media_upload(uuid,uuid,text) to authenticated;
grant execute on function public.update_image_media_alt(uuid,uuid,text) to authenticated;
grant execute on function public.request_image_media_deletion(uuid,uuid,timestamptz) to authenticated;
grant execute on function public.get_published_invitation_media(uuid) to anon, authenticated;

drop policy invitation_media_object_insert_owner on storage.objects;
drop policy invitation_media_object_update_owner on storage.objects;
drop policy invitation_media_object_delete_owner on storage.objects;
create policy invitation_media_object_insert_owner on storage.objects for insert to authenticated
with check (
  bucket_id = 'invitation-media' and
  (storage.foldername(name))[1] = auth.uid()::text and
  exists (
    select 1 from public.invitation_media m
    where m.owner_id = auth.uid() and m.status = 'uploading' and
      (m.storage_path = name or exists (select 1 from public.invitation_media_variants v where v.media_id = m.id and v.storage_path = name and v.status = 'uploading'))
  )
);

commit;
