begin;

update storage.buckets
set file_size_limit = 15728640,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif','audio/mpeg','audio/mp4']
where id = 'invitation-media';

alter table public.invitation_media
  drop constraint invitation_media_mime_type_check,
  drop constraint invitation_media_size_bytes_check,
  drop constraint invitation_media_dimensions_check,
  drop constraint invitation_media_purpose_check,
  add column media_kind text not null default 'image',
  add column duration_ms integer,
  add column content_signature text,
  add constraint invitation_media_kind_check check (media_kind in ('image','audio')),
  add constraint invitation_media_purpose_check check (
    (media_kind = 'image' and media_purpose in ('legacy','couple','gallery')) or
    (media_kind = 'audio' and media_purpose = 'invitation_music')
  ),
  add constraint invitation_media_file_check check (
    (media_kind = 'image' and mime_type in ('image/jpeg','image/png','image/webp','image/avif') and size_bytes between 1 and 10485760 and duration_ms is null and content_signature is null) or
    (media_kind = 'audio' and mime_type in ('audio/mpeg','audio/mp4') and size_bytes between 1 and 15728640 and duration_ms between 1000 and 900000 and content_signature in ('id3','mpeg-frame','mp4-ftyp'))
  ),
  add constraint invitation_media_dimensions_check check (
    (media_kind = 'audio' and width_px is null and height_px is null) or
    (media_kind = 'image' and ((width_px is null and height_px is null) or
      (width_px between 1 and 12000 and height_px between 1 and 12000 and width_px::bigint * height_px::bigint <= 40000000)))
  );

create index invitation_media_audio_invitation_idx
  on public.invitation_media (invitation_id, status, created_at desc)
  where media_kind = 'audio' and media_purpose = 'invitation_music';

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
    new.media_purpose is distinct from old.media_purpose or
    new.media_kind is distinct from old.media_kind
  ) then
    raise exception 'media_quota_identity_immutable' using errcode = '23514';
  end if;

  if tg_op <> 'DELETE' then
    if new.quota_reserved_bytes <= 0 and new.status <> 'deleted' then
      new.quota_reserved_bytes := case
        when new.media_kind = 'audio' then new.size_bytes
        else public.image_media_quota_reservation(new.size_bytes, new.width_px, new.height_px)
      end;
    end if;
    if new.status = 'deleted' then
      new.quota_reserved_bytes := 0;
    elsif tg_op = 'UPDATE' and new.status = 'ready' and old.status = 'processing' then
      if new.media_kind = 'audio' then
        v_actual_bytes := new.size_bytes;
      else
        select new.size_bytes + coalesce(sum(v.size_bytes), 0) into v_actual_bytes
        from public.invitation_media_variants v
        where v.media_id = new.id and v.status = 'ready';
        if v_actual_bytes <= new.size_bytes then
          raise exception 'media_quota_reservation_exceeded' using errcode = '23514';
        end if;
      end if;
      if v_actual_bytes > old.quota_reserved_bytes then
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
  select p.media_quota_bytes into v_owner_limit from public.profiles p where p.id = v_owner;
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

create function public.prepare_audio_media_upload(
  p_media_id uuid,
  p_invitation_id uuid,
  p_client_upload_id uuid,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes bigint,
  p_duration_ms integer,
  p_sha256 text,
  p_content_signature text,
  p_original_path text
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
  if p_mime_type not in ('audio/mpeg','audio/mp4') or p_size_bytes not between 1 and 15728640 then
    raise exception 'invalid_audio_file' using errcode = '22023';
  end if;
  if p_duration_ms not between 1000 and 900000 or p_sha256 !~ '^[0-9a-f]{64}$' or
     char_length(btrim(p_original_filename)) not between 1 and 180 then
    raise exception 'invalid_audio_metadata' using errcode = '22023';
  end if;
  if not ((p_mime_type = 'audio/mpeg' and p_content_signature in ('id3','mpeg-frame')) or
          (p_mime_type = 'audio/mp4' and p_content_signature = 'mp4-ftyp')) then
    raise exception 'audio_signature_mismatch' using errcode = '22023';
  end if;

  select m.id into v_existing from public.invitation_media m
  where m.owner_id = v_owner and m.invitation_id = p_invitation_id and m.client_upload_id = p_client_upload_id;
  if v_existing is null then
    select m.id into v_existing from public.invitation_media m
    where m.invitation_id = p_invitation_id and m.media_kind = 'audio' and
      m.media_purpose = 'invitation_music' and m.content_sha256 = p_sha256 and
      m.status in ('uploading','processing','ready')
    order by m.created_at limit 1;
  end if;
  if v_existing is not null then
    return query select v_existing, true;
    return;
  end if;

  v_prefix := v_owner::text || '/' || p_invitation_id::text || '/' || p_media_id::text || '/';
  if p_original_path !~ ('^' || v_prefix || 'original/[0-9a-f-]+\.(mp3|m4a)$') then
    raise exception 'unsafe_storage_path' using errcode = '22023';
  end if;

  insert into public.invitation_media (
    id, invitation_id, owner_id, storage_path, mime_type, size_bytes, alt_text, status,
    client_upload_id, original_filename, content_sha256, media_purpose, quota_reserved_bytes,
    media_kind, duration_ms, content_signature
  ) values (
    p_media_id, p_invitation_id, v_owner, p_original_path, p_mime_type, p_size_bytes, '', 'uploading',
    p_client_upload_id, btrim(p_original_filename), p_sha256, 'invitation_music', p_size_bytes,
    'audio', p_duration_ms, p_content_signature
  );
  return query select p_media_id, false;
exception when unique_violation then
  select m.id into v_existing from public.invitation_media m
  where m.invitation_id = p_invitation_id and (
    m.client_upload_id = p_client_upload_id or
    (m.media_kind = 'audio' and m.media_purpose = 'invitation_music' and
     m.content_sha256 = p_sha256 and m.status in ('uploading','processing','ready'))
  ) order by m.created_at limit 1;
  if v_existing is null then raise; end if;
  return query select v_existing, true;
end $$;

create function public.complete_audio_media_processing(
  p_invitation_id uuid,
  p_media_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_media public.invitation_media%rowtype;
  v_object storage.objects%rowtype;
begin
  select * into v_media from public.invitation_media
  where id = p_media_id and invitation_id = p_invitation_id and owner_id = auth.uid()
    and media_kind = 'audio' and media_purpose = 'invitation_music'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active')
  for update;
  if v_media.id is null then raise exception 'media_not_found' using errcode = 'P0002'; end if;
  if v_media.status = 'ready' then return v_media.id; end if;
  if v_media.status <> 'processing' then raise exception 'media_not_processing' using errcode = '23514'; end if;

  select * into v_object from storage.objects
  where bucket_id = 'invitation-media' and name = v_media.storage_path;
  if v_object.id is null or
     coalesce(v_object.metadata->>'mimetype', v_object.metadata->>'contentType', '') <> v_media.mime_type or
     coalesce(v_object.metadata->>'size','0')::bigint <> v_media.size_bytes then
    raise exception 'original_object_mismatch' using errcode = '23514';
  end if;

  update public.invitation_media
  set status = 'ready', ready_at = now(), failure_reason = null
  where id = p_media_id;
  return p_media_id;
end $$;

create or replace function public.get_published_invitation_media(p_invitation_id uuid)
returns table(id uuid, alt_text text)
language sql stable security definer set search_path = '' as $$
  select m.id, m.alt_text
  from public.invitation_media m
  join public.invitations i on i.id = m.invitation_id and i.status = 'published'
  where m.invitation_id = p_invitation_id and m.media_kind = 'image' and m.status = 'ready'
    and public.invitation_content_references_media(i.content, m.id)
  order by m.created_at
$$;

create function public.get_published_invitation_audio(p_media_id uuid)
returns table(id uuid, mime_type text, size_bytes bigint, duration_ms integer)
language sql stable security definer set search_path = '' as $$
  select m.id, m.mime_type, m.size_bytes, m.duration_ms
  from public.invitation_media m
  join public.invitations i on i.id = m.invitation_id and i.status = 'published'
  where m.id = p_media_id and m.media_kind = 'audio' and
    m.media_purpose = 'invitation_music' and m.status = 'ready' and
    i.content #>> '{modules,music,trackId}' = 'custom' and
    i.content #>> '{modules,music,mediaId}' = m.id::text
$$;

create function public.validate_invitation_custom_music() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_track_id text := new.content #>> '{modules,music,trackId}';
  v_media_id_text text := new.content #>> '{modules,music,mediaId}';
  v_media_id uuid;
  v_reference_count integer;
begin
  if v_track_id = 'custom' then
    if v_media_id_text is null or v_media_id_text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'invalid_custom_audio_reference' using errcode = '23514';
    end if;
    v_media_id := v_media_id_text::uuid;
    if not exists (
      select 1 from public.invitation_media m
      where m.id = v_media_id and m.invitation_id = new.id and m.owner_id = new.owner_id and
        m.media_kind = 'audio' and m.media_purpose = 'invitation_music' and m.status = 'ready'
    ) then
      raise exception 'custom_audio_not_ready_or_owned' using errcode = '23514';
    end if;
  elsif coalesce(v_media_id_text, '') <> '' then
    raise exception 'custom_audio_reference_requires_custom_track' using errcode = '23514';
  end if;

  select count(*) into v_reference_count
  from public.invitation_media m
  where m.invitation_id = new.id and m.media_kind = 'audio' and
    m.media_purpose = 'invitation_music' and m.status = 'ready' and
    public.invitation_content_references_media(new.content, m.id);
  if (v_track_id = 'custom' and v_reference_count <> 1) or
     (v_track_id is distinct from 'custom' and v_reference_count <> 0) then
    raise exception 'multiple_active_invitation_music' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger invitations_validate_custom_music
before insert or update of content on public.invitations
for each row execute function public.validate_invitation_custom_music();

revoke all on function public.prepare_audio_media_upload(uuid,uuid,uuid,text,text,bigint,integer,text,text,text) from public, anon, authenticated;
revoke all on function public.complete_audio_media_processing(uuid,uuid) from public, anon, authenticated;
revoke all on function public.get_published_invitation_audio(uuid) from public;
revoke all on function public.validate_invitation_custom_music() from public, anon, authenticated;
grant execute on function public.prepare_audio_media_upload(uuid,uuid,uuid,text,text,bigint,integer,text,text,text) to authenticated;
grant execute on function public.complete_audio_media_processing(uuid,uuid) to authenticated;
grant execute on function public.get_published_invitation_audio(uuid) to anon, authenticated;

commit;
