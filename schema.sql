create extension if not exists pgcrypto;

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  price_paise integer not null check (price_paise >= 0),
  icon text,
  image_url text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  prep_time_mins integer not null default 5 check (prep_time_mins >= 1),
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  customer_name text not null,
  customer_phone text not null,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'preparing', 'ready', 'completed')),
  payment_status text not null default 'created'
    check (payment_status in ('created', 'authorized', 'captured', 'failed')),
  subtotal_paise integer not null check (subtotal_paise >= 0),
  estimated_ready_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  item_name text not null,
  quantity integer not null check (quantity >= 1),
  unit_price_paise integer not null check (unit_price_paise >= 0),
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  provider text not null,
  amount_paise integer not null check (amount_paise >= 0),
  status text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_categories_sort_order on categories(sort_order);
create index if not exists idx_menu_items_category_sort on menu_items(category_id, sort_order);
create index if not exists idx_orders_created_at on orders(created_at desc);
create index if not exists idx_order_items_order_id on order_items(order_id);
create index if not exists idx_payments_order_id on payments(order_id, created_at desc);

insert into categories (id, name, slug, sort_order)
values
  ('10000000-0000-0000-0000-000000000001', 'Cool Drinks', 'drinks', 1),
  ('10000000-0000-0000-0000-000000000002', 'Snacks', 'snacks', 2)
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  sort_order = excluded.sort_order;

update menu_items
set is_active = false
where slug in ('tea', 'coffee', 'omelette');

insert into menu_items (
  id,
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
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
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
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'Maggi',
    'maggi',
    '',
    3000,
    'ramen_dining',
    'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=1200&q=80',
    false,
    true,
    2,
    8
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000002',
    'Single Egg Omelette',
    'single-omelette',
    '',
    2000,
    'egg',
    'https://tse1.mm.bing.net/th/id/OIP.hnWK7pz-awMn0-hbP0AU2QHaLH?pid=Api&P=0&h=180',
    false,
    true,
    3,
    6
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000002',
    'Double Egg Omelette',
    'double-omelette',
    '',
    3000,
    'egg',
    'https://www.indianhealthyrecipes.com/wp-content/uploads/2024/06/egg-oats-omelette.jpg',
    false,
    true,
    4,
    7
  ),
  (
    '20000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000002',
    'Bread Omelette',
    'bread-omelette',
    '',
    4000,
    'breakfast_dining',
    'https://tse4.mm.bing.net/th/id/OIP.dAAXxm2FVTAOBgcDqnyOLAHaHa?pid=Api&P=0&h=180',
    true,
    true,
    5,
    7
  ),
  (
    '20000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000002',
    'Vada Pav',
    'vada-pav',
    '',
    2000,
    'lunch_dining',
    'https://tse1.mm.bing.net/th/id/OIP.rYFnUL1PfPfAjDiV6r2yWgHaHa?pid=Api&P=0&h=180',
    false,
    true,
    6,
    4
  ),
  (
    '20000000-0000-0000-0000-000000000007',
    '10000000-0000-0000-0000-000000000002',
    'Samosa',
    'samosa',
    '',
    2000,
    'bakery_dining',
    'https://tse1.mm.bing.net/th/id/OIP.gzfLita-jg6Uhv0TfA8RZgHaHa?pid=Api&P=0&h=180',
    false,
    true,
    7,
    3
  ),
  (
    '20000000-0000-0000-0000-000000000008',
    '10000000-0000-0000-0000-000000000002',
    'Veg Sandwich',
    'veg-sandwich',
    '',
    3000,
    'breakfast_dining',
    'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1200&q=80',
    false,
    true,
    8,
    5
  )
on conflict (id) do update
set
  category_id = excluded.category_id,
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  price_paise = excluded.price_paise,
  icon = excluded.icon,
  image_url = excluded.image_url,
  is_featured = excluded.is_featured,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  prep_time_mins = excluded.prep_time_mins;
