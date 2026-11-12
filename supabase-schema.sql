-- ============================================================================
-- FreshBasket Grocery E-Commerce — PostgreSQL Table Schema
-- Included inside both `storefront` and `admin-panel` repos so each repo is 100% standalone.
-- Note: Both repositories already synchronize automatically out-of-the-box via
-- your Supabase Cloud (`qaqrxudzecgtqcmfjiij.supabase.co`), and also support
-- these PostgreSQL tables if you run this SQL in the Supabase SQL Editor!
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  blurb TEXT NOT NULL,
  image TEXT NOT NULL,
  product_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  unit TEXT NOT NULL,
  price NUMERIC NOT NULL,
  old_price NUMERIC,
  description TEXT NOT NULL,
  image TEXT NOT NULL,
  badge TEXT,
  rating NUMERIC DEFAULT 4.8,
  sku TEXT NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  origin TEXT DEFAULT 'Bogura & Rajshahi Farms',
  nutrition TEXT DEFAULT '100% Farm Fresh & Quality Checked',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'fixed',
  value NUMERIC NOT NULL,
  max_discount NUMERIC,
  min_subtotal NUMERIC DEFAULT 0,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_address TEXT NOT NULL,
  customer_area TEXT NOT NULL,
  customer_city TEXT NOT NULL DEFAULT 'Dhaka',
  delivery_slot TEXT NOT NULL,
  notes TEXT,
  items JSONB NOT NULL,
  subtotal NUMERIC NOT NULL,
  discount NUMERIC NOT NULL DEFAULT 0,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cod',
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
