'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import AudioAlertBanner from '@/components/AudioAlertBanner';
import OrderCard from '@/components/OrderCard';
import { orderService, tableService, sessionService, realtimeService } from '@/lib/services';
import { Order, OrderStatus, Table, TableSession } from '@/types';
import { soundManager } from '@/lib/audio';
import { formatVND } from '@/lib/constants';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { 
  BellRing, 
  CheckCircle2, 
  Clock, 
  Flame, 
  Receipt, 
  Volume2, 
  VolumeX, 
  Layers, 
  Coffee, 
  X, 
  CreditCard,
  Camera,
  AlertTriangle,
  Play
} from 'lucide-react';

export default function StaffDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [shiftStarted, setShiftStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'preparing' | 'served' | 'cancelled'>('all');
  const [viewMode, setViewMode] = useState<'feed' | 'tables'>('tables');
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'connecting' | 'error' | 'disconnected'>('disconnected');
  
  // Checkout Modal state
  const [selectedTableForCheckout, setSelectedTableForCheckout] = useState<Table | null>(null);
  const [isClosingSession, setIsClosingSession] = useState(false);

  // Cancellation Modal state
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('Hết nguyên liệu');
  const [customReason, setCustomReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Track previous order count to detect new orders and ring bell
  const [prevOrderCount, setPrevOrderCount] = useState<number>(0);

  const loadData = useCallback(async () => {
    try {
      const [o, t, s] = await Promise.all([
        orderService.getOrders(),
        tableService.getTables(),
        sessionService.getActiveSessions(),
      ]);
      setOrders(o);
      setTables(t);
      setSessions(s);
    } catch (err) {
      console.error('Lỗi tải dữ liệu quầy:', err);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to Postgres changes with reconnect handler
    const unsubscribe = realtimeService.subscribeToChanges(
      () => {
        orderService.getOrders().then(setOrders).catch(console.error);
      },
      () => {
        sessionService.getActiveSessions().then(setSessions).catch(console.error);
      },
      (status) => {
        setRealtimeStatus(status);
      }
    );

    return () => unsubscribe();
  }, [loadData]);

  // Audio & Notification trigger on new order arrival
  useEffect(() => {
    const newOrders = orders.filter((o) => o.status === 'new');
    if (newOrders.length > prevOrderCount && prevOrderCount >= 0 && shiftStarted) {
      if (soundEnabled) {
        soundManager.playNewOrderBell();
      }
      // Mobile vibration fallback
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([200, 100, 200]);
        } catch {
          // ignore
        }
      }
    }
    setPrevOrderCount(newOrders.length);
  }, [orders, prevOrderCount, soundEnabled, shiftStarted]);

  // Unlock AudioContext and start shift
  const handleStartShift = () => {
    soundManager.unlock();
    setSoundEnabled(true);
    setShiftStarted(true);
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(console.error);
    }
  };

  // Toggle sound
  const handleToggleSound = () => {
    if (!soundEnabled) {
      soundManager.unlock();
      setSoundEnabled(true);
    } else {
      setSoundEnabled(false);
    }
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') return orders;
    return orders.filter((o) => o.status === activeTab);
  }, [orders, activeTab]);

  const newOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === 'new').length;
  }, [orders]);

  const preparingCount = useMemo(() => {
    return orders.filter((o) => o.status === 'preparing').length;
  }, [orders]);

  // Active sessions with table info and unpaid balance
  const activeTableSessions = useMemo(() => {
    const openSessions = sessions.filter((s) => s.status === 'open');
    return openSessions.map((session) => {
      const table = tables.find((t) => t.id === session.table_id);
      const sessionOrders = orders.filter((o) => o.session_id === session.id);
      const total = sessionOrders
        .filter((o) => o.status !== 'cancelled')
        .reduce((sum, ord) => {
          return (
            sum +
            (ord.items || []).reduce(
              (iSum, item) => iSum + item.price_at_order * item.quantity,
              0
            )
          );
        }, 0);
      const hasNew = sessionOrders.some((o) => o.status === 'new');
      const hasPreparing = sessionOrders.some((o) => o.status === 'preparing');

      return {
        session,
        table,
        orders: sessionOrders,
        total,
        hasNew,
        hasPreparing,
      };
    });
  }, [sessions, tables, orders]);

  // Update order status
  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await orderService.updateOrderStatus(orderId, status);
      await loadData();
    } catch (err) {
      console.error('Lỗi đổi trạng thái đơn:', err);
    }
  };

  // Perform checkout and close session
  const handleConfirmCheckout = async () => {
    if (!selectedTableForCheckout) return;
    setIsClosingSession(true);

    try {
      const activeSess = sessions.find(
        (s) => s.table_id === selectedTableForCheckout.id && s.status === 'open'
      );
      if (activeSess) {
        await sessionService.closeSession(activeSess.id);
      }
      setSelectedTableForCheckout(null);
      await loadData();
    } catch (err) {
      console.error('Lỗi đóng phiên bàn:', err);
    } finally {
      setIsClosingSession(false);
    }
  };

  // Confirm order cancellation
  const handleConfirmCancelOrder = async () => {
    if (!cancellingOrderId) return;
    const finalReason = cancellationReason === 'Khác' ? customReason.trim() : cancellationReason;
    if (!finalReason) {
      alert('Vui lòng nhập lý do hủy đơn.');
      return;
    }

    setIsCancelling(true);
    try {
      await orderService.cancelOrder(cancellingOrderId, finalReason);
      setCancellingOrderId(null);
      setCustomReason('');
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi hủy đơn');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-kraft pb-12">
      <Navbar role="staff" />

      {/* Start Shift Overlay / Banner if shift not started */}
      {!shiftStarted && (
        <div className="bg-amber-500/15 border-b border-amber-600/30 px-4 py-3 sticky top-16 z-30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-pine">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 animate-bounce" />
              <div>
                <p className="font-serif font-bold text-sm">
                  Chưa bắt đầu ca làm việc: Chuông thông báo đơn hàng đang tạm khóa!
                </p>
                <p className="text-xs text-pine-2">
                  Trình duyệt yêu cầu bạn chạm vào nút &quot;Bắt đầu ca&quot; để cấp quyền phát chuông báo khi có khách gọi món mới.
                </p>
              </div>
            </div>
            <button
              onClick={handleStartShift}
              className="px-5 py-2.5 bg-pine text-kraft font-serif font-bold text-xs rounded-xl shadow hover:bg-pine/90 transition flex items-center gap-2 tap-active whitespace-nowrap"
            >
              <Play className="w-4 h-4 text-moss fill-current" />
              <span>Bắt đầu ca & Bật chuông ngay</span>
            </button>
          </div>
        </div>
      )}

      {/* Prominent Warning if sound is turned off manually */}
      {shiftStarted && !soundEnabled && (
        <div className="bg-clay/10 border-b border-clay/30 px-4 py-2 text-center text-xs text-clay font-bold flex items-center justify-center gap-2">
          <VolumeX className="w-4 h-4" />
          <span>Cảnh báo: Chuông báo đơn hàng đang TẮT. Hãy bật chuông để không bỏ lỡ đơn của khách!</span>
          <button
            onClick={handleToggleSound}
            className="underline ml-1 hover:text-clay/80"
          >
            Bật lại ngay
          </button>
        </div>
      )}

      {/* Staff Action Top Bar */}
      <div className="max-w-7xl mx-auto px-4 pt-4 flex flex-wrap items-center justify-between gap-3">
        {/* Quick Attendance button */}
        <Link
          href="/staff/attendance"
          className="inline-flex items-center gap-2 px-4 py-2 bg-moss hover:bg-moss/90 text-white font-bold text-xs rounded-xl shadow-sm transition tap-active"
        >
          <Camera className="w-4 h-4" />
          <span>Chấm công Vào/Kết ca</span>
        </Link>

        {/* Realtime status & Sound Toggle */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-kraft-card border border-brass/30 text-[11px] font-semibold text-pine">
            <span
              className={`w-2 h-2 rounded-full ${
                realtimeStatus === 'connected'
                  ? 'bg-moss animate-pulse'
                  : realtimeStatus === 'connecting'
                  ? 'bg-amber-500 animate-spin'
                  : 'bg-clay'
              }`}
            />
            <span>
              {realtimeStatus === 'connected'
                ? 'Đã kết nối trực tiếp (Realtime)'
                : realtimeStatus === 'connecting'
                ? 'Đang kết nối lại...'
                : 'Mất kết nối (Tự tải lại)'}
            </span>
          </div>

          <button
            onClick={handleToggleSound}
            className={`p-2 rounded-xl border transition tap-active flex items-center gap-1.5 text-xs font-bold ${
              soundEnabled
                ? 'bg-moss/10 border-moss/40 text-moss'
                : 'bg-clay/10 border-clay/40 text-clay'
            }`}
            title={soundEnabled ? 'Tắt âm báo' : 'Bật âm báo'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Chuông: BẬT' : 'Chuông: TẮT'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Tabs */}
      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* View mode toggle: Tables vs Orders Feed */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brass/20 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('tables')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'tables'
                  ? 'bg-pine text-kraft shadow-sm'
                  : 'bg-kraft-card border border-brass/30 text-pine hover:bg-kraft-dark/30'
              }`}
            >
              <Coffee className="w-4 h-4" />
              <span>Sơ đồ bàn & Thanh toán ({activeTableSessions.length})</span>
            </button>
            <button
              onClick={() => setViewMode('feed')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'feed'
                  ? 'bg-pine text-kraft shadow-sm'
                  : 'bg-kraft-card border border-brass/30 text-pine hover:bg-kraft-dark/30'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Dòng đơn gọi món ({orders.length})</span>
            </button>
          </div>

          {/* Feed Filter Tabs */}
          {viewMode === 'feed' && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {(['all', 'new', 'preparing', 'served', 'cancelled'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                    activeTab === tab
                      ? 'bg-moss text-white shadow-sm'
                      : 'bg-kraft-soft border border-brass/30 text-pine hover:bg-kraft-dark/40'
                  }`}
                >
                  {tab === 'all' && `Tất cả (${orders.length})`}
                  {tab === 'new' && `Chờ làm (${newOrdersCount})`}
                  {tab === 'preparing' && `Đang pha (${preparingCount})`}
                  {tab === 'served' && 'Đã phục vụ'}
                  {tab === 'cancelled' && 'Đã hủy'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 1. Sơ đồ bàn đang hoạt động (Tables View) */}
        {viewMode === 'tables' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tables.map((table) => {
                const activeSess = activeTableSessions.find((ats) => ats.table?.id === table.id);
                const hasOrders = Boolean(activeSess && activeSess.orders.length > 0);

                return (
                  <div
                    key={table.id}
                    className={`bg-kraft-card border rounded-2xl p-4 shadow-card flex flex-col justify-between transition ${
                      activeSess?.hasNew
                        ? 'border-clay ring-2 ring-clay/20 animate-pulse-slow'
                        : activeSess?.hasPreparing
                        ? 'border-brass'
                        : hasOrders
                        ? 'border-moss/40'
                        : 'border-brass/20 opacity-70 bg-kraft-dark/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-serif font-bold text-pine text-base sm:text-lg">
                            {table.name}
                          </h3>
                          <span className="text-[10px] text-pine-2 font-mono">
                            {table.slug}
                          </span>
                        </div>
                        {hasOrders ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              activeSess?.hasNew
                                ? 'bg-clay text-white animate-bounce'
                                : activeSess?.hasPreparing
                                ? 'bg-brass text-pine'
                                : 'bg-moss/10 text-moss'
                            }`}
                          >
                            {activeSess?.hasNew
                              ? 'Đơn mới!'
                              : activeSess?.hasPreparing
                              ? 'Đang làm'
                              : 'Đang ngồi'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-pine-2/60 bg-kraft px-2 py-0.5 rounded-md">
                            Bàn trống
                          </span>
                        )}
                      </div>

                      {/* Summary of active orders in table */}
                      {hasOrders && activeSess && (
                        <div className="mt-3 pt-2 border-t border-brass/10 space-y-1.5 text-xs">
                          <div className="flex justify-between text-pine-2">
                            <span>Số lượt gọi:</span>
                            <span className="font-bold text-pine">
                              {activeSess.orders.length} lần
                            </span>
                          </div>
                          <div className="flex justify-between text-pine-2">
                            <span>Tạm tính bill:</span>
                            <span className="font-serif font-bold text-clay text-sm">
                              {formatVND(activeSess.total)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Table Action */}
                    <div className="mt-4 pt-2 border-t border-brass/10 flex items-center gap-2">
                      {hasOrders ? (
                        <button
                          onClick={() => setSelectedTableForCheckout(table)}
                          className="w-full py-2 bg-moss hover:bg-moss/90 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm tap-active"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Tính tiền & Trả bàn</span>
                        </button>
                      ) : (
                        <Link
                          href={`/order/${table.qr_token || table.slug}`}
                          target="_blank"
                          className="w-full py-2 bg-kraft-dark/40 hover:bg-kraft-dark/70 text-pine rounded-xl text-xs font-semibold transition text-center"
                        >
                          Mở gọi món hộ
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Dòng đơn hàng (Feed View) */}
        {viewMode === 'feed' && (
          <div>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 text-pine-2">
                <Coffee className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="font-serif text-sm">Không có đơn hàng nào trong mục này.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onUpdateStatus={handleUpdateStatus}
                    onCancelOrder={(id) => setCancellingOrderId(id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Checkout / Payment Modal */}
      {selectedTableForCheckout && (
        <div className="fixed inset-0 z-50 bg-pine/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-kraft-card w-full max-w-md rounded-3xl border border-brass/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-brass/20 pb-3">
              <div>
                <h3 className="font-serif font-bold text-pine text-lg">
                  Thanh toán & Trả {selectedTableForCheckout.name}
                </h3>
                <p className="text-xs text-pine-2">Đóng phiên ngồi và hoàn tất đơn</p>
              </div>
              <button
                onClick={() => setSelectedTableForCheckout(null)}
                className="p-1.5 rounded-full text-pine-2 hover:bg-kraft"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill summary */}
            {(() => {
              const activeSess = activeTableSessions.find(
                (ats) => ats.table?.id === selectedTableForCheckout.id
              );
              return (
                <div className="space-y-3 bg-kraft p-4 rounded-2xl border border-brass/20">
                  <div className="flex justify-between text-xs text-pine-2">
                    <span>Tổng lượt gọi:</span>
                    <span className="font-bold text-pine">{activeSess?.orders.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-brass/20">
                    <span className="font-serif font-bold text-pine">Tổng tiền thanh toán:</span>
                    <span className="font-serif font-bold text-clay text-xl">
                      {formatVND(activeSess?.total || 0)}
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setSelectedTableForCheckout(null)}
                className="flex-1 py-3 rounded-xl border border-brass/40 text-pine font-bold text-xs hover:bg-kraft-dark/20"
              >
                Quay lại
              </button>
              <button
                onClick={handleConfirmCheckout}
                disabled={isClosingSession}
                className="flex-1 py-3 bg-moss hover:bg-moss/90 text-white rounded-xl font-serif font-bold text-sm shadow tap-active disabled:opacity-50"
              >
                {isClosingSession ? 'Đang hoàn tất...' : 'Xác nhận thu tiền'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Reason Modal */}
      {cancellingOrderId && (
        <div className="fixed inset-0 z-50 bg-pine/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-kraft-card w-full max-w-sm rounded-3xl border border-brass/40 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-brass/20 pb-3">
              <div className="flex items-center gap-2 text-clay">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-serif font-bold text-base">Hủy đơn hàng</h3>
              </div>
              <button
                onClick={() => setCancellingOrderId(null)}
                className="p-1 rounded-full text-pine-2 hover:bg-kraft"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-pine">
                Vui lòng chọn lý do hủy (tiền sẽ tự động trừ khỏi bill bàn):
              </label>

              {['Hết nguyên liệu / món', 'Khách đổi ý hủy', 'Khách rời bàn', 'Khác'].map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-brass/30 bg-kraft cursor-pointer text-xs font-semibold text-pine"
                >
                  <input
                    type="radio"
                    name="cancellation_reason"
                    checked={cancellationReason === r}
                    onChange={() => setCancellationReason(r)}
                    className="accent-moss"
                  />
                  <span>{r}</span>
                </label>
              ))}

              {cancellationReason === 'Khác' && (
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Nhập lý do chi tiết..."
                  maxLength={100}
                  className="w-full px-3 py-2 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-xs text-pine"
                />
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setCancellingOrderId(null)}
                className="flex-1 py-2.5 rounded-xl border border-brass/40 text-pine font-bold text-xs"
              >
                Bỏ qua
              </button>
              <button
                onClick={handleConfirmCancelOrder}
                disabled={isCancelling}
                className="flex-1 py-2.5 bg-clay hover:bg-clay/90 text-white font-bold text-xs rounded-xl shadow tap-active disabled:opacity-50"
              >
                {isCancelling ? 'Đang hủy...' : 'Xác nhận hủy đơn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
