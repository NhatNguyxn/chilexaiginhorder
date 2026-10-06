import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { storageService } from '@/lib/storage';
import { AttendanceRecord } from '@/types';

async function verifyAdminOrManager(): Promise<boolean> {
  const supabaseServer = await createClient();
  if (!supabaseServer) return true; // Local demo mode

  const { data: { user } } = await supabaseServer.auth.getUser();
  if (!user) return false;

  const adminClient = getAdminClient() || supabaseServer;
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !['owner', 'manager'].includes(profile.role)) {
    return false;
  }
  return true;
}

export async function GET(request: Request) {
  try {
    const isAuthorized = await verifyAdminOrManager();
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Chưa đăng nhập hoặc không có quyền quản lý' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'today';
    const userId = searchParams.get('user_id') || undefined;
    const status = searchParams.get('status') || undefined;
    const startDate = searchParams.get('start_date') || undefined;
    const endDate = searchParams.get('end_date') || undefined;
    const limit = Math.min(1000, parseInt(searchParams.get('limit') || '50', 10));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    const db = getAdminClient();
    if (!db) {
      return NextResponse.json({ records: [], total: 0 });
    }

    let query = db.from('attendance_records').select('*', { count: 'exact' });

    if (mode === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte('captured_at_server', today.toISOString());
    } else {
      if (startDate) query = query.gte('captured_at_server', startDate);
      if (endDate) query = query.lte('captured_at_server', endDate);
    }

    if (userId && userId !== 'all') query = query.eq('user_id', userId);
    if (status && status !== 'all') query = query.eq('status', status);

    query = query
      .order('captured_at_server', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error || !data) {
      console.warn('[Admin Attendance API] Query warning:', error?.message);
      return NextResponse.json({ records: [], total: 0 });
    }

    // Attach profiles and signed photo URLs
    const userIds = Array.from(new Set(data.map((r) => r.user_id).filter(Boolean)));
    const profileMap = new Map();

    if (userIds.length > 0) {
      const { data: profiles } = await db
        .from('profiles')
        .select('*')
        .in('id', userIds);

      (profiles || []).forEach((p) => profileMap.set(p.id, p));
    }

    // Generate signed URLs in parallel with concurrency safety
    const enrichedRecords = await Promise.all(
      data.map(async (rec) => {
        let signedPhoto = rec.photo_url;
        if (rec.photo_url && !rec.photo_url.startsWith('http') && !rec.photo_url.startsWith('data:')) {
          try {
            signedPhoto = await storageService.getSignedUrl(rec.photo_url, 3600);
          } catch {
            signedPhoto = '/logo.png';
          }
        }
        return {
          ...rec,
          user: profileMap.get(rec.user_id),
          photo_url_signed: signedPhoto,
        };
      })
    );

    return NextResponse.json({
      records: enrichedRecords,
      total: count || enrichedRecords.length,
    });
  } catch (err: unknown) {
    console.error('[Admin Attendance API] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Lỗi lấy dữ liệu chấm công' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const isAuthorized = await verifyAdminOrManager();
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Chưa đăng nhập hoặc không có quyền quản lý' }, { status: 403 });
    }

    const body = await request.json();
    const { id, captured_at_server, status, note } = body;

    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã bản ghi' }, { status: 400 });
    }

    const db = getAdminClient();
    if (!db) {
      return NextResponse.json({ error: 'Chưa cấu hình cơ sở dữ liệu' }, { status: 500 });
    }

    const updates: Record<string, unknown> = {};
    if (captured_at_server) updates.captured_at_server = captured_at_server;
    if (status) updates.status = status;
    if (note !== undefined) updates.note = note;

    const { data, error } = await db
      .from('attendance_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: `Lỗi cập nhật: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, record: data });
  } catch (err: unknown) {
    console.error('[Admin Attendance API] PATCH error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Lỗi cập nhật bản ghi' },
      { status: 500 }
    );
  }
}
