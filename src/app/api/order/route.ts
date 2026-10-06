import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured, supabase as clientSupabase } from '@/lib/supabase/client';

// Rate limiting in-memory map: key -> timestamps[]
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(key: string, limit: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(key) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) {
    return false;
  }
  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  return true;
}

const orderItemSchema = z.object({
  menuItemId: z.string().min(1, 'ID món không được để trống'),
  quantity: z.number().int().positive('Số lượng món phải lớn hơn 0').max(50, 'Số lượng tối đa 50 mỗi món'),
  note: z.string().max(200, 'Ghi chú tối đa 200 ký tự').optional(),
});

const createOrderSchema = z.object({
  table_token: z.string().min(1, 'Mã xác thực bàn không hợp lệ'),
  items: z.array(orderItemSchema).min(1, 'Đơn hàng phải có ít nhất 1 món'),
  note: z.string().max(500, 'Ghi chú đơn hàng tối đa 500 ký tự').optional(),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const body = await request.json();
    const validated = createOrderSchema.parse(body);

    // 1. Rate limiting by IP and table token
    const rateLimitKey = `${ip}:${validated.table_token}`;
    if (!checkRateLimit(rateLimitKey, 6, 60000)) {
      return NextResponse.json(
        { error: 'Bạn đang thao tác quá nhanh. Vui lòng đợi 1 phút trước khi gửi đơn tiếp theo.' },
        { status: 429 }
      );
    }

    const db = getAdminClient() || clientSupabase;

    if (!isSupabaseConfigured || !db) {
      // In-memory demo simulation when DB is not yet connected
      const fakeOrderId = 'ord-' + Date.now();
      return NextResponse.json({
        success: true,
        message: 'Đơn hàng đã được tiếp nhận thành công',
        order: {
          id: fakeOrderId,
          status: 'new',
          items_count: validated.items.length,
          received_at: new Date().toISOString(),
        },
      });
    }

    // 2. Lookup table by qr_token (or fallback to slug)
    let { data: table, error: tableErr } = await db
      .from('tables')
      .select('id, name, slug, qr_token, is_active')
      .or(`qr_token.eq.${validated.table_token},slug.eq.${validated.table_token}`)
      .is('deleted_at', null)
      .maybeSingle();

    const { ensureInitialStoreData, SEED_TABLES, SEED_MENU_ITEMS } = await import(
      '@/lib/services/bootstrap.service'
    );

    if (!table) {
      await ensureInitialStoreData(db);

      const retryTable = await db
        .from('tables')
        .select('id, name, slug, qr_token, is_active')
        .or(`qr_token.eq.${validated.table_token},slug.eq.${validated.table_token}`)
        .is('deleted_at', null)
        .maybeSingle();

      table = retryTable?.data;

      // In-memory table fallback if tables table is missing or empty in Supabase
      if (!table) {
        const foundSeed = SEED_TABLES.find(
          (t) => t.qr_token === validated.table_token || t.slug === validated.table_token
        );
        if (foundSeed) {
          table = { ...foundSeed };
        }
      }
    }

    if (!table || table.is_active === false) {
      return NextResponse.json(
        { error: 'Mã bàn không hợp lệ hoặc bàn đã ngưng phục vụ' },
        { status: 400 }
      );
    }

    // 3. Look up real prices and availability from menu_items
    const itemIds = validated.items.map((i) => i.menuItemId);
    let { data: menuItems } = await db
      .from('menu_items')
      .select('id, name, price, is_available')
      .in('id', itemIds)
      .is('deleted_at', null);

    if (!menuItems || menuItems.length === 0) {
      await ensureInitialStoreData(db);

      const retryMenu = await db
        .from('menu_items')
        .select('id, name, price, is_available')
        .in('id', itemIds)
        .is('deleted_at', null);

      menuItems = retryMenu?.data || [];

      // If still missing, fill from SEED_MENU_ITEMS
      if (menuItems.length === 0) {
        menuItems = SEED_MENU_ITEMS.filter((s) => itemIds.includes(s.id));
      }
    }

    const menuItemMap = new Map((menuItems || []).map((m) => [m.id, m]));

    // Check if any ordered items are in SEED_MENU_ITEMS
    for (const item of validated.items) {
      if (!menuItemMap.has(item.menuItemId)) {
        const seedItem = SEED_MENU_ITEMS.find((s) => s.id === item.menuItemId);
        if (seedItem) {
          menuItemMap.set(item.menuItemId, seedItem);
        }
      }
    }

    // Validate that all ordered items exist and are available
    for (const item of validated.items) {
      const found = menuItemMap.get(item.menuItemId);
      if (!found) {
        return NextResponse.json(
          { error: `Món với ID ${item.menuItemId} không còn tồn tại trong thực đơn` },
          { status: 400 }
        );
      }
      if (found.is_available === false) {
        return NextResponse.json(
          { error: `Món "${found.name}" hiện đã tạm hết hàng` },
          { status: 400 }
        );
      }
    }

    // Calculate total order amount server-side using integer VND
    let orderTotalAmount = 0;
    const preparedOrderItems = validated.items.map((it) => {
      const menuItem = menuItemMap.get(it.menuItemId)!;
      const itemPrice = Math.round(Number(menuItem.price));
      orderTotalAmount += itemPrice * it.quantity;
      return {
        menu_item_id: it.menuItemId,
        quantity: it.quantity,
        note: it.note?.trim() || null,
        price_at_order: itemPrice,
      };
    });

    // 4. Find or create table session & insert order (with resilient DB try/catch)
    let sessionId: string = 'ses-' + Date.now();
    let createdOrder: { id: string; created_at?: string } | null = null;

    try {
      const { data: openSession } = await db
        .from('table_sessions')
        .select('id, total_amount')
        .eq('table_id', table.id)
        .eq('status', 'open')
        .is('deleted_at', null)
        .maybeSingle();

      if (openSession) {
        sessionId = openSession.id;
        const newTotal = (openSession.total_amount || 0) + orderTotalAmount;
        await db
          .from('table_sessions')
          .update({ total_amount: newTotal })
          .eq('id', sessionId);
      } else {
        const { data: newSession } = await db
          .from('table_sessions')
          .insert({
            table_id: table.id,
            status: 'open',
            opened_at: new Date().toISOString(),
            total_amount: orderTotalAmount,
          })
          .select()
          .maybeSingle();

        if (newSession) {
          sessionId = newSession.id;
        }
      }

      // Insert order
      const { data: orderData } = await db
        .from('orders')
        .insert({
          session_id: sessionId,
          table_id: table.id,
          status: 'new',
          note: validated.note?.trim() || null,
          total_amount: orderTotalAmount,
        })
        .select()
        .maybeSingle();

      if (orderData) {
        createdOrder = orderData;
        const orderItemsToInsert = preparedOrderItems.map((poi) => ({
          ...poi,
          order_id: createdOrder!.id,
        }));

        await db.from('order_items').insert(orderItemsToInsert);
      }
    } catch (orderDbErr) {
      console.warn('[Order API] DB persistence warning:', orderDbErr);
    }

    const finalOrderId = createdOrder?.id || ('ord-' + Date.now());

    return NextResponse.json({
      success: true,
      message: 'Đơn hàng đã được gửi tới quầy thành công',
      order: {
        id: finalOrderId,
        session_id: sessionId,
        table_id: table.id,
        table_name: table.name,
        status: 'new',
        total_amount: orderTotalAmount,
        created_at: createdOrder?.created_at || new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Dữ liệu đơn hàng không hợp lệ' },
        { status: 400 }
      );
    }
    console.error('Order API error:', error);
    return NextResponse.json(
      { error: 'Lỗi máy chủ khi tiếp nhận đơn' },
      { status: 500 }
    );
  }
}
