'use client';

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { STORE_NAME, formatVND } from '@/lib/constants';
import { mockStore } from '@/lib/mock-store';
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
  AlertCircle 
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

  // Modal tùy biến món (ghi chú riêng cho từng món)
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);
  const [modalItemNote, setModalItemNote] = useState('');

  // Tải dữ liệu ban đầu
  const loadData = () => {
    const t = mockStore.getTableBySlug(slug);
    setTable(t || null);
    setCategories(mockStore.getCategories());
    setMenuItems(mockStore.getMenuItems());
    if (t) {
      setTableOrders(mockStore.getOrdersForTable(t.id));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // Đăng ký lắng nghe realtime đồng bộ
    const unsubscribe = mockStore.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [slug]);

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
        <p className="text-sm text-pine-2 mt-1 mb-6">
          Mã QR hoặc đường dẫn bàn không hợp lệ. Vui lòng quét lại mã dán trên bàn của bạn.
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

  // Lọc món theo danh mục
  const filteredItems = activeCategory === 'all'
    ? menuItems
    : menuItems.filter((i) => i.category_id === activeCategory);

  // Thao tác giỏ hàng
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

  // Gửi đơn hàng lên quầy
  const handleSubmitOrder = () => {
    if (cart.length === 0 || !table) return;

    setIsSubmitting(true);
    try {
      mockStore.placeOrder({
        tableId: table.id,
        items: cart.map((ci) => ({
          menuItemId: ci.menuItem.id,
          quantity: ci.quantity,
          note: ci.note,
        })),
        note: orderNote,
      });

      setCart([]);
      setOrderNote('');
      setIsCartOpen(false);
      setOrderSuccessMsg(true);
      setIsStatusOpen(true);
      setTimeout(() => setOrderSuccessMsg(false), 4000);
    } catch (err) {
      console.error('Lỗi đặt món', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tính tổng tiền phiên hiện tại của bàn
  const currentSessionTotal = tableOrders.reduce((sum, o) => {
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

        {/* Nút xem đơn của bàn */}
        <button
          onClick={() => setIsStatusOpen(true)}
          className="relative px-3 py-1.5 bg-kraft-dark/50 border border-brass/50 rounded-full text-xs font-bold text-pine flex items-center gap-1.5 tap-active"
        >
          <ReceiptText className="w-3.5 h-3.5 text-moss" />
          <span>Đơn của bàn</span>
          {tableOrders.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-clay text-white text-[10px] flex items-center justify-center font-bold">
              {tableOrders.length}
            </span>
          )}
        </button>
      </header>

      {/* Thông báo đặt đơn thành công */}
      {orderSuccessMsg && (
        <div className="bg-moss text-white px-4 py-3 shadow flex items-center justify-center gap-2 text-xs font-bold animate-fadeIn sticky top-16 z-20">
          <CheckCircle2 className="w-4 h-4" />
          <span>Đã gửi đơn lên quầy! Quán đang chuẩn bị món cho bạn.</span>
        </div>
      )}

      {/* Banner chào mừng mộc mạc */}
      <div className="bg-kraft-soft px-4 py-3 border-b border-brass/20 text-center">
        <p className="font-serif italic text-pine-2 text-xs">
          "Một góc nhỏ giữa phố, pha những ly nước thanh mát mỗi ngày"
        </p>
      </div>

      {/* Category Scroll Tabs (Vuốt ngang mượt mà) */}
      <div className="sticky top-[61px] z-20 bg-kraft/95 backdrop-blur-md py-2.5 px-4 border-b border-brass/20">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition tap-active ${
              activeCategory === 'all'
                ? 'bg-pine text-kraft shadow-sm'
                : 'bg-kraft-card border border-brass/40 text-pine'
            }`}
          >
            Tất cả menu
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition tap-active ${
                activeCategory === cat.id
                  ? 'bg-pine text-kraft shadow-sm'
                  : 'bg-kraft-card border border-brass/40 text-pine'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <main className="p-4 max-w-lg mx-auto space-y-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`bg-kraft-card rounded-xl border border-brass/30 p-3 shadow-sm flex gap-3 transition ${
              !item.is_available ? 'opacity-60 grayscale' : 'hover:border-brass'
            }`}
          >
            {/* Ảnh món */}
            <div className="w-24 h-24 rounded-lg overflow-hidden relative flex-shrink-0 bg-kraft-dark/20 border border-brass/20">
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                sizes="96px"
                className="object-cover"
              />
            </div>

            {/* Chi tiết món */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <h3 className="font-serif font-bold text-pine text-base leading-snug">
                  {item.name}
                </h3>
                <p className="text-xs font-bold text-clay mt-1">
                  {formatVND(item.price)}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                {!item.is_available ? (
                  <span className="text-[11px] font-semibold text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                    Tạm hết món
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItemForModal(item);
                        setModalItemNote('');
                      }}
                      className="text-[11px] text-moss font-semibold underline underline-offset-2"
                    >
                      Thêm ghi chú riêng
                    </button>

                    <button
                      type="button"
                      onClick={() => addToCart(item)}
                      className="w-8 h-8 rounded-full bg-pine hover:bg-pine-2 text-kraft flex items-center justify-center shadow tap-active"
                      title="Thêm món"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* Modal Tùy biến món (Thêm ghi chú riêng như "Ít đá", "Không đường") */}
      {selectedItemForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-kraft-card w-full max-w-md rounded-t-2xl sm:rounded-2xl border-t-2 sm:border-2 border-brass p-5 shadow-floating space-y-4 animate-slideUp">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif font-bold text-pine text-lg">
                  {selectedItemForModal.name}
                </h3>
                <p className="text-sm font-bold text-clay">
                  {formatVND(selectedItemForModal.price)}
                </p>
              </div>
              <button
                onClick={() => setSelectedItemForModal(null)}
                className="p-1 text-pine-2 hover:text-pine"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-pine mb-1.5">
                Gợi ý lựa chọn nhanh:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['100% đá', 'Ít đá (50%)', 'Không đá', 'Ít ngọt', 'Cay nhiều', 'Ít cay'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setModalItemNote((prev) => (prev ? `${prev}, ${opt}` : opt))}
                    className="px-2.5 py-1 text-xs font-semibold bg-kraft border border-brass/50 rounded-full text-pine hover:bg-brass/20 tap-active"
                  >
                    + {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-pine mb-1">
                Ghi chú cho quán (nếu có):
              </label>
              <input
                type="text"
                value={modalItemNote}
                onChange={(e) => setModalItemNote(e.target.value)}
                placeholder="Ví dụ: Giảm ngọt, cho tương ớt riêng..."
                className="w-full px-3 py-2 text-sm bg-kraft border border-brass/40 rounded-lg text-pine focus:outline-none focus:border-brass"
              />
            </div>

            <button
              onClick={() => {
                addToCart(selectedItemForModal, modalItemNote);
                setSelectedItemForModal(null);
              }}
              className="w-full py-3 bg-clay hover:bg-clay-hover text-white font-bold text-sm rounded-xl shadow transition tap-active"
            >
              Thêm vào đơn • {formatVND(selectedItemForModal.price)}
            </button>
          </div>
        </div>
      )}

      {/* Thanh Giỏ Hàng Nổi Đáy Màn Hình (Sticky Bottom Bar) */}
      {totalCartCount > 0 && !isCartOpen && (
        <div className="fixed bottom-3 left-4 right-4 z-40 max-w-md mx-auto">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-pine-deep text-kraft p-3.5 rounded-2xl shadow-floating border border-brass flex items-center justify-between gap-3 tap-active animate-slideUp"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-clay text-white font-bold text-xs flex items-center justify-center">
                {totalCartCount}
              </div>
              <div className="text-left">
                <span className="text-xs text-kraft-dark block">Đang chọn</span>
                <span className="text-sm font-bold text-brass">
                  {formatVND(totalCartAmount)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-kraft-card bg-brass/20 px-3 py-1.5 rounded-full border border-brass/30">
              <ShoppingBag className="w-4 h-4 text-brass" />
              <span>Xem giỏ & Gửi đơn ➔</span>
            </div>
          </button>
        </div>
      )}

      {/* Drawer Xem & Gửi Giỏ Hàng */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center">
          <div className="bg-kraft-card w-full max-w-lg rounded-t-3xl sm:rounded-2xl border-t-2 sm:border-2 border-brass p-5 shadow-floating flex flex-col max-h-[85vh] space-y-4 animate-slideUp">
            <div className="flex items-center justify-between border-b border-brass/20 pb-3">
              <div>
                <h3 className="font-serif font-bold text-pine text-lg">
                  Đơn gọi món — {table.name}
                </h3>
                <p className="text-xs text-moss">Kiểm tra lại danh sách món trước khi gửi lên quầy</p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-pine-2 hover:text-pine"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Danh sách món trong giỏ */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 divide-y divide-brass/10">
              {cart.map((ci, idx) => (
                <div key={idx} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-pine text-sm">{ci.menuItem.name}</h4>
                    <p className="text-xs text-clay font-semibold">
                      {formatVND(ci.menuItem.price * ci.quantity)}
                    </p>
                    {ci.note && (
                      <p className="text-[11px] text-pine-2 italic">Ghi chú: {ci.note}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 border border-brass/40 rounded-lg bg-kraft px-1.5 py-0.5">
                    <button
                      onClick={() => updateCartQty(idx, -1)}
                      className="p-1 text-pine hover:text-clay"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold text-pine w-4 text-center">
                      {ci.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQty(idx, 1)}
                      className="p-1 text-pine hover:text-clay"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Ghi chú chung */}
            <div>
              <label className="block text-xs font-bold text-pine mb-1">
                Ghi chú chung cho đơn (nếu có):
              </label>
              <input
                type="text"
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="Ví dụ: Mang ra cùng lúc, cho thêm ống hút..."
                className="w-full px-3 py-2 text-xs bg-kraft border border-brass/40 rounded-lg text-pine focus:outline-none focus:border-brass"
              />
            </div>

            {/* Tổng tiền & Nút gửi */}
            <div className="pt-2 border-t border-brass/20 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-pine">Tổng tiền đợt này:</span>
                <span className="font-serif font-bold text-clay text-lg">
                  {formatVND(totalCartAmount)}
                </span>
              </div>

              <button
                onClick={handleSubmitOrder}
                disabled={isSubmitting}
                className="w-full py-3.5 bg-clay hover:bg-clay-hover text-white font-bold text-sm rounded-xl shadow transition flex items-center justify-center gap-2 tap-active disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Đang gửi đơn...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xác Nhận & Gửi Đơn Lên Quầy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer Trạng Thái Đơn Của Bàn (Theo dõi các đợt gọi) */}
      {isStatusOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center">
          <div className="bg-kraft-card w-full max-w-lg rounded-t-3xl sm:rounded-2xl border-t-2 sm:border-2 border-brass p-5 shadow-floating flex flex-col max-h-[85vh] space-y-4 animate-slideUp">
            <div className="flex items-center justify-between border-b border-brass/20 pb-3">
              <div>
                <h3 className="font-serif font-bold text-pine text-lg">
                  Đơn đã gọi — {table.name}
                </h3>
                <p className="text-xs text-moss">Trạng thái phục vụ các món bạn đã gửi lên quầy</p>
              </div>
              <button
                onClick={() => setIsStatusOpen(false)}
                className="p-1.5 text-pine-2 hover:text-pine"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {tableOrders.length === 0 ? (
              <div className="py-10 text-center text-pine-2 space-y-2">
                <UtensilsCrossed className="w-8 h-8 text-moss mx-auto" />
                <p className="text-sm font-semibold">Bàn chưa gọi món nào.</p>
                <p className="text-xs text-moss">Hãy chọn món ngon trong menu để gửi đơn nhé!</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {tableOrders.map((order, oIdx) => (
                  <div
                    key={order.id || oIdx}
                    className="bg-kraft rounded-xl border border-brass/40 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs border-b border-brass/20 pb-1.5">
                      <span className="font-bold text-pine">
                        Lần gọi #{tableOrders.length - oIdx}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          order.status === 'new'
                            ? 'bg-clay text-white'
                            : order.status === 'preparing'
                            ? 'bg-brass text-pine'
                            : 'bg-moss text-white'
                        }`}
                      >
                        {order.status === 'new' && 'Mới nhận đơn'}
                        {order.status === 'preparing' && 'Đang pha chế'}
                        {order.status === 'served' && 'Đã phục vụ'}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      {(order.items || []).map((it, iIdx) => (
                        <div key={iIdx} className="flex justify-between text-pine">
                          <span>
                            {it.quantity}x {it.menu_item?.name}
                            {it.note && (
                              <span className="text-clay italic text-[11px] ml-1">
                                ({it.note})
                              </span>
                            )}
                          </span>
                          <span className="font-semibold">
                            {formatVND(it.price_at_order * it.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tổng bill hiện tại */}
            <div className="pt-2 border-t border-brass/20 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-pine">Tổng cộng cần thanh toán:</span>
                <span className="font-serif font-bold text-clay text-lg">
                  {formatVND(currentSessionTotal)}
                </span>
              </div>
              <p className="text-[11px] text-pine-2 text-center italic">
                * Quý khách vui lòng thanh toán trực tiếp với nhân viên khi dùng xong.
              </p>
              <button
                onClick={() => setIsStatusOpen(false)}
                className="w-full py-2.5 bg-pine hover:bg-pine-2 text-kraft font-bold text-xs rounded-xl transition tap-active"
              >
                Tiếp tục gọi thêm món
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
