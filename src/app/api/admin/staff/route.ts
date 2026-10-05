import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { auditService } from '@/lib/services/audit.service';
import { UserRole } from '@/types';

// Zod schemas for input validation
const createStaffSchema = z.object({
  username: z.string().min(2).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ chứa chữ cái, số và dấu gạch dưới'),
  password: z.string().min(6, 'Mật khẩu phải từ 6 ký tự trở lên'),
  full_name: z.string().min(2, 'Họ tên phải từ 2 ký tự trở lên'),
  role: z.enum(['owner', 'manager', 'cashier', 'staff']),
  hourly_rate: z.number().int().nonnegative().optional().default(0),
});

const patchStaffSchema = z.object({
  id: z.string().uuid(),
  is_active: z.boolean().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['owner', 'manager', 'cashier', 'staff']).optional(),
  hourly_rate: z.number().int().nonnegative().optional(),
  full_name: z.string().min(2).optional(),
});

// Helper checking caller permissions
async function getCallerProfile() {
  const serverClient = await createClient();
  if (!serverClient) return null;

  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return null;

  const { data: profile } = await serverClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .is('deleted_at', null)
    .single();

  return profile;
}

export async function GET() {
  const caller = await getCallerProfile();
  if (!caller || !['owner', 'manager'].includes(caller.role)) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Chưa cấu hình Supabase Service Role' }, { status: 500 });
  }

  const { data, error } = await adminClient
    .from('profiles')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ staff: data });
}

export async function POST(request: Request) {
  const caller = await getCallerProfile();
  if (!caller || caller.role !== 'owner') {
    return NextResponse.json({ error: 'Chỉ Chủ quán mới có quyền tạo nhân viên' }, { status: 403 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Chưa cấu hình Supabase Service Role' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const validated = createStaffSchema.parse(body);

    const email = `${validated.username.toLowerCase()}@quan.local`;

    // 1. Create auth user
    const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
      email,
      password: validated.password,
      email_confirm: true,
      user_metadata: {
        username: validated.username,
        full_name: validated.full_name,
      },
    });

    if (authErr || !authData.user) {
      return NextResponse.json(
        { error: authErr?.message || 'Không thể tạo tài khoản người dùng' },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // 2. Insert into profiles
    const { data: profile, error: profileErr } = await adminClient
      .from('profiles')
      .insert({
        id: userId,
        username: validated.username,
        full_name: validated.full_name,
        role: validated.role as UserRole,
        is_active: true,
        hourly_rate: validated.hourly_rate,
      })
      .select()
      .single();

    if (profileErr) {
      // Rollback auth user if profile insertion failed
      await adminClient.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    // 3. Log to audit_logs
    await auditService.log({
      action: 'CREATE_STAFF_USER',
      entity_type: 'profiles',
      entity_id: userId,
      new_data: {
        username: validated.username,
        role: validated.role,
        full_name: validated.full_name,
      },
      user_id: caller.id,
    });

    return NextResponse.json({ success: true, profile });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message || 'Dữ liệu không hợp lệ' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Lỗi máy chủ khi tạo nhân viên' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const caller = await getCallerProfile();
  if (!caller || caller.role !== 'owner') {
    return NextResponse.json({ error: 'Chỉ Chủ quán mới có quyền cập nhật nhân sự' }, { status: 403 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Chưa cấu hình Supabase Service Role' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const validated = patchStaffSchema.parse(body);

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (validated.is_active !== undefined) updates.is_active = validated.is_active;
    if (validated.role !== undefined) updates.role = validated.role;
    if (validated.hourly_rate !== undefined) updates.hourly_rate = validated.hourly_rate;
    if (validated.full_name !== undefined) updates.full_name = validated.full_name;

    // Reset password if provided
    if (validated.password) {
      const { error: pwdErr } = await adminClient.auth.admin.updateUserById(
        validated.id,
        { password: validated.password }
      );
      if (pwdErr) {
        return NextResponse.json({ error: `Lỗi đặt lại mật khẩu: ${pwdErr.message}` }, { status: 400 });
      }
    }

    // Update profile
    const { data: updatedProfile, error: updateErr } = await adminClient
      .from('profiles')
      .update(updates)
      .eq('id', validated.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Audit log
    await auditService.log({
      action: 'UPDATE_STAFF_USER',
      entity_type: 'profiles',
      entity_id: validated.id,
      new_data: updates,
      user_id: caller.id,
    });

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message || 'Dữ liệu không hợp lệ' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Lỗi máy chủ khi cập nhật nhân viên' }, { status: 500 });
  }
}
