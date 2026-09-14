'use client';

import { useState, useEffect } from 'react';
import { mockStore } from '@/lib/mock-store';
import { StaffUser } from '@/types';
import { Users, Plus, Shield, Coffee, CheckCircle2, XCircle, X } from 'lucide-react';

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    role: 'staff' as 'admin' | 'staff',
    email: '',
  });

  const loadStaff = () => {
    setStaffList(mockStore.getStaff());
  };

  useEffect(() => {
    loadStaff();
    const unsub = mockStore.subscribe(loadStaff);
    return () => unsub();
  }, []);

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) return;

    mockStore.addStaff({
      full_name: formData.full_name.trim(),
      role: formData.role,
      email: formData.email.trim() || undefined,
      is_active: true,
    });

    setFormData({
      full_name: '',
      role: 'staff',
      email: '',
    });
    setIsAddModalOpen(false);
  };

  const handleToggleStatus = (id: string) => {
    mockStore.toggleStaffStatus(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-kraft-card border border-brass/30 p-4 sm:p-5 rounded-2xl shadow-card">
        <div>
          <h1 className="font-serif font-bold text-xl sm:text-2xl text-pine flex items-center gap-2">
            <Users className="w-6 h-6 text-moss" />
            <span>Quản Lý Nhân Viên & Phân Quyền</span>
          </h1>
          <p className="text-xs text-pine-2 mt-1">
            Tổng cộng <strong>{staffList.length} tài khoản</strong> nhân sự vận hành quầy và pha chế.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-moss hover:bg-moss/90 text-white transition flex items-center gap-1.5 shadow-sm tap-active self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm nhân viên</span>
        </button>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staffList.map((staff) => (
          <div
            key={staff.id}
            className={`bg-kraft-card border rounded-2xl p-4 shadow-card flex flex-col justify-between transition ${
              staff.is_active ? 'border-brass/30' : 'border-brass/20 opacity-60 bg-kraft-dark/20'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-kraft-dark/60 border border-brass/30 flex items-center justify-center text-pine font-bold font-serif text-sm">
                    {staff.full_name.slice(0, 1)}
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-pine text-base">
                      {staff.full_name}
                    </h3>
                    <p className="text-xs text-pine-2">{staff.email || 'Chưa cập nhật email'}</p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                    staff.role === 'admin'
                      ? 'bg-clay/10 text-clay'
                      : 'bg-moss/10 text-moss'
                  }`}
                >
                  {staff.role === 'admin' ? (
                    <>
                      <Shield className="w-3 h-3" />
                      <span>Admin</span>
                    </>
                  ) : (
                    <>
                      <Coffee className="w-3 h-3" />
                      <span>Quầy/Bếp</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-brass/20 flex items-center justify-between">
              <span className="text-xs text-pine-2">Trạng thái làm việc:</span>
              <button
                onClick={() => handleToggleStatus(staff.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  staff.is_active
                    ? 'bg-moss/20 text-moss hover:bg-moss/30'
                    : 'bg-clay/20 text-clay hover:bg-clay/30'
                }`}
              >
                {staff.is_active ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Đang hoạt động</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Tạm khóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: ADD STAFF */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-kraft-card border border-brass max-w-sm w-full rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-brass/20 pb-3">
              <h3 className="font-serif font-bold text-pine text-base">Thêm Tài Khoản Nhân Viên</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-pine-2 hover:text-pine"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-pine mb-1">Họ và tên nhân viên</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn A (Ca Tối)"
                  className="w-full px-3 py-2 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-pine text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-pine mb-1">Email / SĐT</label>
                <input
                  type="text"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="nhanvien2@chile.vn hoặc SĐT"
                  className="w-full px-3 py-2 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-pine text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-pine mb-1">Vai trò</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'staff' })}
                  className="w-full px-3 py-2 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-pine text-sm"
                >
                  <option value="staff">Nhân viên phục vụ & pha chế (Staff)</option>
                  <option value="admin">Quản trị viên toàn quyền (Admin)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-brass/20">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-pine-2 hover:text-pine"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-moss hover:bg-moss/90 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
