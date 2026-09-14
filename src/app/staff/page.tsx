'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import AudioAlertBanner from '@/components/AudioAlertBanner';
import OrderCard from '@/components/OrderCard';
import { mockStore } from '@/lib/mock-store';
import { Order, Table, TableSession } from '@/types';
import { soundManager } from '@/lib/audio';
import { formatVND } from '@/lib/constants';
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
  CreditCard
} from 'lucide-react';

export default function StaffDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'preparing' | 'served'>('all');
  const [viewMode, setViewMode] = useState<'feed' | 'tables'>('tables');
  
  // Checkout Modal state
  const [selectedTableForCheckout, setSelectedTableForCheckout] = useState<Table | null>(null);
  const [isClosingSession, setIsClosingSession] = useState(false);

  // Track previous order count to detect new orders and ring bell
  const [prevOrderCount, setPrevOrderCount] = useState<number>(0);

  const loadData = useCallback(() => {
    const o = mockStore.getOrders();
    const t = mockStore.getTables();
    const s = mockStore.getSessions();
    setOrders([...o].reverse()); // newest first
    setTables(t);
    setSessions(s);
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = mockStore.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [loadData]);

  // Audio trigger on new order arrival
  useEffect(() => {
    if (orders.length > prevOrderCount && prevOrderCount > 0) {
      if (soundEnabled) {
        soundManager.playNewOrderBell();
      }
    }
    setPrevOrderCount(orders.length);
  }, [orders.length, prevOrderCount, soundEnabled]);

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
      const total = sessionOrders.reduce((sum, ord) => {
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
  const handleUpdateStatus = (orderId: string, status: 'new' | 'preparing' | 'served') => {
    mockStore.updateOrderStatus(orderId, status);
  };

  // Perform checkout and close session
  const handleCheckoutTable = (table: Table) => {
    const session = mockStore.getOpenSessionForTable(table.id);
    if (!session) return;

    setIsClosingSession(true);
    const sessionOrders = mockStore.getOrdersForTable(table.id);
    const total = sessionOrders.reduce((sum, ord) => {
      return (
        sum +
        (ord.items || []).reduce(
          (iSum, item) => iSum + item.price_at_order * item.quantity,
          0
        )
      );
    }, 0);

    // Close session in store
    mockStore.closeSession(session.id, total);
    setIsClosingSession(false);
    setSelectedTableForCheckout(null);
  };

  return (
    <div className="min-h-screen bg-kraft flex flex-col">
      <Navbar role="staff" />
      <AudioAlertBanner />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-kraft-card border border-brass/30 p-4 rounded-2xl shadow-card">
          <div>
            <h1 className="font-serif font-bold text-2xl text-pine flex items-center gap-2.5">
              <span>Bảng Điều Phối Quầy & Bếp</span>
              {newOrdersCount > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-clay text-white animate-pulse">
                  {newOrdersCount} đơn mới
                </span>
              )}
            </h1>
            <p className="text-xs text-pine-2 mt-1">
              Theo dõi đơn đặt món tại bàn theo thời gian thực và quản lý thu tiền bàn.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* Sound Toggle Button */}
            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) soundManager.unlock();
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
                soundEnabled
                  ? 'bg-moss text-white border-moss shadow-sm'
                  : 'bg-kraft border-brass/40 text-pine-2'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? 'Chuông: BẬT' : 'Chuông: TẮT'}</span>
            </button>

            {/* Test Sound Button */}
            <button
              onClick={() => soundManager.playNewOrderBell()}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-kraft-soft hover:bg-kraft-dark/40 border border-brass/40 text-pine transition tap-active"
              title="Thử âm thanh chuông"
            >
              Thử chuông
            </button>

            {/* View Mode Switcher */}
            <div className="flex bg-kraft-dark/40 p-1 rounded-xl border border-brass/30">
              <button
                onClick={() => setViewMode('tables')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  viewMode === 'tables'
                    ? 'bg-pine text-kraft shadow-sm'
                    : 'text-pine hover:text-pine'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Theo bàn ({activeTableSessions.length})</span>
              </button>
              <button
                onClick={() => setViewMode('feed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  viewMode === 'feed'
                    ? 'bg-pine text-kraft shadow-sm'
                    : 'text-pine hover:text-pine'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Theo đợt ({orders.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-kraft-card border border-brass/30 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-pine-2 uppercase">Bàn có khách</p>
              <p className="text-xl font-bold font-serif text-pine mt-0.5">{activeTableSessions.length} bàn</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-kraft-dark/50 flex items-center justify-center text-pine">
              <Coffee className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-kraft-card border border-clay/30 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-clay uppercase">Đơn mới chưa pha</p>
              <p className="text-xl font-bold font-serif text-clay mt-0.5">{newOrdersCount} đơn</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-clay/10 flex items-center justify-center text-clay">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
          </div>

          <div className="bg-kraft-card border border-brass/40 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-brass uppercase">Đang pha chế</p>
              <p className="text-xl font-bold font-serif text-brass mt-0.5">{preparingCount} đơn</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-brass/10 flex items-center justify-center text-brass">
              <Flame className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-kraft-card border border-moss/40 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-moss uppercase">Tạm tính chưa thu</p>
              <p className="text-xl font-bold font-serif text-moss mt-0.5">
                {formatVND(
                  activeTableSessions.reduce((acc, curr) => acc + curr.total, 0)
                )}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-moss/10 flex items-center justify-center text-moss">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* View Mode: BY TABLE (Primary Restaurant Management) */}
        {viewMode === 'tables' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-lg text-pine">
                Danh Sách Bàn Đang Phục Vụ ({activeTableSessions.length})
              </h2>
              <span className="text-xs text-pine-2">
                Nhấn &quot;Tính tiền & Trả bàn&quot; khi khách hoàn tất thanh toán
              </span>
            </div>

            {activeTableSessions.length === 0 ? (
              <div className="bg-kraft-card border border-dashed border-brass/40 rounded-2xl p-12 text-center">
                <Coffee className="w-12 h-12 text-moss/50 mx-auto mb-3" />
                <p className="font-serif font-bold text-pine text-lg">Hiện chưa có bàn nào mở</p>
                <p className="text-xs text-pine-2 max-w-sm mx-auto mt-1">
                  Khi khách quét mã QR tại bàn và ấn &quot;Gửi đơn&quot;, bàn đó sẽ xuất hiện tại đây kèm chuông báo tức thì.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTableSessions.map(({ session, table, orders: sessionOrders, total, hasNew, hasPreparing }) => {
                  if (!table) return null;
                  return (
                    <div
                      key={session.id}
                      className={`bg-kraft-card rounded-2xl border transition shadow-card flex flex-col overflow-hidden ${
                        hasNew
                          ? 'border-clay ring-2 ring-clay/20'
                          : hasPreparing
                          ? 'border-brass'
                          : 'border-brass/30'
                      }`}
                    >
                      {/* Table Header */}
                      <div className="p-4 bg-kraft-dark/30 border-b border-brass/20 flex items-center justify-between">
                        <div>
                          <h3 className="font-serif font-bold text-lg text-pine">
                            {table.name}
                          </h3>
                          <p className="text-[11px] text-pine-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Mở lúc: {new Date(session.opened_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-pine-2 font-medium">Tổng nợ bàn:</span>
                          <p className="font-bold text-clay text-base">
                            {formatVND(total)}
                          </p>
                        </div>
                      </div>

                      {/* Orders under this table */}
                      <div className="p-4 flex-1 space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-pine-2 pb-1 border-b border-brass/20">
                          <span>Các đợt gọi ({sessionOrders.length} đợt)</span>
                          <span className="text-[11px]">
                            {hasNew ? (
                              <span className="text-clay font-bold flex items-center gap-1">
                                <BellRing className="w-3 h-3" /> Có món mới
                              </span>
                            ) : hasPreparing ? (
                              <span className="text-brass font-bold flex items-center gap-1">
                                <Flame className="w-3 h-3" /> Đang pha chế
                              </span>
                            ) : (
                              <span className="text-moss font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Đã phục vụ đủ
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                          {sessionOrders.map((ord) => (
                            <div
                              key={ord.id}
                              className="bg-kraft-soft border border-brass/30 rounded-xl p-3 text-xs space-y-2"
                            >
                              <div className="flex items-center justify-between font-semibold">
                                <span className="text-pine flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-pine-2" />
                                  {new Date(ord.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    ord.status === 'new'
                                      ? 'bg-clay text-white'
                                      : ord.status === 'preparing'
                                      ? 'bg-brass text-pine'
                                      : 'bg-moss/20 text-moss'
                                  }`}
                                >
                                  {ord.status === 'new' ? 'Mới' : ord.status === 'preparing' ? 'Đang pha' : 'Đã xong'}
                                </span>
                              </div>

                              <div className="divide-y divide-brass/10">
                                {(ord.items || []).map((it, idx) => (
                                  <div key={idx} className="py-1 flex items-start justify-between">
                                    <div>
                                      <span className="font-bold text-pine">{it.quantity}x </span>
                                      <span className="text-pine font-medium">{it.menu_item?.name}</span>
                                      {it.note && (
                                        <p className="text-[10px] text-clay italic">↳ {it.note}</p>
                                      )}
                                    </div>
                                    <span className="text-pine-2 font-semibold ml-2">
                                      {formatVND(it.price_at_order * it.quantity)}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {ord.note && (
                                <div className="text-[10px] text-pine-2 bg-kraft border border-brass/20 rounded p-1">
                                  <span className="font-bold text-clay">Ghi chú:</span> {ord.note}
                                </div>
                              )}

                              {/* Action buttons on this order */}
                              <div className="pt-1 flex items-center gap-2">
                                {ord.status === 'new' && (
                                  <button
                                    onClick={() => handleUpdateStatus(ord.id, 'preparing')}
                                    className="flex-1 py-1.5 bg-brass hover:bg-brass-soft text-pine font-bold text-[11px] rounded-lg transition flex items-center justify-center gap-1 tap-active"
                                  >
                                    <Flame className="w-3 h-3" /> Pha chế
                                  </button>
                                )}
                                {ord.status === 'preparing' && (
                                  <button
                                    onClick={() => handleUpdateStatus(ord.id, 'served')}
                                    className="flex-1 py-1.5 bg-moss hover:bg-moss/90 text-white font-bold text-[11px] rounded-lg transition flex items-center justify-center gap-1 tap-active"
                                  >
                                    <CheckCircle2 className="w-3 h-3" /> Đã ra món
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Checkout action button */}
                      <div className="p-4 bg-kraft-dark/20 border-t border-brass/20">
                        <button
                          onClick={() => setSelectedTableForCheckout(table)}
                          className="w-full py-2.5 bg-pine hover:bg-pine/90 text-kraft font-serif font-bold text-sm rounded-xl shadow transition flex items-center justify-center gap-2 tap-active"
                        >
                          <Receipt className="w-4 h-4" />
                          <span>Tính tiền & Trả bàn ({formatVND(total)})</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* View Mode: TIMELINE FEED (All Orders chronological) */}
        {viewMode === 'feed' && (
          <div className="space-y-4">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'bg-pine text-kraft shadow-sm'
                    : 'bg-kraft-card border border-brass/30 text-pine hover:bg-kraft-dark/30'
                }`}
              >
                Tất cả ({orders.length})
              </button>
              <button
                onClick={() => setActiveTab('new')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'new'
                    ? 'bg-clay text-white shadow-sm'
                    : 'bg-kraft-card border border-brass/30 text-clay hover:bg-clay/10'
                }`}
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Mới ({newOrdersCount})</span>
              </button>
              <button
                onClick={() => setActiveTab('preparing')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'preparing'
                    ? 'bg-brass text-pine shadow-sm'
                    : 'bg-kraft-card border border-brass/30 text-pine hover:bg-brass/20'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Đang pha ({preparingCount})</span>
              </button>
              <button
                onClick={() => setActiveTab('served')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'served'
                    ? 'bg-moss text-white shadow-sm'
                    : 'bg-kraft-card border border-brass/30 text-moss hover:bg-moss/10'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đã ra món</span>
              </button>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-kraft-card border border-dashed border-brass/40 rounded-2xl p-12 text-center">
                <Coffee className="w-12 h-12 text-moss/50 mx-auto mb-3" />
                <p className="font-serif font-bold text-pine text-lg">Không có đơn hàng nào</p>
                <p className="text-xs text-pine-2 max-w-sm mx-auto mt-1">
                  Đơn hàng theo phân loại này hiện đang trống.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onUpdateStatus={handleUpdateStatus}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL: CHECKOUT & CLOSE TABLE */}
      {selectedTableForCheckout && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-kraft-card border border-brass max-w-md w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 bg-pine text-kraft flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-lg">
                  Thanh Toán: {selectedTableForCheckout.name}
                </h3>
                <p className="text-[11px] text-kraft-soft opacity-80">
                  Kiểm tra bill và hoàn tất trả bàn
                </p>
              </div>
              <button
                onClick={() => setSelectedTableForCheckout(null)}
                className="w-8 h-8 rounded-full bg-kraft/10 hover:bg-kraft/20 flex items-center justify-center transition"
              >
                <X className="w-4 h-4 text-kraft" />
              </button>
            </div>

            {/* Modal Bill Detail */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {(() => {
                const tableOrders = mockStore.getOrdersForTable(selectedTableForCheckout.id);
                const total = tableOrders.reduce((sum, ord) => {
                  return (
                    sum +
                    (ord.items || []).reduce(
                      (iSum, item) => iSum + item.price_at_order * item.quantity,
                      0
                    )
                  );
                }, 0);

                // Consolidate items
                const itemMap: { [key: string]: { name: string; quantity: number; total: number; notes: string[] } } = {};
                tableOrders.forEach((o) => {
                  (o.items || []).forEach((it) => {
                    const name = it.menu_item?.name || 'Món nước';
                    if (!itemMap[name]) {
                      itemMap[name] = { name, quantity: 0, total: 0, notes: [] };
                    }
                    itemMap[name].quantity += it.quantity;
                    itemMap[name].total += it.price_at_order * it.quantity;
                    if (it.note) itemMap[name].notes.push(it.note);
                  });
                });

                return (
                  <>
                    <div className="bg-kraft-soft border border-brass/30 rounded-xl p-3">
                      <div className="text-xs font-bold text-pine mb-2 border-b border-brass/20 pb-1 flex justify-between">
                        <span>Chi tiết các món đã gọi</span>
                        <span>{Object.keys(itemMap).length} món</span>
                      </div>
                      <div className="divide-y divide-brass/10">
                        {Object.values(itemMap).map((item, idx) => (
                          <div key={idx} className="py-2 flex items-start justify-between text-xs">
                            <div>
                              <span className="font-bold text-pine">{item.quantity}x </span>
                              <span className="font-semibold text-pine">{item.name}</span>
                              {item.notes.length > 0 && (
                                <p className="text-[10px] text-clay italic">
                                  ↳ {item.notes.join(', ')}
                                </p>
                              )}
                            </div>
                            <span className="font-semibold text-pine-2">
                              {formatVND(item.total)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-kraft-dark/30 border border-brass/30 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-pine-2">Tổng số đợt order:</span>
                        <span className="font-bold text-pine">{tableOrders.length} đợt</span>
                      </div>
                      <div className="flex justify-between text-base pt-2 border-t border-brass/30">
                        <span className="font-serif font-bold text-pine">Tổng tiền cần thu:</span>
                        <span className="font-bold text-xl text-clay">{formatVND(total)}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-pine-2 bg-kraft p-2.5 rounded-lg border border-brass/20 flex items-start gap-2">
                      <CreditCard className="w-4 h-4 text-moss flex-shrink-0 mt-0.5" />
                      <span>
                        Thu tiền mặt hoặc quét mã QR ngân hàng trực tiếp từ khách. Sau khi xác nhận tiền đã về hoặc khách đã trả, nhấn <strong>&quot;Xác nhận đã thu & Trả bàn&quot;</strong> bên dưới.
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-kraft-dark/30 border-t border-brass/30 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedTableForCheckout(null)}
                className="flex-1 py-2.5 bg-kraft-card border border-brass/40 text-pine font-semibold text-xs rounded-xl hover:bg-kraft transition"
              >
                Hủy / Chưa thu
              </button>
              <button
                type="button"
                disabled={isClosingSession}
                onClick={() => handleCheckoutTable(selectedTableForCheckout)}
                className="flex-[2] py-2.5 bg-moss hover:bg-moss/90 text-white font-serif font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 tap-active disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isClosingSession ? 'Đang xử lý...' : 'Xác nhận đã thu & Trả bàn'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
