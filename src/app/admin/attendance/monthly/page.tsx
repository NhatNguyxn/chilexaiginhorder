'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import AttendanceNav from '@/components/AttendanceNav';
import { attendanceService } from '@/lib/services';
import { AttendanceRecord, UserProfile } from '@/types';
import { calculateShiftHours } from '@/lib/excel';
import { 
  CalendarRange, 
  FileSpreadsheet, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle,
  X
} from 'lucide-react';

interface DayDetailModalData {
  staffName: string;
  dateStr: string;
  records: AttendanceRecord[];
}

export default function AttendanceMonthlyPage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [monthlyRecords, setMonthlyRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Day detail modal state
  const [dayModalData, setDayModalData] = useState<DayDetailModalData | null>(null);

  // Number of days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch staff
      const staffRes = await fetch('/api/admin/staff');
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setStaffList(staffData.staff || []);
      }

      // 2. Fetch records for the selected month
      const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      const startDate = `${monthStr}-01T00:00:00.000Z`;
      const endDate = new Date(Date.UTC(selectedYear, selectedMonth, 1)).toISOString();

      const { records } = await attendanceService.getRecords({
        startDate,
        endDate,
        limit: 1000,
      });

      setMonthlyRecords(records);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleExportMonth = () => {
    const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    window.open(`/api/attendance/export?format=xlsx&month=${monthStr}`, '_blank');
  };

  // Build matrix for each staff and each day (1..daysInMonth)
  const staffMatrix = useMemo(() => {
    return staffList.map((st) => {
      const userRecs = monthlyRecords.filter((r) => r.user_id === st.id);
      const daysData: { day: number; hours: number; hasFlag: boolean; count: number; recs: AttendanceRecord[] }[] = [];
      let totalHours = 0;
      let totalShifts = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayRecs = userRecs.filter((r) => r.captured_at_server.startsWith(dayStr));

        const checkIn = dayRecs.find((r) => r.check_type === 'check_in');
        const checkOut = dayRecs.find((r) => r.check_type === 'check_out');

        let shiftHours = 0;
        if (checkIn && checkOut) {
          shiftHours = calculateShiftHours(checkIn.captured_at_server, checkOut.captured_at_server);
        } else if (checkIn) {
          shiftHours = 0; // Incomplete shift
        }

        const hasFlag = dayRecs.some((r) => r.flags.length > 0);
        if (checkIn) totalShifts += 1;
        totalHours += shiftHours;

        daysData.push({
          day,
          hours: shiftHours,
          hasFlag,
          count: dayRecs.length,
          recs: dayRecs,
        });
      }

      return {
        profile: st,
        days: daysData,
        totalHours: Math.round(totalHours * 10) / 10,
        totalShifts,
      };
    });
  }, [staffList, monthlyRecords, daysInMonth, selectedYear, selectedMonth]);

  return (
    <div className="space-y-6">
      <AttendanceNav />

      {/* Header & Month Selector */}
      <div className="bg-kraft-card border border-brass/30 p-5 rounded-2xl shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-bold text-xl sm:text-2xl text-pine flex items-center gap-2">
            <CalendarRange className="w-6 h-6 text-moss" />
            <span>Báo Cáo Bảng Công Hàng Tháng</span>
          </h1>
          <p className="text-xs text-pine-2 mt-1">
            Tổng hợp giờ công theo dạng ma trận lịch (Calendar matrix) của toàn bộ nhân viên.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Month Switcher */}
          <div className="flex items-center gap-1 bg-kraft border border-brass/40 rounded-xl p-1 text-xs font-bold text-pine">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-kraft-dark transition tap-active"
              title="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2">
              Tháng {selectedMonth} / {selectedYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-kraft-dark transition tap-active"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleExportMonth}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-moss hover:bg-moss/90 text-white transition flex items-center gap-1.5 shadow-sm tap-active"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel Tháng</span>
          </button>
        </div>
      </div>

      {/* Calendar Matrix Table */}
      <div className="bg-kraft-card border border-brass/30 rounded-2xl shadow-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-pine-2">Đang tải bảng công tháng...</div>
        ) : staffMatrix.length === 0 ? (
          <div className="py-16 text-center text-xs text-pine-2">Chưa có dữ liệu nhân viên.</div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-center text-xs border-collapse">
              <thead>
                <tr className="bg-kraft border-b border-brass/20 text-pine font-bold">
                  <th className="py-3 px-3 text-left sticky left-0 bg-kraft z-10 min-w-[140px] border-r border-brass/20">
                    Nhân viên
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                    <th key={d} className="py-2.5 px-1.5 min-w-[34px] font-mono text-[11px]">
                      {d}
                    </th>
                  ))}
                  <th className="py-3 px-3 min-w-[80px] bg-moss/10 text-moss font-bold border-l border-brass/20">
                    Tổng ca
                  </th>
                  <th className="py-3 px-3 min-w-[90px] bg-pine text-kraft font-bold">
                    Tổng giờ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brass/10">
                {staffMatrix.map((item) => (
                  <tr key={item.profile.id} className="hover:bg-kraft-dark/15 transition">
                    {/* Fixed staff name column */}
                    <td className="py-2.5 px-3 text-left font-bold text-pine sticky left-0 bg-kraft-card z-10 border-r border-brass/20 whitespace-nowrap">
                      <div>{item.profile.full_name}</div>
                      <div className="text-[10px] text-pine-2 font-mono font-normal">@{item.profile.username}</div>
                    </td>

                    {/* Day Cells 1..daysInMonth */}
                    {item.days.map((d) => {
                      const hasWorked = d.hours > 0;
                      const isIncomplete = d.count > 0 && d.hours === 0;

                      return (
                        <td
                          key={d.day}
                          onClick={() => {
                            if (d.recs.length > 0) {
                              setDayModalData({
                                staffName: item.profile.full_name,
                                dateStr: `${d.day}/${selectedMonth}/${selectedYear}`,
                                records: d.recs,
                              });
                            }
                          }}
                          className={`py-2 px-1 text-[11px] font-mono transition cursor-pointer ${
                            hasWorked
                              ? d.hasFlag
                                ? 'bg-amber-100 text-amber-900 font-bold hover:bg-amber-200'
                                : 'bg-moss/10 text-moss font-bold hover:bg-moss/20'
                              : isIncomplete
                              ? 'bg-clay/10 text-clay font-bold hover:bg-clay/20'
                              : 'text-pine-2/40 hover:bg-kraft'
                          }`}
                          title={
                            hasWorked
                              ? `${d.hours}h (${d.hasFlag ? 'Có cảnh báo' : 'Hợp lệ'})`
                              : isIncomplete
                              ? 'Chưa kết ca'
                              : 'Nghỉ'
                          }
                        >
                          {hasWorked ? `${d.hours}h` : isIncomplete ? '!' : '-'}
                        </td>
                      );
                    })}

                    {/* Total Shifts */}
                    <td className="py-2.5 px-3 font-bold text-moss border-l border-brass/20 bg-moss/5">
                      {item.totalShifts}
                    </td>

                    {/* Total Hours */}
                    <td className="py-2.5 px-3 font-bold text-pine bg-kraft-dark/30">
                      {item.totalHours}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Day Details Modal */}
      {dayModalData && (
        <div className="fixed inset-0 z-50 bg-pine/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-kraft-card max-w-md w-full rounded-3xl border border-brass/40 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-brass/20 pb-3">
              <div>
                <h3 className="font-serif font-bold text-pine text-base">
                  Chi Tiết Ca Làm Ngày {dayModalData.dateStr}
                </h3>
                <p className="text-xs text-pine-2">{dayModalData.staffName}</p>
              </div>
              <button
                onClick={() => setDayModalData(null)}
                className="p-1 rounded-full text-pine-2 hover:bg-kraft"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {dayModalData.records.map((r) => (
                <div
                  key={r.id}
                  className="bg-kraft p-3 rounded-2xl border border-brass/20 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.photo_url}
                      alt="Ảnh"
                      className="w-10 h-12 rounded-lg object-cover border border-brass/30 bg-black flex-shrink-0"
                    />
                    <div>
                      <div className="font-bold text-pine">
                        {r.check_type === 'check_in' ? 'Vào ca' : 'Kết ca'}:{' '}
                        {new Date(r.captured_at_server).toLocaleTimeString('vi-VN')}
                      </div>
                      <div className="text-[11px] text-pine-2">
                        Khoảng cách: {r.distance_meters != null ? `${r.distance_meters}m` : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.flags.length > 0 ? 'bg-clay/10 text-clay' : 'bg-moss/10 text-moss'
                    }`}
                  >
                    {r.flags.length > 0 ? 'Cảnh báo' : 'Chuẩn'}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setDayModalData(null)}
              className="w-full py-2.5 bg-pine text-kraft font-bold text-xs rounded-xl shadow tap-active"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
