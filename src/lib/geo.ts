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
