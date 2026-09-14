import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { table_id, items, note } = body;

    if (!table_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Dữ liệu đơn hàng không hợp lệ' },
        { status: 400 }
      );
    }

    // In a full Supabase environment, you would insert into DB here.
    // In local dev, response is returned to confirm receipt.
    return NextResponse.json({
      success: true,
      message: 'Đơn hàng đã được tiếp nhận thành công',
      order: {
        table_id,
        items_count: items.length,
        note: note || '',
        received_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Order API error:', error);
    return NextResponse.json(
      { error: 'Lỗi máy chủ khi tiếp nhận đơn' },
      { status: 500 }
    );
  }
}
