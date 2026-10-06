'use client';

import { useState, useEffect } from 'react';
import AttendanceNav from '@/components/AttendanceNav';
import { attendanceService, auditService } from '@/lib/services';
import { StoreSettings, GeofenceMode } from '@/types';
import { SlidersHorizontal, MapPin, Crosshair, Save, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function AttendanceSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>({
    id: 'a0000000-0000-0000-0000-000000000001',
    store_name: 'Chị Lệ xai gính',
    address: 'Quảng trường Nguyễn Tất Thành, Tỉnh Tuyên Quang',
    latitude: 21.8197,
    longitude: 105.2172,
    radius_meters: 150,
    warning_mode: 'warn_only',
    ip_whitelist: [],
    photo_retention_days: 90,
    updated_at: new Date().toISOString(),
  });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [isGettingGps, setIsGettingGps] = useState(false);

  useEffect(() => {
    attendanceService.getSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  // Use current GPS button for owner standing at the store
  const handleGetCurrentGps = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt không hỗ trợ lấy vị trí.');
      return;
    }

    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSettings((prev) => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        }));
        setIsGettingGps(false);
        alert(`Đã lấy vị trí thành công: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
      },
      (err) => {
        setIsGettingGps(false);
        alert(`Không thể lấy vị trí: ${err.message}. Vui lòng cấp quyền vị trí cho trình duyệt.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMsg(false);

    try {
      await attendanceService.updateSettings(settings);
      await auditService.log({
        action: 'UPDATE_STORE_SETTINGS',
        entity_type: 'store_settings',
        entity_id: settings.id,
        new_data: settings as unknown as Record<string, unknown>,
      });

      setSaveSuccessMsg(true);
      setTimeout(() => setSaveSuccessMsg(false), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi lưu cấu hình');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AttendanceNav />

      {/* Header */}
      <div className="bg-kraft-card border border-brass/30 p-5 rounded-2xl shadow-card">
        <h1 className="font-serif font-bold text-xl sm:text-2xl text-pine flex items-center gap-2">
          <SlidersHorizontal className="w-6 h-6 text-moss" />
          <span>Cấu Hình Địa Điểm Chấm Công & Bán Kính GPS (Chỉ Chủ Quán)</span>
        </h1>
        <p className="text-xs text-pine-2 mt-1">
          Thiết lập tọa độ chính xác của quán, hàng rào địa lý (Geofencing), và chế độ xử lý khi nhân viên chấm công ngoài phạm vi quán.
        </p>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 bg-moss/10 border border-moss/30 rounded-2xl flex items-center gap-2.5 text-moss text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>Đã lưu toàn bộ cấu hình quán và cập nhật hàng rào địa lý thành công!</span>
        </div>
      )}

      {/* Settings Form */}
      <div className="bg-kraft-card border border-brass/30 rounded-2xl p-6 shadow-card max-w-2xl">
        <form onSubmit={handleSaveSettings} className="space-y-5 text-xs text-pine">
          {/* Store Info */}
          <div className="space-y-3">
            <h2 className="font-serif font-bold text-sm text-pine flex items-center gap-1.5 pb-2 border-b border-brass/20">
              <ShieldCheck className="w-4 h-4 text-moss" />
              <span>Thông tin địa điểm quán</span>
            </h2>

            <div>
              <label className="block font-bold mb-1">Tên quán / địa điểm:</label>
              <input
                type="text"
                required
                value={settings.store_name}
                onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-xs text-pine"
              />
            </div>

            <div>
              <label className="block font-bold mb-1">Địa chỉ hiển thị:</label>
              <input
                type="text"
                required
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-xs text-pine"
              />
            </div>
          </div>

          {/* GPS Coordinates & Geofence */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-brass/20">
              <h2 className="font-serif font-bold text-sm text-pine flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-moss" />
                <span>Tọa độ GPS & Hàng rào địa lý (Geofencing)</span>
              </h2>

              <button
                type="button"
                onClick={handleGetCurrentGps}
                disabled={isGettingGps}
                className="px-3 py-1.5 rounded-lg bg-kraft hover:bg-kraft-dark text-pine font-bold text-[11px] border border-brass/40 flex items-center gap-1.5 transition tap-active disabled:opacity-50"
              >
                <Crosshair className={`w-3.5 h-3.5 ${isGettingGps ? 'animate-spin' : ''}`} />
                <span>Lấy tọa độ vị trí hiện tại của tôi</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Vĩ độ (Latitude):</label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={settings.latitude}
                  onChange={(e) => setSettings({ ...settings, latitude: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brass/40 bg-kraft font-mono text-xs text-pine"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Kinh độ (Longitude):</label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={settings.longitude}
                  onChange={(e) => setSettings({ ...settings, longitude: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brass/40 bg-kraft font-mono text-xs text-pine"
                />
              </div>
            </div>

            {/* Radius Slider */}
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span>Bán kính cho phép chấm công:</span>
                <span className="text-moss text-sm">{settings.radius_meters} mét</span>
              </div>
              <input
                type="range"
                min={50}
                max={500}
                step={25}
                value={settings.radius_meters}
                onChange={(e) => setSettings({ ...settings, radius_meters: Number(e.target.value) })}
                className="w-full accent-moss cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-pine-2 mt-0.5">
                <span>50m (Chính xác cửa quán)</span>
                <span>150m (Khuyên dùng)</span>
                <span>500m (Rộng)</span>
              </div>
            </div>

            {/* Warning Mode */}
            <div>
              <label className="block font-bold mb-1">Chế độ xử lý khi nhân viên ngoài bán kính:</label>
              <select
                value={settings.warning_mode}
                onChange={(e) =>
                  setSettings({ ...settings, warning_mode: e.target.value as GeofenceMode })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-brass/40 bg-kraft text-xs text-pine"
              >
                <option value="warn_only">Cảnh báo cờ vàng nhưng vẫn cho chụp (Mặc định)</option>
                <option value="require_note">Bắt buộc nhập lý do giải trình khi ngoài bán kính</option>
                <option value="block">Chặn hoàn toàn - Không cho phép chấm công khi đứng ngoài quán</option>
              </select>
            </div>
          </div>

          {/* Data Retention */}
          <div className="space-y-3 pt-2">
            <h2 className="font-serif font-bold text-sm text-pine pb-2 border-b border-brass/20">
              Chính sách lưu trữ ảnh chấm công
            </h2>

            <div>
              <label className="block font-bold mb-1">Thời hạn lưu ảnh (ngày):</label>
              <input
                type="number"
                min={30}
                max={365}
                value={settings.photo_retention_days}
                onChange={(e) =>
                  setSettings({ ...settings, photo_retention_days: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-brass/40 bg-kraft text-xs text-pine"
              />
              <p className="text-[11px] text-pine-2 mt-1">
                Ảnh cũ hơn số ngày này có thể được tự động xóa định kỳ để tối ưu dung lượng bộ nhớ Supabase.
              </p>
            </div>
          </div>

          {/* Submit button */}
          <div className="pt-4 border-t border-brass/20">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 bg-moss hover:bg-moss/90 text-white rounded-xl font-serif font-bold text-sm shadow flex items-center justify-center gap-2 tap-active transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Đang lưu cấu hình...' : 'Lưu Thay Đổi Cấu Hình'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
