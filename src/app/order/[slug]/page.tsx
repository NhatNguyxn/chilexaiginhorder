'use client';

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { STORE_NAME, formatVND } from '@/lib/constants';
import { tableService, menuService, orderService } from '@/lib/services';
import { CartItem, MenuCategory, MenuItem, Order, Table } from '@/types';
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  X, 
  Clock, 
  CheckCircle2, 
  Flame, 
  ReceiptText, 
  UtensilsCrossed, 
  AlertCircle,
  RefreshCw,
  Send
} from 'lucide-react';

export default function TableOrderPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [loading, setLoading] = useState(true);
  const [table, setTable] = useState<Table | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [orderNote, setOrderNote] = useState('');
  const [tableOrders, setTableOrders] = useState<Order[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Modal custom note for single item
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);
  const [modalItemNote, setModalItemNote] = useState('');

  // Load initial data
  const loadData = async () => {
    try {
      setErrorMessage(null);
      // Try resolving by token or slug
      let t = await tableService.getTableByToken(slug);
      if (!t) {
        t = await tableService.getTableBySlug(slug);
      }
      setTable(t || null);

      const [cats, items] = await Promise.all([
        menuService.getCategories(),
        menuService.getMenuItems(),
      ]);
      setCategories(cats);
      setMenuItems(items);

      if (t) {
        const ords = await orderService.getOrdersForTable(t.id);
        setTableOrders(ords);
      }
    } catch (err: unknown) {
      console.error('Lỗi tải dữ liệu bàn:', err);
      setErrorMessage('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (table) {
        orderService.getOrdersForTable(table.id).then(setTableOrders).catch(console.error);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [slug, table?.id]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setTimeout(() => {
      setCooldownSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  if (loading) {
    return (
      <div className="min-h-screen bg-kraft flex flex-col items-center justify-center p-6">
        <div className="w-8 h-8 border-2 border-moss border-t-transparent rounded-full animate-spin mb-3" />
        <p className="font-serif font-semibold text-pine text-sm">Đang tải thực đơn bàn...</p>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="min-h-screen bg-kraft flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-clay mb-3" />
        <h1 className="font-serif font-bold text-2xl text-pine">Không tìm thấy bàn</h1>
        <p className="text-sm text-pine-2 mt-1 mb-6 max-w-sm">
          Mã QR hoặc đường dẫn bàn không hợp lệ hoặc đã hết hạn. Vui lòng quét lại mã QR dán trên bàn của bạn.
        </p>
        <Link
          href="/"
          className="px-5 py-2.5 bg-pine text-kraft font-bold text-sm rounded-full shadow"
        >
          Trở về trang chủ
        </Link>
      </div>
    );
  }

  // Filter items by category
  const filteredItems = activeCategory === 'all'
    ? menuItems
    : menuItems.filter((i) => i.category_id === activeCategory);

  // Cart operations
  const addToCart = (item: MenuItem, note: string = '') => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (ci) => ci.menuItem.id === item.id && ci.note === note
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      } else {
        return [...prev, { menuItem: item, quantity: 1, note }];
      }
    });
  };

  const updateCartQty = (index: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      updated[index].quantity += delta;
      if (updated[index].quantity <= 0) {
        updated.splice(index, 1);
      }
      return updated;
    });
  };

  const totalCartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const totalCartAmount = cart.reduce(
    (sum, i) => sum + i.menuItem.price * i.quantity,
    0
  );

  // Submit order to secure server API
  const handleSubmitOrder = async () => {
    if (cart.length === 0 || !table || isSubmitting || cooldownSeconds > 0) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_token: table.qr_token || table.slug,
          items: cart.map((ci) => ({
            menuItemId: ci.menuItem.id,
            quantity: ci.quantity,
            note: ci.note,
          })),
          note: orderNote,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi gửi đơn.');
      }

      setCart([]);
      setOrderNote('');
      setIsCartOpen(false);
      setOrderSuccessMsg(true);
      setIsStatusOpen(true);
      setCooldownSeconds(10); // 10s cooldown
      setTimeout(() => setOrderSuccessMsg(false), 5000);

      // Refresh table orders
      const updatedOrders = await orderService.getOrdersForTable(table.id);
      setTableOrders(updatedOrders);
    } catch (err: unknown) {
      console.error('Lỗi đặt món:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Lỗi kết nối khi gửi đơn hàng. Vui lòng bấm thử lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Current session total
  const currentSessionTotal = tableOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => {
      const orderSum = (o.items || []).reduce(
        (s, it) => s + it.price_at_order * it.quantity,
        0
      );
      return sum + orderSum;
    }, 0);

  return (
    <div className="min-h-screen bg-kraft pb-24 select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-kraft-card border-b border-brass/30 px-4 py-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-brass shadow-sm relative flex-shrink-0">
            <Image
              src="/logo.png"
              alt={STORE_NAME}
              width={40}
              height={40}
              className="object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="font-serif font-bold text-pine text-base leading-tight">
              {STORE_NAME}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-moss animate-pulse" />
              <span className="text-xs font-bold text-clay tracking-wide">
                {table.name}
              </span>
            </div>
          </div>
        </div>

        {/* View Table Orders button */}
        <button
          onClick={() => setIsStatusOpen(true)}
          className="relative px-3 py-1.5 bg-kraft-dark/50 border border-brass/50 rounded-full text-xs font-bold text-pine flex items-center gap-1.5 tap-active"
        >
          <ReceiptText className="w-3.5 h-3.5 text-moss" />
          <span>Đơn đã gọi</span>
          {tableOrders.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-clay" />
          )}
        </button>
      </header>

      {/* Network or submission error toast */}
      {errorMessage && (
        <div className="mx-4 mt-3 p-3 bg-clay/10 border border-clay/30 rounded-xl flex items-center justify-between text-xs text-clay">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => loadData()}
            className="px-2.5 py-1 bg-clay text-white rounded-lg font-bold text-[11px] flex items-center gap-1 tap-active ml-2"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* Categories Bar */}
      <div className="sticky top-[65px] z-20 bg-kraft/95 backdrop-blur-sm px-4 py-2.5 border-b border-brass/20 flex gap-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition tap-active ${
            activeCategory === 'all'
              ? 'bg-pine text-kraft shadow-sm'
              : 'bg-kraft-card border border-brass/30 text-pine hover:bg-kraft-dark/30'
          }`}
        >
          Tất cả món
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition tap-active ${
              activeCategory === cat.id
                ? 'bg-pine text-kraft shadow-sm'
                : 'bg-kraft-card border border-brass/30 text-pine hover:bg-kraft-dark/30'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <main className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`bg-kraft-card border border-brass/30 rounded-2xl p-3 shadow-card flex gap-3 items-center transition ${
              !item.is_available ? 'opacity-60 bg-kraft-dark/20' : ''
            }`}
          >
            {/* Item Image */}
            <div className="w-20 h-20 rounded-xl overflow-hidden relative flex-shrink-0 border border-brass/20 bg-kraft-dark">
              <Image
                src={item.image_url || '/logo.png'}
                alt={item.name}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>

            {/* Item Info */}
            <div className="flex-1 min-w-0">
              <h2 className="font-serif font-bold text-pine text-sm sm:text-base leading-snug line-clamp-1">
                {item.name}
              </h2>
              {item.description && (
                <p className="text-[11px] text-pine-2 line-clamp-1 mt-0.5">
                  {item.description}
                </p>
              )}
              <div className="mt-1 font-serif font-bold text-clay text-sm">
                {formatVND(item.price)}
              </div>
            </div>

            {/* Add to Cart button */}
            <div className="flex-shrink-0">
              {item.is_available ? (
                <button
                  onClick={() => {
                    setSelectedItemForModal(item);
                    setModalItemNote('');
                  }}
                  className="w-9 h-9 rounded-full bg-pine hover:bg-pine/90 text-kraft flex items-center justify-center shadow tap-active"
                  title="Thêm món này"
                >
                  <Plus className="w-5 h-5" />
                </button>
              ) : (
                <span className="text-[10px] font-bold text-pine-2/70 bg-kraft px-2 py-1 rounded-md border border-brass/20">
                  Tạm hết
                </span>
              )}
            </div>
          </div>
        ))}
      </main>

      {/* Bottom Sticky Floating Cart Bar */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-30">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-pine text-kraft py-3.5 px-5 rounded-2xl shadow-xl flex items-center justify-between tap-active border border-brass/40"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingBag className="w-5 h-5 text-moss" />
                <span className="absolute -top-2 -right-2 bg-clay text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
                  {totalCartCount}
                </span>
              </div>
              <span className="font-bold text-sm">Xem giỏ & Gọi món</span>
            </div>
            <span className="font-serif font-bold text-base text-kraft">
              {formatVND(totalCartAmount)}
            </span>
          </button>
        </div>
      )}

      {/* Note & Customization Modal for single item */}
      {selectedItemForModal && (
        <div className="fixed inset-0 z-50 bg-pine/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-kraft-card w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-brass/40 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-brass/20 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-clay" />
                <h3 className="font-serif font-bold text-pine text-base">
                  {selectedItemForModal.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItemForModal(null)}
                className="p-1 rounded-full text-pine-2 hover:bg-kraft"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-pine mb-1">
                Ghi chú riêng cho món này (tùy chọn)
              </label>
              <textarea
                value={modalItemNote}
                onChange={(e) => setModalItemNote(e.target.value)}
                placeholder="Ví dụ: Ít đường, nhiều đá, không lấy thạch..."
                rows={2}
                maxLength={100}
                className="w-full px-3 py-2 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-xs text-pine placeholder:text-pine-2/50"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedItemForModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-brass/40 text-pine font-bold text-xs"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  addToCart(selectedItemForModal, modalItemNote.trim());
                  setSelectedItemForModal(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-pine text-kraft font-bold text-xs shadow tap-active"
              >
                Thêm vào giỏ ({formatVND(selectedItemForModal.price)})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer / Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-pine/60 backdrop-blur-xs flex items-end justify-center animate-in fade-in">
          <div className="bg-kraft-card w-full max-w-lg rounded-t-3xl border-t border-brass/40 max-h-[85vh] flex flex-col shadow-2xl">
            {/* Drawer Header */}
            <div className="p-4 border-b border-brass/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-moss" />
                <h3 className="font-serif font-bold text-pine text-base">
                  Giỏ hàng ({table.name})
                </h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-full text-pine-2 hover:bg-kraft"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((item, idx) => (
                <div
                  key={`${item.menuItem.id}-${idx}`}
                  className="bg-kraft border border-brass/20 rounded-xl p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif font-bold text-pine text-sm line-clamp-1">
                      {item.menuItem.name}
                    </h4>
                    {item.note && (
                      <p className="text-[11px] text-clay line-clamp-1 italic mt-0.5">
                        &quot;{item.note}&quot;
                      </p>
                    )}
                    <span className="text-xs font-serif font-bold text-clay mt-1 inline-block">
                      {formatVND(item.menuItem.price * item.quantity)}
                    </span>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2 bg-kraft-card border border-brass/40 rounded-lg p-1">
                    <button
                      onClick={() => updateCartQty(idx, -1)}
                      className="w-6 h-6 rounded-md bg-kraft hover:bg-kraft-dark text-pine flex items-center justify-center font-bold text-xs"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-5 text-center font-bold text-xs text-pine">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQty(idx, 1)}
                      className="w-6 h-6 rounded-md bg-kraft hover:bg-kraft-dark text-pine flex items-center justify-center font-bold text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Order-level note */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-pine mb-1">
                  Ghi chú chung cho đơn (nếu có):
                </label>
                <input
                  type="text"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Ví dụ: Mang lên cùng lúc..."
                  maxLength={150}
                  className="w-full px-3 py-2 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-xs text-pine placeholder:text-pine-2/50"
                />
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-brass/20 bg-kraft-card/90 space-y-3">
              <div className="flex items-center justify-between font-serif font-bold text-pine">
                <span>Tổng tiền:</span>
                <span className="text-clay text-lg">{formatVND(totalCartAmount)}</span>
              </div>

              <button
                onClick={handleSubmitOrder}
                disabled={isSubmitting || cooldownSeconds > 0}
                className="w-full py-3.5 bg-moss hover:bg-moss/90 disabled:opacity-50 text-white rounded-xl font-serif font-bold text-sm shadow flex items-center justify-center gap-2 tap-active transition"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Đang gửi đơn lên quầy...'
                    : cooldownSeconds > 0
                    ? `Chờ ${cooldownSeconds}s để gửi tiếp`
                    : 'Gửi gọi món ngay'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders Status Modal */}
      {isStatusOpen && (
        <div className="fixed inset-0 z-50 bg-pine/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-kraft-card w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-brass/40 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-brass/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-moss" />
                <h3 className="font-serif font-bold text-pine text-base">
                  Món đã gọi tại {table.name}
                </h3>
              </div>
              <button
                onClick={() => setIsStatusOpen(false)}
                className="p-1.5 rounded-full text-pine-2 hover:bg-kraft"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {orderSuccessMsg && (
                <div className="p-3 bg-moss/10 border border-moss/30 rounded-xl text-moss flex items-center gap-2 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Đơn hàng của bạn đã gửi đến quầy thành công! Nhân viên đang chuẩn bị.</span>
                </div>
              )}

              {tableOrders.length === 0 ? (
                <div className="text-center py-8 text-pine-2 text-xs">
                  <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <span>Bàn hiện chưa có đơn gọi nào. Vui lòng chọn món để bắt đầu!</span>
                </div>
              ) : (
                tableOrders.map((ord, idx) => (
                  <div
                    key={ord.id}
                    className={`bg-kraft border rounded-xl p-3 space-y-2 ${
                      ord.status === 'cancelled'
                        ? 'border-clay/30 bg-clay/5 opacity-70'
                        : 'border-brass/30'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-serif font-bold text-pine">
                        Lượt gọi #{tableOrders.length - idx}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.status === 'new'
                            ? 'bg-amber-100 text-amber-800'
                            : ord.status === 'preparing'
                            ? 'bg-blue-100 text-blue-800'
                            : ord.status === 'served'
                            ? 'bg-moss/10 text-moss'
                            : 'bg-clay/10 text-clay'
                        }`}
                      >
                        {ord.status === 'new'
                          ? 'Đã nhận đơn'
                          : ord.status === 'preparing'
                          ? 'Đang pha chế'
                          : ord.status === 'served'
                          ? 'Đã phục vụ'
                          : `Đã hủy: ${ord.cancellation_reason || 'Quán hủy'}`}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      {(ord.items || []).map((it) => (
                        <div key={it.id} className="flex justify-between text-pine-2">
                          <span>
                            {it.quantity}x {it.menu_item?.name || 'Món'}
                            {it.note && <span className="italic text-[10px] text-clay"> ({it.note})</span>}
                          </span>
                          <span className="font-serif font-bold text-pine">
                            {formatVND(it.price_at_order * it.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-brass/20 bg-kraft-card/90">
              <div className="flex items-center justify-between font-serif font-bold text-pine">
                <span>Tổng tạm tính:</span>
                <span className="text-clay text-lg">{formatVND(currentSessionTotal)}</span>
              </div>
              <p className="text-[11px] text-pine-2 mt-1 text-center">
                Vui lòng thanh toán tại quầy khi rời quán. Cảm ơn quý khách!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
