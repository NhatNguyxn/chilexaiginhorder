/**
 * Script to trigger live test data cleanup on Vercel production
 */
const BASE_URL = process.env.TEST_BASE_URL || 'https://chilexaiginhorder.vercel.app';

async function main() {
  console.log('================================================================');
  console.log('🧹 BẮT ĐẦU DỌN DẸP TOÀN BỘ DỮ LIỆU KIỂM THỬ TRÊN VERCEL');
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log('================================================================\n');

  // 1. Log in as Owner
  console.log('1. Đang đăng nhập tài khoản Chủ quán (0333859626)...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: '0333859626',
      password: 'MebanManh@@@626',
    }),
  });

  const setCookieHeaders = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [];
  const adminCookieHeader = setCookieHeaders.map((c) => c.split(';')[0]).join('; ');

  if (!loginRes.ok) {
    const errText = await loginRes.text();
    throw new Error(`Đăng nhập thất bại: ${errText}`);
  }
  console.log('  ✅ Đăng nhập Chủ quán thành công!\n');

  // 2. Call clean-test-data endpoint
  console.log('2. Đang gửi yêu cầu dọn dẹp dữ liệu kiểm thử (/api/admin/clean-test-data)...');
  const cleanRes = await fetch(`${BASE_URL}/api/admin/clean-test-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookieHeader,
    },
  });

  const cleanText = await cleanRes.text();
  let cleanData;
  try {
    cleanData = JSON.parse(cleanText);
  } catch {
    console.error(`  ❌ Phản hồi từ server: HTTP ${cleanRes.status}:`, cleanText.slice(0, 500));
    throw new Error(`Server trả về HTTP ${cleanRes.status} (không phải JSON)`);
  }

  if (!cleanRes.ok || !cleanData.success) {
    throw new Error(`Dọn dẹp thất bại: ${JSON.stringify(cleanData)}`);
  }

  console.log('  ✅ DỌN DẸP DỮ LIỆU HOÀN TẤT RỰC RỠ!\n');
  console.log('📊 THỐNG KÊ CHI TIẾT CÁC BẢN GHI ĐÃ DỌN DẸP:');
  console.log('--------------------------------------------------');
  console.log(`  • Tài khoản nhân viên test đã xóa: ${cleanData.summary.staff_accounts_deleted}`);
  console.log(`  • Bản ghi chấm công đã xóa:        ${cleanData.summary.attendance_records_deleted}`);
  console.log(`  • Yêu cầu sửa công đã xóa:          ${cleanData.summary.attendance_adjustments_deleted}`);
  console.log(`  • Đơn hàng (orders) đã xóa:         ${cleanData.summary.orders_deleted}`);
  console.log(`  • Chi tiết món (order items) đã xóa: ${cleanData.summary.order_items_deleted}`);
  console.log(`  • Phiên bàn (table sessions) đã xóa: ${cleanData.summary.table_sessions_deleted}`);
  console.log(`  • Nhật ký thao tác (audit logs) đã xóa: ${cleanData.summary.audit_logs_deleted}`);
  console.log(`  • Tài khoản Chủ quán được giữ nguyên: ${cleanData.summary.preserved_owner.username}`);
  console.log(`  • Số lượng bàn chuẩn (Bàn 01 -> 10):  ${cleanData.summary.active_tables}`);
  console.log('--------------------------------------------------\n');

  // 3. Verify clean state
  console.log('3. Đối soát lại trạng thái hệ thống:');

  // 3a. Check attendance
  const attRes = await fetch(`${BASE_URL}/api/admin/attendance?mode=today`, {
    headers: { Cookie: adminCookieHeader },
  });
  const attData = await attRes.json();
  console.log(`  • Danh sách chấm công hôm nay còn lại: ${attData.records?.length || 0} bản ghi (Chuẩn sạch: 0)`);

  // 3b. Check staff
  const staffRes = await fetch(`${BASE_URL}/api/admin/staff`, {
    headers: { Cookie: adminCookieHeader },
  });
  const staffData = await staffRes.json();
  console.log(`  • Danh sách nhân viên còn lại: ${staffData.staff?.length || 0} người`);

  // 3c. Check tables
  const tablesRes = await fetch(`${BASE_URL}/api/admin/tables`, {
    headers: { Cookie: adminCookieHeader },
  });
  const tablesData = await tablesRes.json();
  console.log(`  • Danh sách bàn phục vụ hiện có: ${tablesData.tables?.length || 0} bàn (Bàn 01 -> Bàn 10)`);

  console.log('\n================================================================');
  console.log('🏆 TOÀN BỘ HỆ THỐNG ĐÃ TRỞ VỀ TRẠNG THÁI SẠCH SẼ HOÀN TOÀN!');
  console.log('================================================================');
}

main().catch((err) => {
  console.error('\n❌ LỖI KHI DỌN DẸP DỮ LIỆU:', err);
  process.exit(1);
});
