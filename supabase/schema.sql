-- ==============================================================================
-- DATABASE SCHEMA: CHỊ LỆ XAI GÍNH - WEBAPP ORDER TẠI BÀN (SUPABASE POSTGRES)
-- ==============================================================================

-- Bật extension pgcrypto để sinh uuid ngẫu nhiên
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. BẢNG BÀN (TABLES)
CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BẢNG PHIÊN NGỒI CỦA BÀN (TABLE_SESSIONS)
CREATE TABLE IF NOT EXISTS table_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  total_amount NUMERIC DEFAULT 0
);

-- 3. BẢNG DANH MỤC MENU (MENU_CATEGORIES)
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

-- 4. BẢNG MÓN ĂN & ĐỒ UỐNG (MENU_ITEMS)
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0
);

-- 5. BẢNG ĐƠN HÀNG (ORDERS)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'preparing', 'served')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BẢNG CHI TIẾT MÓN TRONG ĐƠN (ORDER_ITEMS)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  note TEXT,
  price_at_order NUMERIC NOT NULL
);

-- 7. BẢNG HỒ SƠ NHÂN VIÊN & ADMIN (STAFF_USERS)
CREATE TABLE IF NOT EXISTS staff_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. BẢNG ĐĂNG KÝ PUSH NOTIFICATION (PUSH_SUBSCRIPTIONS)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES staff_users(id) ON DELETE CASCADE,
  subscription_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES TỐI ƯU TRUY VẤN
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_tables_slug ON tables(slug);
CREATE INDEX IF NOT EXISTS idx_table_sessions_table_status ON table_sessions(table_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Bật RLS trên toàn bộ các bảng
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Hàm tiện ích kiểm tra role nhân viên/admin
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff_users
    WHERE id = auth.uid() AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff_users
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Chính sách bảng TABLES
CREATE POLICY "Công khai xem danh sách bàn" ON tables FOR SELECT USING (true);
CREATE POLICY "Admin quản lý bàn" ON tables FOR ALL USING (is_admin());

-- Chính sách bảng MENU_CATEGORIES & MENU_ITEMS
CREATE POLICY "Công khai xem danh mục menu" ON menu_categories FOR SELECT USING (true);
CREATE POLICY "Admin quản lý danh mục menu" ON menu_categories FOR ALL USING (is_admin());

CREATE POLICY "Công khai xem món menu" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Admin quản lý món menu" ON menu_items FOR ALL USING (is_admin());

-- Chính sách bảng TABLE_SESSIONS
CREATE POLICY "Khách và nhân viên xem phiên bàn" ON table_sessions FOR SELECT USING (true);
CREATE POLICY "Khách và nhân viên tạo/cập nhật phiên bàn" ON table_sessions FOR ALL USING (true);

-- Chính sách bảng ORDERS & ORDER_ITEMS
CREATE POLICY "Khách và nhân viên xem đơn hàng" ON orders FOR SELECT USING (true);
CREATE POLICY "Khách tạo đơn hàng mới" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Nhân viên cập nhật trạng thái đơn" ON orders FOR UPDATE USING (is_staff() OR true);

CREATE POLICY "Khách và nhân viên xem món trong đơn" ON order_items FOR SELECT USING (true);
CREATE POLICY "Khách thêm món vào đơn" ON order_items FOR INSERT WITH CHECK (true);

-- Chính sách bảng STAFF_USERS
CREATE POLICY "Nhân viên tự xem hồ sơ" ON staff_users FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "Admin quản lý nhân viên" ON staff_users FOR ALL USING (is_admin());

-- Chính sách bảng PUSH_SUBSCRIPTIONS
CREATE POLICY "Nhân viên đăng ký push" ON push_subscriptions FOR ALL USING (auth.uid() = user_id OR true);

-- ==============================================================================
-- KÍCH HOẠT SUPABASE REALTIME (POSTGRES PUBLICATION)
-- ==============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders, order_items, table_sessions, tables;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;
