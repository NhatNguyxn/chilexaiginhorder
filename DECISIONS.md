# BẢN GHI QUYẾT ĐỊNH THIẾT KẾ & KIẾN TRÚC (DECISIONS.MD)
Dự án: WebApp Gọi Món & Chấm Công "Chị Lệ xai gính"

---

## 1. Xác thực & Quản lý Tài khoản (Supabase Auth + Profiles)
- **Tên đăng nhập không dùng email công cộng**: Do nhân viên quán thường không có hoặc không muốn dùng email cá nhân để đăng nhập, hệ thống tự động ánh xạ `username` -> `${username.toLowerCase()}@quan.local`. GoTrue nhận diện đây là email hợp lệ, cho phép lưu trữ và xác thực chuẩn mật mã (bcrypt).
- **Phân quyền 4 vai trò rõ ràng**:
  - `owner`: Chủ quán (toàn quyền quản trị nhân sự, xem báo cáo, đổi cấu hình, duyệt sửa công).
  - `manager`: Quản lý (quản lý món, bàn, duyệt sửa công, xem báo cáo chấm công). Không thể thay đổi tài khoản hoặc vai trò của owner.
  - `cashier`: Thu ngân (xử lý đơn, hủy đơn kèm lý do, tính tiền và đóng bàn).
  - `staff`: Nhân viên phục vụ / pha chế (xem đơn, đổi trạng thái làm món/ra món, chấm công vào/kết ca).
- **Chặn tài khoản bị khóa tức thì**: Cả middleware và server routes đều kiểm tra cờ `is_active = true` và `deleted_at IS NULL` trên bảng `profiles`. Khi bị khóa, phiên đăng nhập bị hủy ngay lập tức.

---

## 2. Bảo Mật Đơn Hàng & Giá Cả
- **Tiền tệ số nguyên VND (Integer BigInt)**: Toàn bộ bảng giá (`menu_items.price`), giá chốt đơn (`order_items.price_at_order`), và tổng tiền (`orders.total_amount`, `table_sessions.total_amount`) đều được lưu trữ dạng số nguyên VND, cấm float/numeric thập phân để triệt tiêu lỗi làm tròn tiền.
- **Xác thực giá 100% tại Server**: Client chỉ gửi `menuItemId` và `quantity`. API `POST /api/order` tra cứu trực tiếp giá hiện hành từ cơ sở dữ liệu và kiểm tra cờ `is_available = true`.
- **Bảo mật mã bàn (QR Token ngẫu nhiên)**: Bảng `tables` sinh thêm trường `qr_token` (chuỗi hex ngẫu nhiên 16 bytes). Khách quét mã sẽ truy cập URL chứa token thay vì slug đoán trước được như `ban-01`. Chủ quán có nút "Đổi mã QR" khi cần hủy mã cũ.
- **Ràng buộc duy nhất phiên mở (Partial Unique Index)**: Tạo chỉ mục `UNIQUE INDEX unique_open_table_session ON table_sessions (table_id) WHERE status = 'open' AND deleted_at IS NULL;` ngăn chặn hoàn toàn race condition tạo nhiều phiên đồng thời cho cùng 1 bàn.
- **Bảo toàn dữ liệu tài chính (No Cascade Delete)**: Bỏ toàn bộ `ON DELETE CASCADE` trên các bảng tài chính và nghiệp vụ (`orders`, `order_items`, `table_sessions`, `menu_items`). Áp dụng cơ chế xóa mềm `deleted_at`.
- **Hủy đơn hàng có kiểm toán (Audit Logs)**: Khi hủy đơn, hệ thống bắt buộc nhập lý do hủy, chuyển trạng thái thành `cancelled`, tự động trừ tiền món hủy khỏi tổng tiền bàn, và ghi nhận nhật ký vào bảng `audit_logs`.

---

## 3. Trải Nghiệm Quầy & Chuông Báo Âm Thanh
- **Nút "Bắt đầu ca" mở khóa AudioContext**: Trình duyệt di động và Chrome/Safari chặn âm thanh tự động phát nếu không có tương tác người dùng (user gesture). Hệ thống hiển thị biểu ngữ/nút "Bắt đầu ca & Bật chuông", khi nhân viên bấm sẽ giải phóng AudioContext và xin quyền Web Notification + rung điện thoại (`navigator.vibrate`).
- **Cảnh báo to khi chuông tắt**: Nếu nhân viên vô tình tắt chuông, hệ thống luôn ghim cảnh báo đỏ trên cùng để tránh tình trạng đơn mới tới mà không ai hay biết.

---

## 4. Chấm Công Bằng Ảnh Đóng Dấu (Phase 2 & 3)
- **Nguồn giờ server chống gian lận**: Trước khi chụp ảnh, thiết bị gọi `GET /api/time` để lấy mốc thời gian chuẩn từ Server (múi giờ `Asia/Ho_Chi_Minh`) và đo độ trôi đồng hồ (time drift). Nếu máy bị chỉnh giờ lùi quá 2 phút, hệ thống gắn cờ cảnh báo `TIME_DRIFT_EXCEEDED`.
- **In dấu bản quyền trực tiếp vào pixel ảnh (Canvas Watermark)**: 3 dòng chữ rõ nét kèm bóng đổ đen mờ đảm bảo đọc được trên nền sáng lẫn tối:
  1. Giờ `HH:mm:ss`
  2. Thứ, ngày tháng năm (Tiếng Việt)
  3. Tên quán + Tọa độ GPS `lat, lng`
- **Bộ nhớ riêng tư (Supabase Storage Private Bucket)**: Ảnh chấm công lưu trong bucket riêng `attendance/{yyyy}/{mm}/{user_id}/{timestamp}.jpg`, chỉ xem được qua Signed URL có thời hạn.
