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
  X,
  RefreshCw,
} from 'lucide-react';

export default function StaffAttendancePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [locationAddress, setLocationAddress] = useState<string | null>(null);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);

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

  // Reverse geocode GPS coordinates to real Vietnamese address
  const resolveAddressFromCoords = async (lat: number, lng: number) => {
    setIsResolvingAddress(true);
    try {
      const res = await fetch(`/api/geo/reverse?lat=${lat}&lon=${lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data.address) {
          setLocationAddress(data.address);
        }
      }
    } catch (err) {
      console.warn('Lỗi giải mã địa chỉ thực:', err);
    } finally {
      setIsResolvingAddress(false);
    }
  };

  // Request Real Live GPS Location with Satellite & Cellular Fallback
  const requestGps = () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGpsError('Thiết bị không hỗ trợ định vị GPS');
      return;
    }

    setIsLocatingGps(true);
    setGpsError(null);

    // 1. Try High Accuracy (GPS Satellites) first
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setGpsCoords({
          lat,
          lng,
          accuracy: Math.round(pos.coords.accuracy),
        });
        setIsLocatingGps(false);
        setGpsError(null);
        resolveAddressFromCoords(lat, lng);
      },
      (err) => {
        console.warn('[GPS] High accuracy lock timed out or failed, trying fallback:', err);
        // 2. Fallback to standard accuracy (Cellular / Wi-Fi)
        navigator.geolocation.getCurrentPosition(
          (fallbackPos) => {
            const lat = Number(fallbackPos.coords.latitude.toFixed(6));
            const lng = Number(fallbackPos.coords.longitude.toFixed(6));
            setGpsCoords({
              lat,
              lng,
              accuracy: Math.round(fallbackPos.coords.accuracy),
            });
            setIsLocatingGps(false);
            setGpsError(null);
            resolveAddressFromCoords(lat, lng);
          },
          (fallbackErr) => {
            console.warn('[GPS] Fallback failed:', fallbackErr);
            setIsLocatingGps(false);
            if (fallbackErr.code === 1) {
              setGpsError('Quyền GPS bị từ chối. Hãy bật Vị trí trong Cài đặt trình duyệt.');
            } else if (fallbackErr.code === 2) {
              setGpsError('Không tìm thấy GPS. Hãy bật Định vị (Location) trên điện thoại.');
            } else {
              setGpsError('GPS tạm thời chưa phản hồi. Nhấn "Lấy lại GPS".');
            }
          },
          { enableHighAccuracy: false, timeout: 12000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
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
          id: 'a0000000-0000-0000-0000-000000000001',
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

  // Helper to draw the official 3-line stamped watermark directly into canvas pixels
  const drawWatermarkOnContext = (
    ctx: CanvasRenderingContext2D,
    targetWidth: number,
    targetHeight: number
  ) => {
    const now = new Date(Date.now() + serverTimeOffsetMs);
    const { timeStr, dateStr } = formatVietnameseDateTime(now);
    const storeName = settings?.store_name || 'Chị Lệ xai gính';

    // Line 3: Replace raw numbers with real human-readable location address
    const locationText = locationAddress
      ? `${storeName} • ${locationAddress}`
      : gpsCoords
      ? `${storeName} • Vị trí: ${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)}${
          gpsCoords.accuracy ? ` (±${gpsCoords.accuracy}m)` : ''
        }`
      : `${storeName} • ${gpsError || 'Đang xác định vị trí'}`;

    // Responsive typography based on image width
    const fontSizeTime = Math.max(26, Math.round(targetWidth * 0.046));
    const fontSizeDate = Math.max(16, Math.round(targetWidth * 0.026));
    const fontSizeGps = Math.max(12, Math.round(targetWidth * 0.022));

    const paddingX = Math.round(targetWidth * 0.035);
    const paddingY = Math.round(targetWidth * 0.03);
    const boxHeight = fontSizeTime + fontSizeDate + fontSizeGps + paddingY * 2 + 16;
    const boxWidth = Math.round(targetWidth * 0.92);
    const boxX = Math.round(targetWidth * 0.04);
    const boxY = targetHeight - boxHeight - Math.round(targetHeight * 0.04);

    // 1. Dark frosted badge background
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 18, 0.85)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 16);
    ctx.fill();

    // 2. Brass accent outline
    ctx.strokeStyle = 'rgba(173, 139, 82, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. Stamped text with high-contrast shadow
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
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

    // Line 3: Real Human Location Address (Safely fit within badge width)
    ctx.fillStyle = '#E2E8F0';
    ctx.font = `500 ${fontSizeGps}px sans-serif`;
    const textY3 = textY2 + fontSizeGps + 6;

    const maxTextWidth = boxWidth - paddingX * 2;
    let fittedText = locationText;
    while (ctx.measureText(fittedText).width > maxTextWidth && fittedText.length > 12) {
      fittedText = fittedText.slice(0, -4) + '...';
    }
    ctx.fillText(fittedText, boxX + paddingX, textY3);

    ctx.restore();
  };

  // Start Camera with Mobile Portrait constraints
  const startCamera = async (type: AttendanceCheckType) => {
    setActiveCheckType(type);
    setCapturedImageBase64(null);
    setCameraError(null);
    setCameraActive(true);
    requestGps();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Trình duyệt không hỗ trợ mở camera trực tiếp. Vui lòng bấm vào "Mở Camera gốc của điện thoại".');
      return;
    }

    try {
      // Request Portrait ratio suitable for vertical mobile phones
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1080 },
          height: { ideal: 1440 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((playErr) => {
          console.warn('Video play warning:', playErr);
        });
      }
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      const errorStr = String(err);
      if (errorStr.includes('NotAllowedError') || errorStr.includes('Permission denied')) {
        setCameraError(
          'Quyền Camera bị từ chối. Vui lòng cho phép Camera trên thanh địa chỉ, hoặc bấm nút mở Camera gốc của điện thoại.'
        );
      } else {
        setCameraError('Không thể mở camera trình duyệt. Bạn có thể sử dụng nút "Mở Camera gốc của điện thoại" bên dưới.');
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

  // Capture Photo from Live Video with Mirror Correction & Watermark
  const capturePhotoWithWatermark = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Check if camera has actually rendered a frame to prevent black image
    if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) {
      alert('Camera đang khởi động hoặc lấy nét, vui lòng chờ 1-2 giây rồi bấm chụp lại!');
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    const maxDim = 1280;
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

    // 1. Draw camera video frame with mirror correction (so natural selfie matches mirror preview)
    ctx.save();
    ctx.translate(targetWidth, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    ctx.restore();

    // 2. Draw official watermark badge with real GPS
    drawWatermarkOnContext(ctx, targetWidth, targetHeight);

    // 3. Compress to JPEG (quality 0.8) ensuring < 250KB
    const compressedJpeg = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImageBase64(compressedJpeg);

    // Stop camera feed once photo is captured
    stopCamera();
  };

  // Fallback: Capture using Native Mobile Phone Camera App
  const handleNativeCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const maxDim = 1280;
        let targetWidth = img.naturalWidth || img.width;
        let targetHeight = img.naturalHeight || img.height;

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

        // Draw portrait image
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Draw official watermark badge with real GPS
        drawWatermarkOnContext(ctx, targetWidth, targetHeight);

        const compressedJpeg = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImageBase64(compressedJpeg);
        stopCamera();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
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
          location_address: locationAddress || undefined,
          note: locationAddress ? `Vị trí: ${locationAddress}` : undefined,
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

          <div className="pt-3 border-t border-brass/20 flex flex-col gap-2 text-xs text-pine-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-1.5 text-left flex-1 min-w-0">
                <MapPin className="w-4 h-4 text-moss flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-pine text-xs break-words leading-snug">
                    {locationAddress ? (
                      <span>{locationAddress}</span>
                    ) : isResolvingAddress ? (
                      <span className="text-amber-700 font-semibold animate-pulse">Đang định vị địa chỉ thực...</span>
                    ) : isLocatingGps ? (
                      <span className="text-amber-700 font-semibold animate-pulse">Đang dò vệ tinh GPS...</span>
                    ) : gpsError ? (
                      <span className="text-clay font-medium">{gpsError}</span>
                    ) : (
                      <span className="text-pine-2">Chưa xác định vị trí</span>
                    )}
                  </div>
                  {gpsCoords && (
                    <div className="text-[10px] text-pine-2/70 mt-0.5">
                      Tọa độ thực: {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}
                      {gpsCoords.accuracy ? ` (sai số ±${gpsCoords.accuracy}m)` : ''}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={requestGps}
                disabled={isLocatingGps || isResolvingAddress}
                className="text-moss font-bold hover:underline flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-kraft tap-active flex-shrink-0"
                title="Lấy lại vị trí thực tế"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLocatingGps || isResolvingAddress ? 'animate-spin' : ''}`} />
                <span>{isLocatingGps || isResolvingAddress ? 'Đang tìm...' : 'Định vị lại'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-pine-2/70">
              <span>{settings?.store_name} ({settings?.radius_meters || 150}m)</span>
              <button
                onClick={() => setIsAdjustmentModalOpen(true)}
                className="text-moss font-bold hover:underline flex items-center gap-1"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Gửi sửa công</span>
              </button>
            </div>
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
                className="p-2 rounded-full bg-kraft-dark/30 hover:bg-kraft-dark/60 tap-active"
              >
                <X className="w-5 h-5 text-kraft" />
              </button>
            </div>

            {/* Video Viewfinder with Live Watermark Badge Overlay */}
            <div className="relative w-full max-w-md aspect-3/4 rounded-3xl overflow-hidden bg-black shadow-2xl border-2 border-brass/40 flex items-center justify-center">
              <video
                ref={(el) => {
                  videoRef.current = el;
                  if (el && mediaStreamRef.current && el.srcObject !== mediaStreamRef.current) {
                    el.srcObject = mediaStreamRef.current;
                    el.play().catch((err) => console.warn('Video play warning:', err));
                  }
                }}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />

              {/* Viewfinder live clock watermark simulation */}
              <div className="absolute bottom-4 left-4 right-4 bg-pine/85 backdrop-blur-md border border-brass/40 rounded-2xl p-3 text-white pointer-events-none space-y-0.5 shadow-lg">
                <div className="font-mono font-bold text-xl">{currentTimeDisplay}</div>
                <div className="text-xs font-semibold text-kraft-dark">{currentDateDisplay}</div>
                <div className="text-[11px] text-moss font-medium line-clamp-1">
                  {settings?.store_name} • {locationAddress || (isResolvingAddress ? 'Đang xác định địa chỉ...' : (gpsCoords ? `Vị trí: ${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)}` : gpsError || 'Đang định vị...'))}
                </div>
              </div>
            </div>

            {/* Shutter Button & Native Camera Switcher */}
            <div className="w-full max-w-md flex flex-col items-center justify-center py-3">
              <button
                onClick={capturePhotoWithWatermark}
                className="w-20 h-20 rounded-full border-4 border-white bg-moss hover:bg-moss/90 flex items-center justify-center shadow-2xl tap-active transition active:scale-95"
                title="Bấm chụp ảnh"
              >
                <Camera className="w-8 h-8 text-white" />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-sm border border-white/30 flex items-center gap-1.5 transition tap-active"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Mở Camera gốc của điện thoại (Nếu màn hình đen)</span>
              </button>
            </div>
          </div>
        )}

        {/* Hidden File Input for Native Mobile Camera Fallback */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handleNativeCameraCapture}
        />

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

              {/* Location & Time summary banner */}
              <div className="p-3 bg-kraft rounded-2xl border border-brass/30 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-pine">
                  <MapPin className="w-4 h-4 text-moss flex-shrink-0" />
                  <span className="line-clamp-1">
                    {locationAddress || (gpsCoords ? `Tọa độ: ${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)}` : 'Đang định vị')}
                  </span>
                </div>
                <div className="text-[11px] text-pine-2 flex items-center justify-between">
                  <span>Loại ca: <strong className="text-pine">{activeCheckType === 'check_in' ? 'Vào ca' : 'Kết ca'}</strong></span>
                  <span>{currentTimeDisplay} • {currentDateDisplay}</span>
                </div>
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
