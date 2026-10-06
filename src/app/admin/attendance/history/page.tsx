'use client';

import { useState, useEffect, useCallback } from 'react';
import AttendanceNav from '@/components/AttendanceNav';
import { attendanceService } from '@/lib/services';
import { AttendanceRecord, UserProfile } from '@/types';
import { calculateShiftHours } from '@/lib/excel';
import { 
  History, 
  Download, 
  FileSpreadsheet, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  X
} from 'lucide-react';

export default function AttendanceHistoryPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Zoomed photo state
  const [zoomedPhotoUrl, setZoomedPhotoUrl] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch staff dropdown list
      const staffRes = await fetch('/api/admin/staff');
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setStaffList(staffData.staff || []);
      }

      // Fetch history records
      const { records: data, total } = await attendanceService.getRecords({
        userId: selectedStaffId !== 'all' ? selectedStaffId : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        startDate: startDate ? `${startDate}T00:00:00.000Z` : undefined,
        endDate: endDate ? `${endDate}T23:59:59.999Z` : undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });

      setRecords(data);
      setTotalCount(total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedStaffId, selectedStatus, startDate, endDate, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Export File
  const handleExport = (format: 'xlsx' | 'csv') => {
    const params = new URLSearchParams();
    params.set('format', format);
    if (selectedStaffId !== 'all') params.set('user_id', selectedStaffId);
    if (startDate && startDate.length >= 7) params.set('month', startDate.slice(0, 7));

    window.open(`/api/attendance/export?${params.toString()}`, '_blank');
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      <AttendanceNav />

      {/* Header & Export Actions */}
      <div className="bg-kraft-card border border-brass/30 p-5 rounded-2xl shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-bold text-xl sm:text-2xl text-pine flex items-center gap-2">
            <History className="w-6 h-6 text-moss" />
            <span>Lịch Sử Chấm Công & Xuất Báo Cáo</span>
          </h1>
          <p className="text-xs text-pine-2 mt-1">
            Tổng cộng <strong>{totalCount} lượt chấm công</strong>. Tra cứu hình ảnh đối soát và xuất file Excel/CSV chuẩn kế toán.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => handleExport('xlsx')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-moss hover:bg-moss/90 text-white transition flex items-center gap-1.5 shadow-sm tap-active"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => handleExport('csv')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-kraft-soft border border-brass/40 text-pine hover:bg-kraft-dark/40 transition flex items-center gap-1.5 tap-active"
          >
            <Download className="w-4 h-4" />
            <span>Xuất CSV (UTF-8 BOM)</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-kraft-card border border-brass/30 p-4 rounded-2xl shadow-card grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block font-bold text-pine mb-1">Nhân viên:</label>
          <select
            value={selectedStaffId}
            onChange={(e) => {
              setSelectedStaffId(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl border border-brass/40 bg-kraft text-pine"
          >
            <option value="all">Tất cả nhân sự ({staffList.length})</option>
            {staffList.map((st) => (
              <option key={st.id} value={st.id}>
                {st.full_name} (@{st.username})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-pine mb-1">Trạng thái:</label>
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl border border-brass/40 bg-kraft text-pine"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="valid">Hợp lệ</option>
            <option value="flagged">Có cảnh báo bất thường</option>
            <option value="adjusted">Đã sửa công</option>
            <option value="auto_closed">Hệ thống tự đóng ca (23:59)</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-pine mb-1">Từ ngày:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl border border-brass/40 bg-kraft text-pine"
          />
        </div>

        <div>
          <label className="block font-bold text-pine mb-1">Đến ngày:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl border border-brass/40 bg-kraft text-pine"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="bg-kraft-card border border-brass/30 rounded-2xl shadow-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-pine-2">Đang tải lịch sử...</div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center text-xs text-pine-2">Không tìm thấy bản ghi nào phù hợp với bộ lọc.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-kraft border-b border-brass/20 text-pine font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Ảnh & Thời gian</th>
                  <th className="py-3 px-4">Nhân viên</th>
                  <th className="py-3 px-4">Loại ca</th>
                  <th className="py-3 px-4">Vị trí & Khoảng cách</th>
                  <th className="py-3 px-4">Cờ cảnh báo</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brass/10">
                {records.map((r) => {
                  const hasFlags = r.flags.length > 0;
                  return (
                    <tr key={r.id} className="hover:bg-kraft-dark/10 transition">
                      {/* Photo Thumbnail with hover zoom */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setZoomedPhotoUrl(r.photo_url_signed || r.photo_url)}
                            className="w-12 h-14 rounded-lg overflow-hidden border border-brass/30 bg-black flex-shrink-0 group relative tap-active"
                            title="Bấm để xem ảnh to"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={r.photo_url_signed || r.photo_url}
                              alt="Ảnh"
                              className="w-full h-full object-cover group-hover:scale-110 transition"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                              <Eye className="w-3.5 h-3.5" />
                            </div>
                          </button>
                          <div>
                            <div className="font-bold text-pine text-sm">
                              {new Date(r.captured_at_server).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </div>
                            <div className="text-[11px] text-pine-2">
                              {new Date(r.captured_at_server).toLocaleDateString('vi-VN')}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Staff */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-pine">{r.user?.full_name || 'Nhân viên'}</div>
                        <div className="text-[11px] text-pine-2 font-mono">@{r.user?.username || 'user'}</div>
                      </td>

                      {/* Check type */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            r.check_type === 'check_in'
                              ? 'bg-moss/10 text-moss'
                              : 'bg-clay/10 text-clay'
                          }`}
                        >
                          {r.check_type === 'check_in' ? 'Vào ca' : 'Kết ca'}
                        </span>
                      </td>

                      {/* Distance */}
                      <td className="py-3 px-4">
                        <div className="text-pine font-medium">
                          {r.distance_meters != null ? `${r.distance_meters}m` : 'N/A'}
                        </div>
                        <div className="text-[10px] text-pine-2 line-clamp-1">{r.location_name}</div>
                      </td>

                      {/* Flags */}
                      <td className="py-3 px-4">
                        {hasFlags ? (
                          <div className="flex flex-wrap gap-1">
                            {r.flags.map((f) => (
                              <span
                                key={f}
                                className="px-1.5 py-0.5 rounded bg-clay/10 text-clay font-bold text-[10px]"
                              >
                                {f === 'OUT_OF_RADIUS'
                                  ? 'Ngoài quán'
                                  : f === 'TIME_DRIFT_EXCEEDED'
                                  ? 'Lệch giờ > 2p'
                                  : f === 'NO_GPS'
                                  ? 'Không GPS'
                                  : f}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-moss font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Chuẩn vị trí</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'valid'
                              ? 'bg-moss/10 text-moss'
                              : r.status === 'flagged'
                              ? 'bg-clay/10 text-clay'
                              : r.status === 'auto_closed'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {r.status === 'valid'
                            ? 'Hợp lệ'
                            : r.status === 'flagged'
                            ? 'Bất thường'
                            : r.status === 'auto_closed'
                            ? 'Tự đóng ca'
                            : 'Đã sửa công'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setZoomedPhotoUrl(r.photo_url_signed || r.photo_url)}
                          className="px-2.5 py-1 rounded-lg bg-kraft hover:bg-kraft-dark text-pine font-semibold transition"
                        >
                          Xem ảnh
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-brass/20 flex items-center justify-between text-xs text-pine">
            <span>
              Trang {page} / {totalPages} (Tổng số {totalCount} bản ghi)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-brass/30 hover:bg-kraft disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-brass/30 hover:bg-kraft disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Zoomed Photo */}
      {zoomedPhotoUrl && (
        <div className="fixed inset-0 z-50 bg-pine/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-kraft-card max-w-md w-full rounded-3xl border border-brass/40 p-4 shadow-2xl space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-brass/20">
              <h3 className="font-serif font-bold text-pine text-sm">Hình ảnh chấm công</h3>
              <button
                onClick={() => setZoomedPhotoUrl(null)}
                className="p-1 rounded-full text-pine-2 hover:bg-kraft"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-3/4 max-h-[65vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={zoomedPhotoUrl}
                alt="Phóng to ảnh chấm công"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
