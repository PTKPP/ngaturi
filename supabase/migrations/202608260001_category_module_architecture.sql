begin;

create table public.category_catalog (
  key text not null check (key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  version integer not null check (version > 0),
  name text not null,
  status public.catalog_status not null default 'active',
  required_modules jsonb not null check (jsonb_typeof(required_modules) = 'array'),
  capabilities jsonb not null check (jsonb_typeof(capabilities) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (key, version)
);

create trigger categories_touch before update on public.category_catalog for each row execute function public.touch_updated_at();

insert into public.category_catalog (key, version, name, required_modules, capabilities) values
('wedding',1,'Pernikahan','["cover","couple-profile","event","closing"]','{"cover":"required","greeting":"default","couple-profile":"required","child-profile":"unsupported","parents":"optional","quote":"default","event":"required","countdown":"default","love-story":"default","birth-info":"unsupported","speaker":"unsupported","agenda":"unsupported","gallery":"default","video":"optional","rsvp":"optional","gift":"optional","wishes":"optional","maps":"default","qr-check-in":"optional","livestream":"optional","closing":"required"}'),
('khitan',1,'Khitan','["cover","child-profile","event","closing"]','{"cover":"required","greeting":"default","couple-profile":"unsupported","child-profile":"required","parents":"default","quote":"default","event":"required","countdown":"default","love-story":"unsupported","birth-info":"unsupported","speaker":"unsupported","agenda":"unsupported","gallery":"default","video":"optional","rsvp":"optional","gift":"optional","wishes":"optional","maps":"default","qr-check-in":"optional","livestream":"optional","closing":"required"}'),
('aqiqah',1,'Aqiqah','["cover","child-profile","birth-info","event","closing"]','{"cover":"required","greeting":"default","couple-profile":"unsupported","child-profile":"required","parents":"default","quote":"default","event":"required","countdown":"optional","love-story":"unsupported","birth-info":"required","speaker":"unsupported","agenda":"unsupported","gallery":"default","video":"optional","rsvp":"optional","gift":"optional","wishes":"optional","maps":"default","qr-check-in":"optional","livestream":"optional","closing":"required"}'),
('birthday',1,'Ulang Tahun','["cover","event","closing"]','{"cover":"required","greeting":"default","couple-profile":"unsupported","child-profile":"optional","parents":"optional","quote":"optional","event":"required","countdown":"default","love-story":"unsupported","birth-info":"unsupported","speaker":"unsupported","agenda":"unsupported","gallery":"default","video":"optional","rsvp":"optional","gift":"optional","wishes":"optional","maps":"default","qr-check-in":"optional","livestream":"optional","closing":"required"}'),
('corporate',1,'Korporat','["cover","event","closing"]','{"cover":"required","greeting":"default","couple-profile":"unsupported","child-profile":"unsupported","parents":"unsupported","quote":"unsupported","event":"required","countdown":"optional","love-story":"unsupported","birth-info":"unsupported","speaker":"default","agenda":"default","gallery":"optional","video":"optional","rsvp":"optional","gift":"unsupported","wishes":"optional","maps":"default","qr-check-in":"optional","livestream":"optional","closing":"required"}');

alter table public.template_catalog
  add column category_key text,
  add column category_version integer,
  add column theme_schema_version integer,
  add column supported_modules jsonb,
  add column required_modules jsonb,
  add column optional_modules jsonb,
  add column default_enabled_modules jsonb,
  add column sections jsonb;

update public.template_catalog set
  category_key = 'wedding', category_version = 1, theme_schema_version = 1,
  active_content_schema_version = 2,
  supported_modules = case key
    when 'daztore-inv1' then '["cover","greeting","couple-profile","quote","event","countdown","love-story","gallery","gift","maps","closing"]'::jsonb
    else '["cover","greeting","couple-profile","quote","event","love-story","gift","closing"]'::jsonb end,
  required_modules = '["cover","couple-profile","event","closing"]'::jsonb,
  optional_modules = '["gift"]'::jsonb,
  default_enabled_modules = case key
    when 'daztore-inv1' then '["greeting","quote","countdown","love-story","gallery","maps"]'::jsonb
    else '["greeting","quote","love-story"]'::jsonb end,
  sections = case key
    when 'minimal-white' then '[{"id":"hero","moduleId":"cover","renderer":"minimal-hero"},{"id":"greeting","moduleId":"greeting","renderer":"minimal-greeting"},{"id":"couple","moduleId":"couple-profile","renderer":"minimal-couple"},{"id":"quote","moduleId":"quote","renderer":"minimal-quote"},{"id":"events","moduleId":"event","renderer":"minimal-events"},{"id":"story","moduleId":"love-story","renderer":"minimal-story"},{"id":"gift","moduleId":"gift","renderer":"minimal-gift"},{"id":"closing","moduleId":"closing","renderer":"minimal-closing"}]'::jsonb
    when 'elegant-gold' then '[{"id":"hero","moduleId":"cover","renderer":"gold-hero"},{"id":"greeting","moduleId":"greeting","renderer":"gold-greeting"},{"id":"couple","moduleId":"couple-profile","renderer":"gold-couple"},{"id":"quote","moduleId":"quote","renderer":"gold-quote"},{"id":"events","moduleId":"event","renderer":"gold-events"},{"id":"story","moduleId":"love-story","renderer":"gold-story"},{"id":"gift","moduleId":"gift","renderer":"gold-gift"},{"id":"closing","moduleId":"closing","renderer":"gold-closing"}]'::jsonb
    else '[{"id":"cover","moduleId":"cover","renderer":"daztore-cover"},{"id":"greeting","moduleId":"greeting","renderer":"daztore-greeting"},{"id":"couple","moduleId":"couple-profile","renderer":"daztore-couple"},{"id":"quote","moduleId":"quote","renderer":"daztore-quote"},{"id":"events","moduleId":"event","renderer":"daztore-events"},{"id":"countdown","moduleId":"countdown","renderer":"daztore-countdown"},{"id":"story","moduleId":"love-story","renderer":"daztore-story"},{"id":"gallery","moduleId":"gallery","renderer":"daztore-gallery"},{"id":"gift","moduleId":"gift","renderer":"daztore-gift"},{"id":"maps","moduleId":"maps","renderer":"daztore-maps"},{"id":"closing","moduleId":"closing","renderer":"daztore-closing"}]'::jsonb end;

update public.template_catalog set description = 'Template pernikahan monokrom bernuansa klasik-Islami dengan cover interaktif, tipografi elegan, countdown, rangkaian acara, dan musik latar.' where key = 'daztore-inv1' and version = 1;

alter table public.template_catalog
  alter column category_key set not null,
  alter column category_version set not null,
  alter column theme_schema_version set not null,
  alter column supported_modules set not null,
  alter column required_modules set not null,
  alter column optional_modules set not null,
  alter column default_enabled_modules set not null,
  alter column sections set not null,
  add constraint template_catalog_category_fk foreign key (category_key, category_version) references public.category_catalog(key, version) on update cascade on delete restrict,
  add constraint template_catalog_supported_modules_array check (jsonb_typeof(supported_modules) = 'array'),
  add constraint template_catalog_required_modules_array check (jsonb_typeof(required_modules) = 'array'),
  add constraint template_catalog_optional_modules_array check (jsonb_typeof(optional_modules) = 'array'),
  add constraint template_catalog_default_modules_array check (jsonb_typeof(default_enabled_modules) = 'array'),
  add constraint template_catalog_sections_array check (jsonb_typeof(sections) = 'array'),
  add constraint template_catalog_category_unique unique (key, version, category_key, category_version);

update public.theme_catalog set tokens = tokens || case key
  when 'minimal-white-default' then '{"headingFont":"inter","bodyFont":"inter","ornament":"minimal-line","backgroundPattern":"none","borderStyle":"soft"}'::jsonb
  when 'minimal-white-sage' then '{"headingFont":"inter","bodyFont":"inter","ornament":"minimal-line","backgroundPattern":"paper-soft","borderStyle":"soft"}'::jsonb
  when 'elegant-gold-default' then '{"headingFont":"cormorant-garamond","bodyFont":"inter","ornament":"classic-gold","backgroundPattern":"dark-grain","borderStyle":"classic"}'::jsonb
  when 'elegant-gold-rose' then '{"headingFont":"cormorant-garamond","bodyFont":"inter","ornament":"classic-gold","backgroundPattern":"dark-grain","borderStyle":"classic"}'::jsonb
  when 'daztore-inv1-default' then '{"headingFont":"cormorant-garamond","bodyFont":"josefin-sans","ornament":"islamic-arch","backgroundPattern":"mosque-soft","borderStyle":"classic"}'::jsonb
  when 'daztore-inv1-blue' then '{"headingFont":"cormorant-garamond","bodyFont":"josefin-sans","ornament":"islamic-arch","backgroundPattern":"mosque-soft","borderStyle":"classic"}'::jsonb
  else '{}'::jsonb end;

alter table public.invitations
  add column category_key text,
  add column category_version integer,
  add column theme_overrides jsonb not null default '{}'::jsonb check (jsonb_typeof(theme_overrides) = 'object'),
  add constraint invitation_theme_override_keys_safe check ((theme_overrides - array['background','surface','text','mutedText','primary','accent','border','headingFont','bodyFont','ornament','backgroundPattern','borderStyle']::text[]) = '{}'::jsonb),
  add constraint invitation_theme_override_colors_safe check (
    (not theme_overrides ? 'background' or theme_overrides ->> 'background' ~ '^#[0-9A-Fa-f]{6}$') and
    (not theme_overrides ? 'surface' or theme_overrides ->> 'surface' ~ '^#[0-9A-Fa-f]{6}$') and
    (not theme_overrides ? 'text' or theme_overrides ->> 'text' ~ '^#[0-9A-Fa-f]{6}$') and
    (not theme_overrides ? 'mutedText' or theme_overrides ->> 'mutedText' ~ '^#[0-9A-Fa-f]{6}$') and
    (not theme_overrides ? 'primary' or theme_overrides ->> 'primary' ~ '^#[0-9A-Fa-f]{6}$') and
    (not theme_overrides ? 'accent' or theme_overrides ->> 'accent' ~ '^#[0-9A-Fa-f]{6}$') and
    (not theme_overrides ? 'border' or theme_overrides ->> 'border' ~ '^#[0-9A-Fa-f]{6}$')
  ),
  add constraint invitation_theme_override_references_safe check (
    (not theme_overrides ? 'headingFont' or theme_overrides ->> 'headingFont' = any (array['inter','cormorant-garamond','josefin-sans','sacramento','noto-naskh-arabic'])) and
    (not theme_overrides ? 'bodyFont' or theme_overrides ->> 'bodyFont' = any (array['inter','cormorant-garamond','josefin-sans','sacramento','noto-naskh-arabic'])) and
    (not theme_overrides ? 'ornament' or theme_overrides ->> 'ornament' = any (array['none','minimal-line','classic-gold','islamic-arch'])) and
    (not theme_overrides ? 'backgroundPattern' or theme_overrides ->> 'backgroundPattern' = any (array['none','paper-soft','dark-grain','mosque-soft'])) and
    (not theme_overrides ? 'borderStyle' or theme_overrides ->> 'borderStyle' = any (array['none','soft','classic']))
  );

update public.invitations i set category_key = t.category_key, category_version = t.category_version
from public.template_catalog t where (t.key, t.version) = (i.template_key, i.template_version);

alter table public.invitations
  alter column category_key set not null,
  alter column category_version set not null,
  add constraint invitations_category_fk foreign key (category_key, category_version) references public.category_catalog(key, version) on update cascade on delete restrict,
  add constraint invitations_template_category_fk foreign key (template_key, template_version, category_key, category_version) references public.template_catalog(key, version, category_key, category_version) on update cascade on delete restrict;

create or replace function public.enforce_invitation_rules() returns trigger language plpgsql set search_path = '' as $$
declare active_version integer; template_status public.catalog_status; theme_status public.catalog_status; template_category_key text; template_category_version integer;
begin
  select active_content_schema_version, status, category_key, category_version into active_version, template_status, template_category_key, template_category_version
  from public.template_catalog where key = new.template_key and version = new.template_version;
  if template_status is distinct from 'active' then raise exception 'inactive_template' using errcode = '23514'; end if;
  if new.category_key is null then new.category_key = template_category_key; end if;
  if new.category_version is null then new.category_version = template_category_version; end if;
  if (new.category_key, new.category_version) is distinct from (template_category_key, template_category_version) then raise exception 'template_category_mismatch' using errcode = '23514'; end if;
  if tg_op = 'INSERT' or new.content is distinct from old.content or new.content_schema_version is distinct from old.content_schema_version or (new.template_key, new.template_version) is distinct from (old.template_key, old.template_version) or (new.status = 'published' and old.status <> 'published') then
    if active_version <> new.content_schema_version then raise exception 'inactive_template_or_content_version' using errcode = '23514'; end if;
  end if;
  select status into theme_status from public.theme_catalog where key = new.theme_key and version = new.theme_version and template_key = new.template_key and template_version = new.template_version;
  if theme_status is distinct from 'active' then raise exception 'inactive_or_incompatible_theme' using errcode = '23514'; end if;
  if jsonb_typeof(new.theme_overrides) <> 'object' then raise exception 'theme_overrides_must_be_object' using errcode = '22023'; end if;
  if tg_op = 'UPDATE' then
    if new.owner_id <> old.owner_id or new.route_id <> old.route_id then raise exception 'invitation_owner_and_route_immutable' using errcode = '42501'; end if;
    if (new.template_key, new.template_version) is distinct from (old.template_key, old.template_version) and old.status <> 'draft' then raise exception 'template_change_requires_draft' using errcode = '23514'; end if;
    if (new.category_key, new.category_version) is distinct from (old.category_key, old.category_version) then raise exception 'invitation_category_immutable' using errcode = '23514'; end if;
  end if;
  if new.status = 'published' and new.published_at is null then new.published_at = now(); end if;
  if new.status <> 'published' then new.published_at = null; end if;
  return new;
end $$;

create or replace function public.get_published_invitation_by_slug(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'slug', r.slug,
    'invitation', jsonb_build_object(
      'id', i.id, 'ownerId', i.owner_id, 'routeId', i.route_id, 'title', i.title,
      'categoryKey', i.category_key, 'categoryVersion', i.category_version,
      'templateKey', i.template_key, 'templateVersion', i.template_version,
      'contentSchemaVersion', i.content_schema_version, 'themeKey', i.theme_key,
      'themeVersion', i.theme_version, 'themeOverrides', i.theme_overrides,
      'status', i.status, 'content', i.content,
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

alter table public.category_catalog enable row level security;
create policy categories_read_active on public.category_catalog for select to anon, authenticated using (status = 'active');
revoke all on public.category_catalog from anon, authenticated;
grant select on public.category_catalog to anon, authenticated;
grant update (title, category_key, category_version, template_key, template_version, content_schema_version, theme_key, theme_version, theme_overrides, status, content, published_at) on public.invitations to authenticated;

commit;
