-- =========================================================================
-- SUPABASE SCHEMA DÀNH CHO ỨNG DỤNG MÁY TÍNH TIỀN IN LY NHỰA (POS)
-- Bạn hãy copy toàn bộ script này và dán vào Supabase SQL Editor -> bấm RUN
-- =========================================================================

-- 1. BẢNG SẢN PHẨM (Bảng giá các loại ly, nắp, màng ép, phụ kiện)
create table if not exists pos_products (
  id text primary key,
  code text not null,
  name text not null,
  price numeric not null,
  unit text not null default 'thiên',
  category text not null default 'Cốc Tim',
  is_popular boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. BẢNG KHÁCH HÀNG (Danh bạ tiệm trà, quán cafe, đại lý)
create table if not exists pos_customers (
  id text primary key,
  code text,
  name text not null,
  phone text,
  address text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. BẢNG ĐƠN HÀNG (Lưu trữ chi tiết đơn hàng, dòng sản phẩm dạng JSONB)
create table if not exists pos_orders (
  id text primary key,
  code text not null,
  customer_id text,
  customer_name text not null,
  customer_phone text,
  customer_address text,
  items jsonb not null default '[]'::jsonb,
  total_quantity integer not null default 0,
  total_amount numeric not null default 0,
  notes text,
  status text not null default 'Chờ in',
  created_at text not null,
  updated_at text not null
);

-- BẬT ROW LEVEL SECURITY (RLS)
alter table pos_products enable row level security;
alter table pos_customers enable row level security;
alter table pos_orders enable row level security;

-- TẠO CHÍNH SÁCH TRUY CẬP (ANON KEY CÓ THỂ ĐỌC/GHI ĐỂ MÁY POS HOẠT ĐỘNG KHÔNG CẦN LOGIN)
drop policy if exists "Allow all operations for anon on pos_products" on pos_products;
create policy "Allow all operations for anon on pos_products" 
  on pos_products for all 
  using (true) 
  with check (true);

drop policy if exists "Allow all operations for anon on pos_customers" on pos_customers;
create policy "Allow all operations for anon on pos_customers" 
  on pos_customers for all 
  using (true) 
  with check (true);

drop policy if exists "Allow all operations for anon on pos_orders" on pos_orders;
create policy "Allow all operations for anon on pos_orders" 
  on pos_orders for all 
  using (true) 
  with check (true);

-- BẬT REALTIME CHO CÁC BẢNG (TỰ ĐỘNG CẬP NHẬT TRÊN CÁC THIẾT BỊ)
alter publication supabase_realtime add table pos_products;
alter publication supabase_realtime add table pos_customers;
alter publication supabase_realtime add table pos_orders;
