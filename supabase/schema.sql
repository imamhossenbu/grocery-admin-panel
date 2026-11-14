-- ============================================================================
-- FreshBasket — PostgreSQL schema (shared by `grocery-store` and
-- `grocery-admin-panel`; the same file lives in both repos).
--
-- Run this ONCE in Supabase Dashboard → SQL Editor. It is safe to re-run.
-- After it succeeds, run `npm run db:migrate` in grocery-store to copy the
-- existing catalog and orders into these tables.
--
-- Security model: Row Level Security is ON for every table. The public
-- (publishable) key can only READ the catalog and approved reviews. Orders,
-- coupons, profiles and messages are reachable only from server code that
-- holds the secret key.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists categories (
  id          text primary key,
  name        text not null,
  blurb       text not null default '',
  image       text not null default '',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists products (
  id            text primary key,              -- also the URL slug
  name          text not null,
  category      text not null references categories(id) on update cascade on delete restrict,
  unit          text not null,
  price         numeric(10,2) not null check (price >= 0),
  old_price     numeric(10,2) check (old_price is null or old_price >= 0),
  description   text not null default '',
  image         text not null default '',
  images        text[] not null default '{}',  -- extra gallery images
  badge         text,
  rating        numeric(2,1) not null default 0,
  review_count  int  not null default 0,
  sku           text not null default '',
  stock         int  not null default 0 check (stock >= 0),
  sold_count    int  not null default 0,
  featured      boolean not null default false,
  active        boolean not null default true,
  origin        text,
  nutrition     text,
  tags          text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists products_category_idx on products (category);
create index if not exists products_active_idx   on products (active);

create table if not exists coupons (
  code           text primary key,
  label          text not null,
  discount_type  text not null default 'fixed' check (discount_type in ('fixed', 'percent')),
  value          numeric(10,2) not null check (value >= 0),
  max_discount   numeric(10,2),
  min_subtotal   numeric(10,2) not null default 0,
  active         boolean not null default true,
  starts_at      timestamptz,
  expires_at     timestamptz,
  usage_limit    int,
  used_count     int not null default 0,
  created_at     timestamptz not null default now()
);

create table if not exists orders (
  id                text primary key,
  access_token      uuid not null default gen_random_uuid(),  -- lets a guest open their own order page
  user_id           uuid references auth.users(id) on delete set null,
  customer_name     text not null,
  customer_phone    text not null,
  customer_email    text,
  customer_address  text not null,
  customer_area     text not null,
  customer_city     text not null default 'Dhaka',
  delivery_slot     text not null,
  notes             text,
  items             jsonb not null,
  subtotal          numeric(10,2) not null,
  discount          numeric(10,2) not null default 0,
  coupon_code       text,
  delivery_fee      numeric(10,2) not null default 0,
  total             numeric(10,2) not null,
  payment_method    text not null default 'cod',
  status            text not null default 'Pending'
                    check (status in ('Pending', 'Confirmed', 'Packed', 'Out for delivery', 'Delivered', 'Cancelled')),
  status_history    jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists orders_user_idx    on orders (user_id);
create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists orders_status_idx  on orders (status);

-- Online payment (SSLCommerz). Added after the first release: written as
-- ALTERs so re-running this file upgrades a database created by an older
-- version without touching existing rows (old orders become cod / unpaid).
alter table orders add column if not exists payment_status  text not null default 'unpaid';
alter table orders add column if not exists payment_tran_id text;
alter table orders add column if not exists payment_val_id  text;
alter table orders add column if not exists payment_details jsonb;
alter table orders add column if not exists paid_at         timestamptz;

alter table orders drop constraint if exists orders_payment_method_check;
alter table orders add  constraint orders_payment_method_check
  check (payment_method in ('cod', 'sslcommerz'));
alter table orders drop constraint if exists orders_payment_status_check;
alter table orders add  constraint orders_payment_status_check
  check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'cancelled', 'refunded'));

-- Unique transaction id sent to the gateway (NULL for cash-on-delivery orders).
create unique index if not exists orders_payment_tran_id_key on orders (payment_tran_id);
-- Finds abandoned online payments quickly (see expire_stale_payments).
create index if not exists orders_payment_pending_idx on orders (created_at)
  where payment_status = 'pending';

create table if not exists reviews (
  id                 uuid primary key default gen_random_uuid(),
  product_id         text not null references products(id) on update cascade on delete cascade,
  user_id            uuid not null references auth.users(id) on delete cascade,
  author_name        text not null,
  rating             int  not null check (rating between 1 and 5),
  comment            text not null default '',
  verified_purchase  boolean not null default false,
  approved           boolean not null default true,
  created_at         timestamptz not null default now(),
  unique (product_id, user_id)
);

create index if not exists reviews_product_idx on reviews (product_id, created_at desc);

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  phone       text not null default '',
  address     text not null default '',
  area        text not null default '',
  city        text not null default 'Dhaka',
  updated_at  timestamptz not null default now()
);

create table if not exists newsletter_subscribers (
  email       text primary key,
  created_at  timestamptz not null default now()
);

create table if not exists contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  phone       text,
  subject     text not null default '',
  message     text not null,
  created_at  timestamptz not null default now()
);

-- Admin inbox read state (null = unread). Added after launch.
alter table contact_messages add column if not exists read_at timestamptz;

-- Store-wide settings edited in the admin panel (Settings → Delivery).
-- Exactly one row (id = 1). Read by delivery_fee_for() below, by the
-- storefront (getDeliverySettings) and the admin panel, all server-side.
create table if not exists store_settings (
  id                          int primary key default 1 check (id = 1),
  delivery_fee_dhaka          numeric(10,2) not null default 60   check (delivery_fee_dhaka >= 0),
  -- null = Dhaka delivery is never free
  free_delivery_dhaka_from    numeric(10,2)          default 1000 check (free_delivery_dhaka_from is null or free_delivery_dhaka_from >= 0),
  delivery_fee_outside        numeric(10,2) not null default 130  check (delivery_fee_outside >= 0),
  -- null = outside-Dhaka delivery is never free
  free_delivery_outside_from  numeric(10,2)          default null check (free_delivery_outside_from is null or free_delivery_outside_from >= 0),
  updated_at                  timestamptz   not null default now()
);
insert into store_settings (id) values (1) on conflict (id) do nothing;
alter table store_settings enable row level security;
revoke all on store_settings from anon, authenticated;
grant all on store_settings to service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table categories             enable row level security;
alter table products               enable row level security;
alter table coupons                enable row level security;
alter table orders                 enable row level security;
alter table reviews                enable row level security;
alter table profiles               enable row level security;
alter table newsletter_subscribers enable row level security;
alter table contact_messages       enable row level security;

drop policy if exists "Public can read categories" on categories;
create policy "Public can read categories" on categories
  for select to anon, authenticated using (true);

drop policy if exists "Public can read active products" on products;
create policy "Public can read active products" on products
  for select to anon, authenticated using (active);

drop policy if exists "Public can read approved reviews" on reviews;
create policy "Public can read approved reviews" on reviews
  for select to anon, authenticated using (approved);

drop policy if exists "Users can read own profile" on profiles;
create policy "Users can read own profile" on profiles
  for select to authenticated using (auth.uid() = id);

-- No policies on coupons / orders / newsletter_subscribers / contact_messages:
-- with RLS on, that means "server (secret key) only".

revoke all on categories, products, coupons, orders, reviews, profiles,
              newsletter_subscribers, contact_messages
  from anon, authenticated;
grant select on categories, products, reviews to anon, authenticated;
grant select on profiles to authenticated;
grant all on categories, products, coupons, orders, reviews, profiles,
             newsletter_subscribers, contact_messages
  to service_role;

-- ---------------------------------------------------------------------------
-- delivery_fee_for: the delivery charge for an order, from store_settings.
-- Dhaka district (or no district: older clients) uses the Dhaka fee and
-- free-delivery threshold; every other district the outside-Dhaka ones.
-- Falls back to the original rule (৳60, free from ৳1000; outside ৳130) if
-- the settings row is missing. Mirrored for display in src/lib/pricing.ts.
-- ---------------------------------------------------------------------------
create or replace function delivery_fee_for(p_subtotal numeric, p_customer jsonb)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_s     store_settings%rowtype;
  v_dhaka boolean := lower(coalesce(nullif(trim(p_customer->>'district'), ''), nullif(trim(p_customer->>'city'), ''), 'dhaka')) = 'dhaka';
  v_fee   numeric;
  v_free  numeric;
begin
  if p_subtotal <= 0 then
    return 0;
  end if;
  select * into v_s from store_settings where id = 1;
  if not found then
    v_s.delivery_fee_dhaka := 60;
    v_s.free_delivery_dhaka_from := 1000;
    v_s.delivery_fee_outside := 130;
    v_s.free_delivery_outside_from := null;
  end if;
  if v_dhaka then
    v_fee := v_s.delivery_fee_dhaka;
    v_free := v_s.free_delivery_dhaka_from;
  else
    v_fee := v_s.delivery_fee_outside;
    v_free := v_s.free_delivery_outside_from;
  end if;
  if v_free is not null and p_subtotal >= v_free then
    return 0;
  end if;
  return v_fee;
end;
$$;
revoke all on function delivery_fee_for(numeric, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- place_order: the only way an order is created.
-- Runs in one transaction: locks the product rows, re-reads price and stock
-- from the database (the client only sends product ids and quantities),
-- validates the coupon, decrements stock and inserts the order.
-- Delivery fee: delivery_fee_for() (store_settings, edited in the admin).
-- p_payment_method: 'cod' (default) or 'sslcommerz'. Online orders start with
-- payment_status 'pending' and get a gateway transaction id generated here;
-- the order stays 'Pending' until mark_order_paid() confirms the payment.
-- ---------------------------------------------------------------------------

-- The first release had a 4-argument version; replace it (a second overload
-- would make 4-argument calls ambiguous). Callers that pass only the first
-- four arguments keep working through the default.
drop function if exists place_order(jsonb, jsonb, text, uuid);

create or replace function place_order(
  p_customer       jsonb,
  p_items          jsonb,
  p_coupon_code    text default null,
  p_user_id        uuid default null,
  p_payment_method text default 'cod'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item      jsonb;
  v_qty       int;
  v_product   products%rowtype;
  v_coupon    coupons%rowtype;
  v_lines     jsonb := '[]'::jsonb;
  v_subtotal  numeric := 0;
  v_discount  numeric := 0;
  v_fee       numeric := 0;
  v_code      text := nullif(upper(trim(coalesce(p_coupon_code, ''))), '');
  v_id        text;
  v_order     orders%rowtype;
  v_method    text := lower(trim(coalesce(p_payment_method, 'cod')));
  v_total     numeric;
begin
  if v_method not in ('cod', 'sslcommerz') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  -- Lock rows in a stable order so two concurrent orders cannot deadlock.
  for v_item in
    select value from jsonb_array_elements(p_items) order by value->>'productId'
  loop
    v_qty := (v_item->>'qty')::int;
    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise exception 'INVALID_QTY';
    end if;

    select * into v_product from products
      where id = v_item->>'productId' and active
      for update;
    if not found then
      raise exception 'PRODUCT_UNAVAILABLE:%', coalesce(v_item->>'productId', '');
    end if;
    if v_product.stock < v_qty then
      raise exception 'OUT_OF_STOCK:%:%', v_product.stock, v_product.name;
    end if;

    update products
      set stock = stock - v_qty, sold_count = sold_count + v_qty, updated_at = now()
      where id = v_product.id;

    v_lines := v_lines || jsonb_build_object(
      'productId', v_product.id,
      'name',      v_product.name,
      'unit',      v_product.unit,
      'price',     v_product.price,
      'qty',       v_qty,
      'image',     v_product.image
    );
    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;

  if v_code is not null then
    select * into v_coupon from coupons where code = v_code for update;
    if not found
       or not v_coupon.active
       or (v_coupon.starts_at  is not null and v_coupon.starts_at  > now())
       or (v_coupon.expires_at is not null and v_coupon.expires_at < now())
       or (v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit) then
      raise exception 'COUPON_INVALID';
    end if;
    if v_subtotal < v_coupon.min_subtotal then
      raise exception 'COUPON_MIN_SUBTOTAL:%', v_coupon.min_subtotal;
    end if;

    if v_coupon.discount_type = 'fixed' then
      v_discount := least(v_coupon.value, v_subtotal);
    else
      v_discount := round(v_subtotal * v_coupon.value / 100);
      if v_coupon.max_discount is not null then
        v_discount := least(v_discount, v_coupon.max_discount);
      end if;
    end if;

    update coupons set used_count = used_count + 1 where code = v_code;
  end if;

  -- Admin-set delivery charge (store_settings); no district counts as Dhaka.
  v_fee := delivery_fee_for(v_subtotal, p_customer);
  v_total := greatest(0, v_subtotal - v_discount + v_fee);

  -- SSLCommerz accepts 10.00 – 500000.00 BDT per transaction.
  if v_method = 'sslcommerz' and (v_total < 10 or v_total > 500000) then
    raise exception 'PAYMENT_AMOUNT_OUT_OF_RANGE';
  end if;

  loop
    v_id := 'FB-' || lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from orders where id = v_id);
  end loop;

  insert into orders (
    id, user_id, customer_name, customer_phone, customer_email,
    customer_address, customer_area, customer_city, delivery_slot, notes,
    items, subtotal, discount, coupon_code, delivery_fee, total, status_history,
    payment_method, payment_status, payment_tran_id
  ) values (
    v_id,
    p_user_id,
    p_customer->>'name',
    p_customer->>'phone',
    nullif(p_customer->>'email', ''),
    p_customer->>'address',
    p_customer->>'area',
    coalesce(nullif(p_customer->>'city', ''), 'Dhaka'),
    p_customer->>'deliverySlot',
    nullif(p_customer->>'notes', ''),
    v_lines,
    v_subtotal,
    v_discount,
    case when v_discount > 0 then v_code end,
    v_fee,
    v_total,
    jsonb_build_array(jsonb_build_object('status', 'Pending', 'at', now())),
    v_method,
    case when v_method = 'sslcommerz' then 'pending' else 'unpaid' end,
    -- e.g. FB123456-9f2c41ab07de (≤ 30 chars, unguessable, unique index).
    -- gen_random_uuid() is built in (no extension schema on the search_path
    -- needed); its first 12 hex digits are fully random.
    case when v_method = 'sslcommerz'
      then replace(v_id, '-', '') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
    end
  )
  returning * into v_order;

  return to_jsonb(v_order);
end;
$$;

-- ---------------------------------------------------------------------------
-- set_order_status: used by the admin panel. Appends to the status history
-- and puts stock back when an order is cancelled (and takes it again if a
-- cancelled order is re-opened).
-- ---------------------------------------------------------------------------

create or replace function set_order_status(p_id text, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
  v_item  jsonb;
begin
  select * into v_order from orders where id = p_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_order.status = p_status then
    return to_jsonb(v_order);
  end if;

  if p_status = 'Cancelled' then
    for v_item in select value from jsonb_array_elements(v_order.items) loop
      update products
        set stock = stock + (v_item->>'qty')::int,
            sold_count = greatest(0, sold_count - (v_item->>'qty')::int),
            updated_at = now()
        where id = v_item->>'productId';
    end loop;
  elsif v_order.status = 'Cancelled' then
    for v_item in select value from jsonb_array_elements(v_order.items) loop
      update products
        set stock = greatest(0, stock - (v_item->>'qty')::int),
            sold_count = sold_count + (v_item->>'qty')::int,
            updated_at = now()
        where id = v_item->>'productId';
    end loop;
  end if;

  update orders
    set status = p_status,
        status_history = status_history || jsonb_build_object('status', p_status, 'at', now()),
        updated_at = now()
    where id = p_id
    returning * into v_order;

  return to_jsonb(v_order);
end;
$$;

-- ---------------------------------------------------------------------------
-- Keep products.rating / review_count in step with approved reviews.
-- ---------------------------------------------------------------------------

create or replace function refresh_product_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id text := coalesce(new.product_id, old.product_id);
  v_count int;
  v_avg   numeric;
begin
  select count(*), avg(rating) into v_count, v_avg
    from reviews where product_id = v_product_id and approved;
  update products
    set review_count = v_count,
        rating = case when v_count > 0 then round(v_avg, 1) else rating end
    where id = v_product_id;
  return null;
end;
$$;

drop trigger if exists reviews_refresh_rating on reviews;
create trigger reviews_refresh_rating
  after insert or update or delete on reviews
  for each row execute function refresh_product_rating();

-- ---------------------------------------------------------------------------
-- Online payment (SSLCommerz) state changes. Called only by the storefront's
-- server code, and only AFTER it has checked the payment with the SSLCommerz
-- validation API — these functions do not talk to the gateway themselves.
-- ---------------------------------------------------------------------------

-- mark_order_paid: the gateway confirmed the payment. Idempotent: the browser
-- redirect and the IPN both call it; a repeat with the same val_id returns
-- the order unchanged.
create or replace function mark_order_paid(
  p_tran_id text,
  p_val_id  text,
  p_amount  numeric,
  p_details jsonb default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
begin
  select * into v_order from orders where payment_tran_id = p_tran_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_order.payment_method <> 'sslcommerz' then
    raise exception 'NOT_AN_ONLINE_ORDER';
  end if;
  if coalesce(p_val_id, '') = '' then
    raise exception 'MISSING_VAL_ID';
  end if;

  if v_order.payment_status = 'paid' then
    if v_order.payment_val_id = p_val_id then
      return to_jsonb(v_order);            -- same payment reported twice
    end if;
    raise exception 'ALREADY_PAID';         -- a second, different payment: needs a human
  end if;

  if p_amount is null or p_amount <> v_order.total then
    raise exception 'AMOUNT_MISMATCH:%:%', p_amount, v_order.total;
  end if;

  if v_order.status = 'Cancelled' or v_order.payment_status <> 'pending' then
    -- Money arrived for an order that was already cancelled (payment expired,
    -- failed callback, or cancelled by staff). Never drop a real payment:
    -- record it so staff see "Cancelled + Paid" and can refund or re-open it.
    -- The order itself stays cancelled (its stock was already released).
    update orders
      set payment_status  = 'paid',
          payment_val_id  = p_val_id,
          payment_details = coalesce(v_order.payment_details, '{}'::jsonb)
                            || coalesce(p_details, '{}'::jsonb)
                            || jsonb_build_object('late_payment', true,
                                                  'previous_payment_status', v_order.payment_status),
          paid_at         = now(),
          updated_at      = now()
      where id = v_order.id
      returning * into v_order;
    return to_jsonb(v_order);
  end if;

  update orders
    set payment_status  = 'paid',
        payment_val_id  = p_val_id,
        payment_details = p_details,
        paid_at         = now(),
        status          = case when status = 'Pending' then 'Confirmed' else status end,
        status_history  = case when status = 'Pending'
                            then status_history || jsonb_build_object('status', 'Confirmed', 'at', now())
                            else status_history end,
        updated_at      = now()
    where id = v_order.id
    returning * into v_order;

  return to_jsonb(v_order);
end;
$$;

-- mark_payment_failed: the payment failed, was cancelled by the shopper, or
-- expired. Cancels the order (putting its stock back through
-- set_order_status) unless staff already moved it past 'Pending'. Never
-- touches a paid order; repeats are no-ops.
create or replace function mark_payment_failed(
  p_tran_id text,
  p_status  text,
  p_reason  text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
begin
  if p_status not in ('failed', 'cancelled') then
    raise exception 'INVALID_PAYMENT_STATUS';
  end if;

  select * into v_order from orders where payment_tran_id = p_tran_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_order.payment_method <> 'sslcommerz' or v_order.payment_status <> 'pending' then
    return to_jsonb(v_order);              -- paid, already failed, or not online: leave it
  end if;

  update orders
    set payment_status  = p_status,
        payment_details = coalesce(payment_details, '{}'::jsonb)
                          || jsonb_build_object('failure', p_status, 'reason', p_reason, 'at', now()),
        updated_at      = now()
    where id = v_order.id;

  if v_order.status = 'Pending' then
    perform set_order_status(v_order.id, 'Cancelled');
  end if;

  select * into v_order from orders where id = v_order.id;
  return to_jsonb(v_order);
end;
$$;

-- expire_stale_payments: cancels online orders whose shopper never came back
-- from the gateway, so their stock is not held forever. Run it from a cron
-- (POST /api/payment/expire). Returns the number of orders cancelled.
create or replace function expire_stale_payments(p_minutes int default 60)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tran  text;
  v_count int := 0;
begin
  for v_tran in
    select payment_tran_id from orders
      where payment_method = 'sslcommerz'
        and payment_status = 'pending'
        and status = 'Pending'
        and created_at < now() - make_interval(mins => greatest(coalesce(p_minutes, 60), 15))
      order by created_at
      limit 500
      for update skip locked
  loop
    perform mark_payment_failed(v_tran, 'cancelled', 'expired');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- These functions must never be callable with the public key.
revoke all on function place_order(jsonb, jsonb, text, uuid, text)     from public, anon, authenticated;
revoke all on function set_order_status(text, text)                    from public, anon, authenticated;
revoke all on function refresh_product_rating()                        from public, anon, authenticated;
revoke all on function mark_order_paid(text, text, numeric, jsonb)     from public, anon, authenticated;
revoke all on function mark_payment_failed(text, text, text)           from public, anon, authenticated;
revoke all on function expire_stale_payments(int)                      from public, anon, authenticated;
grant execute on function place_order(jsonb, jsonb, text, uuid, text)  to service_role;
grant execute on function set_order_status(text, text)                 to service_role;
grant execute on function mark_order_paid(text, text, numeric, jsonb)  to service_role;
grant execute on function mark_payment_failed(text, text, text)        to service_role;
grant execute on function expire_stale_payments(int)                   to service_role;

-- Tell the API layer to pick up the new tables and functions immediately.
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Category tree: a category may have a parent (subcategory). Products can
-- belong to any level; a parent category page shows its whole subtree.
-- ---------------------------------------------------------------------------

alter table categories add column if not exists parent_id text
  references categories(id) on update cascade on delete restrict;
alter table categories add column if not exists description text not null default '';
create index if not exists categories_parent_idx on categories (parent_id);

alter table categories drop constraint if exists categories_not_own_parent;
alter table categories add constraint categories_not_own_parent check (parent_id is null or parent_id <> id);

-- Reject cycles (A → B → A) and trees deeper than 3 levels.
create or replace function categories_check_tree()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_cursor text := new.parent_id;
  v_depth  int  := 1;
begin
  while v_cursor is not null loop
    if v_cursor = new.id then
      raise exception 'CATEGORY_CYCLE';
    end if;
    v_depth := v_depth + 1;
    if v_depth > 3 then
      raise exception 'CATEGORY_TOO_DEEP';
    end if;
    select parent_id into v_cursor from categories where id = v_cursor;
  end loop;
  return new;
end;
$$;

drop trigger if exists categories_tree_guard on categories;
create trigger categories_tree_guard
  before insert or update of parent_id on categories
  for each row execute function categories_check_tree();

revoke all on function categories_check_tree() from public, anon, authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Bangladesh address picker (division → district → upazila/thana → union).
-- Structured address parts for orders and saved profiles. All nullable:
-- older rows keep only address / area / city, which stay populated for
-- backwards compatibility (customer_area = upazila/thana, customer_city =
-- district). Names come from the bangladesh-geo-data dataset, validated by
-- the storefront before place_order() is called.
-- ---------------------------------------------------------------------------

alter table orders add column if not exists customer_division text;
alter table orders add column if not exists customer_district text;
alter table orders add column if not exists customer_upazila  text;
alter table orders add column if not exists customer_union    text;
alter table orders add column if not exists customer_landmark text;
alter table orders add column if not exists customer_postcode text;

alter table profiles add column if not exists division   text;
alter table profiles add column if not exists district   text;
alter table profiles add column if not exists upazila    text;
alter table profiles add column if not exists union_name text;
alter table profiles add column if not exists landmark   text;
alter table profiles add column if not exists postcode   text;

-- place_order, unchanged except that it also stores the address parts above
-- from p_customer (division, district, upazila, union, landmark, postcode).
-- This replaces the definition earlier in this file (same signature, so the
-- grants below and existing callers are unaffected).

create or replace function place_order(
  p_customer       jsonb,
  p_items          jsonb,
  p_coupon_code    text default null,
  p_user_id        uuid default null,
  p_payment_method text default 'cod'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item      jsonb;
  v_qty       int;
  v_product   products%rowtype;
  v_coupon    coupons%rowtype;
  v_lines     jsonb := '[]'::jsonb;
  v_subtotal  numeric := 0;
  v_discount  numeric := 0;
  v_fee       numeric := 0;
  v_code      text := nullif(upper(trim(coalesce(p_coupon_code, ''))), '');
  v_id        text;
  v_order     orders%rowtype;
  v_method    text := lower(trim(coalesce(p_payment_method, 'cod')));
  v_total     numeric;
begin
  if v_method not in ('cod', 'sslcommerz') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  -- Lock rows in a stable order so two concurrent orders cannot deadlock.
  for v_item in
    select value from jsonb_array_elements(p_items) order by value->>'productId'
  loop
    v_qty := (v_item->>'qty')::int;
    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise exception 'INVALID_QTY';
    end if;

    select * into v_product from products
      where id = v_item->>'productId' and active
      for update;
    if not found then
      raise exception 'PRODUCT_UNAVAILABLE:%', coalesce(v_item->>'productId', '');
    end if;
    if v_product.stock < v_qty then
      raise exception 'OUT_OF_STOCK:%:%', v_product.stock, v_product.name;
    end if;

    update products
      set stock = stock - v_qty, sold_count = sold_count + v_qty, updated_at = now()
      where id = v_product.id;

    v_lines := v_lines || jsonb_build_object(
      'productId', v_product.id,
      'name',      v_product.name,
      'unit',      v_product.unit,
      'price',     v_product.price,
      'qty',       v_qty,
      'image',     v_product.image
    );
    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;

  if v_code is not null then
    select * into v_coupon from coupons where code = v_code for update;
    if not found
       or not v_coupon.active
       or (v_coupon.starts_at  is not null and v_coupon.starts_at  > now())
       or (v_coupon.expires_at is not null and v_coupon.expires_at < now())
       or (v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit) then
      raise exception 'COUPON_INVALID';
    end if;
    if v_subtotal < v_coupon.min_subtotal then
      raise exception 'COUPON_MIN_SUBTOTAL:%', v_coupon.min_subtotal;
    end if;

    if v_coupon.discount_type = 'fixed' then
      v_discount := least(v_coupon.value, v_subtotal);
    else
      v_discount := round(v_subtotal * v_coupon.value / 100);
      if v_coupon.max_discount is not null then
        v_discount := least(v_discount, v_coupon.max_discount);
      end if;
    end if;

    update coupons set used_count = used_count + 1 where code = v_code;
  end if;

  -- Admin-set delivery charge (store_settings); no district counts as Dhaka.
  v_fee := delivery_fee_for(v_subtotal, p_customer);
  v_total := greatest(0, v_subtotal - v_discount + v_fee);

  -- SSLCommerz accepts 10.00 – 500000.00 BDT per transaction.
  if v_method = 'sslcommerz' and (v_total < 10 or v_total > 500000) then
    raise exception 'PAYMENT_AMOUNT_OUT_OF_RANGE';
  end if;

  loop
    v_id := 'FB-' || lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from orders where id = v_id);
  end loop;

  insert into orders (
    id, user_id, customer_name, customer_phone, customer_email,
    customer_address, customer_area, customer_city, delivery_slot, notes,
    items, subtotal, discount, coupon_code, delivery_fee, total, status_history,
    payment_method, payment_status, payment_tran_id,
    customer_division, customer_district, customer_upazila, customer_union,
    customer_landmark, customer_postcode
  ) values (
    v_id,
    p_user_id,
    p_customer->>'name',
    p_customer->>'phone',
    nullif(p_customer->>'email', ''),
    p_customer->>'address',
    p_customer->>'area',
    coalesce(nullif(p_customer->>'city', ''), 'Dhaka'),
    p_customer->>'deliverySlot',
    nullif(p_customer->>'notes', ''),
    v_lines,
    v_subtotal,
    v_discount,
    case when v_discount > 0 then v_code end,
    v_fee,
    v_total,
    jsonb_build_array(jsonb_build_object('status', 'Pending', 'at', now())),
    v_method,
    case when v_method = 'sslcommerz' then 'pending' else 'unpaid' end,
    -- e.g. FB123456-9f2c41ab07de (≤ 30 chars, unguessable, unique index).
    -- gen_random_uuid() is built in (no extension schema on the search_path
    -- needed); its first 12 hex digits are fully random.
    case when v_method = 'sslcommerz'
      then replace(v_id, '-', '') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
    end,
    nullif(trim(p_customer->>'division'), ''),
    nullif(trim(p_customer->>'district'), ''),
    nullif(trim(p_customer->>'upazila'), ''),
    nullif(trim(p_customer->>'union'), ''),
    nullif(trim(p_customer->>'landmark'), ''),
    nullif(trim(p_customer->>'postcode'), '')
  )
  returning * into v_order;

  return to_jsonb(v_order);
end;
$$;

revoke all on function place_order(jsonb, jsonb, text, uuid, text)     from public, anon, authenticated;
grant execute on function place_order(jsonb, jsonb, text, uuid, text)  to service_role;

notify pgrst, 'reload schema';
