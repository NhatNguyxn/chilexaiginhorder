-- ==============================================================================
-- MIGRATION: 20261006000001_phase2_attendance.sql
-- DESCRIPTION: Phase 2: Photo Timestamp Attendance, Store Settings,
-- Attendance Records with Geofence & Device Drift flags, and Adjustments
-- ==============================================================================

-- 1. BẢNG CẤU HÌNH QUÁN & ĐỊA ĐIỂM CHẤM CÔNG (STORE_SETTINGS)
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT NOT NULL DEFAULT 'Chị Lệ xai gính',
  address TEXT NOT NULL DEFAULT 'Khu phố ẩm thực Hoàng Su Phì, Tỉnh Hà Giang',
  latitude DOUBLE PRECISION NOT NULL DEFAULT 22.753333,
  longitude DOUBLE PRECISION NOT NULL DEFAULT 104.685278,
  radius_meters INT NOT NULL DEFAULT 150, -- Bán kính cho phép chấm công (mét)
  warning_mode TEXT NOT NULL DEFAULT 'warn_only' CHECK (warning_mode IN ('warn_only', 'require_note', 'block')),
  ip_whitelist TEXT[] DEFAULT '{}',
  photo_retention_days INT NOT NULL DEFAULT 90,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Khởi tạo bản ghi cấu hình mặc định duy nhất nếu chưa có
INSERT INTO store_settings (id, store_name, address, latitude, longitude, radius_meters, warning_mode)
VALUES (
  's0000000-0000-0000-0000-000000000001',
  'Chị Lệ xai gính',
  'Khu phố ẩm thực Hoàng Su Phì, Tỉnh Hà Giang',
  22.753333,
  104.685278,
  150,
  'warn_only'
)
ON CONFLICT (id) DO NOTHING;

-- 2. BẢNG BẢN GHI CHẤM CÔNG BẰNG ẢNH (ATTENDANCE_RECORDS)
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  check_type TEXT NOT NULL CHECK (check_type IN ('check_in', 'check_out')),
  captured_at_client TIMESTAMPTZ NOT NULL,
  captured_at_server TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  photo_url TEXT NOT NULL, -- Đường dẫn storage (VD: attendance/2026/10/userId/timestamp.jpg)
  location_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_meters INT,
  device_id TEXT,
  ip_address TEXT,
  flags TEXT[] NOT NULL DEFAULT '{}', -- ['OUT_OF_RADIUS', 'TIME_DRIFT_EXCEEDED', 'FOREIGN_DEVICE', 'NO_GPS']
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'flagged', 'adjusted', 'auto_closed')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 3. BẢNG YÊU CẦU ĐIỀU CHỈNH / SỬA CÔNG (ATTENDANCE_ADJUSTMENTS)
CREATE TABLE IF NOT EXISTS attendance_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID REFERENCES attendance_records(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  shift_date DATE NOT NULL,
  check_type TEXT NOT NULL CHECK (check_type IN ('check_in', 'check_out')),
  original_time TIMESTAMPTZ,
  requested_time TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- ==============================================================================
-- INDEXES TỐI ƯU TRUY VẤN CHẤM CÔNG
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_server_time ON attendance_records(captured_at_server DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_adjustments_user_status ON attendance_adjustments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_adjustments_status ON attendance_adjustments(status);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_adjustments ENABLE ROW LEVEL SECURITY;

-- STORE_SETTINGS: Mọi nhân viên đã xác thực đều đọc được để đối chiếu vị trí
CREATE POLICY "Nhân viên xem cấu hình quán"
  ON store_settings FOR SELECT USING (is_active_staff());

CREATE POLICY "Chủ quán cập nhật cấu hình quán"
  ON store_settings FOR ALL USING (is_owner());

-- ATTENDANCE_RECORDS:
-- Nhân viên tự xem bản ghi chấm công của mình
CREATE POLICY "Nhân viên tự xem bản ghi chấm công"
  ON attendance_records FOR SELECT USING (auth.uid() = user_id);

-- Quản lý và Chủ quán xem toàn bộ bản ghi chấm công
CREATE POLICY "Quản lý và Chủ quán xem mọi bản ghi chấm công"
  ON attendance_records FOR SELECT USING (is_manager_or_owner());

-- Nhân viên tạo bản ghi chấm công của mình
CREATE POLICY "Nhân viên tạo bản ghi chấm công"
  ON attendance_records FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Quản lý và Chủ quán cập nhật trạng thái bản ghi
CREATE POLICY "Quản lý và Chủ quán cập nhật bản ghi chấm công"
  ON attendance_records FOR UPDATE USING (is_manager_or_owner());

-- ATTENDANCE_ADJUSTMENTS:
-- Nhân viên tự xem và gửi yêu cầu sửa công của mình
CREATE POLICY "Nhân viên xem yêu cầu sửa công của mình"
  ON attendance_adjustments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Nhân viên gửi yêu cầu sửa công"
  ON attendance_adjustments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Quản lý và Chủ quán xem và duyệt yêu cầu sửa công
CREATE POLICY "Quản lý và Chủ quán xem yêu cầu sửa công"
  ON attendance_adjustments FOR SELECT USING (is_manager_or_owner());

CREATE POLICY "Quản lý và Chủ quán duyệt yêu cầu sửa công"
  ON attendance_adjustments FOR UPDATE USING (is_manager_or_owner());

-- ==============================================================================
-- THỦ TỤC TỰ ĐỘNG ĐÓNG CA KHI QUÁ 23:59 (AUTO-CLOSE PROCEDURE)
-- ==============================================================================
CREATE OR REPLACE FUNCTION auto_close_unended_shifts()
RETURNS INT AS $$
DECLARE
  closed_count INT := 0;
BEGIN
  -- Tìm các bản ghi check_in của ngày hôm trước mà chưa có check_out tương ứng
  -- và đánh dấu ghi chú auto_closed
  WITH unclosed AS (
    SELECT DISTINCT ar1.id
    FROM attendance_records ar1
    WHERE ar1.check_type = 'check_in'
      AND ar1.captured_at_server < CURRENT_DATE
      AND ar1.status = 'valid'
      AND NOT EXISTS (
        SELECT 1 FROM attendance_records ar2
        WHERE ar2.user_id = ar1.user_id
          AND ar2.check_type = 'check_out'
          AND ar2.captured_at_server >= ar1.captured_at_server
          AND ar2.captured_at_server < ar1.captured_at_server + INTERVAL '24 hours'
      )
  )
  UPDATE attendance_records
  SET status = 'auto_closed',
      note = COALESCE(note || ' | ', '') || 'Hệ thống tự đóng ca lúc 23:59 do nhân viên quên bấm Kết ca'
  WHERE id IN (SELECT id FROM unclosed);

  GET DIAGNOSTICS closed_count = ROW_COUNT;
  RETURN closed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- HƯỚNG DẪN ROLLBACK
-- ==============================================================================
/*
DROP FUNCTION IF EXISTS auto_close_unended_shifts();
DROP TABLE IF EXISTS attendance_adjustments CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS store_settings CASCADE;
*/
