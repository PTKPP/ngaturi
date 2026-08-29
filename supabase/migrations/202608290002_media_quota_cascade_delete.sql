begin;

-- A parent invitation DELETE removes media through an FK cascade after the
-- invitation row is no longer visible to the media trigger. Keep quota
-- release correct without requiring the missing parent row.
create or replace function public.release_invitation_media_quota_on_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bytes bigint := case when old.status = 'deleted' then 0 else old.quota_reserved_bytes end;
  v_count integer := case when old.status = 'deleted' then 0 else 1 end;
  v_gallery integer := case when old.status <> 'deleted' and old.media_purpose = 'gallery' then 1 else 0 end;
  v_invitation_exists boolean;
begin
  if v_count = 0 then
    return old;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('ngaturi-media-quota:' || old.owner_id::text, 0));

  select exists (
    select 1 from public.invitations i
    where i.id = old.invitation_id and i.owner_id = old.owner_id
  ) into v_invitation_exists;

  update public.owner_media_quota_usage
  set active_bytes = active_bytes - v_bytes,
      active_media_count = active_media_count - v_count,
      updated_at = now()
  where owner_id = old.owner_id
    and active_bytes >= v_bytes
    and active_media_count >= v_count;

  if not found and exists (select 1 from public.profiles p where p.id = old.owner_id) then
    raise exception 'media_quota_owner_usage_underflow' using errcode = '23514';
  end if;

  if v_invitation_exists then
    update public.invitation_media_quota_usage
    set active_bytes = active_bytes - v_bytes,
        active_media_count = active_media_count - v_count,
        active_gallery_count = active_gallery_count - v_gallery,
        updated_at = now()
    where invitation_id = old.invitation_id
      and owner_id = old.owner_id
      and active_bytes >= v_bytes
      and active_media_count >= v_count
      and active_gallery_count >= v_gallery;

    if not found then
      raise exception 'media_quota_invitation_usage_underflow' using errcode = '23514';
    end if;
  end if;

  return old;
end
$$;

drop trigger invitation_media_hard_quota on public.invitation_media;

create trigger invitation_media_hard_quota_reserve
before insert or update on public.invitation_media
for each row execute function public.enforce_invitation_media_quota();

create trigger invitation_media_hard_quota_release
before delete on public.invitation_media
for each row execute function public.release_invitation_media_quota_on_delete();

revoke all on function public.release_invitation_media_quota_on_delete() from public, anon, authenticated;

commit;
