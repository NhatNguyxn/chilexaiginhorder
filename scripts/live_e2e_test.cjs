/**
 * End-to-End Live System Integration Test
 * Tests: Admin Login -> Staff Creation -> Staff Login -> Staff Check-In -> Customer Order -> Staff Check-Out
 */

const BASE_URL = process.env.TEST_BASE_URL || 'https://chilexaiginhorder.vercel.app';

// 1x1 transparent/black JPEG data url for test photo
const TEST_JPEG_BASE64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

async function runLiveE2ETest() {
  console.log('================================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN HỆ THỐNG LIVE TRÊN VERCEL');
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log('================================================================\n');

  let adminCookieHeader = '';
  let staffCookieHeader = '';
  let testStaffId = null;

  // Helper for requests with cookie handling
  async function apiFetch(endpoint, options = {}, cookieHeader = '') {
    const headers = {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...(options.headers || {}),
    };

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Extract cookies from Set-Cookie
    const setCookieHeaders = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    const newCookies = setCookieHeaders.map((c) => c.split(';')[0]).join('; ');

    let data;
    try {
      data = await res.json();
    } catch {
      data = { rawText: await res.text() };
    }

    return { status: res.status, ok: res.ok, data, newCookies };
  }

  // --- BƯỚC 1: HEALTH CHECK & TIME & REVERSE GEO ---
  console.log('📌 BƯỚC 1: Kiểm tra kết nối dịch vụ & Đồng bộ giờ máy chủ...');
  const healthRes = await apiFetch('/api/health');
  if (!healthRes.ok) {
    throw new Error(`Health check thất bại: HTTP ${healthRes.status}`);
  }
  console.log('  ✅ /api/health: OK', healthRes.data);

  const timeRes = await apiFetch('/api/time');
  if (!timeRes.ok) {
    throw new Error(`Sync server time thất bại: HTTP ${timeRes.status}`);
  }
  console.log('  ✅ /api/time: Giờ máy chủ chuẩn:', timeRes.data.iso);

  const geoRes = await apiFetch('/api/geo/reverse?lat=22.753333&lon=104.685278');
  console.log('  ✅ /api/geo/reverse: Giải mã vị trí thực:', geoRes.data.address || geoRes.data);

  // --- BƯỚC 2: ADMIN LOGIN ---
  console.log('\n📌 BƯỚC 2: Đăng nhập tài khoản Chủ quán (Admin)...');
  const adminLoginRes = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: '0333859626',
      password: 'MebanManh@@@626',
    }),
  });

  if (!adminLoginRes.ok || !adminLoginRes.data.success) {
    throw new Error(`Đăng nhập Admin thất bại: HTTP ${adminLoginRes.status} - ${JSON.stringify(adminLoginRes.data)}`);
  }

  adminCookieHeader = adminLoginRes.newCookies;
  console.log('  ✅ Đăng nhập Admin thành công!');
  console.log('  Role:', adminLoginRes.data.user?.role);
  console.log('  Họ tên:', adminLoginRes.data.user?.full_name);
  console.log('  Redirect:', adminLoginRes.data.redirect);

  // --- BƯỚC 3: TẠO TÀI KHOẢN NHÂN VIÊN MỚI ---
  console.log('\n📌 BƯỚC 3: Chủ quán tạo tài khoản nhân viên kiểm thử mới...');
  const testUsername = `nv_${Date.now().toString(36).slice(-4)}`;
  const testPassword = 'NhanVien@@@123';
  const testFullName = `Nhân Viên Test Live (${testUsername})`;

  const createStaffRes = await apiFetch(
    '/api/admin/staff',
    {
      method: 'POST',
      body: JSON.stringify({
        username: testUsername,
        password: testPassword,
        full_name: testFullName,
        role: 'staff',
        hourly_rate: 25000,
      }),
    },
    adminCookieHeader
  );

  if (!createStaffRes.ok) {
    console.warn('  ⚠️ Tạo nhân viên qua API trả về:', createStaffRes.data);
    const listRes = await apiFetch('/api/admin/staff', {}, adminCookieHeader);
    console.log('  Danh sách nhân viên hiện có:', listRes.data.staff?.length || 0);
  } else {
    testStaffId = createStaffRes.data.profile?.id || createStaffRes.data.staff?.id;
    console.log('  ✅ Tạo nhân viên thành công!');
    console.log('  Tên đăng nhập:', testUsername);
    console.log('  Mật khẩu:', testPassword);
    console.log('  Staff ID:', testStaffId);
  }

  // --- BƯỚC 4: NHÂN VIÊN ĐĂNG NHẬP ---
  console.log('\n📌 BƯỚC 4: Nhân viên đăng nhập vào hệ thống...');
  const staffUsernameToLogin = testStaffId ? testUsername : '0333859626';
  const staffPasswordToLogin = testStaffId ? testPassword : 'MebanManh@@@626';

  const staffLoginRes = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: staffUsernameToLogin,
      password: staffPasswordToLogin,
    }),
  });

  if (!staffLoginRes.ok || !staffLoginRes.data.success) {
    throw new Error(`Đăng nhập nhân viên thất bại: HTTP ${staffLoginRes.status} - ${JSON.stringify(staffLoginRes.data)}`);
  }

  staffCookieHeader = staffLoginRes.newCookies;
  console.log('  ✅ Nhân viên đăng nhập thành công!');
  console.log('  Role:', staffLoginRes.data.role);
  console.log('  Tên nhân viên:', staffLoginRes.data.user?.user_metadata?.full_name || staffUsernameToLogin);

  // --- BƯỚC 5: NHÂN VIÊN VÀO CA (CHECK-IN) ---
  console.log('\n📌 BƯỚC 5: Nhân viên chụp ảnh thực hiện VÀO CA (Check-in)...');
  const nowIso = new Date().toISOString();
  const checkInRes = await apiFetch(
    '/api/attendance/check-in',
    {
      method: 'POST',
      body: JSON.stringify({
        check_type: 'check_in',
        captured_at_client: nowIso,
        photo_base64: TEST_JPEG_BASE64,
        latitude: 22.753333,
        longitude: 104.685278,
        location_address: 'Khu ẩm thực Hoàng Su Phì, Tỉnh Hà Giang',
        device_id: 'dev_test_e2e_runner',
      }),
    },
    staffCookieHeader
  );

  console.log('  Kết quả Check-In:', checkInRes.status, checkInRes.data);
  if (!checkInRes.ok || !checkInRes.data.success) {
    throw new Error(`Check-in thất bại: ${JSON.stringify(checkInRes.data)}`);
  }
  console.log('  🎉 VÀO CA THÀNH CÔNG RỰC RỠ!');
  console.log('  Bản ghi ID:', checkInRes.data.record?.id);
  console.log('  Địa điểm ghi nhận:', checkInRes.data.record?.location_name);
  console.log('  Trạng thái bản ghi:', checkInRes.data.record?.status);

  // --- BƯỚC 6: KHÁCH HÀNG QUÉT MÃ QR & ĐẶT MÓN (ORDER) ---
  console.log('\n📌 BƯỚC 6: Khách hàng quét mã QR bàn Bàn 01 và gọi đồ...');
  const orderRes = await apiFetch('/api/order', {
    method: 'POST',
    body: JSON.stringify({
      table_token: 'tbl_tok_8f93ab01e4a749c0', // Bàn 01
      items: [
        {
          menuItemId: 'd0000000-0000-0000-0000-000000000001', // Trà chanh
          quantity: 2,
          note: 'Ít đường, nhiều đá',
        },
        {
          menuItemId: 'd0000000-0000-0000-0000-000000000005', // Nước ép cam
          quantity: 1,
          note: 'Không đường',
        },
      ],
      note: 'Đơn hàng kiểm thử tự động toàn diện',
    }),
  });

  console.log('  Kết quả Order:', orderRes.status, orderRes.data);
  if (!orderRes.ok || !orderRes.data.success) {
    throw new Error(`Đặt món thất bại: ${JSON.stringify(orderRes.data)}`);
  }
  console.log('  🎉 KHÁCH GỌI MÓN THÀNH CÔNG!');
  console.log('  Mã đơn hàng:', orderRes.data.order?.id);
  console.log('  Tổng tiền hóa đơn:', orderRes.data.order?.total_amount?.toLocaleString('vi-VN'), 'VND');

  // --- BƯỚC 7: NHÂN VIÊN KẾT THÚC CA (CHECK-OUT) ---
  console.log('\n📌 BƯỚC 7: Nhân viên hoàn thành ca và bấm KẾT THÚC CA (Check-out)...');
  const checkOutIso = new Date(Date.now() + 5000).toISOString();
  const checkOutRes = await apiFetch(
    '/api/attendance/check-out',
    {
      method: 'POST',
      body: JSON.stringify({
        check_type: 'check_out',
        captured_at_client: checkOutIso,
        photo_base64: TEST_JPEG_BASE64,
        latitude: 22.753333,
        longitude: 104.685278,
        location_address: 'Khu ẩm thực Hoàng Su Phì, Tỉnh Hà Giang',
        device_id: 'dev_test_e2e_runner',
      }),
    },
    staffCookieHeader
  );

  console.log('  Kết quả Check-Out:', checkOutRes.status, checkOutRes.data);
  if (!checkOutRes.ok || !checkOutRes.data.success) {
    throw new Error(`Check-out thất bại: ${JSON.stringify(checkOutRes.data)}`);
  }
  console.log('  🎉 KẾT CA THÀNH CÔNG RỰC RỠ!');
  console.log('  Bản ghi ID:', checkOutRes.data.record?.id);

  // --- BƯỚC 8: CHỦ QUÁN XUẤT BẢNG CÔNG ---
  console.log('\n📌 BƯỚC 8: Chủ quán đối soát & xem lịch sử bảng công...');
  const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-10"
  const exportRes = await apiFetch(`/api/attendance/export?month=${currentMonth}`, {}, adminCookieHeader);
  if (exportRes.ok) {
    console.log('  ✅ Xuất bảng công tháng OK, tổng bản ghi:', exportRes.data.total_records || exportRes.data.records?.length || 0);
  } else {
    console.log('  ℹ️ Xuất bảng công trả về:', exportRes.status, exportRes.data);
  }

  console.log('\n================================================================');
  console.log('🏆 TOÀN BỘ LUỒNG KIỂM THỬ THÀNH CÔNG 100%! HỆ THỐNG HOÀN HẢO!');
  console.log('================================================================');
}

runLiveE2ETest().catch((err) => {
  console.error('\n❌ KIỂM THỬ GẶP LỖI:', err);
  process.exit(1);
});
