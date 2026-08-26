begin;

create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'user');
create type public.account_status as enum ('active', 'inactive');
create type public.catalog_status as enum ('active', 'inactive');
create type public.invitation_status as enum ('draft', 'published', 'inactive');
create type public.route_assigned_by as enum ('admin', 'user', 'migration');
create type public.media_status as enum ('pending', 'ready', 'deleted');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  email text not null,
  role public.app_role not null default 'user',
  status public.account_status not null default 'active',
  route_quota integer not null default 1 check (route_quota >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_email_unique on public.profiles (lower(email));

create table public.invitation_routes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  slug text not null check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  assigned_by public.route_assigned_by not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);
create unique index invitation_routes_slug_unique on public.invitation_routes (slug);
create index invitation_routes_owner_created_idx on public.invitation_routes (owner_id, created_at desc);

create table public.template_catalog (
  key text not null check (key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  version integer not null check (version > 0),
  name text not null,
  description text not null,
  thumbnail text not null,
  status public.catalog_status not null default 'active',
  active_content_schema_version integer not null check (active_content_schema_version > 0),
  supported_sections jsonb not null check (jsonb_typeof(supported_sections) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (key, version)
);

create table public.theme_catalog (
  key text not null check (key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  version integer not null check (version > 0),
  template_key text not null,
  template_version integer not null,
  name text not null,
  description text not null,
  status public.catalog_status not null default 'active',
  is_default boolean not null default false,
  tokens jsonb not null check (jsonb_typeof(tokens) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (key, version),
  unique (key, version, template_key, template_version),
  foreign key (template_key, template_version) references public.template_catalog(key, version) on update cascade on delete restrict
);
create unique index theme_catalog_one_active_default_idx on public.theme_catalog (template_key, template_version) where is_default and status = 'active';
create index theme_catalog_template_idx on public.theme_catalog (template_key, template_version, status);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  route_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  template_key text not null,
  template_version integer not null,
  content_schema_version integer not null check (content_schema_version > 0),
  theme_key text not null,
  theme_version integer not null,
  status public.invitation_status not null default 'draft',
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (route_id),
  unique (id, owner_id),
  foreign key (route_id, owner_id) references public.invitation_routes(id, owner_id) on update restrict on delete restrict,
  foreign key (template_key, template_version) references public.template_catalog(key, version) on update cascade on delete restrict,
  foreign key (theme_key, theme_version, template_key, template_version) references public.theme_catalog(key, version, template_key, template_version) on update cascade on delete restrict,
  check ((status = 'published' and published_at is not null) or (status <> 'published' and published_at is null))
);
create index invitations_owner_updated_idx on public.invitations (owner_id, updated_at desc);
create index invitations_status_updated_idx on public.invitations (status, updated_at desc);
create index invitations_template_idx on public.invitations (template_key, template_version);

create table public.invitation_media (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  alt_text text not null default '' check (char_length(alt_text) <= 300),
  status public.media_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (invitation_id, owner_id) references public.invitations(id, owner_id) on delete cascade
);
create index invitation_media_invitation_idx on public.invitation_media (invitation_id, status, created_at);
create index invitation_media_owner_idx on public.invitation_media (owner_id, created_at desc);

create function public.is_reserved_slug(candidate text) returns boolean
language sql immutable parallel safe
set search_path = ''
as $$ select candidate = any (array['admin','dashboard','login','register','api','assets','_next','favicon.ico']) $$;

create function public.is_admin() returns boolean
language sql stable security definer
set search_path = ''
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'active') $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger routes_touch before update on public.invitation_routes for each row execute function public.touch_updated_at();
create trigger templates_touch before update on public.template_catalog for each row execute function public.touch_updated_at();
create trigger themes_touch before update on public.theme_catalog for each row execute function public.touch_updated_at();
create trigger invitations_touch before update on public.invitations for each row execute function public.touch_updated_at();
create trigger media_touch before update on public.invitation_media for each row execute function public.touch_updated_at();

create function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)), coalesce(new.email, new.id::text));
  return new;
end $$;
create trigger auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();

create function public.enforce_route_rules() returns trigger language plpgsql security definer set search_path = '' as $$
declare quota_value integer; allocated integer;
begin
  if public.is_reserved_slug(new.slug) then raise exception 'reserved_slug' using errcode = '22023'; end if;
  if tg_op = 'UPDATE' and new.owner_id <> old.owner_id then raise exception 'route_owner_immutable' using errcode = '42501'; end if;
  if tg_op = 'INSERT' or new.owner_id <> old.owner_id then
    select route_quota into quota_value from public.profiles where id = new.owner_id and status = 'active' for update;
    if quota_value is null then raise exception 'inactive_or_missing_owner' using errcode = '42501'; end if;
    select count(*) into allocated from public.invitation_routes where owner_id = new.owner_id;
    if allocated >= quota_value then raise exception 'route_quota_exceeded' using errcode = '23514'; end if;
  end if;
  return new;
end $$;
create trigger routes_enforce before insert or update on public.invitation_routes for each row execute function public.enforce_route_rules();

create function public.enforce_invitation_rules() returns trigger language plpgsql set search_path = '' as $$
declare active_version integer; template_status public.catalog_status; theme_status public.catalog_status;
begin
  select active_content_schema_version, status into active_version, template_status from public.template_catalog where key = new.template_key and version = new.template_version;
  if template_status is distinct from 'active' or active_version <> new.content_schema_version then raise exception 'inactive_template_or_content_version' using errcode = '23514'; end if;
  select status into theme_status from public.theme_catalog where key = new.theme_key and version = new.theme_version and template_key = new.template_key and template_version = new.template_version;
  if theme_status is distinct from 'active' then raise exception 'inactive_or_incompatible_theme' using errcode = '23514'; end if;
  if tg_op = 'UPDATE' then
    if new.owner_id <> old.owner_id or new.route_id <> old.route_id then raise exception 'invitation_owner_and_route_immutable' using errcode = '42501'; end if;
    if (new.template_key, new.template_version) is distinct from (old.template_key, old.template_version) and old.status <> 'draft' then raise exception 'template_change_requires_draft' using errcode = '23514'; end if;
  end if;
  if new.status = 'published' and new.published_at is null then new.published_at = now(); end if;
  if new.status <> 'published' then new.published_at = null; end if;
  return new;
end $$;
create trigger invitations_enforce before insert or update on public.invitations for each row execute function public.enforce_invitation_rules();

create function public.claim_route_and_create_invitation(
  p_slug text, p_title text, p_template_key text, p_template_version integer,
  p_content_schema_version integer, p_theme_key text, p_theme_version integer, p_content jsonb
) returns public.invitations
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); normalized text := lower(btrim(p_slug)); new_route public.invitation_routes; result public.invitations;
begin
  if actor is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if normalized !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or public.is_reserved_slug(normalized) then raise exception 'invalid_slug' using errcode = '22023'; end if;
  if jsonb_typeof(p_content) <> 'object' then raise exception 'content_must_be_object' using errcode = '22023'; end if;
  insert into public.invitation_routes(owner_id, slug, assigned_by) values (actor, normalized, 'user') returning * into new_route;
  insert into public.invitations(owner_id, route_id, title, template_key, template_version, content_schema_version, theme_key, theme_version, content)
  values (actor, new_route.id, btrim(p_title), p_template_key, p_template_version, p_content_schema_version, p_theme_key, p_theme_version, p_content)
  returning * into result;
  return result;
end $$;

create function public.create_invitation_on_route(
  p_route_id uuid, p_title text, p_template_key text, p_template_version integer,
  p_content_schema_version integer, p_theme_key text, p_theme_version integer, p_content jsonb
) returns public.invitations
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); result public.invitations;
begin
  if actor is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not exists (select 1 from public.invitation_routes where id = p_route_id and owner_id = actor for update) then raise exception 'route_not_owned' using errcode = '42501'; end if;
  insert into public.invitations(owner_id, route_id, title, template_key, template_version, content_schema_version, theme_key, theme_version, content)
  values (actor, p_route_id, btrim(p_title), p_template_key, p_template_version, p_content_schema_version, p_theme_key, p_theme_version, p_content)
  returning * into result;
  return result;
end $$;

create function public.admin_preassign_route(p_owner_id uuid, p_slug text) returns public.invitation_routes
language plpgsql security definer set search_path = '' as $$
declare result public.invitation_routes; normalized text := lower(btrim(p_slug));
begin
  if not public.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if normalized !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or public.is_reserved_slug(normalized) then raise exception 'invalid_slug' using errcode = '22023'; end if;
  insert into public.invitation_routes(owner_id, slug, assigned_by) values (p_owner_id, normalized, 'admin') returning * into result;
  return result;
end $$;

create function public.admin_reassign_route(p_route_id uuid, p_slug text, p_confirm boolean) returns public.invitation_routes
language plpgsql security definer set search_path = '' as $$
declare result public.invitation_routes; normalized text := lower(btrim(p_slug));
begin
  if not public.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_confirm is not true then raise exception 'confirmation_required' using errcode = '22023'; end if;
  if normalized !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or public.is_reserved_slug(normalized) then raise exception 'invalid_slug' using errcode = '22023'; end if;
  update public.invitation_routes set slug = normalized where id = p_route_id returning * into result;
  if result.id is null then raise exception 'route_not_found' using errcode = 'P0002'; end if;
  return result;
end $$;

create function public.admin_set_route_quota(p_owner_id uuid, p_quota integer) returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare allocated integer; result public.profiles;
begin
  if not public.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_quota < 0 then raise exception 'invalid_quota' using errcode = '22023'; end if;
  select count(*) into allocated from public.invitation_routes where owner_id = p_owner_id;
  if p_quota < allocated then raise exception 'quota_below_allocated_routes' using errcode = '23514'; end if;
  update public.profiles set route_quota = p_quota where id = p_owner_id returning * into result;
  return result;
end $$;

create function public.get_published_invitation_by_slug(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'slug', r.slug,
    'invitation', jsonb_build_object(
      'id', i.id, 'ownerId', i.owner_id, 'routeId', i.route_id, 'title', i.title,
      'templateKey', i.template_key, 'templateVersion', i.template_version,
      'contentSchemaVersion', i.content_schema_version, 'themeKey', i.theme_key,
      'themeVersion', i.theme_version, 'status', i.status, 'content', i.content,
      'publishedAt', i.published_at, 'createdAt', i.created_at, 'updatedAt', i.updated_at
    ),
    'themeTokens', t.tokens,
    'mediaIds', coalesce((select jsonb_agg(m.id order by m.created_at) from public.invitation_media m where m.invitation_id = i.id and m.status = 'ready'), '[]'::jsonb)
  )
  from public.invitation_routes r
  join public.invitations i on i.route_id = r.id and i.status = 'published'
  join public.theme_catalog t on (t.key, t.version) = (i.theme_key, i.theme_version)
  where r.slug = lower(btrim(p_slug)) and lower(btrim(p_slug)) ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
$$;

alter table public.profiles enable row level security;
alter table public.invitation_routes enable row level security;
alter table public.template_catalog enable row level security;
alter table public.theme_catalog enable row level security;
alter table public.invitations enable row level security;
alter table public.invitation_media enable row level security;

create policy profiles_read_self_or_admin on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy routes_read_owner_or_admin on public.invitation_routes for select to authenticated using (owner_id = auth.uid() or public.is_admin());
create policy templates_read_active on public.template_catalog for select to anon, authenticated using (status = 'active');
create policy themes_read_active on public.theme_catalog for select to anon, authenticated using (status = 'active');
create policy invitations_read_owner on public.invitations for select to authenticated using (owner_id = auth.uid());
create policy invitations_update_owner on public.invitations for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy media_read_owner on public.invitation_media for select to authenticated using (owner_id = auth.uid());
create policy media_insert_owner on public.invitation_media for insert to authenticated with check (owner_id = auth.uid() and exists (select 1 from public.invitations i where i.id = invitation_id and i.owner_id = auth.uid()));
create policy media_update_owner on public.invitation_media for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy media_delete_owner on public.invitation_media for delete to authenticated using (owner_id = auth.uid());

revoke all on all tables in schema public from anon, authenticated;
grant select on public.template_catalog, public.theme_catalog to anon, authenticated;
grant select on public.profiles, public.invitation_routes, public.invitations, public.invitation_media to authenticated;
grant update (title, template_key, template_version, content_schema_version, theme_key, theme_version, status, content, published_at) on public.invitations to authenticated;
grant insert, update (storage_path, mime_type, size_bytes, alt_text, status), delete on public.invitation_media to authenticated;

revoke all on function public.claim_route_and_create_invitation(text,text,text,integer,integer,text,integer,jsonb) from public;
revoke all on function public.create_invitation_on_route(uuid,text,text,integer,integer,text,integer,jsonb) from public;
revoke all on function public.admin_preassign_route(uuid,text) from public;
revoke all on function public.admin_reassign_route(uuid,text,boolean) from public;
revoke all on function public.admin_set_route_quota(uuid,integer) from public;
revoke all on function public.get_published_invitation_by_slug(text) from public;
grant execute on function public.claim_route_and_create_invitation(text,text,text,integer,integer,text,integer,jsonb) to authenticated;
grant execute on function public.create_invitation_on_route(uuid,text,text,integer,integer,text,integer,jsonb) to authenticated;
grant execute on function public.admin_preassign_route(uuid,text) to authenticated;
grant execute on function public.admin_reassign_route(uuid,text,boolean) to authenticated;
grant execute on function public.admin_set_route_quota(uuid,integer) to authenticated;
grant execute on function public.get_published_invitation_by_slug(text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invitation-media', 'invitation-media', false, 10485760, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy invitation_media_object_read_owner on storage.objects for select to authenticated
using (bucket_id = 'invitation-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy invitation_media_object_insert_owner on storage.objects for insert to authenticated
with check (bucket_id = 'invitation-media' and (storage.foldername(name))[1] = auth.uid()::text and exists (
  select 1 from public.invitations i where i.id::text = (storage.foldername(name))[2] and i.owner_id = auth.uid()
));
create policy invitation_media_object_update_owner on storage.objects for update to authenticated
using (bucket_id = 'invitation-media' and owner_id = auth.uid()::text)
with check (bucket_id = 'invitation-media' and owner_id = auth.uid()::text);
create policy invitation_media_object_delete_owner on storage.objects for delete to authenticated
using (bucket_id = 'invitation-media' and owner_id = auth.uid()::text);

insert into public.template_catalog (key, version, name, description, thumbnail, active_content_schema_version, supported_sections) values
('elegant-gold',1,'Elegant Gold','Nuansa hangat dengan aksen emas dan tipografi klasik.','/templates/elegant-gold.svg',1,'["hero","couple","events","story","gift","closing"]'),
('minimal-white',1,'Minimal White','Tampilan bersih, lapang, dan modern dengan fokus pada informasi.','/templates/minimal-white.svg',1,'["hero","couple","events","story","gift","closing"]'),
('daztore-inv1',1,'Daztore Invitation 1','Tema pernikahan monokrom bernuansa klasik-Islami dengan cover interaktif, tipografi elegan, countdown, rangkaian acara, dan musik latar.','/templates/daztore-inv1/thumbnail.svg',1,'["cover","hero","couple","quote","events","story","gallery","gift","closing","audio","navigation"]');

insert into public.theme_catalog (key,version,template_key,template_version,name,description,is_default,tokens) values
('minimal-white-default',1,'minimal-white',1,'Putih Minimal','Tampilan asli Minimal White.',true,'{"background":"#f8faf7","surface":"#ffffff","text":"#16201d","mutedText":"#64706b","primary":"#16201d","accent":"#7e9d8e","border":"#cbd7d0"}'),
('minimal-white-sage',1,'minimal-white',1,'Sage Lembut','Palet sage lembut dengan struktur yang sama.',false,'{"background":"#eef3ec","surface":"#fbfdf9","text":"#23352c","mutedText":"#607068","primary":"#355f49","accent":"#88a994","border":"#b9cbbf"}'),
('elegant-gold-default',1,'elegant-gold',1,'Emas Klasik','Tampilan asli Elegant Gold.',true,'{"background":"#1c1712","surface":"#241e18","text":"#f7ecd5","mutedText":"#d9c9aa","primary":"#d3ad61","accent":"#a98847","border":"#7c653c"}'),
('elegant-gold-rose',1,'elegant-gold',1,'Rose Malam','Palet rose gelap tanpa perubahan struktur.',false,'{"background":"#24171c","surface":"#301f25","text":"#fae9ee","mutedText":"#d7bfc7","primary":"#dfa4b5","accent":"#b87589","border":"#805363"}'),
('daztore-inv1-default',1,'daztore-inv1',1,'Monokrom Klasik','Tampilan asli Daztore Invitation 1.',true,'{"background":"#f5f2ec","surface":"#fffdf9","text":"#242526","mutedText":"#706d68","primary":"#2f3133","accent":"#a9a39a","border":"#d8d3ca"}'),
('daztore-inv1-blue',1,'daztore-inv1',1,'Biru Teduh','Palet biru teduh dengan interaksi Daztore yang sama.',false,'{"background":"#edf2f5","surface":"#fbfdff","text":"#24313a","mutedText":"#63727d","primary":"#304b5c","accent":"#8ca9ba","border":"#c5d2d9"}');

commit;
