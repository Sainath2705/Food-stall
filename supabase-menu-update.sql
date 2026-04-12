update menu_items
set description = ''
where is_active = true;

update menu_items
set is_active = false
where slug in ('tea', 'coffee');

update menu_items
set
  name = 'Coke',
  slug = 'coke',
  description = '',
  image_url = 'https://images.pexels.com/photos/25291886/pexels-photo-25291886.jpeg?cs=srgb&dl=pexels-olenkabohovyk-25291886.jpg&fm=jpg',
  price_paise = 2000,
  is_featured = false,
  sort_order = 1
where slug = 'coke';

update menu_items
set
  name = 'Maggi',
  description = '',
  image_url = 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=1200&q=80',
  price_paise = 3000,
  is_featured = false,
  sort_order = 1
where slug = 'maggi';

update menu_items
set
  name = 'Single Egg Omelette',
  slug = 'single-omelette',
  description = '',
  image_url = 'https://tse1.mm.bing.net/th/id/OIP.hnWK7pz-awMn0-hbP0AU2QHaLH?pid=Api&P=0&h=180',
  price_paise = 2000,
  is_featured = false,
  sort_order = 2
where slug in ('omelette', 'single-omelette');

update menu_items
set
  name = 'Double Egg Omelette',
  slug = 'double-omelette',
  description = '',
  image_url = 'https://www.indianhealthyrecipes.com/wp-content/uploads/2024/06/egg-oats-omelette.jpg',
  price_paise = 3000,
  is_featured = false,
  sort_order = 3
where slug = 'double-omelette';

update menu_items
set
  name = 'Bread Omelette',
  slug = 'bread-omelette',
  description = '',
  image_url = 'https://tse4.mm.bing.net/th/id/OIP.dAAXxm2FVTAOBgcDqnyOLAHaHa?pid=Api&P=0&h=180',
  price_paise = 4000,
  is_featured = true,
  sort_order = 4
where slug = 'bread-omelette';

insert into menu_items (
  category_id, name, slug, description, price_paise, icon, image_url,
  is_featured, is_active, sort_order, prep_time_mins
)
select id, 'Double Egg Omelette', 'double-omelette', '', 3000, 'egg',
'https://www.indianhealthyrecipes.com/wp-content/uploads/2024/06/egg-oats-omelette.jpg',
false, true, 3, 7
from categories
where slug = 'snacks'
and not exists (select 1 from menu_items where slug = 'double-omelette');

insert into menu_items (
  category_id, name, slug, description, price_paise, icon, image_url,
  is_featured, is_active, sort_order, prep_time_mins
)
select id, 'Vada Pav', 'vada-pav', '', 2000, 'lunch_dining',
'https://tse1.mm.bing.net/th/id/OIP.rYFnUL1PfPfAjDiV6r2yWgHaHa?pid=Api&P=0&h=180',
false, true, 5, 4
from categories
where slug = 'snacks'
and not exists (select 1 from menu_items where slug = 'vada-pav');

insert into menu_items (
  category_id, name, slug, description, price_paise, icon, image_url,
  is_featured, is_active, sort_order, prep_time_mins
)
select id, 'Samosa', 'samosa', '', 2000, 'bakery_dining',
'https://tse1.mm.bing.net/th/id/OIP.gzfLita-jg6Uhv0TfA8RZgHaHa?pid=Api&P=0&h=180',
false, true, 6, 3
from categories
where slug = 'snacks'
and not exists (select 1 from menu_items where slug = 'samosa');

insert into menu_items (
  category_id, name, slug, description, price_paise, icon, image_url,
  is_featured, is_active, sort_order, prep_time_mins
)
select id, 'Veg Sandwich', 'veg-sandwich', '', 3000, 'breakfast_dining',
'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1200&q=80',
false, true, 7, 5
from categories
where slug = 'snacks'
and not exists (select 1 from menu_items where slug = 'veg-sandwich');

update menu_items
set description = ''
where slug in ('double-omelette', 'vada-pav', 'samosa', 'veg-sandwich');
