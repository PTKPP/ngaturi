begin;

create table public.invitation_wishes (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  client_submission_id uuid not null,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  guest_name text not null check (char_length(guest_name) between 2 and 100),
  message text not null check (char_length(message) between 2 and 1000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (invitation_id, client_submission_id),
  check (updated_at >= created_at)
);

create index invitation_wishes_invitation_status_created_idx
  on public.invitation_wishes (invitation_id, status, created_at desc, id desc);

create table public.invitation_wish_rate_limits (
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

alter table public.invitation_wishes enable row level security;
alter table public.invitation_wish_rate_limits enable row level security;
revoke all on public.invitation_wishes from public, anon, authenticated;
revoke all on public.invitation_wish_rate_limits from public, anon, authenticated;

create function public.consume_invitation_wish_rate_limit(
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
    raise exception 'invalid_wish_rate_limit_options' using errcode = '22023';
  end if;

  insert into public.invitation_wish_rate_limits (
    invitation_id, scope, rate_key, window_started_at, submission_count, updated_at
  ) values (
    p_invitation_id, p_scope, p_rate_key, now(), 1, now()
  )
  on conflict (invitation_id, scope, rate_key) do update set
    window_started_at = case
      when public.invitation_wish_rate_limits.window_started_at <= now() - p_window then now()
      else public.invitation_wish_rate_limits.window_started_at
    end,
    submission_count = case
      when public.invitation_wish_rate_limits.window_started_at <= now() - p_window then 1
      else public.invitation_wish_rate_limits.submission_count + 1
    end,
    updated_at = now()
  where public.invitation_wish_rate_limits.window_started_at <= now() - p_window
     or public.invitation_wish_rate_limits.submission_count < p_limit
  returning submission_count into v_count;

  if v_count is null then
    raise exception 'wish_rate_limited' using errcode = 'P0001';
  end if;
end $$;

create function public.submit_public_invitation_wish(
  p_invitation_id uuid,
  p_client_submission_id uuid,
  p_guest_name text,
  p_message text,
  p_source_hash text
) returns table(wish_id uuid, submitted_at timestamptz, idempotent boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := regexp_replace(btrim(coalesce(p_guest_name, '')), '[[:space:]]+', ' ', 'g');
  v_message text := regexp_replace(btrim(coalesce(p_message, '')), '[[:space:]]+', ' ', 'g');
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
    raise exception 'wish_invitation_not_available' using errcode = 'P0002';
  end if;
  if p_client_submission_id is null or p_source_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_wish_submission_identity' using errcode = '22023';
  end if;
  if char_length(v_name) not between 2 and 100 or
     char_length(v_message) not between 2 and 1000 or
     coalesce(p_guest_name, '') ~ '[[:cntrl:]]' or
     coalesce(p_message, '') ~ '[[:cntrl:]]' then
    raise exception 'invalid_wish_submission' using errcode = '22023';
  end if;

  v_request_hash := encode(extensions.digest(convert_to(concat_ws(
    chr(31), v_name, v_message
  ), 'UTF8'), 'sha256'), 'hex');

  select w.id, w.created_at, w.request_hash
  into wish_id, submitted_at, v_existing_hash
  from public.invitation_wishes w
  where w.invitation_id = p_invitation_id and w.client_submission_id = p_client_submission_id;
  if wish_id is not null then
    if v_existing_hash is distinct from v_request_hash then
      raise exception 'wish_idempotency_conflict' using errcode = '23505';
    end if;
    idempotent := true;
    return next;
    return;
  end if;

  begin
    delete from public.invitation_wish_rate_limits
    where invitation_id = p_invitation_id and updated_at < now() - interval '7 days';
    perform public.consume_invitation_wish_rate_limit(
      p_invitation_id, 'invitation', 'global', 100, interval '10 minutes'
    );
    perform public.consume_invitation_wish_rate_limit(
      p_invitation_id, 'source', p_source_hash, 5, interval '10 minutes'
    );

    insert into public.invitation_wishes (
      invitation_id, client_submission_id, request_hash, guest_name, message
    ) values (
      p_invitation_id, p_client_submission_id, v_request_hash, v_name, v_message
    ) returning id, created_at into wish_id, submitted_at;
    idempotent := false;
    return next;
    return;
  exception when unique_violation then
    select w.id, w.created_at, w.request_hash
    into wish_id, submitted_at, v_existing_hash
    from public.invitation_wishes w
    where w.invitation_id = p_invitation_id and w.client_submission_id = p_client_submission_id;
    if wish_id is null then raise; end if;
    if v_existing_hash is distinct from v_request_hash then
      raise exception 'wish_idempotency_conflict' using errcode = '23505';
    end if;
    idempotent := true;
    return next;
    return;
  end;
end $$;

create function public.list_public_approved_invitation_wishes(
  p_invitation_id uuid,
  p_limit integer default 11,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
) returns table(
  id uuid,
  guest_name text,
  message text,
  created_at timestamptz
) language plpgsql stable security definer set search_path = '' as $$
begin
  if p_limit not between 1 and 21 or
     ((p_before_created_at is null) <> (p_before_id is null)) then
    raise exception 'invalid_public_wish_list_options' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.invitations i
    join public.profiles p on p.id = i.owner_id and p.status = 'active'
    where i.id = p_invitation_id and i.status = 'published' and i.published_at is not null
  ) then
    raise exception 'wish_invitation_not_available' using errcode = 'P0002';
  end if;

  return query
  select w.id, w.guest_name, w.message, w.created_at
  from public.invitation_wishes w
  where w.invitation_id = p_invitation_id
    and w.status = 'approved'
    and (
      p_before_created_at is null or
      (w.created_at, w.id) < (p_before_created_at, p_before_id)
    )
  order by w.created_at desc, w.id desc
  limit p_limit;
end $$;

create function public.get_owned_invitation_wish_summary(
  p_owner_id uuid,
  p_invitation_id uuid
) returns table(
  pending bigint,
  approved bigint,
  rejected bigint,
  total bigint
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.invitations i
    join public.profiles p on p.id = i.owner_id and p.status = 'active'
    where i.id = p_invitation_id and i.owner_id = p_owner_id
  ) then
    raise exception 'wish_owner_access_denied' using errcode = '42501';
  end if;
  return query
  select
    count(*) filter (where w.status = 'pending')::bigint,
    count(*) filter (where w.status = 'approved')::bigint,
    count(*) filter (where w.status = 'rejected')::bigint,
    count(*)::bigint
  from public.invitation_wishes w
  where w.invitation_id = p_invitation_id;
end $$;

create function public.list_owned_invitation_wishes(
  p_owner_id uuid,
  p_invitation_id uuid,
  p_status text default 'pending',
  p_limit integer default 50,
  p_offset integer default 0
) returns table(
  id uuid,
  guest_name text,
  message text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
) language plpgsql stable security definer set search_path = '' as $$
begin
  if p_status not in ('pending','approved','rejected') or
     p_limit not between 1 and 50 or p_offset not between 0 and 100000 then
    raise exception 'invalid_owned_wish_list_options' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.invitations i
    join public.profiles p on p.id = i.owner_id and p.status = 'active'
    where i.id = p_invitation_id and i.owner_id = p_owner_id
  ) then
    raise exception 'wish_owner_access_denied' using errcode = '42501';
  end if;

  return query
  select w.id, w.guest_name, w.message, w.status, w.created_at, w.updated_at
  from public.invitation_wishes w
  where w.invitation_id = p_invitation_id and w.status = p_status
  order by w.created_at desc, w.id desc
  limit p_limit offset p_offset;
end $$;

create function public.moderate_owned_invitation_wish(
  p_owner_id uuid,
  p_invitation_id uuid,
  p_wish_id uuid,
  p_status text,
  p_expected_updated_at timestamptz
) returns table(wish_id uuid, moderated_status text, moderated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_status text;
  v_updated_at timestamptz;
begin
  if p_status not in ('approved','rejected') or p_expected_updated_at is null then
    raise exception 'invalid_wish_moderation' using errcode = '22023';
  end if;

  select w.status, w.updated_at
  into v_status, v_updated_at
  from public.invitation_wishes w
  join public.invitations i on i.id = w.invitation_id
  join public.profiles p on p.id = i.owner_id and p.status = 'active'
  where w.id = p_wish_id
    and w.invitation_id = p_invitation_id
    and i.owner_id = p_owner_id
  for update of w;

  if not found then
    raise exception 'wish_owner_access_denied' using errcode = '42501';
  end if;
  if v_status = p_status then
    wish_id := p_wish_id;
    moderated_status := v_status;
    moderated_at := v_updated_at;
    return next;
    return;
  end if;
  if v_updated_at is distinct from p_expected_updated_at then
    raise exception 'wish_moderation_conflict' using errcode = '40001';
  end if;

  update public.invitation_wishes
  set status = p_status, updated_at = clock_timestamp()
  where id = p_wish_id
  returning id, status, updated_at into wish_id, moderated_status, moderated_at;
  return next;
end $$;

revoke all on function public.consume_invitation_wish_rate_limit(uuid,text,text,integer,interval) from public, anon, authenticated, service_role;
revoke all on function public.submit_public_invitation_wish(uuid,uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.list_public_approved_invitation_wishes(uuid,integer,timestamptz,uuid) from public, anon, authenticated;
revoke all on function public.get_owned_invitation_wish_summary(uuid,uuid) from public, anon, authenticated;
revoke all on function public.list_owned_invitation_wishes(uuid,uuid,text,integer,integer) from public, anon, authenticated;
revoke all on function public.moderate_owned_invitation_wish(uuid,uuid,uuid,text,timestamptz) from public, anon, authenticated;
grant execute on function public.submit_public_invitation_wish(uuid,uuid,text,text,text) to service_role;
grant execute on function public.list_public_approved_invitation_wishes(uuid,integer,timestamptz,uuid) to service_role;
grant execute on function public.get_owned_invitation_wish_summary(uuid,uuid) to service_role;
grant execute on function public.list_owned_invitation_wishes(uuid,uuid,text,integer,integer) to service_role;
grant execute on function public.moderate_owned_invitation_wish(uuid,uuid,uuid,text,timestamptz) to service_role;

commit;
