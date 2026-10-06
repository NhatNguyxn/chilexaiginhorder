import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { attendanceService } from '@/lib/services/attendance.service';
import { storageService } from '@/lib/storage';
import { calculateDistanceMeters } from '@/lib/geo';
import { AttendanceCheckType } from '@/types';

const attendanceSchema = z.object({
  check_type: z.enum(['check_in', 'check_out']),
  captured_at_client: z.string().datetime(),
  photo_base64: z.string().min(10, 'Ảnh chụp không hợp lệ'),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  location_address: z.string().max(255).optional(),
  device_id: z.string().min(1, 'Thiết bị không xác định'),
  note: z.string().max(300).optional(),
});

export async function handleAttendanceSubmission(request: Request, forcedType?: AttendanceCheckType) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    // 1. Authenticate user
    const supabaseServer = await createClient();
    let userId = 'user-local';
    let userFullName = 'Nhân viên';

    if (supabaseServer) {
      const { data: { user } } = await supabaseServer.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
      }
      userId = user.id;

      const { data: profile } = await supabaseServer
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!profile || profile.is_active === false) {
        return NextResponse.json({ error: 'Tài khoản không hoạt động' }, { status: 403 });
      }
      userFullName = profile.full_name;
    }

    const body = await request.json();
    const validated = attendanceSchema.parse(body);
    const checkType = forcedType || validated.check_type;

    const serverNow = new Date();
    const clientTime = new Date(validated.captured_at_client);
    const flags: string[] = [];

    // 2. Time drift check (> 2 minutes)
    const timeDriftMs = Math.abs(serverNow.getTime() - clientTime.getTime());
    if (timeDriftMs > 120000) {
      flags.push('TIME_DRIFT_EXCEEDED');
    }

    // 3. Geofence & Location calculation
    const settings = await attendanceService.getSettings();
    let distanceMeters: number | null = null;

    if (validated.latitude != null && validated.longitude != null) {
      distanceMeters = calculateDistanceMeters(
        validated.latitude,
        validated.longitude,
        settings.latitude,
        settings.longitude
      );

      if (distanceMeters > settings.radius_meters) {
        flags.push('OUT_OF_RADIUS');
        if (settings.warning_mode === 'block') {
          return NextResponse.json(
            {
              error: `Vị trí hiện tại (${distanceMeters}m) cách quán quá xa (cho phép tối đa ${settings.radius_meters}m). Bạn cần có mặt tại quán để chấm công.`,
            },
            { status: 400 }
          );
        }
      }
    } else {
      flags.push('NO_GPS');
    }

    // 4. Decode base64 and upload photo to Supabase Storage
    const base64Data = validated.photo_base64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const year = serverNow.getFullYear();
    const month = String(serverNow.getMonth() + 1).padStart(2, '0');
    const timestamp = serverNow.getTime();
    const storagePath = `${year}/${month}/${userId}/${timestamp}_${checkType}.jpg`;

    const uploadedPath = await storageService.uploadAttendancePhoto(imageBuffer, storagePath);
    const signedUrl = await storageService.getSignedUrl(uploadedPath, 3600);

    // 5. Determine record status
    const recordStatus = flags.length > 0 ? 'flagged' : 'valid';

    // 6. Save attendance record
    const record = await attendanceService.createRecord({
      user_id: userId,
      check_type: checkType,
      captured_at_client: validated.captured_at_client,
      captured_at_server: serverNow.toISOString(),
      photo_url: uploadedPath,
      location_name: validated.location_address || settings.store_name,
      latitude: validated.latitude ?? null,
      longitude: validated.longitude ?? null,
      distance_meters: distanceMeters,
      device_id: validated.device_id,
      ip_address: ip,
      flags,
      status: recordStatus,
      note: validated.note?.trim() || null,
    });

    return NextResponse.json({
      success: true,
      message: checkType === 'check_in' ? 'Vào ca thành công' : 'Kết ca thành công',
      record: {
        ...record,
        photo_url_signed: signedUrl,
      },
      flags,
      user_name: userFullName,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Dữ liệu chấm công không hợp lệ' },
        { status: 400 }
      );
    }
    console.error('Attendance submit error:', error);
    return NextResponse.json(
      { error: 'Lỗi máy chủ khi ghi nhận chấm công' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return handleAttendanceSubmission(request);
}
