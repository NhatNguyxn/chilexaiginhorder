/**
 * Haversine Formula: Calculates great-circle distance between two GPS coordinates in meters.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's mean radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Formats coordinates into standard 6 decimal places.
 */
export function formatCoordinates(lat: number | null | undefined, lon: number | null | undefined): string {
  if (lat == null || lon == null) {
    return 'GPS: Không khả dụng (bị từ chối hoặc lỗi)';
  }
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

/**
 * Vietnamese date and day formatter for attendance watermark.
 * Timezone: Asia/Ho_Chi_Minh.
 */
export function formatVietnameseDateTime(date: Date = new Date()): {
  timeStr: string;
  dateStr: string;
} {
  const days = [
    'Chủ Nhật',
    'Thứ Hai',
    'Thứ Ba',
    'Thứ Tư',
    'Thứ Năm',
    'Thứ Sáu',
    'Thứ Bảy',
  ];

  const d = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);

  const dayOfWeek = days[date.getDay()];
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();

  return {
    timeStr: d,
    dateStr: `${dayOfWeek}, ${dd}/${mm}/${yyyy}`,
  };
}

/**
 * Calculates shift duration in hours between check-in and check-out.
 * Accurately handles normal daytime shifts and overnight shifts crossing midnight (0h).
 * Supports ISO strings, Date instances, and "HH:mm" time strings.
 */
export function calculateShiftHours(
  checkIn: string | Date,
  checkOut: string | Date | null | undefined
): number {
  if (!checkOut) return 0;

  // Handle "HH:mm" format (e.g. "22:00", "06:00")
  if (
    typeof checkIn === 'string' &&
    typeof checkOut === 'string' &&
    /^\d{1,2}:\d{2}(:\d{2})?$/.test(checkIn) &&
    /^\d{1,2}:\d{2}(:\d{2})?$/.test(checkOut)
  ) {
    const [hIn, mIn] = checkIn.split(':').map(Number);
    const [hOut, mOut] = checkOut.split(':').map(Number);
    let diffMinutes = (hOut * 60 + mOut) - (hIn * 60 + mIn);
    if (diffMinutes < 0) {
      // Crossed midnight (0h)
      diffMinutes += 24 * 60;
    }
    return Math.round((diffMinutes / 60) * 100) / 100;
  }

  // Handle ISO strings or Date objects
  const inTime = typeof checkIn === 'string' ? new Date(checkIn).getTime() : checkIn.getTime();
  const outTime = typeof checkOut === 'string' ? new Date(checkOut).getTime() : checkOut.getTime();

  if (isNaN(inTime) || isNaN(outTime) || outTime <= inTime) return 0;

  const diffMs = outTime - inTime;
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
}

/**
 * Detects whether client time drifts from server time beyond a given threshold (default: 2 minutes).
 */
export function isTimeDriftDetected(
  clientTime: string | number | Date,
  serverTime: string | number | Date = new Date(),
  thresholdMs: number = 2 * 60 * 1000 // 120,000 ms = 2 minutes
): boolean {
  const c = typeof clientTime === 'number' ? clientTime : new Date(clientTime).getTime();
  const s = typeof serverTime === 'number' ? serverTime : new Date(serverTime).getTime();
  if (isNaN(c) || isNaN(s)) return false;
  return Math.abs(s - c) > thresholdMs;
}

