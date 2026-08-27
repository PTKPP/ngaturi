begin;

update public.category_catalog
set capabilities = jsonb_set(capabilities, '{music}', case when key = 'wedding' then '"default"'::jsonb else '"optional"'::jsonb, true)
where version = 1 and key in ('wedding', 'khitan', 'aqiqah', 'birthday', 'corporate');

update public.template_catalog
set
  supported_modules = case key
    when 'daztore-inv1' then '["cover","greeting","couple-profile","quote","event","countdown","love-story","gallery","video","rsvp","gift","wishes","maps","music","closing"]'::jsonb
    else '["cover","greeting","couple-profile","quote","event","love-story","gift","music","closing"]'::jsonb
  end,
  optional_modules = case key
    when 'daztore-inv1' then '["video","rsvp","gift","wishes"]'::jsonb
    else '["gift"]'::jsonb
  end,
  default_enabled_modules = case key
    when 'daztore-inv1' then '["greeting","quote","countdown","love-story","gallery","maps","music"]'::jsonb
    else '["greeting","quote","love-story","music"]'::jsonb
  end,
  sections = case key
    when 'daztore-inv1' then '[{"id":"cover","moduleId":"cover","renderer":"daztore-cover"},{"id":"greeting","moduleId":"greeting","renderer":"daztore-greeting"},{"id":"couple","moduleId":"couple-profile","renderer":"daztore-couple"},{"id":"quote","moduleId":"quote","renderer":"daztore-quote"},{"id":"events","moduleId":"event","renderer":"daztore-events"},{"id":"countdown","moduleId":"countdown","renderer":"daztore-countdown"},{"id":"story","moduleId":"love-story","renderer":"daztore-story"},{"id":"gallery","moduleId":"gallery","renderer":"daztore-gallery"},{"id":"video","moduleId":"video","renderer":"daztore-video"},{"id":"rsvp","moduleId":"rsvp","renderer":"daztore-rsvp"},{"id":"gift","moduleId":"gift","renderer":"daztore-gift"},{"id":"wishes","moduleId":"wishes","renderer":"daztore-wishes"},{"id":"maps","moduleId":"maps","renderer":"daztore-maps"},{"id":"closing","moduleId":"closing","renderer":"daztore-closing"}]'::jsonb
    else sections
  end,
  supported_sections = case key
    when 'daztore-inv1' then '["cover","greeting","couple","quote","events","countdown","story","gallery","video","rsvp","gift","wishes","maps","closing","navigation"]'::jsonb
    else supported_sections
  end
where version = 1 and key in ('minimal-white', 'elegant-gold', 'daztore-inv1');

commit;
