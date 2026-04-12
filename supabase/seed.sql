insert into categories (name, slug, sort_order)
values
  ('Cool Drinks', 'drinks', 1),
  ('Snacks', 'snacks', 2)
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order;

update menu_items
set is_active = false
where slug in ('tea', 'coffee', 'omelette');

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
  (
    (select id from drinks),
    'Coke',
    'coke',
    '',
    2000,
    'water_drop',
    'https://images.pexels.com/photos/25291886/pexels-photo-25291886.jpeg?cs=srgb&dl=pexels-olenkabohovyk-25291886.jpg&fm=jpg',
    false,
    true,
    1,
    1
  ),
  (
    (select id from snacks),
    'Maggi',
    'maggi',
    '',
    3000,
    'ramen_dining',
    'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=1200&q=80',
    false,
    true,
    1,
    8
  ),
  (
    (select id from snacks),
    'Single Egg Omelette',
    'single-omelette',
    '',
    2000,
    'egg',
    'https://tse1.mm.bing.net/th/id/OIP.hnWK7pz-awMn0-hbP0AU2QHaLH?pid=Api&P=0&h=180',
    false,
    true,
    2,
    6
  ),
  (
    (select id from snacks),
    'Double Egg Omelette',
    'double-omelette',
    '',
    3000,
    'egg',
    'https://www.indianhealthyrecipes.com/wp-content/uploads/2024/06/egg-oats-omelette.jpg',
    false,
    true,
    3,
    7
  ),
  (
    (select id from snacks),
    'Bread Omelette',
    'bread-omelette',
    '',
    4000,
    'breakfast_dining',
    'https://tse4.mm.bing.net/th/id/OIP.dAAXxm2FVTAOBgcDqnyOLAHaHa?pid=Api&P=0&h=180',
    true,
    true,
    4,
    7
  ),
  (
    (select id from snacks),
    'Vada Pav',
    'vada-pav',
    '',
    2000,
    'lunch_dining',
    'https://tse1.mm.bing.net/th/id/OIP.rYFnUL1PfPfAjDiV6r2yWgHaHa?pid=Api&P=0&h=180',
    false,
    true,
    5,
    4
  ),
  (
    (select id from snacks),
    'Samosa',
    'samosa',
    '',
    2000,
    'bakery_dining',
    'https://tse1.mm.bing.net/th/id/OIP.gzfLita-jg6Uhv0TfA8RZgHaHa?pid=Api&P=0&h=180',
    false,
    true,
    6,
    3
  ),
  (
    (select id from snacks),
    'Veg Sandwich',
    'veg-sandwich',
    '',
    3000,
    'breakfast_dining',
    'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1200&q=80',
    false,
    true,
    7,
    5
  )
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
