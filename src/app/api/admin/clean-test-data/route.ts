import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { SEED_TABLES } from '@/lib/services/bootstrap.service';

const OWNER_USERNAME = '0333859626';

export async function POST() {
  try {
    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: 'Thiếu cấu hình SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      );
    }

    // 1. Verify caller is authenticated as the Owner
    const supabaseServer = await createClient();
    if (supabaseServer) {
      const { data: { user } } = await supabaseServer.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
      }

      const { data: profile } = await admin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile || profile.role !== 'owner') {
        return NextResponse.json(
          { error: 'Chỉ Chủ quán mới có quyền dọn dẹp dữ liệu test' },
          { status: 403 }
        );
      }
    }

    console.log('[CleanTestData] Bắt đầu dọn dẹp dữ liệu kiểm thử...');

    // 2. Identify Owner profile and ID
    const { data: ownerProfile } = await admin
      .from('profiles')
      .select('id, username')
      .eq('username', OWNER_USERNAME)
      .maybeSingle();

    const ownerId = ownerProfile?.id;

    // 3. Delete attendance adjustments
    const { count: deletedAdjCount } = await admin
      .from('attendance_adjustments')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

    // 4. Delete attendance records
    const { count: deletedAttCount } = await admin
      .from('attendance_records')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

    // 5. Delete order items
    const { count: deletedOrderItemsCount } = await admin
      .from('order_items')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

    // 6. Delete orders
    const { count: deletedOrdersCount } = await admin
      .from('orders')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

    // 7. Delete table sessions
    const { count: deletedSessionsCount } = await admin
      .from('table_sessions')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

    // 8. Delete audit logs
    const { count: deletedAuditCount } = await admin
      .from('audit_logs')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // 9. Find all non-owner staff users to delete
    let deletedStaffCount = 0;
    const { data: staffProfiles } = await admin
      .from('profiles')
      .select('id, username')
      .neq('username', OWNER_USERNAME);

    if (staffProfiles && staffProfiles.length > 0) {
      for (const staff of staffProfiles) {
        // Delete profile
        await admin.from('profiles').delete().eq('id', staff.id);
        // Delete auth user from GoTrue
        try {
          await admin.auth.admin.deleteUser(staff.id);
          deletedStaffCount++;
        } catch (delErr) {
          console.warn(`[CleanTestData] Không thể xóa GoTrue user ${staff.id}:`, delErr);
        }
      }
    }

    // Also check GoTrue users directly in case there are auth users without profiles
    const { data: authUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authUsers?.users) {
      for (const u of authUsers.users) {
        if (ownerId && u.id === ownerId) continue;
        if (u.email?.startsWith(`${OWNER_USERNAME}@`)) continue;

        try {
          await admin.auth.admin.deleteUser(u.id);
          deletedStaffCount++;
        } catch {
          // Already deleted
        }
      }
    }

    // 10. Clean up storage files in bucket 'attendance'
    try {
      const { data: bucketFiles } = await admin.storage.from('attendance').list();
      if (bucketFiles && bucketFiles.length > 0) {
        // Remove folders / files
        const filePaths = bucketFiles.map((f) => f.name);
        await admin.storage.from('attendance').remove(filePaths);
      }
    } catch (storageErr) {
      console.warn('[CleanTestData] Storage cleanup warning:', storageErr);
    }

    // 11. Reset tables to the clean 10 standard tables (Bàn 01 to Bàn 10)
    // Remove any test tables not in SEED_TABLES
    const seedTableIds = SEED_TABLES.map((t) => t.id);
    await admin
      .from('tables')
      .delete()
      .not('id', 'in', `(${seedTableIds.join(',')})`);

    // Ensure all 10 seed tables are active and not deleted
    for (const st of SEED_TABLES) {
      await admin.from('tables').upsert({
        id: st.id,
        name: st.name,
        slug: st.slug,
        qr_token: st.qr_token,
        is_active: true,
        deleted_at: null,
      }, { onConflict: 'slug' });
    }

    const report = {
      success: true,
      message: 'Đã dọn dẹp toàn bộ dữ liệu kiểm thử thành công!',
      summary: {
        staff_accounts_deleted: deletedStaffCount,
        attendance_records_deleted: deletedAttCount ?? 0,
        attendance_adjustments_deleted: deletedAdjCount ?? 0,
        orders_deleted: deletedOrdersCount ?? 0,
        order_items_deleted: deletedOrderItemsCount ?? 0,
        table_sessions_deleted: deletedSessionsCount ?? 0,
        audit_logs_deleted: deletedAuditCount ?? 0,
        preserved_owner: {
          username: OWNER_USERNAME,
          id: ownerId,
        },
        active_tables: SEED_TABLES.length,
      },
    };

    console.log('[CleanTestData] Kết quả:', report);
    return NextResponse.json(report);
  } catch (err: unknown) {
    console.error('[CleanTestData] Lỗi:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Lỗi dọn dẹp dữ liệu' },
      { status: 500 }
    );
  }
}
