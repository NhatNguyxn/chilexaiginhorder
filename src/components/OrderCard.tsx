'use client';

import { Order } from '@/types';
import { formatVND } from '@/lib/constants';
import { Clock, CheckCircle2, Flame, BellRing } from 'lucide-react';

interface OrderCardProps {
  order: Order;
  onUpdateStatus: (orderId: string, status: 'new' | 'preparing' | 'served') => void;
}

export default function OrderCard({ order, onUpdateStatus }: OrderCardProps) {
  const orderTotal = (order.items || []).reduce(
    (sum, it) => sum + it.price_at_order * it.quantity,
    0
  );

  const formattedTime = new Date(order.created_at).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`rounded-xl border shadow-card transition bg-kraft-card overflow-hidden ${
        order.status === 'new'
          ? 'border-clay ring-2 ring-clay/20 animate-pulse-slow'
          : order.status === 'preparing'
          ? 'border-brass ring-1 ring-brass/30'
          : 'border-brass/30 opacity-90'
      }`}
    >
      {/* Card Header */}
      <div
        className={`px-4 py-2.5 flex items-center justify-between border-b ${
          order.status === 'new'
            ? 'bg-clay text-white'
            : order.status === 'preparing'
            ? 'bg-brass text-pine font-bold'
            : 'bg-kraft-dark/40 text-pine'
        }`}
      >
        <div className="flex items-center gap-2">
          {order.status === 'new' && <BellRing className="w-4 h-4 animate-bounce" />}
          {order.status === 'preparing' && <Flame className="w-4 h-4" />}
          {order.status === 'served' && <CheckCircle2 className="w-4 h-4 text-moss" />}
          <span className="font-serif font-bold text-sm tracking-wide">
            {order.table?.name || `Bàn #${order.table_id.slice(-3)}`}
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs opacity-90">
          <Clock className="w-3.5 h-3.5" />
          <span>{formattedTime}</span>
        </div>
      </div>

      {/* Items list */}
      <div className="p-4 space-y-2.5">
        <div className="divide-y divide-brass/10">
          {(order.items || []).map((it, idx) => (
            <div key={it.id || idx} className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-pine text-sm">
                    {it.quantity}x
                  </span>
                  <span className="font-semibold text-pine text-sm">
                    {it.menu_item?.name || 'Món nước'}
                  </span>
                </div>
                {it.note && (
                  <p className="text-xs text-clay font-medium italic mt-0.5 pl-5">
                    ↳ {it.note}
                  </p>
                )}
              </div>
              <span className="text-xs font-semibold text-pine-2 whitespace-nowrap">
                {formatVND(it.price_at_order * it.quantity)}
              </span>
            </div>
          ))}
        </div>

        {/* General Order Note */}
        {order.note && (
          <div className="bg-kraft-soft border border-brass/30 rounded-lg p-2 text-xs text-pine-2">
            <span className="font-bold text-clay">Ghi chú đơn:</span> {order.note}
          </div>
        )}

        {/* Subtotal */}
        <div className="pt-2 border-t border-brass/20 flex items-center justify-between text-xs">
          <span className="text-pine-2 font-medium">Tổng đợt gọi này:</span>
          <span className="font-bold text-clay text-sm">
            {formatVND(orderTotal)}
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-4 py-2.5 bg-kraft-soft/80 border-t border-brass/20 flex items-center gap-2">
        {order.status === 'new' && (
          <button
            onClick={() => onUpdateStatus(order.id, 'preparing')}
            className="flex-1 py-2 bg-brass hover:bg-brass-soft text-pine font-bold text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-1.5 tap-active"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Pha chế</span>
          </button>
        )}

        {order.status === 'preparing' && (
          <button
            onClick={() => onUpdateStatus(order.id, 'served')}
            className="flex-1 py-2 bg-moss hover:bg-moss/90 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-1.5 tap-active"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Đã ra món</span>
          </button>
        )}

        {order.status === 'served' && (
          <div className="w-full text-center text-xs font-semibold text-moss py-1">
            ✓ Đã phục vụ đủ món
          </div>
        )}
      </div>
    </div>
  );
}
