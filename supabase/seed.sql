insert into categories (name, slug, sort_order)
values
  ('Drinks', 'drinks', 1),
  ('Snacks', 'snacks', 2)
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order;

with drinks as (
  select id from categories where slug = 'drinks'
),
snacks as (
  select id from categories where slug = 'snacks'
)
insert into menu_items (
  category_id,
  name,
  slug,
  description,
  price_paise,
  icon,
  image_url,
  is_featured,
  is_active,
  sort_order,
  prep_time_mins
)
values
  ((select id from drinks), 'Tea', 'tea', 'Freshly brewed tea to kickstart your class break.', 1000, 'coffee', null, false, true, 1, 3),
  ((select id from drinks), 'Coffee', 'coffee', 'Strong and hot, made for quick campus energy.', 1500, 'local_cafe', null, false, true, 2, 4),
  ((select id from drinks), 'Coke', 'coke', 'Ice-cold fizzy refreshment for the afternoon rush.', 2000, 'water_drop', null, false, true, 3, 1),
  ((select id from snacks), 'Maggi', 'maggi', 'The classic college comfort bowl. Hot, quick, and spicy.', 3000, 'ramen_dining', 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=1200&q=80', true, true, 1, 8),
  ((select id from snacks), 'Omelette', 'omelette', 'Soft, hot omelette folded fresh on the tawa.', 2500, 'egg', null, false, true, 2, 6),
  ((select id from snacks), 'Bread Omelette', 'bread-omelette', 'A loaded hostel favorite that eats like a full meal.', 4000, 'breakfast_dining', null, false, true, 3, 7)
on conflict (slug) do update
set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  price_paise = excluded.price_paise,
  icon = excluded.icon,
  image_url = excluded.image_url,
  is_featured = excluded.is_featured,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  prep_time_mins = excluded.prep_time_mins;
