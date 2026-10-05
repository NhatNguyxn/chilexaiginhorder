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
    const { data: table, error: tableErr } = await db
      .from('tables')
      .select('id, name, slug, qr_token, is_active')
      .or(`qr_token.eq.${validated.table_token},slug.eq.${validated.table_token}`)
      .is('deleted_at', null)
      .maybeSingle();

    if (tableErr || !table || table.is_active === false) {
      return NextResponse.json(
        { error: 'Mã bàn không hợp lệ hoặc bàn đã ngưng phục vụ' },
        { status: 400 }
      );
    }

    // 3. Look up real prices and availability from menu_items
    const itemIds = validated.items.map((i) => i.menuItemId);
    const { data: menuItems, error: menuErr } = await db
      .from('menu_items')
      .select('id, name, price, is_available')
      .in('id', itemIds)
      .is('deleted_at', null);

    if (menuErr || !menuItems) {
      return NextResponse.json(
        { error: 'Lỗi truy vấn thực đơn quán' },
        { status: 500 }
      );
    }

    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    // Validate that all ordered items exist and are available
    for (const item of validated.items) {
      const found = menuItemMap.get(item.menuItemId);
      if (!found) {
        return NextResponse.json(
          { error: `Món với ID ${item.menuItemId} không còn tồn tại trong thực đơn` },
          { status: 400 }
        );
      }
      if (!found.is_available) {
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

    // 4. Find or create an open table session
    let sessionId: string;
    const { data: openSession } = await db
      .from('table_sessions')
      .select('id, total_amount')
      .eq('table_id', table.id)
      .eq('status', 'open')
      .is('deleted_at', null)
      .maybeSingle();

    if (openSession) {
      sessionId = openSession.id;
      // Increment total amount
      const newTotal = (openSession.total_amount || 0) + orderTotalAmount;
      await db
        .from('table_sessions')
        .update({ total_amount: newTotal })
        .eq('id', sessionId);
    } else {
      const { data: newSession, error: newSessionErr } = await db
        .from('table_sessions')
        .insert({
          table_id: table.id,
          status: 'open',
          opened_at: new Date().toISOString(),
          total_amount: orderTotalAmount,
        })
        .select()
        .single();

      if (newSessionErr || !newSession) {
        return NextResponse.json(
          { error: 'Không thể mở phiên bàn mới' },
          { status: 500 }
        );
      }
      sessionId = newSession.id;
    }

    // 5. Insert order
    const { data: createdOrder, error: orderErr } = await db
      .from('orders')
      .insert({
        session_id: sessionId,
        table_id: table.id,
        status: 'new',
        note: validated.note?.trim() || null,
        total_amount: orderTotalAmount,
      })
      .select()
      .single();

    if (orderErr || !createdOrder) {
      return NextResponse.json(
        { error: `Lỗi ghi nhận đơn hàng: ${orderErr?.message}` },
        { status: 500 }
      );
    }

    // 6. Insert order items
    const orderItemsToInsert = preparedOrderItems.map((poi) => ({
      ...poi,
      order_id: createdOrder.id,
    }));

    const { error: itemsErr } = await db
      .from('order_items')
      .insert(orderItemsToInsert);

    if (itemsErr) {
      console.error('Lỗi thêm order items:', itemsErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Đơn hàng đã được gửi tới quầy thành công',
      order: {
        id: createdOrder.id,
        session_id: sessionId,
        table_id: table.id,
        status: 'new',
        total_amount: orderTotalAmount,
        created_at: createdOrder.created_at,
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
