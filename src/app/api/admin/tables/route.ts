import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { ensureInitialStoreData, SEED_TABLES } from '@/lib/services/bootstrap.service';
import { Table } from '@/types';

function generateRandomToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'tok_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  }
  return 'tok_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

// In-memory fallback
let localTables: Table[] = SEED_TABLES.map((t) => ({ ...t }));

// Helper to check owner/manager permission
async function verifyAdminOrManager(request?: Request): Promise<boolean> {
  const adminClient = getAdminClient();
  let user: { id: string } | null = null;

  if (request && adminClient) {
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) {
        try {
          const { data: authData } = await adminClient.auth.getUser(token);
          if (authData?.user) {
            user = authData.user;
          }
        } catch {
          // ignore
        }
      }
    }
  }

  if (!user) {
    const supabaseServer = await createClient();
    if (!supabaseServer) return true; // Local dev mode
    const { data: { user: cookieUser } } = await supabaseServer.auth.getUser();
    user = cookieUser;
  }

  if (!user) return false;

  const db = adminClient || (await createClient());
  if (!db) return true;

  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !['owner', 'manager'].includes(profile.role)) {
    return false;
  }
  return true;
}

export async function GET() {
  try {
    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ tables: localTables.filter((t) => !t.deleted_at) });
    }

    // Auto-bootstrap default tables if empty
    await ensureInitialStoreData(admin);

    const { data, error } = await admin
      .from('tables')
      .select('*')
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) {
      console.warn('[Admin Tables API] GET warning:', error.message);
      return NextResponse.json({ tables: localTables.filter((t) => !t.deleted_at) });
    }

    return NextResponse.json({ tables: data || [] });
  } catch (err: unknown) {
    console.error('[Admin Tables API] GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Lỗi lấy danh sách bàn' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const isAuthorized = await verifyAdminOrManager(request);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này' }, { status: 403 });
    }

    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Tên bàn không được để trống' }, { status: 400 });
    }

    const slug = 'ban-' + Math.random().toString(36).substring(2, 7);
    const qr_token = generateRandomToken();

    const admin = getAdminClient();
    if (!admin) {
      const newTable: Table = {
        id: 'b' + Math.random().toString(36).substring(2, 10),
        name,
        slug,
        qr_token,
        is_active: true,
      };
      localTables.push(newTable);
      return NextResponse.json({ success: true, table: newTable });
    }

    const { data, error } = await admin
      .from('tables')
      .insert({
        name,
        slug,
        qr_token,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('[Admin Tables API] POST error:', error);
      return NextResponse.json({ error: `Lỗi tạo bàn: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, table: data });
  } catch (err: unknown) {
    console.error('[Admin Tables API] POST error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Lỗi tạo bàn' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const isAuthorized = await verifyAdminOrManager(request);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, regenerate_token } = body;
    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã bàn' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (name) updates.name = String(name).trim();
    if (regenerate_token) updates.qr_token = generateRandomToken();

    const admin = getAdminClient();
    if (!admin) {
      const idx = localTables.findIndex((t) => t.id === id);
      if (idx !== -1) {
        localTables[idx] = { ...localTables[idx], ...updates };
      }
      return NextResponse.json({ success: true, table: localTables[idx] });
    }

    const { data, error } = await admin
      .from('tables')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Admin Tables API] PATCH error:', error);
      return NextResponse.json({ error: `Lỗi cập nhật bàn: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, table: data });
  } catch (err: unknown) {
    console.error('[Admin Tables API] PATCH error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Lỗi cập nhật bàn' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const isAuthorized = await verifyAdminOrManager(request);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch {
        // Body may be empty if passed via query param
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã bàn cần xóa' }, { status: 400 });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const nowIso = new Date().toISOString();

    const admin = getAdminClient();
    if (!admin) {
      localTables = localTables.filter((t) => t.id !== id);
      return NextResponse.json({ success: true, message: 'Đã xóa bàn thành công' });
    }

    if (isUuid) {
      // 1. Soft-delete the table
      const { error } = await admin
        .from('tables')
        .update({ deleted_at: nowIso, is_active: false })
        .eq('id', id);

      if (error) {
        console.error('[Admin Tables API] DELETE error:', error);
        return NextResponse.json({ error: `Lỗi xóa bàn: ${error.message}` }, { status: 500 });
      }

      // 2. Also close any active table sessions
      await admin
        .from('table_sessions')
        .update({ status: 'closed', closed_at: nowIso })
        .eq('table_id', id)
        .eq('status', 'active');
    } else {
      // Legacy id (e.g. tbl-1, ban-01) - attempt matching by slug or id in local fallback
      await admin
        .from('tables')
        .update({ deleted_at: nowIso, is_active: false })
        .eq('slug', id);

      localTables = localTables.filter((t) => t.id !== id);
    }

    return NextResponse.json({ success: true, message: 'Đã xóa bàn thành công' });
  } catch (err: unknown) {
    console.error('[Admin Tables API] DELETE error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Lỗi xóa bàn' },
      { status: 500 }
    );
  }
}
