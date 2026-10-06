-- ==============================================================================
-- MIGRATION: 20261006000000_phase1_foundation.sql
-- DESCRIPTION: Phase 1 Foundation: Real Auth, Profiles, RBAC (4 roles),
-- Soft Delete, Audit Logs, Safe Financial Schema, Random QR Token, RLS
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- DỌN DẸP BẢNG CŨ (Nếu database đã có các bảng thử nghiệm cũ từ schema.sql)
DROP TABLE IF EXISTS push_subscriptions CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS menu_categories CASCADE;
DROP TABLE IF EXISTS table_sessions CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS staff_users CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP FUNCTION IF EXISTS is_owner() CASCADE;
DROP FUNCTION IF EXISTS is_manager_or_owner() CASCADE;
DROP FUNCTION IF EXISTS is_active_staff() CASCADE;
DROP FUNCTION IF EXISTS get_current_role() CASCADE;

-- 2. BẢNG HỒ SƠ TÀI KHOẢN (PROFILES)
-- Thay thế staff_users cũ, liên kết trực tiếp với auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'cashier', 'staff')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  hourly_rate BIGINT NOT NULL DEFAULT 0, -- Số nguyên VND
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 3. BẢNG BÀN (TABLES)
-- Thêm qr_token ngẫu nhiên để chống đoán số bàn
CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  qr_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 4. BẢNG PHIÊN NGỒI CỦA BÀN (TABLE_SESSIONS)
-- Dùng ON DELETE RESTRICT bảo toàn dữ liệu tài chính
CREATE TABLE IF NOT EXISTS table_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  total_amount BIGINT NOT NULL DEFAULT 0, -- Số nguyên VND
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- RÀNG BUỘC TOÀN VẸN: Mỗi bàn chỉ có duy nhất 1 phiên 'open' tại một thời điểm
CREATE UNIQUE INDEX IF NOT EXISTS unique_open_table_session 
  ON table_sessions (table_id) 
  WHERE status = 'open' AND deleted_at IS NULL;

-- 5. BẢNG DANH MỤC THỰC ĐƠN (MENU_CATEGORIES)
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 6. BẢNG MÓN TRONG MENU (MENU_ITEMS)
-- Giá tiền lưu dạng BIGINT số nguyên VND
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  price BIGINT NOT NULL DEFAULT 0,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 7. BẢNG ĐƠN HÀNG (ORDERS)
-- Thêm trạng thái 'cancelled' và cancellation_reason
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE RESTRICT,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'preparing', 'served', 'cancelled')),
  cancellation_reason TEXT,
  note TEXT,
  total_amount BIGINT NOT NULL DEFAULT 0, -- Số nguyên VND
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 8. BẢNG CHI TIẾT MÓN TRONG ĐƠN (ORDER_ITEMS)
-- Lưu giá chốt tại thời điểm đặt (price_at_order)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  note TEXT,
  price_at_order BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 9. BẢNG NHẬT KÝ THAO TÁC NHẠY CẢM (AUDIT_LOGS)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. BẢNG ĐĂNG KÝ WEB PUSH NOTIFICATION (PUSH_SUBSCRIPTIONS)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES TỐI ƯU HIỆU NĂNG
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_tables_slug ON tables(slug);
CREATE INDEX IF NOT EXISTS idx_tables_qr_token ON tables(qr_token);
CREATE INDEX IF NOT EXISTS idx_table_sessions_table_status ON table_sessions(table_id, status);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Bật RLS cho toàn bộ các bảng
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper functions lấy vai trò người dùng hiện tại
CREATE OR REPLACE FUNCTION get_current_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM profiles 
    WHERE id = auth.uid() AND is_active = true AND deleted_at IS NULL
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_active_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_role() IN ('owner', 'manager', 'cashier', 'staff');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_manager_or_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_role() IN ('owner', 'manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_role() = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- RLS: PROFILES
CREATE POLICY "Người dùng tự đọc hồ sơ của mình"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Quản lý và Chủ quán xem toàn bộ hồ sơ"
  ON profiles FOR SELECT USING (is_manager_or_owner());

CREATE POLICY "Chủ quán cập nhật tài khoản nhân sự"
  ON profiles FOR UPDATE USING (is_owner());

-- RLS: TABLES
CREATE POLICY "Công khai xem bàn còn hoạt động"
  ON tables FOR SELECT USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "Nhân viên xem toàn bộ bàn"
  ON tables FOR SELECT USING (is_active_staff());

CREATE POLICY "Quản lý và Chủ quán quản lý bàn"
  ON tables FOR ALL USING (is_manager_or_owner());

-- RLS: MENU CATEGORIES & ITEMS
CREATE POLICY "Công khai xem danh mục món"
  ON menu_categories FOR SELECT USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "Quản lý và Chủ quán quản lý danh mục"
  ON menu_categories FOR ALL USING (is_manager_or_owner());

CREATE POLICY "Công khai xem món ăn"
  ON menu_items FOR SELECT USING (is_available = true AND deleted_at IS NULL);

CREATE POLICY "Nhân viên xem toàn bộ món ăn"
  ON menu_items FOR SELECT USING (is_active_staff());

CREATE POLICY "Quản lý và Chủ quán quản lý món ăn"
  ON menu_items FOR ALL USING (is_manager_or_owner());

-- RLS: TABLE SESSIONS
CREATE POLICY "Khách và nhân viên xem phiên bàn"
  ON table_sessions FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Nhân viên cập nhật phiên bàn (thanh toán/đóng bàn)"
  ON table_sessions FOR UPDATE USING (is_active_staff());

-- RLS: ORDERS & ORDER ITEMS
CREATE POLICY "Nhân viên xem toàn bộ đơn hàng"
  ON orders FOR SELECT USING (is_active_staff());

CREATE POLICY "Nhân viên cập nhật trạng thái đơn hàng"
  ON orders FOR UPDATE USING (is_active_staff());

CREATE POLICY "Nhân viên xem chi tiết món trong đơn"
  ON order_items FOR SELECT USING (is_active_staff());

-- RLS: AUDIT LOGS
CREATE POLICY "Chủ quán và Quản lý xem nhật ký thao tác"
  ON audit_logs FOR SELECT USING (is_manager_or_owner());

-- RLS: PUSH SUBSCRIPTIONS
CREATE POLICY "Nhân viên xem và lưu push subscription của mình"
  ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- ==============================================================================
-- KÍCH HOẠT SUPABASE REALTIME
-- ==============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders, order_items, table_sessions, tables;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ==============================================================================
-- HƯỚNG DẪN ROLLBACK (KHI CẦN HỦY MIGRATION NÀY)
-- ==============================================================================
/*
DROP TABLE IF EXISTS push_subscriptions CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS menu_categories CASCADE;
DROP TABLE IF EXISTS table_sessions CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP FUNCTION IF EXISTS is_owner();
DROP FUNCTION IF EXISTS is_manager_or_owner();
DROP FUNCTION IF EXISTS is_active_staff();
DROP FUNCTION IF EXISTS get_current_role();
*/
