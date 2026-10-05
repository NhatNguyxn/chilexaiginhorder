'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { formatCoordinates, formatVietnameseDateTime } from '@/lib/geo';
import { AttendanceRecord, AttendanceCheckType, StoreSettings } from '@/types';
import { 
  Camera, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Clock, 
  ArrowLeft, 
  ShieldAlert, 
  HelpCircle,
  FileEdit,
  Send,
  X
} from 'lucide-react';

export default function StaffAttendancePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Shifts state
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Camera & Capture flow state
  const [activeCheckType, setActiveCheckType] = useState<AttendanceCheckType | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);

  // Time & Location Sync state
  const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState<number>(0);
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState<string>('');
  const [currentDateDisplay, setCurrentDateDisplay] = useState<string>('');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Consent Modal state
  const [hasConsent, setHasConsent] = useState<boolean>(true);
  const [showConsentModal, setShowConsentModal] = useState<boolean>(false);

  // Adjustment Request Modal state
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({
    check_type: 'check_in' as AttendanceCheckType,
    shift_date: new Date().toISOString().split('T')[0],
    requested_time: '08:00',
    reason: '',
  });

  // Get or initialize persistent Device ID
  const getDeviceId = () => {
    if (typeof window === 'undefined') return 'unknown_device';
    let id = localStorage.getItem('chile_device_id_v1');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem('chile_device_id_v1', id);
    }
    return id;
  };

  // Sync server time
  const syncServerTime = async () => {
    try {
      const res = await fetch('/api/time');
      if (res.ok) {
        const data = await res.json();
        const serverMs = data.unix_ms;
        const localMs = Date.now();
        setServerTimeOffsetMs(serverMs - localMs);
      }
    } catch (err) {
      console.warn('Lỗi đồng bộ giờ server:', err);
    }
  };

  // Request GPS Location
  const requestGps = () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGpsError('Thiết bị không hỗ trợ định vị GPS');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGpsError(null);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setGpsError('GPS: Không khả dụng (bị từ chối hoặc lỗi)');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Load initial settings and today's shift records
  const loadData = useCallback(async () => {
    try {
      await syncServerTime();

      // Check consent
      const consentStored = localStorage.getItem('chile_camera_consent_v1');
      if (!consentStored) {
        setHasConsent(false);
        setShowConsentModal(true);
      }

      // Fetch settings
      const settingsRes = await fetch('/api/time');
      if (settingsRes.ok) {
        setSettings({
          id: 's0000000-0000-0000-0000-000000000001',
          store_name: 'Chị Lệ xai gính',
          address: 'Khu phố ẩm thực Hoàng Su Phì, Hà Giang',
          latitude: 22.753333,
          longitude: 104.685278,
          radius_meters: 150,
          warning_mode: 'warn_only',
          ip_whitelist: [],
          photo_retention_days: 90,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    requestGps();
  }, [loadData]);

  // Live Clock Tick synced with server offset
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date(Date.now() + serverTimeOffsetMs);
      const { timeStr, dateStr } = formatVietnameseDateTime(now);
      setCurrentTimeDisplay(timeStr);
      setCurrentDateDisplay(dateStr);
    }, 1000);
    return () => clearInterval(interval);
  }, [serverTimeOffsetMs]);

  // Start Camera
  const startCamera = async (type: AttendanceCheckType) => {
    setActiveCheckType(type);
    setCapturedImageBase64(null);
    setCameraError(null);
    requestGps();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Trình duyệt của bạn không hỗ trợ mở camera trực tiếp.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Selfie camera for attendance
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      const errorStr = String(err);
      if (errorStr.includes('NotAllowedError') || errorStr.includes('Permission denied')) {
        setCameraError(
          'Quyền truy cập Camera bị từ chối. Vui lòng nhấn vào biểu tượng ổ khóa trên thanh địa chỉ trình duyệt và cho phép Camera để chấm công.'
        );
      } else if (errorStr.includes('NotFoundError') || errorStr.includes('DevicesNotFoundError')) {
        setCameraError('Không tìm thấy thiết bị camera trên máy này.');
      } else {
        setCameraError('Không thể khởi động camera. Vui lòng kiểm tra quyền và tải lại trang.');
      }
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  // Capture Photo and Draw Inset Pixel Watermark
  const capturePhotoWithWatermark = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Get video dimensions
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    // Resize max dimension to 1024px for compression
    const maxDim = 1024;
    let targetWidth = width;
    let targetHeight = height;

    if (targetWidth > maxDim || targetHeight > maxDim) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
        targetWidth = maxDim;
      } else {
        targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
        targetHeight = maxDim;
      }
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw camera video frame
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

    // 2. Prepare Watermark Content
    const now = new Date(Date.now() + serverTimeOffsetMs);
    const { timeStr, dateStr } = formatVietnameseDateTime(now);
    const storeName = settings?.store_name || 'Chị Lệ xai gính';
    const gpsText = gpsCoords
      ? `${storeName} • GPS: ${formatCoordinates(gpsCoords.lat, gpsCoords.lng)}`
      : `${storeName} • ${gpsError || 'GPS: Không khả dụng'}`;

    // Dynamic sizing based on canvas width
    const fontSizeTime = Math.max(26, Math.round(targetWidth * 0.048));
    const fontSizeDate = Math.max(16, Math.round(targetWidth * 0.026));
    const fontSizeGps = Math.max(13, Math.round(targetWidth * 0.022));

    const paddingX = Math.round(targetWidth * 0.03);
    const paddingY = Math.round(targetWidth * 0.025);
    const boxHeight = fontSizeTime + fontSizeDate + fontSizeGps + paddingY * 2 + 16;
    const boxWidth = Math.round(targetWidth * 0.88);
    const boxX = Math.round(targetWidth * 0.04);
    const boxY = targetHeight - boxHeight - Math.round(targetWidth * 0.04);

    // 3. Draw dark badge overlay
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 18, 0.75)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 14);
    ctx.fill();

    // Subtle golden brass border on watermark badge
    ctx.strokeStyle = 'rgba(173, 139, 82, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4. Render Text Lines with crisp white color & contrast shadow
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // Line 1: Time HH:mm:ss
    ctx.font = `bold ${fontSizeTime}px sans-serif`;
    const textY1 = boxY + paddingY + fontSizeTime - 2;
    ctx.fillText(timeStr, boxX + paddingX, textY1);

    // Line 2: Vietnamese Date
    ctx.font = `600 ${fontSizeDate}px sans-serif`;
    const textY2 = textY1 + fontSizeDate + 8;
    ctx.fillText(dateStr, boxX + paddingX, textY2);

    // Line 3: Location + GPS
    ctx.fillStyle = '#E2E8F0';
    ctx.font = `500 ${fontSizeGps}px sans-serif`;
    const textY3 = textY2 + fontSizeGps + 6;
    ctx.fillText(gpsText, boxX + paddingX, textY3);

    ctx.restore();

    // 5. Compress to JPEG (quality 0.75) ensuring < 250KB
    const compressedJpeg = canvas.toDataURL('image/jpeg', 0.75);
    setCapturedImageBase64(compressedJpeg);

    // Stop camera feed once photo is captured
    stopCamera();
  };

  // Submit Attendance Record to Server
  const handleConfirmSubmit = async () => {
    if (!capturedImageBase64 || !activeCheckType || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitSuccessMsg(null);

    const clientNow = new Date(Date.now() + serverTimeOffsetMs).toISOString();

    try {
      const endpoint =
        activeCheckType === 'check_in'
          ? '/api/attendance/check-in'
          : '/api/attendance/check-out';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          check_type: activeCheckType,
          captured_at_client: clientNow,
          photo_base64: capturedImageBase64,
          latitude: gpsCoords?.lat ?? null,
          longitude: gpsCoords?.lng ?? null,
          device_id: getDeviceId(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi khi gửi chấm công');
      }

      setSubmitSuccessMsg(
        activeCheckType === 'check_in'
          ? 'Đã vào ca thành công! Chúc bạn một ca làm việc vui vẻ.'
          : 'Đã kết ca thành công! Cảm ơn bạn đã hoàn thành ca.'
      );

      if (data.record) {
        setTodayRecords((prev) => [data.record, ...prev]);
      }

      setCapturedImageBase64(null);
      setActiveCheckType(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi gửi dữ liệu chấm công');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Adjustment Request
  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentForm.reason.trim()) {
      alert('Vui lòng nhập lý do giải trình.');
      return;
    }

    try {
      const requestedIso = new Date(
        `${adjustmentForm.shift_date}T${adjustmentForm.requested_time}:00`
      ).toISOString();

      const res = await fetch('/api/attendance/adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_date: adjustmentForm.shift_date,
          check_type: adjustmentForm.check_type,
          requested_time: requestedIso,
          reason: adjustmentForm.reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi gửi yêu cầu');
      }

      alert('Đã gửi yêu cầu sửa công tới Chủ quán / Quản lý thành công!');
      setIsAdjustmentModalOpen(false);
      setAdjustmentForm({
        check_type: 'check_in',
        shift_date: new Date().toISOString().split('T')[0],
        requested_time: '08:00',
        reason: '',
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi gửi yêu cầu');
    }
  };

  // Determine current working status
  const lastRecord = todayRecords[0];
  const isWorking = lastRecord && lastRecord.check_type === 'check_in';
  const hasFinishedShift = lastRecord && lastRecord.check_type === 'check_out';

  return (
    <div className="min-h-screen bg-kraft flex flex-col">
      <Navbar role="staff" />

      {/* Header bar */}
      <div className="bg-kraft-card border-b border-brass/20">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/staff"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-pine-2 hover:text-pine px-2.5 py-1.5 rounded-lg bg-kraft border border-brass/30 transition tap-active"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Quầy</span>
          </Link>
          <span className="font-serif font-bold text-pine text-sm">
            Chấm Công Ảnh Đóng Dấu
          </span>
        </div>
      </div>

      <main className="flex-1 max-w-xl w-full mx-auto p-4 space-y-4">
        {/* Success toast */}
        {submitSuccessMsg && (
          <div className="p-4 bg-moss/10 border border-moss/30 rounded-2xl flex items-center gap-3 text-moss text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{submitSuccessMsg}</span>
          </div>
        )}

        {/* Current Working Status Widget */}
        <div className="bg-kraft-card border border-brass/40 rounded-3xl p-5 shadow-card space-y-4 text-center">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-moss uppercase tracking-wider">
              {currentDateDisplay || 'Đang đồng bộ ngày...'}
            </span>
            <div className="font-mono font-bold text-4xl text-pine tracking-tight">
              {currentTimeDisplay || '--:--:--'}
            </div>
            <p className="text-xs text-pine-2 flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5 text-moss" />
              <span>Giờ chuẩn máy chủ (Asia/Ho_Chi_Minh)</span>
            </p>
          </div>

          {/* Shift status badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border mx-auto bg-kraft">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isWorking
                  ? 'bg-moss animate-pulse'
                  : hasFinishedShift
                  ? 'bg-pine-2'
                  : 'bg-amber-500'
              }`}
            />
            <span>
              {isWorking
                ? `Đang làm việc (Vào ca lúc ${new Date(lastRecord.captured_at_server).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})`
                : hasFinishedShift
                ? 'Đã kết ca hôm nay'
                : 'Chưa vào ca làm việc'}
            </span>
          </div>

          {/* Large Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => startCamera('check_in')}
              disabled={cameraActive || isWorking}
              className={`py-4 rounded-2xl font-serif font-bold text-sm shadow-md transition flex flex-col items-center justify-center gap-1.5 tap-active ${
                !isWorking
                  ? 'bg-pine text-kraft hover:bg-pine/90 ring-2 ring-brass/30'
                  : 'bg-kraft-dark/40 text-pine-2 opacity-50 cursor-not-allowed'
              }`}
            >
              <Camera className="w-6 h-6 text-moss" />
              <span>Vào Ca Làm Việc</span>
            </button>

            <button
              onClick={() => startCamera('check_out')}
              disabled={cameraActive || !isWorking}
              className={`py-4 rounded-2xl font-serif font-bold text-sm shadow-md transition flex flex-col items-center justify-center gap-1.5 tap-active ${
                isWorking
                  ? 'bg-clay text-white hover:bg-clay/90 ring-2 ring-clay/30'
                  : 'bg-kraft-dark/40 text-pine-2 opacity-50 cursor-not-allowed'
              }`}
            >
              <Camera className="w-6 h-6" />
              <span>Kết Thúc Ca (Về)</span>
            </button>
          </div>

          <div className="pt-2 border-t border-brass/20 flex items-center justify-between text-xs text-pine-2">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-moss" />
              <span>
                {gpsCoords ? 'GPS: Đã nhận tọa độ' : gpsError || 'Đang lấy vị trí...'}
              </span>
            </span>

            <button
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="text-moss font-bold hover:underline flex items-center gap-1"
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Gửi sửa công</span>
            </button>
          </div>
        </div>

        {/* Live Camera Viewfinder Modal */}
        {cameraActive && (
          <div className="fixed inset-0 z-50 bg-pine/90 backdrop-blur-md flex flex-col items-center justify-between p-4 animate-in fade-in">
            <div className="w-full max-w-md flex items-center justify-between text-kraft pb-2">
              <span className="font-serif font-bold text-base">
                {activeCheckType === 'check_in' ? 'Chụp ảnh Vào Ca' : 'Chụp ảnh Kết Ca'}
              </span>
              <button
                onClick={stopCamera}
                className="p-2 rounded-full bg-kraft-dark/30 hover:bg-kraft-dark/60"
              >
                <X className="w-5 h-5 text-kraft" />
              </button>
            </div>

            {/* Video Viewfinder with Live Watermark Badge Overlay */}
            <div className="relative w-full max-w-md aspect-3/4 rounded-3xl overflow-hidden bg-black shadow-2xl border-2 border-brass/40 flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover mirror"
              />

              {/* Viewfinder live clock watermark simulation */}
              <div className="absolute bottom-4 left-4 right-4 bg-pine/75 backdrop-blur-sm border border-brass/40 rounded-2xl p-3 text-white pointer-events-none space-y-0.5">
                <div className="font-mono font-bold text-xl">{currentTimeDisplay}</div>
                <div className="text-xs font-semibold text-kraft-dark">{currentDateDisplay}</div>
                <div className="text-[11px] text-moss font-medium line-clamp-1">
                  {settings?.store_name} • {gpsCoords ? formatCoordinates(gpsCoords.lat, gpsCoords.lng) : gpsError || 'GPS: Đang lấy...'}
                </div>
              </div>
            </div>

            {/* Shutter Button */}
            <div className="w-full max-w-md flex items-center justify-center py-4">
              <button
                onClick={capturePhotoWithWatermark}
                className="w-20 h-20 rounded-full border-4 border-white bg-moss hover:bg-moss/90 flex items-center justify-center shadow-2xl tap-active transition"
                title="Bấm chụp ảnh"
              >
                <Camera className="w-8 h-8 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Hidden Canvas for Watermark Processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Photo Preview & Confirm Modal */}
        {capturedImageBase64 && (
          <div className="fixed inset-0 z-50 bg-pine/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in">
            <div className="bg-kraft-card w-full max-w-md rounded-3xl border border-brass/40 p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-brass/20 pb-3">
                <div>
                  <h3 className="font-serif font-bold text-pine text-base">
                    Xem lại ảnh đã đóng dấu
                  </h3>
                  <p className="text-xs text-pine-2">Kiểm tra thông tin in trên ảnh trước khi gửi</p>
                </div>
                <button
                  onClick={() => setCapturedImageBase64(null)}
                  className="p-1 rounded-full text-pine-2 hover:bg-kraft"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Preview image */}
              <div className="relative rounded-2xl overflow-hidden border border-brass/30 bg-black aspect-3/4 max-h-[50vh]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedImageBase64}
                  alt="Ảnh chấm công đã đóng dấu"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => {
                    setCapturedImageBase64(null);
                    if (activeCheckType) startCamera(activeCheckType);
                  }}
                  className="flex-1 py-3 rounded-xl border border-brass/40 text-pine font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-kraft-dark/20 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Chụp lại</span>
                </button>

                <button
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-moss hover:bg-moss/90 text-white rounded-xl font-serif font-bold text-xs shadow flex items-center justify-center gap-1.5 tap-active disabled:opacity-50 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Đang lưu...' : 'Xác nhận chấm công'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Camera Error Message */}
        {cameraError && (
          <div className="p-4 bg-clay/10 border border-clay/30 rounded-2xl text-xs text-clay space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Không thể truy cập máy ảnh:</span>
            </div>
            <p>{cameraError}</p>
          </div>
        )}

        {/* Consent Modal (Shown once on first visit) */}
        {showConsentModal && (
          <div className="fixed inset-0 z-50 bg-pine/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-kraft-card w-full max-w-sm rounded-3xl border border-brass/40 p-6 shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-moss/10 text-moss flex items-center justify-center mx-auto">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-pine text-lg">
                  Quyền Chấm Công Bằng Hình Ảnh
                </h3>
                <p className="text-xs text-pine-2 mt-2 leading-relaxed">
                  Hệ thống sẽ chụp ảnh trực tiếp và ghi nhận vị trí GPS tại thời điểm Vào ca / Kết ca. 
                  Hình ảnh chỉ dùng nội bộ phục vụ việc đối soát bảng công và được bảo mật tuyệt đối.
                </p>
              </div>
              <button
                onClick={() => {
                  localStorage.setItem('chile_camera_consent_v1', 'true');
                  setHasConsent(true);
                  setShowConsentModal(false);
                }}
                className="w-full py-3 bg-pine text-kraft font-bold text-xs rounded-xl shadow tap-active"
              >
                Tôi đồng ý và tiếp tục
              </button>
            </div>
          </div>
        )}

        {/* Adjustment Modal */}
        {isAdjustmentModalOpen && (
          <div className="fixed inset-0 z-50 bg-pine/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-kraft-card w-full max-w-sm rounded-3xl border border-brass/40 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-brass/20 pb-3">
                <div className="flex items-center gap-2">
                  <FileEdit className="w-4 h-4 text-moss" />
                  <h3 className="font-serif font-bold text-pine text-base">Gửi Yêu Cầu Sửa Công</h3>
                </div>
                <button
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="p-1 rounded-full text-pine-2 hover:bg-kraft"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAdjustmentSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-pine mb-1">Loại giờ cần bổ sung:</label>
                  <select
                    value={adjustmentForm.check_type}
                    onChange={(e) =>
                      setAdjustmentForm({
                        ...adjustmentForm,
                        check_type: e.target.value as AttendanceCheckType,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-brass/40 bg-kraft text-xs text-pine"
                  >
                    <option value="check_in">Giờ Vào Ca</option>
                    <option value="check_out">Giờ Kết Ca</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-pine mb-1">Ngày làm việc:</label>
                    <input
                      type="date"
                      required
                      value={adjustmentForm.shift_date}
                      onChange={(e) =>
                        setAdjustmentForm({ ...adjustmentForm, shift_date: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-brass/40 bg-kraft text-xs text-pine"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-pine mb-1">Giờ chính xác:</label>
                    <input
                      type="time"
                      required
                      value={adjustmentForm.requested_time}
                      onChange={(e) =>
                        setAdjustmentForm({ ...adjustmentForm, requested_time: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-brass/40 bg-kraft text-xs text-pine"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-pine mb-1">
                    Lý do giải trình (quên chụp, lỗi camera...):
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={adjustmentForm.reason}
                    onChange={(e) =>
                      setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })
                    }
                    placeholder="Ví dụ: Máy hết pin lúc về, xin bổ sung kết ca..."
                    className="w-full px-3 py-2 rounded-xl border border-brass/40 bg-kraft text-xs text-pine"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAdjustmentModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-brass/40 text-pine font-bold text-xs"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-moss text-white font-bold text-xs rounded-xl shadow tap-active flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Gửi duyệt</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
