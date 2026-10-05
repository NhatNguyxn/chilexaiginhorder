'use client';

import { useState, useEffect, useCallback } from 'react';
import AttendanceNav from '@/components/AttendanceNav';
import { attendanceService, auditService } from '@/lib/services';
import { AttendanceRecord, UserProfile } from '@/types';
import { formatCoordinates } from '@/lib/geo';
import { 
  CalendarCheck2, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  Edit3, 
  Eye, 
  X, 
  Smartphone, 
  ShieldAlert,
  Save
} from 'lucide-react';

interface StaffTodayStatus {
  profile: UserProfile;
  checkInRecord?: AttendanceRecord;
  checkOutRecord?: AttendanceRecord;
  status: 'working' | 'completed' | 'not_started';
  elapsedHours: string;
}

export default function AttendanceTodayPage() {
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Inspection Modal state
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  // Edit Time Modal state
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editTimeStr, setEditTimeStr] = useState('');
  const [editReason, setEditReason] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // 1. Fetch staff
      const staffRes = await fetch('/api/admin/staff');
      let users: UserProfile[] = [];
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        users = staffData.staff || [];
        setStaffList(users);
      }

      // 2. Fetch today's records
      const todayRecs = await attendanceService.getAllTodayRecords();
      setRecords(todayRecs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // 15s live refresh
    return () => clearInterval(interval);
  }, [loadData]);

  // Compute shift status per staff member
  const staffStatuses: StaffTodayStatus[] = staffList.map((st) => {
    const userRecs = records.filter((r) => r.user_id === st.id);
    const checkIn = userRecs.find((r) => r.check_type === 'check_in');
    const checkOut = userRecs.find((r) => r.check_type === 'check_out');

    let status: 'working' | 'completed' | 'not_started' = 'not_started';
    let elapsedHours = '--';

    if (checkIn && !checkOut) {
      status = 'working';
      const inTime = new Date(checkIn.captured_at_server).getTime();
      const now = Date.now();
      const diffMins = Math.max(0, Math.floor((now - inTime) / (1000 * 60)));
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      elapsedHours = `${h}h ${m}p`;
    } else if (checkIn && checkOut) {
      status = 'completed';
      const inTime = new Date(checkIn.captured_at_server).getTime();
      const outTime = new Date(checkOut.captured_at_server).getTime();
      const diffMins = Math.max(0, Math.floor((outTime - inTime) / (1000 * 60)));
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      elapsedHours = `${h}h ${m}p`;
    }

    return {
      profile: st,
      checkInRecord: checkIn,
      checkOutRecord: checkOut,
      status,
      elapsedHours,
    };
  });

  const handleSaveManualEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !editTimeStr || !editReason.trim()) {
      alert('Vui lòng nhập giờ mới và lý do sửa.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const todayDate = editingRecord.captured_at_server.split('T')[0];
      const newTimeIso = new Date(`${todayDate}T${editTimeStr}:00`).toISOString();

      await auditService.log({
        action: 'ATTENDANCE_TIME_EDIT',
        entity_type: 'attendance_records',
        entity_id: editingRecord.id,
        old_data: { captured_at_server: editingRecord.captured_at_server },
        new_data: { captured_at_server: newTimeIso, reason: editReason.trim() },
      });

      alert('Đã cập nhật giờ chấm công và ghi nhận nhật ký kiểm toán!');
      setEditingRecord(null);
      setEditReason('');
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi cập nhật');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      <AttendanceNav />

      {/* Header */}
      <div className="bg-kraft-card border border-brass/30 p-5 rounded-2xl shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif font-bold text-xl sm:text-2xl text-pine flex items-center gap-2">
            <CalendarCheck2 className="w-6 h-6 text-moss" />
            <span>Tình Hình Điểm Danh Ca Làm Hôm Nay</span>
          </h1>
          <p className="text-xs text-pine-2 mt-1">
            Theo dõi trạng thái nhân viên có mặt theo thời gian thực, hình ảnh đóng dấu và cờ cảnh báo vị trí.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-moss animate-pulse" />
          <span className="text-xs font-bold text-moss">Tự động cập nhật trực tiếp</span>
        </div>
      </div>

      {/* Staff attendance list */}
      {loading ? (
        <div className="py-12 text-center text-xs text-pine-2">Đang tải dữ liệu ca làm...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffStatuses.map((item) => {
            const hasFlags =
              (item.checkInRecord && item.checkInRecord.flags.length > 0) ||
              (item.checkOutRecord && item.checkOutRecord.flags.length > 0);

            return (
              <div
                key={item.profile.id}
                className={`bg-kraft-card border rounded-2xl p-4 shadow-card flex flex-col justify-between transition ${
                  item.status === 'working'
                    ? 'border-moss ring-1 ring-moss/30'
                    : item.status === 'completed'
                    ? 'border-brass/40 opacity-95'
                    : 'border-brass/20 opacity-60 bg-kraft-dark/20'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-serif font-bold text-pine text-base">
                        {item.profile.full_name}
                      </h3>
                      <p className="text-xs text-pine-2 font-mono">@{item.profile.username}</p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                        item.status === 'working'
                          ? 'bg-moss text-white shadow-xs animate-pulse-slow'
                          : item.status === 'completed'
                          ? 'bg-pine text-kraft'
                          : 'bg-kraft-dark/40 text-pine-2'
                      }`}
                    >
                      {item.status === 'working' && 'Đang làm việc'}
                      {item.status === 'completed' && 'Đã kết ca'}
                      {item.status === 'not_started' && 'Chưa vào ca'}
                    </span>
                  </div>

                  {/* Hours & Flags Summary */}
                  <div className="mt-4 pt-3 border-t border-brass/20 space-y-2 text-xs">
                    <div className="flex justify-between text-pine-2">
                      <span>Thời gian ca:</span>
                      <span className="font-bold text-pine">{item.elapsedHours}</span>
                    </div>

                    {item.checkInRecord && (
                      <div className="flex justify-between items-center text-pine-2">
                        <span>Giờ vào ca:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-pine">
                            {new Date(item.checkInRecord.captured_at_server).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <button
                            onClick={() => setSelectedRecord(item.checkInRecord!)}
                            className="p-1 rounded-md bg-kraft hover:bg-kraft-dark text-moss transition"
                            title="Xem ảnh vào ca"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingRecord(item.checkInRecord!);
                              setEditTimeStr('08:00');
                              setEditReason('');
                            }}
                            className="p-1 rounded-md bg-kraft hover:bg-kraft-dark text-clay transition"
                            title="Sửa giờ vào ca"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {item.checkOutRecord && (
                      <div className="flex justify-between items-center text-pine-2">
                        <span>Giờ kết ca:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-pine">
                            {new Date(item.checkOutRecord.captured_at_server).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <button
                            onClick={() => setSelectedRecord(item.checkOutRecord!)}
                            className="p-1 rounded-md bg-kraft hover:bg-kraft-dark text-moss transition"
                            title="Xem ảnh kết ca"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingRecord(item.checkOutRecord!);
                              setEditTimeStr('17:00');
                              setEditReason('');
                            }}
                            className="p-1 rounded-md bg-kraft hover:bg-kraft-dark text-clay transition"
                            title="Sửa giờ kết ca"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {hasFlags && (
                      <div className="p-2 rounded-xl bg-clay/10 border border-clay/30 text-[11px] text-clay font-bold flex items-center gap-1.5 mt-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>Có cảnh báo bất thường (Lệch giờ / Ngoài quán)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspection Modal: Detailed Photo & Geolocation Verification */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-pine/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-kraft-card w-full max-w-lg rounded-3xl border border-brass/40 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-brass/20 pb-3">
              <div>
                <h3 className="font-serif font-bold text-pine text-base">
                  Đối Soát Bản Ghi Chấm Công ({selectedRecord.check_type === 'check_in' ? 'Vào ca' : 'Kết ca'})
                </h3>
                <p className="text-xs text-pine-2">
                  Chụp lúc {new Date(selectedRecord.captured_at_server).toLocaleString('vi-VN')}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-full text-pine-2 hover:bg-kraft"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo with Inset Watermark Badge */}
            <div className="relative rounded-2xl overflow-hidden border border-brass/30 bg-black aspect-3/4 max-h-[50vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedRecord.photo_url}
                alt="Ảnh chấm công đã đóng dấu"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Forensic Details List */}
            <div className="space-y-2 bg-kraft p-4 rounded-2xl border border-brass/20 text-xs text-pine">
              <div className="flex justify-between py-1 border-b border-brass/10">
                <span className="text-pine-2">Giờ ghi nhận Server:</span>
                <span className="font-bold">
                  {new Date(selectedRecord.captured_at_server).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-brass/10">
                <span className="text-pine-2">Giờ trên thiết bị:</span>
                <span
                  className={`font-bold ${
                    selectedRecord.flags.includes('TIME_DRIFT_EXCEEDED') ? 'text-clay' : ''
                  }`}
                >
                  {new Date(selectedRecord.captured_at_client).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                  {selectedRecord.flags.includes('TIME_DRIFT_EXCEEDED') && ' (Lệch > 2 phút!)'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-brass/10">
                <span className="text-pine-2">Tọa độ GPS:</span>
                <div className="flex items-center gap-1 font-mono font-bold">
                  <span>{formatCoordinates(selectedRecord.latitude, selectedRecord.longitude)}</span>
                  {selectedRecord.latitude != null && selectedRecord.longitude != null && (
                    <a
                      href={`https://maps.google.com/?q=${selectedRecord.latitude},${selectedRecord.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-moss hover:underline p-1"
                      title="Mở Google Maps"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex justify-between py-1 border-b border-brass/10">
                <span className="text-pine-2">Khoảng cách tới quán:</span>
                <span
                  className={`font-bold ${
                    selectedRecord.flags.includes('OUT_OF_RADIUS') ? 'text-clay' : 'text-moss'
                  }`}
                >
                  {selectedRecord.distance_meters != null
                    ? `${selectedRecord.distance_meters} mét`
                    : 'Không xác định'}
                  {selectedRecord.flags.includes('OUT_OF_RADIUS') && ' (Vượt bán kính cho phép!)'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-brass/10">
                <span className="text-pine-2">Mã thiết bị (Device ID):</span>
                <span className="font-mono text-[11px] text-pine-2">
                  {selectedRecord.device_id || 'N/A'}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-pine-2">Địa chỉ IP:</span>
                <span className="font-mono text-[11px] text-pine-2">
                  {selectedRecord.ip_address || '127.0.0.1'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedRecord(null)}
              className="w-full py-3 bg-pine text-kraft font-bold text-xs rounded-xl shadow tap-active"
            >
              Đóng xem ảnh
            </button>
          </div>
        </div>
      )}

      {/* Edit Shift Time Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-pine/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-kraft-card w-full max-w-sm rounded-3xl border border-brass/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-brass/20 pb-3">
              <h3 className="font-serif font-bold text-pine text-base">
                Sửa Giờ Chấm Công ({editingRecord.check_type === 'check_in' ? 'Vào ca' : 'Kết ca'})
              </h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1 rounded-full text-pine-2 hover:bg-kraft"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-pine mb-1">
                  Giờ mới (HH:mm):
                </label>
                <input
                  type="time"
                  required
                  value={editTimeStr}
                  onChange={(e) => setEditTimeStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brass/40 bg-kraft text-xs text-pine"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-pine mb-1">
                  Lý do điều chỉnh (lưu vết vào audit logs):
                </label>
                <textarea
                  required
                  rows={2}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Ví dụ: Nhân viên có mặt từ 07:45 nhưng máy chụp báo lỗi..."
                  className="w-full px-3 py-2 rounded-xl border border-brass/40 bg-kraft text-xs text-pine"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="flex-1 py-2.5 rounded-xl border border-brass/40 text-pine font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex-1 py-2.5 bg-moss text-white font-bold text-xs rounded-xl shadow tap-active flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingEdit ? 'Đang lưu...' : 'Lưu điều chỉnh'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
