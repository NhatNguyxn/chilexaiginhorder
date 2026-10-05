# HƯỚNG DẪN THIẾT LẬP THỦ CÔNG & VẬN HÀNH THỰC TẾ (SETUP_GUIDE.MD)
**Dự án:** WebApp Quản lý Gọi Món & Chấm Công "Chị Lệ xai gính"

Tài liệu này hướng dẫn chi tiết từng bước để đưa hệ thống vào vận hành thực tế trên nền tảng Supabase và Vercel.

---

## BƯỚC 1: TẠO SUPABASE PROJECT & LẤY THÔNG TIN CẤU HÌNH
1. Truy cập [https://supabase.com](https://supabase.com) và đăng nhập (hoặc đăng ký tài khoản miễn phí).
2. Nhấn nút **New Project**.
   - **Name**: `chile-xaiginh-order`
   - **Database Password**: Đặt mật khẩu mạnh và lưu lại an toàn.
   - **Region**: Chọn khu vực gần Việt Nam nhất (ví dụ: `Singapore - ap-southeast-1`).
3. Sau khi dự án khởi tạo xong (khoảng 1-2 phút), vào menu **Project Settings** (biểu tượng bánh răng góc dưới bên trái) -> chọn mục **API**:
   - **Project URL**: Có dạng `https://xxxxxxxxxxxxxxxx.supabase.co`
   - **Project API Keys**:
     - `anon` `public`: Chuỗi JWT public dùng cho client.
     - `service_role` `secret`: Chuỗi JWT có toàn quyền admin (**tuyệt đối không chia sẻ công khai**).

---

## BƯỚC 2: CẤU HÌNH BIẾN MÔI TRƯỜNG (.env.local & Vercel)

### 1. Tại máy tính cá nhân (phục vụ chạy test hoặc dev)
Tạo file `.env.local` ở thư mục gốc của dự án (ngang hàng `package.json`) dựa trên mẫu `.env.example`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...chuỗi_anon_key_của_bạn...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...chuỗi_service_role_key_của_bạn...

INITIAL_OWNER_USERNAME=chile
INITIAL_OWNER_PASSWORD=ChiLeQuan@2026
INITIAL_OWNER_NAME=Chị Lệ (Chủ quán)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 2. Khi Deploy lên Vercel
Vào **Project Settings** trên dashboard của Vercel -> chọn thẻ **Environment Variables** -> Thêm đủ 4 biến:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (ví dụ: `https://chile-xaiginh.vercel.app`)

---

## BƯỚC 3: CHẠY CÁC FILE MIGRATION LÊN CƠ SỞ DỮ LIỆU
Trong giao diện Supabase Dashboard, vào menu **SQL Editor** (biểu tượng `>_` bên thanh điều hướng trái) -> nhấn **New Query**.

Thực thi lần lượt các file SQL theo đúng thứ tự sau:

### 1. Chạy Migration Phase 1 (Nền tảng & Nghiệp vụ Gọi món)
- Mở file `supabase/migrations/20261006000000_phase1_foundation.sql`.
- Copy toàn bộ nội dung dán vào SQL Editor trên Supabase.
- Nhấn **Run** (Ctrl + Enter).
- *Kết quả:* Khởi tạo các bảng `profiles`, `tables`, `table_sessions`, `menu_categories`, `menu_items`, `orders`, `order_items`, `audit_logs`, `push_subscriptions`, các hàm triggers tự động, index tối ưu hóa và chính sách bảo mật RLS.

### 2. Chạy Migration Phase 2 & 3 (Chấm công & Cài đặt định vị quán)
- Mở file `supabase/migrations/20261006000001_phase2_attendance.sql`.
- Copy toàn bộ nội dung dán vào SQL Editor trên Supabase.
- Nhấn **Run** (Ctrl + Enter).
- *Kết quả:* Khởi tạo các bảng `store_settings`, `attendance_records`, `attendance_adjustments`, Stored Procedure `auto_close_unended_shifts()` và cấu hình RLS bảo vệ dữ liệu chấm công.

### 3. Nạp Dữ Liệu Ban Đầu (Seed Data)
- Mở file `supabase/seed.sql`.
- Copy toàn bộ nội dung dán vào SQL Editor trên Supabase.
- Nhấn **Run** (Ctrl + Enter).
- *Kết quả:* Nạp danh mục món (Gánh bánh, Nước thanh mát, Topping), các món ăn với giá số nguyên VND, và 10 bàn ăn kèm token ngẫu nhiên ban đầu.

---

## BƯỚC 4: TẠO TÀI KHOẢN OWNER ĐẦU TIÊN
Do hệ thống sử dụng cơ chế bảo mật cao cấp với ánh xạ tài khoản nội bộ:
1. Vào Supabase Dashboard -> chọn menu **Authentication** -> **Users** -> nhấn nút **Add User** -> chọn **Create User**.
2. Điền thông tin:
   - **Email**: `chile@quan.local` (tương ứng với username là `chile`)
   - **Password**: `ChiLeQuan@2026` (hoặc mật khẩu bạn muốn)
   - Bật tích chọn **Auto Confirm User** (để không cần gửi email xác nhận).
   - Nhấn **Create User**.
3. Copy chuỗi **User UID** vừa tạo (dạng UUID: ví dụ `b214a79c-482a-4467-...`).
4. Quay lại **SQL Editor** và chạy câu lệnh sau để phân quyền Owner:
```sql
INSERT INTO public.profiles (id, username, full_name, role, is_active, hourly_rate)
VALUES (
  'b214a79c-482a-4467-...điền_user_uid_vào_đây...',
  'chile',
  'Chị Lệ (Chủ quán)',
  'owner',
  true,
  35000
)
ON CONFLICT (id) DO UPDATE SET
  role = 'owner',
  is_active = true;
```
5. Đăng nhập thử nghiệm: Vào trang `/login`, gõ tên đăng nhập `chile` và mật khẩu `ChiLeQuan@2026`. Hệ thống sẽ dẫn thẳng vào trang quản trị `/admin/tables`.

---

## BƯỚC 5: CẤU HÌNH SUPABASE STORAGE CHO ẢNH CHẤM CÔNG
1. Vào Supabase Dashboard -> chọn menu **Storage**.
2. Nhấn **New bucket**:
   - **Bucket name**: `attendance`
   - **Public bucket**: **TẮT** (Giữ ở chế độ Private để bảo vệ hình ảnh nhân viên).
   - **File size limit**: Điền `2097152` (tương đương 2MB, vì ảnh đã được client nén chuẩn < 250KB).
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp`
   - Nhấn **Save bucket**.
3. Cấu hình quyền truy cập (RLS Policies cho Storage):
   - Vào thẻ **Policies** của Storage -> tìm bucket `attendance`.
   - Nhấn **New Policy** -> chọn *For full customization*:
     - **Name**: `Allow authenticated users and service role to upload photos`
     - **Allowed operation**: `INSERT`
     - **Target roles**: `authenticated, service_role`
     - **WITH CHECK expression**: `bucket_id = 'attendance'`
   - Nhấn **Save policy**.
   - Tạo tiếp Policy cho phép đọc:
     - **Name**: `Allow owners, managers and owners of photo to read`
     - **Allowed operation**: `SELECT`
     - **Target roles**: `authenticated, service_role`
     - **USING expression**: `bucket_id = 'attendance'`
   - Nhấn **Save policy**.

---

## BƯỚC 6: THIẾT LẬP CRON TỰ ĐỘNG ĐÓNG CA (AUTO-CLOSE SHIFTS)
Để tự động đóng các ca làm việc nhân viên quên bấm "Kết ca", chọn một trong hai phương án:

### Phương án A: Dùng extension `pg_cron` trực tiếp trên Supabase (Khuyên dùng)
1. Vào Supabase Dashboard -> **Database** -> **Extensions** -> Tìm `pg_cron` và bật kích hoạt (Enable).
2. Vào **SQL Editor** và chạy câu lệnh sau (chạy mỗi ngày lúc 04:00 sáng theo giờ Việt Nam, tức 21:00 UTC):
```sql
SELECT cron.schedule(
  'auto-close-unended-attendance-shifts',
  '0 21 * * *', -- 21:00 UTC = 04:00 sáng hôm sau tại GMT+7
  $$SELECT public.auto_close_unended_shifts();$$
);
```

### Phương án B: Dùng Vercel Cron
Nếu không dùng `pg_cron`, dự án có thể gọi webhook qua Vercel Cron bằng cách tạo route `/api/cron/auto-close` và khai báo trong file `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/auto-close",
      "schedule": "0 21 * * *"
    }
  ]
}
```

---

## BƯỚC 7: CẤU HÌNH BẢO MẬT HEADERS (CSP & PERMISSIONS)
Dự án đã tích hợp sẵn chính sách bảo mật nghiêm ngặt trong file `next.config.mjs`:
- `Content-Security-Policy`: Chặn XSS, cho phép tải tài nguyên cần thiết từ Supabase và Google Fonts.
- `X-Frame-Options: DENY`: Chống Clickjacking.
- `Permissions-Policy: camera=(self), geolocation=(self)`: Chỉ cho phép camera và GPS hoạt động trên chính tên miền của quán để thực hiện chấm công an toàn.

---

## BƯỚC 8: KỊCH BẢN KIỂM THỬ VÀ NGHIỆM THU TỪNG LUỒNG (POST-DEPLOY CHECKLIST)

### Luồng 1: Khách Quét Mã QR & Đặt Món
1. Dùng điện thoại truy cập vào link QR của bàn (ví dụ: `https://domain.com/order/8f3a9e1d2c4b5a6f`).
2. Giao diện thực đơn hiện ra với giá tiền hiển thị rõ ràng bằng tiếng Việt (VND).
3. Thêm 2 món vào giỏ, bấm "Gửi đơn gọi món".
4. Nút gửi đơn tự động hiển thị đếm ngược cooldown 30 giây chống bấm đúp/spam.
5. Kiểm tra: Bàn được tạo phiên mở duy nhất (`table_sessions`), đơn hàng xuất hiện ở trạng thái `pending`.

### Luồng 2: Màn Hình Bếp / Thu Ngân Nhận Đơn Realtime
1. Mở trang `/staff` trên máy tính hoặc iPad của quán.
2. Bấm nút nổi bật **"Bắt đầu ca & Bật chuông"** để mở khóa âm thanh và bật thông báo.
3. Khi khách từ điện thoại gửi đơn, máy tính lập tức phát chuông báo âm thanh và hiển thị thông báo.
4. Nhân viên bấm "Nhận đơn", "Đang làm", "Hoàn thành". Trạng thái cập nhật theo thời gian thực.
5. Thử nghiệm nút "Hủy món / Hủy đơn": Hệ thống yêu cầu nhập lý do hủy. Sau khi hủy, món chuyển sang trạng thái `cancelled`, tổng tiền bill tự động giảm trừ và ghi nhận vào bảng `audit_logs`.

### Luồng 3: Nhân Viên Chấm Công Bằng Camera
1. Nhân viên truy cập `/staff/attendance` trên điện thoại.
2. Bấm nút **"Vào ca"**. Hệ thống xin quyền Camera và Vị trí GPS.
3. Đồng hồ hiển thị thời gian server đồng bộ chuẩn xác.
4. Màn hình chụp ảnh xuất hiện. Bấm chụp.
5. Kiểm tra ảnh xem trước: Có 3 dòng đóng dấu bản quyền in chết ở góc dưới bên trái (Giờ, Ngày tháng tiếng Việt, Tên quán + Tọa độ GPS).
6. Bấm "Xác nhận & Lưu bản ghi".
7. Bản ghi được lưu lên server, ảnh được đưa vào bucket `attendance`.

### Luồng 4: Chủ Quán Giám Sát, Duyệt Sửa Công & Xuất Báo Cáo
1. Đăng nhập tài khoản Owner `chile`, vào menu **Chấm công**:
   - `/admin/attendance/today`: Xem ai đang trong ca, thời gian làm việc hiện tại, bấm xem ảnh phóng to.
   - `/admin/attendance/history`: Lọc theo nhân viên, ngày, trạng thái bất thường. Bấm nút **"Xuất Excel (.xlsx)"** và **"Xuất CSV"**. Mở file bằng Microsoft Excel trên Windows kiểm tra tiếng Việt có dấu hiển thị rõ nét 100%, có đầy đủ 2 Sheet.
   - `/admin/attendance/monthly`: Xem ma trận lịch trực cả tháng theo dạng lưới nhân viên x ngày, thống kê tổng số giờ làm việc.
   - `/admin/attendance/settings`: Cập nhật vị trí quán qua GPS hiện tại hoặc bản đồ, điều chỉnh bán kính geofence (ví dụ 100m) và chọn chế độ cảnh báo (`warn_only` hoặc `block`).
