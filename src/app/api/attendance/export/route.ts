import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { attendanceService } from '@/lib/services/attendance.service';
import { generateAttendanceExcel, generateAttendanceCsvWithBom, calculateShiftHours } from '@/lib/excel';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'xlsx';
    const month = searchParams.get('month') || '';
    const userId = searchParams.get('user_id') || undefined;

    // Verify caller has owner or manager role
    const supabaseServer = await createClient();
    if (supabaseServer) {
      const { data: { user } } = await supabaseServer.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
      }

      const { data: profile } = await supabaseServer
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['owner', 'manager'].includes(profile.role)) {
        return NextResponse.json({ error: 'Chỉ Quản lý hoặc Chủ quán mới có quyền xuất file' }, { status: 403 });
      }
    }

    // Determine date filter for month (e.g. "2026-10")
    let startDate: string | undefined;
    let endDate: string | undefined;
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      startDate = `${month}-01T00:00:00.000Z`;
      const [y, m] = month.split('-').map(Number);
      const nextMonth = new Date(Date.UTC(y, m, 1));
      endDate = nextMonth.toISOString();
    }

    // Fetch records
    const { records } = await attendanceService.getRecords({
      userId,
      startDate,
      endDate,
      limit: 1000,
    });

    // Group into paired shifts (check_in and check_out)
    // Map records by user and date
    const checkIns = records.filter((r) => r.check_type === 'check_in');
    const checkOuts = records.filter((r) => r.check_type === 'check_out');

    const detailItems = checkIns.map((ci, idx) => {
      // Find closest subsequent checkout for same user
      const matchingCo = checkOuts.find(
        (co) =>
          co.user_id === ci.user_id &&
          new Date(co.captured_at_server) >= new Date(ci.captured_at_server) &&
          new Date(co.captured_at_server).getTime() - new Date(ci.captured_at_server).getTime() < 24 * 3600 * 1000
      );

      const hours = matchingCo
        ? calculateShiftHours(ci.captured_at_server, matchingCo.captured_at_server)
        : 0;

      const dateStr = new Date(ci.captured_at_server).toLocaleDateString('vi-VN');
      const inTimeStr = new Date(ci.captured_at_server).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const outTimeStr = matchingCo
        ? new Date(matchingCo.captured_at_server).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : ci.status === 'auto_closed'
        ? 'Tự đóng 23:59'
        : 'Chưa kết ca';

      return {
        stt: idx + 1,
        date: dateStr,
        user_name: ci.user?.full_name || 'Nhân viên',
        username: ci.user?.username || 'user',
        check_in_time: inTimeStr,
        check_out_time: outTimeStr,
        total_hours: hours > 0 ? `${hours}h` : '--',
        distance_meters: ci.distance_meters != null ? `${ci.distance_meters}m` : 'N/A',
        flags: ci.flags.length > 0 ? ci.flags.join(', ') : 'Hợp lệ',
        status:
          ci.status === 'valid'
            ? 'Hợp lệ'
            : ci.status === 'flagged'
            ? 'Bất thường'
            : ci.status === 'auto_closed'
            ? 'Tự đóng ca'
            : 'Đã sửa công',
        note: ci.note || '',
      };
    });

    // Summary grouped by staff
    const userSummaryMap = new Map<
      string,
      { user_name: string; username: string; total_shifts: number; total_hours: number; flagged_count: number }
    >();

    detailItems.forEach((d) => {
      const existing = userSummaryMap.get(d.username) || {
        user_name: d.user_name,
        username: d.username,
        total_shifts: 0,
        total_hours: 0,
        flagged_count: 0,
      };
      existing.total_shifts += 1;
      const numHours = parseFloat(d.total_hours) || 0;
      existing.total_hours += numHours;
      if (d.flags !== 'Hợp lệ') existing.flagged_count += 1;
      userSummaryMap.set(d.username, existing);
    });

    const summaryItems = Array.from(userSummaryMap.values()).map((s, idx) => ({
      stt: idx + 1,
      user_name: s.user_name,
      username: s.username,
      total_shifts: s.total_shifts,
      total_hours: Math.round(s.total_hours * 100) / 100,
      flagged_count: s.flagged_count,
    }));

    const filenameBase = month
      ? `Bang_Cham_Cong_Chi_Le_${month}`
      : `Bang_Cham_Cong_Chi_Le_${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      const csvContent = generateAttendanceCsvWithBom(detailItems);
      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filenameBase}.csv"`,
        },
      });
    }

    // Default XLSX export
    const excelBuffer = await generateAttendanceExcel(detailItems, summaryItems, month);
    return new Response(new Uint8Array(excelBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filenameBase}.xlsx"`,
      },
    });
  } catch (error: unknown) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Lỗi xuất file dữ liệu chấm công' }, { status: 500 });
  }
}
