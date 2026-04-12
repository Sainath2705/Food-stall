-- Run this script in the Supabase SQL Editor for your project.

create extension if not exists pgcrypto;

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text not null default '',
  price_paise integer not null check (price_paise >= 0),
  icon text not null default 'restaurant',
  image_url text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  prep_time_mins integer not null default 5,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  customer_name text not null,
  customer_phone text not null,
  notes text,
  subtotal_paise integer not null check (subtotal_paise >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'preparing', 'ready', 'completed')),
  payment_status text not null default 'created' check (payment_status in ('created', 'authorized', 'captured', 'failed', 'refunded')),
  estimated_ready_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  item_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_paise integer not null check (unit_price_paise >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  provider text not null default 'upi_qr',
  provider_order_id text,
  provider_payment_id text,
  signature text,
  amount_paise integer not null check (amount_paise >= 0),
  status text not null default 'created',
  raw_payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists menu_items_category_sort_order_idx
  on menu_items(category_id, sort_order, created_at);

create index if not exists orders_created_at_idx
  on orders(created_at desc);

create index if not exists order_items_order_created_at_idx
  on order_items(order_id, created_at asc);

create index if not exists payments_order_created_at_idx
  on payments(order_id, created_at desc);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at
before update on orders
for each row
execute function set_updated_at();

drop trigger if exists payments_set_updated_at on payments;
create trigger payments_set_updated_at
before update on payments
for each row
execute function set_updated_at();

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
  ((select id from drinks), 'Coke', 'coke', '', 2000, 'water_drop', 'https://images.pexels.com/photos/25291886/pexels-photo-25291886.jpeg?cs=srgb&dl=pexels-olenkabohovyk-25291886.jpg&fm=jpg', false, true, 1, 1),
  ((select id from snacks), 'Maggi', 'maggi', '', 3000, 'ramen_dining', 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=1200&q=80', false, true, 1, 8),
  ((select id from snacks), 'Single Egg Omelette', 'single-omelette', '', 2000, 'egg', 'https://tse1.mm.bing.net/th/id/OIP.hnWK7pz-awMn0-hbP0AU2QHaLH?pid=Api&P=0&h=180', false, true, 2, 6),
  ((select id from snacks), 'Double Egg Omelette', 'double-omelette', '', 3000, 'egg', 'https://www.indianhealthyrecipes.com/wp-content/uploads/2024/06/egg-oats-omelette.jpg', false, true, 3, 7),
  ((select id from snacks), 'Bread Omelette', 'bread-omelette', '', 4000, 'breakfast_dining', 'https://tse4.mm.bing.net/th/id/OIP.dAAXxm2FVTAOBgcDqnyOLAHaHa?pid=Api&P=0&h=180', true, true, 4, 7),
  ((select id from snacks), 'Vada Pav', 'vada-pav', '', 2000, 'lunch_dining', 'https://tse1.mm.bing.net/th/id/OIP.rYFnUL1PfPfAjDiV6r2yWgHaHa?pid=Api&P=0&h=180', false, true, 5, 4),
  ((select id from snacks), 'Samosa', 'samosa', '', 2000, 'bakery_dining', 'https://tse1.mm.bing.net/th/id/OIP.gzfLita-jg6Uhv0TfA8RZgHaHa?pid=Api&P=0&h=180', false, true, 6, 3),
  ((select id from snacks), 'Veg Sandwich', 'veg-sandwich', '', 3000, 'breakfast_dining', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1200&q=80', false, true, 7, 5)
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
