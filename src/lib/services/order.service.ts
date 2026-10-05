import { Order, OrderStatus } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { auditService } from './audit.service';

let localOrders: Order[] = [];

export const orderService = {
  async getOrders(): Promise<Order[]> {
    if (!isSupabaseConfigured || !supabase) {
      return [...localOrders];
    }

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        table:tables(*),
        items:order_items(
          *,
          menu_item:menu_items(*)
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[orderService.getOrders] Error:', error.message);
      return [...localOrders];
    }
    return data || [];
  },

  async getOrdersForTable(tableId: string): Promise<Order[]> {
    if (!isSupabaseConfigured || !supabase) {
      return localOrders.filter((o) => o.table_id === tableId && o.status !== 'cancelled');
    }

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          *,
          menu_item:menu_items(*)
        )
      `)
      .eq('table_id', tableId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[orderService.getOrdersForTable] Error:', error.message);
      return localOrders.filter((o) => o.table_id === tableId);
    }
    return data || [];
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      const idx = localOrders.findIndex((o) => o.id === orderId);
      if (idx !== -1) {
        localOrders[idx].status = status;
      }
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) {
      throw new Error(`Lỗi cập nhật trạng thái đơn: ${error.message}`);
    }
  },

  async cancelOrder(orderId: string, reason: string, cancelledBy?: string): Promise<void> {
    if (!reason || !reason.trim()) {
      throw new Error('Cần cung cấp lý do hủy đơn');
    }

    if (!isSupabaseConfigured || !supabase) {
      const idx = localOrders.findIndex((o) => o.id === orderId);
      if (idx !== -1) {
        localOrders[idx].status = 'cancelled';
        localOrders[idx].cancellation_reason = reason.trim();
      }
      await auditService.log({
        action: 'ORDER_CANCELLED',
        entity_type: 'orders',
        entity_id: orderId,
        new_data: { reason: reason.trim() },
        user_id: cancelledBy,
      });
      return;
    }

    // Fetch current order to get session_id and calculate total to deduct
    const { data: orderData, error: fetchErr } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', orderId)
      .single();

    if (fetchErr || !orderData) {
      throw new Error('Không tìm thấy đơn hàng cần hủy');
    }

    const orderAmount = (orderData.items || []).reduce(
      (sum: number, it: { price_at_order: number; quantity: number }) => sum + it.price_at_order * it.quantity,
      0
    );

    // Update order status to cancelled
    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancellation_reason: reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateErr) {
      throw new Error(`Lỗi hủy đơn: ${updateErr.message}`);
    }

    // Deduct order amount from table_session total_amount
    if (orderData.session_id && orderAmount > 0) {
      const { data: sessionData } = await supabase
        .from('table_sessions')
        .select('total_amount')
        .eq('id', orderData.session_id)
        .single();

      if (sessionData) {
        const newTotal = Math.max(0, (sessionData.total_amount || 0) - orderAmount);
        await supabase
          .from('table_sessions')
          .update({ total_amount: newTotal })
          .eq('id', orderData.session_id);
      }
    }

    // Log to audit logs
    await auditService.log({
      action: 'ORDER_CANCELLED',
      entity_type: 'orders',
      entity_id: orderId,
      old_data: { status: orderData.status, amount: orderAmount },
      new_data: { status: 'cancelled', reason: reason.trim() },
      user_id: cancelledBy,
    });
  },
};
