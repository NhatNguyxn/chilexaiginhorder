'use client';

import { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '@/types';
import { ROLE_LABELS } from '@/lib/permissions';
import { formatVND } from '@/lib/constants';
import { Users, Plus, Shield, CheckCircle2, XCircle, X, KeyRound, Lock, AlertCircle } from 'lucide-react';

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add Staff Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'staff' as UserRole,
    hourly_rate: 25000,
  });

  // Reset Password Modal
  const [resetModalStaff, setResetModalStaff] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const loadStaff = async () => {
    try {
      setErrorMessage(null);
      const res = await fetch('/api/admin/staff');
      if (!res.ok) {
        throw new Error('Không thể tải danh sách nhân viên hoặc bạn không có quyền.');
      }
      const data = await res.json();
      setStaffList(data.staff || []);
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi tải danh sách');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          username: formData.username.trim().toLowerCase(),
          hourly_rate: Number(formData.hourly_rate),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi tạo nhân viên');
      }

      setFormData({
        username: '',
        password: '',
        full_name: '',
        role: 'staff',
        hourly_rate: 25000,
      });
      setIsAddModalOpen(false);
      await loadStaff();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi tạo tài khoản');
    }
  };

  const handleToggleStatus = async (staff: UserProfile) => {
    if (staff.role === 'owner') {
      alert('Không thể khóa tài khoản Chủ quán.');
      return;
    }

    try {
      const res = await fetch('/api/admin/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: staff.id,
          is_active: !staff.is_active,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Lỗi cập nhật trạng thái');
      }

      await loadStaff();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi cập nhật trạng thái');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalStaff || !newPassword) return;

    try {
      const res = await fetch('/api/admin/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: resetModalStaff.id,
          password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi đặt lại mật khẩu');
      }

      alert(`Đã đặt lại mật khẩu cho tài khoản "${resetModalStaff.username}" thành công!`);
      setResetModalStaff(null);
      setNewPassword('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi đặt lại mật khẩu');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-kraft-card border border-brass/30 p-4 sm:p-5 rounded-2xl shadow-card">
        <div>
          <h1 className="font-serif font-bold text-xl sm:text-2xl text-pine flex items-center gap-2">
            <Users className="w-6 h-6 text-moss" />
            <span>Quản Lý Nhân Viên & Phân Quyền (4 Vai Trò)</span>
          </h1>
          <p className="text-xs text-pine-2 mt-1">
            Tổng cộng <strong>{staffList.length} tài khoản</strong> nhân sự. Chủ quán có toàn quyền quản trị, phân quyền và đặt lại mật khẩu.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-moss hover:bg-moss/90 text-white transition flex items-center gap-1.5 shadow-sm tap-active self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm nhân viên mới</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-clay/10 border border-clay/30 rounded-xl text-xs text-clay flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Staff Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-pine-2">Đang tải danh sách nhân sự...</div>
      ) : (
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
                      <p className="text-xs text-pine-2 font-mono">@{staff.username}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                      staff.role === 'owner'
                        ? 'bg-amber-100 text-amber-800'
                        : staff.role === 'manager'
                        ? 'bg-purple-100 text-purple-800'
                        : staff.role === 'cashier'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-moss/10 text-moss'
                    }`}
                  >
                    <Shield className="w-3 h-3" />
                    <span>{ROLE_LABELS[staff.role] || staff.role}</span>
                  </span>
                </div>

                <div className="text-xs text-pine-2 space-y-1 bg-kraft p-2.5 rounded-xl border border-brass/20">
                  <div className="flex justify-between">
                    <span>Lương theo giờ:</span>
                    <span className="font-bold text-pine">{formatVND(staff.hourly_rate || 0)}/h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trạng thái tài khoản:</span>
                    <span className={`font-bold ${staff.is_active ? 'text-moss' : 'text-clay'}`}>
                      {staff.is_active ? 'Đang hoạt động' : 'Đã khóa'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-4 pt-3 border-t border-brass/20 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleStatus(staff)}
                  disabled={staff.role === 'owner'}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                    staff.is_active
                      ? 'text-clay hover:bg-clay/10'
                      : 'text-moss hover:bg-moss/10'
                  } disabled:opacity-40`}
                >
                  {staff.is_active ? 'Khóa tài khoản' : 'Mở khóa'}
                </button>

                <button
                  onClick={() => {
                    setResetModalStaff(staff);
                    setNewPassword('');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-kraft-dark/40 hover:bg-kraft-dark/70 text-pine text-xs font-semibold flex items-center gap-1 transition"
                  title="Đặt lại mật khẩu"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Đổi mật khẩu</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add Staff */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-pine/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-kraft-card w-full max-w-md rounded-3xl border border-brass/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-brass/20 pb-3">
              <h3 className="font-serif font-bold text-pine text-base">Thêm Tài Khoản Nhân Sự Mới</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full text-pine-2 hover:bg-kraft"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-pine mb-1">Họ và tên:</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-xs text-pine"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-pine mb-1">Tên đăng nhập (chữ không dấu):</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Ví dụ: vanan, thungan01..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-xs text-pine"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-pine mb-1">Mật khẩu khởi tạo:</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-xs text-pine"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-pine mb-1">Vai trò:</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-xs text-pine"
                  >
                    <option value="staff">Nhân viên (Staff)</option>
                    <option value="cashier">Thu ngân (Cashier)</option>
                    <option value="manager">Quản lý (Manager)</option>
                    <option value="owner">Chủ quán (Owner)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-pine mb-1">Lương / giờ (VND):</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-xs text-pine"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-brass/40 text-pine font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-moss text-white font-bold text-xs rounded-xl shadow tap-active"
                >
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {resetModalStaff && (
        <div className="fixed inset-0 z-50 bg-pine/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-kraft-card w-full max-w-sm rounded-3xl border border-brass/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-brass/20 pb-3">
              <h3 className="font-serif font-bold text-pine text-base">
                Đặt Lại Mật Khẩu
              </h3>
              <button
                onClick={() => setResetModalStaff(null)}
                className="p-1.5 rounded-full text-pine-2 hover:bg-kraft"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-pine-2">
              Đặt lại mật khẩu cho tài khoản <strong>@{resetModalStaff.username}</strong> ({resetModalStaff.full_name}):
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-pine mb-1">Mật khẩu mới:</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-xs text-pine"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setResetModalStaff(null)}
                  className="flex-1 py-2.5 rounded-xl border border-brass/40 text-pine font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-moss text-white font-bold text-xs rounded-xl shadow tap-active"
                >
                  Xác nhận đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
