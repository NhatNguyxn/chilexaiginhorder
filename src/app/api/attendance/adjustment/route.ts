import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { attendanceService } from '@/lib/services/attendance.service';

const createAdjustmentSchema = z.object({
  record_id: z.string().uuid().optional(),
  shift_date: z.string(),
  check_type: z.enum(['check_in', 'check_out']),
  original_time: z.string().datetime().optional(),
  requested_time: z.string().datetime(),
  reason: z.string().min(5, 'Lý do phải từ 5 ký tự trở lên').max(300),
});

const reviewAdjustmentSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
});

export async function POST(request: Request) {
  try {
    const supabaseServer = await createClient();
    let userId = 'user-local';

    if (supabaseServer) {
      const { data: { user } } = await supabaseServer.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
      }
      userId = user.id;
    }

    const body = await request.json();
    const validated = createAdjustmentSchema.parse(body);

    const adj = await attendanceService.createAdjustment({
      user_id: userId,
      record_id: validated.record_id || null,
      shift_date: validated.shift_date,
      check_type: validated.check_type,
      original_time: validated.original_time || null,
      requested_time: validated.requested_time,
      reason: validated.reason,
      requested_by: userId,
    });

    return NextResponse.json({ success: true, adjustment: adj });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Lỗi gửi yêu cầu sửa công' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabaseServer = await createClient();
    let reviewerId = 'owner-local';

    if (supabaseServer) {
      const { data: { user } } = await supabaseServer.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
      }
      reviewerId = user.id;

      const { data: profile } = await supabaseServer
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['owner', 'manager'].includes(profile.role)) {
        return NextResponse.json({ error: 'Chỉ Quản lý hoặc Chủ quán mới có quyền duyệt' }, { status: 403 });
      }
    }

    const body = await request.json();
    const validated = reviewAdjustmentSchema.parse(body);

    await attendanceService.reviewAdjustment(validated.id, validated.status, reviewerId);

    return NextResponse.json({ success: true, message: 'Đã cập nhật yêu cầu sửa công' });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Lỗi duyệt yêu cầu sửa công' }, { status: 500 });
  }
}
