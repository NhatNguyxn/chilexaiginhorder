# BẢN GHI QUYẾT ĐỊNH THIẾT KẾ & KIẾN TRÚC (DECISIONS.MD)
**Dự án:** WebApp Quản lý Gọi món & Chấm công "Chị Lệ xai gính"  
**Nền tảng:** Next.js 15 App Router, React 19, TypeScript Strict, Tailwind CSS, Supabase (Postgres, Auth, Storage, Realtime), Vercel.

---

## 1. Xác thực & Quản lý Người dùng (Supabase Auth + SSR Cookies)
- **Quyết định:** Ánh xạ tên đăng nhập nội bộ `username` thành `${username.toLowerCase()}@quan.local`.
  - *Lý do:* Nhân viên phục vụ và pha chế quán ăn thường không có sẵn email cá nhân hoặc không muốn dùng email cá nhân để nhận link kích hoạt. Ánh xạ này cho phép tận dụng 100% sức mạnh của GoTrue (Supabase Auth) với mã hóa bcrypt chuẩn quốc tế, quản lý session bằng cookie HttpOnly qua `@supabase/ssr`, chống XSS đánh cắp token.
  - *Đánh đổi:* Cần hàm phụ trợ chuẩn hóa giữa username và email khi đăng nhập và khi tạo tài khoản.
- **Phân quyền 4 vai trò rõ ràng (RBAC):**
  - `owner` (Chủ quán): Toàn quyền quản trị nhân sự, xem báo cáo doanh thu & chấm công, đổi cài đặt định vị quán, duyệt yêu cầu sửa công.
  - `manager` (Quản lý): Quản lý menu món, bàn, duyệt sửa công, xem báo cáo chấm công. Bị chặn tuyệt đối quyền sửa đổi/xóa tài khoản của Owner.
  - `cashier` (Thu ngân): Xem đơn, chuyển trạng thái đơn, hủy món/hủy đơn kèm lý do, tính tiền và thanh toán đóng bàn.
  - `staff` (Nhân viên): Xem danh sách đơn bếp, đổi trạng thái làm món/ra món, chấm công vào ca/kết ca.
- **Chặn tài khoản bị khóa tức thì (Zero Latency Revocation):**
  - Middleware `src/middleware.ts` và mọi Server API đều truy vấn trạng thái `is_active = true` và `deleted_at IS NULL` của bảng `profiles`. Nhân viên vừa bị Admin khóa sẽ bị ngắt quyền truy cập ngay ở request tiếp theo.

---

## 2. Bảo Mật Nghiệp Vụ Gọi Món & Dữ Liệu Tài Chính
- **Đơn vị tiền tệ Số nguyên VND (Integer BigInt):**
  - *Quyết định:* Mọi trường tiền tệ (`price`, `price_at_order`, `total_amount`) lưu dưới dạng số nguyên VND, cấm float/numeric thập phân.
  - *Lý do:* Triệt tiêu triệt để lỗi làm tròn số chấm động IEEE 754 (vd: 0.1 + 0.2 = 0.30000000000000004) dẫn đến sai lệch lệch sổ sách kế toán.
- **Xác thực giá 100% tại Server (Server-Side Price Authority):**
  - Khách gửi đơn chỉ bao gồm `{ menuItemId, quantity }`. Route `POST /api/order` tra cứu trực tiếp giá bán hiện hành từ cơ sở dữ liệu `menu_items` và kiểm tra cờ `is_available = true`. Khách tuyệt đối không thể can thiệp giá từ phía client.
- **Bảo mật mã bàn (Random Cryptographic Token):**
  - *Quyết định:* Bảng `tables` sinh thêm trường `qr_token` (chuỗi hex ngẫu nhiên 16 bytes khó đoán). Mã QR chứa đường dẫn `/order/{qr_token}` thay vì slug lộ thiên dễ đoán như `ban-01`.
  - *Lý do:* Ngăn kẻ xấu ngồi ngoài quán đoán slug bàn để gửi đơn ảo hoặc spam gây quá tải bếp.
  - *Chức năng phụ trợ:* Admin có nút "Đổi mã QR" (Regenerate QR Token) để thu hồi mã cũ và cấp mã mới ngay tức thì nếu nghi ngờ lộ mã.
- **Ràng buộc duy nhất phiên mở (Partial Unique Index):**
  - *Quyết định:* `CREATE UNIQUE INDEX unique_open_table_session ON table_sessions (table_id) WHERE status = 'open' AND deleted_at IS NULL;`
  - *Lý do:* Giải quyết triệt để race condition khi 2 khách cùng quét QR và đặt món đồng thời; đảm bảo mỗi bàn chỉ tồn tại duy nhất 1 phiên thanh toán đang mở.
- **Bảo toàn dữ liệu tài chính (Cấm ON DELETE CASCADE):**
  - *Quyết định:* Loại bỏ hoàn toàn `ON DELETE CASCADE` trên các bảng tài chính và lịch sử đơn hàng (`orders`, `order_items`, `table_sessions`, `menu_items`).
  - *Lý do:* Tránh việc vô tình xóa một danh mục hoặc một bàn làm mất sạch lịch sử doanh thu và đơn hàng đã phục vụ. Áp dụng cơ chế xóa mềm `deleted_at`.
- **Hủy đơn hàng có kiểm toán (Audit Logs):**
  - Thao tác hủy đơn bắt buộc phải nhập lý do hủy (hết nguyên liệu, khách đổi ý, làm sai...), cập nhật trạng thái đơn thành `cancelled`, tự động giảm trừ tiền khỏi hóa đơn bàn, và ghi nhận nhật ký vào bảng `audit_logs` (ai hủy, đơn nào, lúc nào, lý do gì).

---

## 3. Trải Nghiệm Quầy Bếp & Chuông Báo Âm Thanh
- **Mở khóa AudioContext bằng nút "Bắt đầu ca":**
  - Trình duyệt hiện đại (Chrome, Safari, iOS, Android) chặn toàn bộ âm thanh tự động phát nếu không có tương tác người dùng ban đầu. Hệ thống yêu cầu nhân viên bấm nút "Bắt đầu ca" để kích hoạt AudioContext, đồng thời xin quyền Web Notification và rung thiết bị (`navigator.vibrate`) làm kênh dự phòng khi nhân viên ra ngoài tầm nghe.
- **Cảnh báo to khi chuông tắt:**
  - Nếu âm thanh bị tắt, hệ thống hiển thị thanh cảnh báo đỏ nổi bật trên màn hình quản lý đơn, yêu cầu bật lại để không bị trôi đơn hàng mới.

---

## 4. Chấm Công Bằng Ảnh Đóng Dấu (Phase 2 & 3)
- **Đóng dấu trực tiếp vào pixel ảnh (Canvas Rasterization):**
  - *Quyết định:* Dùng HTML5 Canvas để vẽ watermark trực tiếp vào dữ liệu ảnh trước khi nén JPEG và gửi lên server.
  - *Lý do:* Watermark in chết vào pixel ảnh (khác với overlay CSS dễ bị làm giả hoặc chụp màn hình đánh lừa).
  - *Nội dung watermark:* 3 dòng chữ màu trắng có viền và nền mờ đen:
    1. Giờ `HH:mm:ss` (chữ lớn nhất)
    2. Thứ, ngày/tháng/năm tiếng Việt (vd: `Thứ Ba, 06/10/2026`)
    3. Tên quán + Tọa độ GPS `lat, lng` (chuẩn 6 chữ số thập phân)
- **Kiểm soát gian lận thời gian (Server Time Authority & Drift Detection):**
  - Trước khi chụp, client đồng bộ giờ từ `GET /api/time` (`Asia/Ho_Chi_Minh`).
  - Khi lưu bản ghi, server so sánh thời gian client gửi lên và thời gian máy chủ. Nếu chênh lệch > 2 phút (120,000 ms), hệ thống tự động đánh dấu cờ cảnh báo `TIME_DRIFT_EXCEEDED` để chủ quán hậu kiểm.
- **Bảo mật ảnh chấm công (Private Storage Bucket + Signed URL):**
  - Ảnh nhân viên chứa dữ liệu nhận diện khuôn mặt nhạy cảm, tuyệt đối không để Public. Bucket `attendance` được cấu hình Private, lưu theo đường dẫn phân cấp `attendance/{yyyy}/{mm}/{user_id}/{timestamp}.jpg`. Chủ quán và nhân viên xem lại ảnh thông qua Signed URL có thời hạn (1 - 24 giờ).
- **Định vị & Geofencing linh hoạt:**
  - Khoảng cách giữa tọa độ nhân viên và quán được tính bằng công thức Haversine (bán kính Trái Đất $R = 6,371,000$ m).
  - Cung cấp 2 chế độ:
    - `warn_only` (Mặc định): Nếu nhân viên ở ngoài bán kính hoặc GPS bị lỗi/từ chối, hệ thống vẫn cho chấm công nhưng tự động gắn cờ `OUT_OF_RADIUS` hoặc `NO_GPS` để chủ quán rà soát.
    - `block`: Chặn đứng hành động chấm công nếu khoảng cách vượt quá bán kính quy định.

---

## 5. Xuất Báo Cáo Excel & CSV Chuẩn Tiếng Việt
- **Sử dụng thư viện `exceljs`:**
  - *Lý do:* Cho phép tùy biến định dạng chuyên nghiệp hơn `xlsx/sheetjs`: tô màu nền nhận diện thương hiệu (xanh thông kraft), cố định dòng tiêu đề (Freeze panes dòng 1-2), tự động căn giữa/căn phải số tiền và giờ làm việc, hiển thị song song 2 Sheet:
    - Sheet 1: Chi tiết từng ca chấm công (ngày, giờ vào/ra, tổng giờ, khoảng cách, cờ cảnh báo, ghi chú).
    - Sheet 2: Bảng tổng hợp tháng (tên nhân viên, tổng số ca, tổng số giờ làm việc, số lần bất thường).
- **Kỹ thuật chèn Byte Order Mark (`\uFEFF`) cho file CSV:**
  - Khi xuất file CSV tiếng Việt, Microsoft Excel trên hệ điều hành Windows mặc định mở file ở bảng mã ANSI dẫn đến lỗi hiển thị ký tự có dấu (Mojibake). Bằng cách chèn ký tự `\uFEFF` (UTF-8 BOM) vào đầu chuỗi nội dung CSV, Excel tự động nhận diện chính xác bảng mã UTF-8 và hiển thị tiếng Việt hoàn hảo 100%.

---

## 6. Tự Động Đóng Ca Quên Check-out (Auto-Close Shift Cron)
- **Quyết định:** Viết hàm PostgreSQL Stored Procedure `auto_close_unended_shifts()` và lập lịch chạy hàng ngày vào 04:00 sáng.
- **Cơ chế:** Quét tất cả các bản ghi có `check_type = 'check_in'` chưa có `check_out` tương ứng thuộc ngày hôm trước. Hệ thống tự động tạo bản ghi đóng ca với ghi chú `Tự động đóng ca do quên check-out` và gắn cờ `FORGOTTEN_CHECK_OUT` để chủ quán dễ dàng điều chỉnh giờ công khi xem lại.

---

## 7. Chiến Lược Kiểm Thử (Unit Testing với Vitest)
- **Phạm vi kiểm thử tự động:**
  1. Tính khoảng cách Haversine GPS (`calculateDistanceMeters`): Kiểm tra tọa độ trùng nhau bằng 0m, kiểm tra khoảng cách thực tế giữa các điểm mốc.
  2. Định dạng ngày giờ tiếng Việt (`formatVietnameseDateTime`): Kiểm tra đúng thứ tiếng Việt (Thứ Hai đến Chủ Nhật) và mẫu `dd/MM/yyyy`.
  3. Tính số giờ làm việc ca thường (`calculateShiftHours`): Kiểm tra ca ban ngày 8.5 giờ.
  4. Tính số giờ làm việc ca qua đêm (`calculateShiftHours`): Kiểm tra ca xuyên đêm vượt 0h (ví dụ 22:00 đến 06:00 sáng hôm sau = 8 giờ).
  5. Phát hiện lệch giờ máy khách và máy chủ (`isTimeDriftDetected`): Kiểm tra ngưỡng lệch > 2 phút và dung sai cho phép trong điều kiện mạng bình thường.
- **Kết quả:** 15/15 tests passed trong 6.48s.
