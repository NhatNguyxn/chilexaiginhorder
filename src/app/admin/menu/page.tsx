'use client';

import { useState, useEffect } from 'react';
import { menuService } from '@/lib/services';
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
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: 20000,
    category_id: '',
    description: '',
    is_available: true,
  });

  const loadData = async () => {
    try {
      const [c, i] = await Promise.all([
        menuService.getCategories(),
        menuService.getMenuItems(),
      ]);
      setCategories(c);
      setItems(i);
    } catch (err) {
      console.error('Lỗi tải thực đơn:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      price: 20000,
      category_id: categories[0]?.id || '',
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingItem) {
        await menuService.updateMenuItem(editingItem.id, {
          name: formData.name.trim(),
          price: Math.round(Number(formData.price)),
          category_id: formData.category_id,
          description: formData.description.trim(),
          is_available: formData.is_available,
        });
      } else {
        await menuService.createMenuItem({
          name: formData.name.trim(),
          price: Math.round(Number(formData.price)),
          category_id: formData.category_id,
          description: formData.description.trim(),
          is_available: formData.is_available,
          image_url: '/logo.png',
          sort_order: items.length + 1,
        });
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi lưu món');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Bạn có chắc muốn xóa món "${name}" khỏi thực đơn không?`)) {
      try {
        await menuService.deleteMenuItem(id);
        await loadData();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Lỗi xóa món');
      }
    }
  };

  const handleToggleAvailable = async (item: MenuItem) => {
    try {
      await menuService.updateMenuItem(item.id, {
        is_available: !item.is_available,
      });
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi cập nhật trạng thái món');
    }
  };

  const filteredItems = selectedCatId === 'all'
    ? items
    : items.filter((i) => i.category_id === selectedCatId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-kraft-card border border-brass/30 p-4 sm:p-5 rounded-2xl shadow-card">
        <div>
          <h1 className="font-serif font-bold text-xl sm:text-2xl text-pine flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-moss" />
            <span>Quản Lý Món & Danh Mục Thực Đơn</span>
          </h1>
          <p className="text-xs text-pine-2 mt-1">
            Tổng cộng <strong>{items.length} món</strong> thuộc {categories.length} danh mục.
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

      {/* Category filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        <button
          onClick={() => setSelectedCatId('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
            selectedCatId === 'all'
              ? 'bg-pine text-kraft shadow-sm'
              : 'bg-kraft-card border border-brass/30 text-pine hover:bg-kraft-dark/40'
          }`}
        >
          Tất cả ({items.length})
        </button>
        {categories.map((c) => {
          const count = items.filter((i) => i.category_id === c.id).length;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCatId(c.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                selectedCatId === c.id
                  ? 'bg-pine text-kraft shadow-sm'
                  : 'bg-kraft-card border border-brass/30 text-pine hover:bg-kraft-dark/40'
              }`}
            >
              {c.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Items Table / Cards */}
      {loading ? (
        <div className="py-12 text-center text-xs text-pine-2">Đang tải thực đơn...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-kraft-card border rounded-2xl p-4 shadow-card flex flex-col justify-between transition ${
                item.is_available ? 'border-brass/30' : 'border-brass/20 opacity-60 bg-kraft-dark/20'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif font-bold text-pine text-base">
                    {item.name}
                  </h3>
                  <span className="font-serif font-bold text-clay text-sm whitespace-nowrap">
                    {formatVND(item.price)}
                  </span>
                </div>
                {item.description && (
                  <p className="text-xs text-pine-2 mt-1 line-clamp-2">
                    {item.description}
                  </p>
                )}
                <div className="mt-2 text-[10px] text-moss font-semibold uppercase tracking-wider">
                  {categories.find((c) => c.id === item.category_id)?.name || 'Khác'}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-brass/20 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleAvailable(item)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    item.is_available
                      ? 'bg-moss/10 text-moss hover:bg-moss/20'
                      : 'bg-clay/10 text-clay hover:bg-clay/20'
                  }`}
                >
                  {item.is_available ? 'Đang bán' : 'Tạm hết'}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1.5 text-pine-2 hover:text-pine rounded-lg hover:bg-kraft transition"
                    title="Chỉnh sửa món"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    className="p-1.5 text-clay/70 hover:text-clay rounded-lg hover:bg-kraft transition"
                    title="Xóa món"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-pine/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-kraft-card w-full max-w-md rounded-3xl border border-brass/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-brass/20 pb-3">
              <h3 className="font-serif font-bold text-pine text-base">
                {editingItem ? 'Chỉnh Sửa Món' : 'Thêm Món Mới Vào Menu'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-pine-2 hover:bg-kraft"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-pine mb-1">Tên món:</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Trà quấy nha đam..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-xs text-pine"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-pine mb-1">Giá bán (VND):</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-xs text-pine"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-pine mb-1">Danh mục:</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-xs text-pine"
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
                <label className="block text-xs font-bold text-pine mb-1">Mô tả món (tùy chọn):</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Thành phần, hương vị..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-xs text-pine"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_available"
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                  className="accent-moss w-4 h-4 rounded"
                />
                <label htmlFor="is_available" className="text-xs font-bold text-pine cursor-pointer">
                  Món đang sẵn sàng phục vụ
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-brass/40 text-pine font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-moss text-white font-bold text-xs rounded-xl shadow tap-active"
                >
                  Lưu món
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
