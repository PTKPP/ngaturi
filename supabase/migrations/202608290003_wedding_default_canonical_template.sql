begin;

-- This is the final pre-production canonical rename. Existing invitations are
-- migrated by the catalog foreign keys; content JSON and media references are
-- intentionally untouched.
lock table public.template_catalog, public.theme_catalog, public.invitations in access exclusive mode;

do $$
begin
  if exists (select 1 from public.template_catalog where key = 'wedding-default' and version = 1) then
    raise exception 'wedding_default_catalog_collision' using errcode = '23505';
  end if;
  if not exists (select 1 from public.template_catalog where key = 'daztore-inv1' and version = 1) then
    raise exception 'legacy_daztore_template_missing' using errcode = '23514';
  end if;
end
$$;

-- The cascade is a controlled identifier migration, including published rows.
-- Disable only the invitation rule/touch triggers while the tables are locked;
-- constraints stay enabled and invitation updated_at values stay unchanged.
alter table public.invitations disable trigger invitations_enforce;
alter table public.invitations disable trigger invitations_touch;

update public.template_catalog
set key = 'wedding-default',
    name = 'Wedding Default',
    description = 'Template pernikahan monokrom bernuansa klasik-Islami dengan cover interaktif, tipografi elegan, countdown, rangkaian acara, dan musik latar.',
    thumbnail = '/templates/wedding-default/thumbnail.svg',
    active_content_schema_version = 2,
    theme_schema_version = 1,
    supported_modules = '["cover","greeting","couple-profile","quote","event","countdown","love-story","gallery","video","rsvp","gift","wishes","maps","music","closing"]'::jsonb,
    required_modules = '["cover","couple-profile","event","closing"]'::jsonb,
    optional_modules = '["video","rsvp","gift","wishes"]'::jsonb,
    default_enabled_modules = '["greeting","quote","countdown","love-story","gallery","maps","music"]'::jsonb,
    sections = '[{"id":"cover","moduleId":"cover","renderer":"wedding-default-cover"},{"id":"greeting","moduleId":"greeting","renderer":"wedding-default-greeting"},{"id":"couple","moduleId":"couple-profile","renderer":"wedding-default-couple"},{"id":"quote","moduleId":"quote","renderer":"wedding-default-quote"},{"id":"events","moduleId":"event","renderer":"wedding-default-events"},{"id":"countdown","moduleId":"countdown","renderer":"wedding-default-countdown"},{"id":"story","moduleId":"love-story","renderer":"wedding-default-story"},{"id":"gallery","moduleId":"gallery","renderer":"wedding-default-gallery"},{"id":"video","moduleId":"video","renderer":"wedding-default-video"},{"id":"rsvp","moduleId":"rsvp","renderer":"wedding-default-rsvp"},{"id":"gift","moduleId":"gift","renderer":"wedding-default-gift"},{"id":"wishes","moduleId":"wishes","renderer":"wedding-default-wishes"},{"id":"maps","moduleId":"maps","renderer":"wedding-default-maps"},{"id":"closing","moduleId":"closing","renderer":"wedding-default-closing"}]'::jsonb,
    supported_sections = '["cover","greeting","couple","quote","events","countdown","story","gallery","video","rsvp","gift","wishes","maps","closing","navigation"]'::jsonb
where key = 'daztore-inv1' and version = 1;

update public.theme_catalog
set key = 'wedding-default-default',
    name = 'Monokrom Klasik',
    description = 'Tampilan default Wedding Default.'
where key = 'daztore-inv1-default' and version = 1;

update public.theme_catalog
set key = 'wedding-default-blue',
    name = 'Biru Teduh',
    description = 'Palet biru teduh dengan struktur Wedding Default yang sama.'
where key = 'daztore-inv1-blue' and version = 1;

alter table public.invitations enable trigger invitations_touch;
alter table public.invitations enable trigger invitations_enforce;

do $$
begin
  if exists (select 1 from public.template_catalog where key = 'daztore-inv1')
     or exists (select 1 from public.theme_catalog where template_key = 'daztore-inv1' or key in ('daztore-inv1-default', 'daztore-inv1-blue'))
     or exists (select 1 from public.invitations where template_key = 'daztore-inv1' or theme_key in ('daztore-inv1-default', 'daztore-inv1-blue')) then
    raise exception 'legacy_daztore_identifier_remains' using errcode = '23514';
  end if;
  if not exists (select 1 from public.template_catalog where key = 'wedding-default' and version = 1)
     or not exists (select 1 from public.theme_catalog where key = 'wedding-default-default' and version = 1 and template_key = 'wedding-default' and template_version = 1)
     or not exists (select 1 from public.theme_catalog where key = 'wedding-default-blue' and version = 1 and template_key = 'wedding-default' and template_version = 1) then
    raise exception 'wedding_default_catalog_incomplete' using errcode = '23514';
  end if;
end
$$;

commit;
