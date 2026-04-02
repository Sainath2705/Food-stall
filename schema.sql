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
  ('10000000-0000-0000-0000-000000000001', 'Drinks', 'drinks', 1),
  ('10000000-0000-0000-0000-000000000002', 'Snacks', 'snacks', 2)
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  sort_order = excluded.sort_order;

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
    'Tea',
    'tea',
    'Freshly brewed tea to kickstart your class break.',
    1000,
    'coffee',
    null,
    false,
    true,
    1,
    3
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'Coffee',
    'coffee',
    'Strong and hot, made for quick campus energy.',
    1500,
    'local_cafe',
    null,
    false,
    true,
    2,
    4
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    'Coke',
    'coke',
    'Ice-cold fizzy refreshment for the afternoon rush.',
    2000,
    'water_drop',
    null,
    false,
    true,
    3,
    1
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000002',
    'Maggi',
    'maggi',
    'The classic college comfort bowl. Hot, quick, and spicy.',
    3000,
    'ramen_dining',
    'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=1200&q=80',
    true,
    true,
    1,
    8
  ),
  (
    '20000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000002',
    'Omelette',
    'omelette',
    'Soft, hot omelette folded fresh on the tawa.',
    2500,
    'egg',
    null,
    false,
    true,
    2,
    6
  ),
  (
    '20000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000002',
    'Bread Omelette',
    'bread-omelette',
    'A loaded hostel favorite that eats like a full meal.',
    4000,
    'breakfast_dining',
    null,
    false,
    true,
    3,
    7
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
