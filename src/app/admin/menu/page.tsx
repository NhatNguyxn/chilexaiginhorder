'use client';

import { useState, useEffect } from 'react';
import { mockStore } from '@/lib/mock-store';
import { MenuCategory, MenuItem } from '@/types';
import { formatVND } from '@/lib/constants';
import { 
  UtensilsCrossed, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('all');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: 20000,
    category_id: 'cat-tra',
    description: '',
    is_available: true,
  });

  const loadData = () => {
    setCategories(mockStore.getCategories());
    setItems(mockStore.getMenuItems());
  };

  useEffect(() => {
    loadData();
    const unsub = mockStore.subscribe(loadData);
    return () => unsub();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      price: 20000,
      category_id: categories[0]?.id || 'cat-tra',
      description: '',
      is_available: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: item.price,
      category_id: item.category_id,
      description: item.description || '',
      is_available: item.is_available,
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingItem) {
      mockStore.updateMenuItem(editingItem.id, {
        name: formData.name.trim(),
        price: Number(formData.price),
        category_id: formData.category_id,
        description: formData.description.trim(),
        is_available: formData.is_available,
      });
    } else {
      mockStore.addMenuItem({
        name: formData.name.trim(),
        price: Number(formData.price),
        category_id: formData.category_id,
        description: formData.description.trim(),
        is_available: formData.is_available,
        image_url: '/logo.png',
        sort_order: items.length + 1,
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Bạn có chắc muốn xóa món "${name}" khỏi thực đơn không?`)) {
      mockStore.deleteMenuItem(id);
    }
  };

  const filteredItems = selectedCatId === 'all'
    ? items
    : items.filter((i) => i.category_id === selectedCatId);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-kraft-card border border-brass/30 p-4 sm:p-5 rounded-2xl shadow-card">
        <div>
          <h1 className="font-serif font-bold text-xl sm:text-2xl text-pine flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-moss" />
            <span>Quản Lý Thực Đơn & Giá Món</span>
          </h1>
          <p className="text-xs text-pine-2 mt-1">
            Tổng cộng <strong>{items.length} món</strong> đang phục vụ. Bật/tắt trạng thái hết món tức thì cho toàn bộ khách quét QR.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-moss hover:bg-moss/90 text-white transition flex items-center gap-1.5 shadow-sm tap-active self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm món mới</span>
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCatId('all')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            selectedCatId === 'all'
              ? 'bg-pine text-kraft shadow-sm'
              : 'bg-kraft-card border border-brass/30 text-pine hover:bg-kraft-dark/30'
          }`}
        >
          Tất cả danh mục ({items.length})
        </button>
        {categories.map((cat) => {
          const count = items.filter((i) => i.category_id === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedCatId === cat.id
                  ? 'bg-pine text-kraft shadow-sm'
                  : 'bg-kraft-card border border-brass/30 text-pine hover:bg-kraft-dark/30'
              }`}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Menu Items Table / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const cat = categories.find((c) => c.id === item.category_id);
          return (
            <div
              key={item.id}
              className={`bg-kraft-card border rounded-2xl p-4 shadow-card flex flex-col justify-between transition ${
                item.is_available ? 'border-brass/30' : 'border-brass/20 opacity-70 bg-kraft-dark/20'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-moss">
                      {cat?.name || 'Món'}
                    </span>
                    <h3 className="font-serif font-bold text-pine text-base mt-0.5">
                      {item.name}
                    </h3>
                  </div>
                  <span className="font-bold text-clay text-sm whitespace-nowrap bg-clay/10 px-2 py-0.5 rounded-lg">
                    {formatVND(item.price)}
                  </span>
                </div>

                {item.description && (
                  <p className="text-xs text-pine-2 mt-2 line-clamp-2">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Status & Actions */}
              <div className="mt-4 pt-3 border-t border-brass/20 flex items-center justify-between">
                {/* Availability Toggle */}
                <button
                  onClick={() => mockStore.toggleItemAvailability(item.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    item.is_available
                      ? 'bg-moss/20 text-moss hover:bg-moss/30'
                      : 'bg-clay/20 text-clay hover:bg-clay/30'
                  }`}
                  title="Nhấn để đổi trạng thái Còn món / Hết món"
                >
                  {item.is_available ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Còn phục vụ</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Hết món</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1.5 rounded-lg text-pine hover:bg-kraft-dark/40 transition"
                    title="Chỉnh sửa thông tin món"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    className="p-1.5 rounded-lg text-clay/70 hover:text-clay hover:bg-clay/10 transition"
                    title="Xóa món"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: ADD / EDIT MENU ITEM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-kraft-card border border-brass max-w-md w-full rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-brass/20 pb-3">
              <h3 className="font-serif font-bold text-pine text-base">
                {editingItem ? 'Chỉnh Sửa Món' : 'Thêm Món Mới Vào Menu'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-pine-2 hover:text-pine"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-pine mb-1">Tên món</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Nước dâu rừng Hoàng Su Phì"
                  className="w-full px-3 py-2 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-pine text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-pine mb-1">Giá bán (VNĐ)</label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-pine text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-pine mb-1">Danh mục</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-pine text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-pine mb-1">Mô tả món (Tùy chọn)</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Hương vị, nguyên liệu tự nhiên tươi ngon..."
                  className="w-full px-3 py-2 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-pine text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_available_chk"
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                  className="rounded border-brass/40 text-moss focus:ring-moss h-4 w-4"
                />
                <label htmlFor="is_available_chk" className="text-xs font-semibold text-pine cursor-pointer">
                  Món đang sẵn sàng phục vụ khách
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-brass/20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-pine-2 hover:text-pine"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-moss hover:bg-moss/90 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  {editingItem ? 'Lưu cập nhật' : 'Thêm vào thực đơn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
