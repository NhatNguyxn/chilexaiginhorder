import { describe, it, expect } from 'vitest';
import {
  calculateDistanceMeters,
  formatVietnameseDateTime,
  calculateShiftHours,
  isTimeDriftDetected,
} from '../src/lib/geo';

describe('Attendance System Core Calculations', () => {
  describe('1. Haversine distance calculation (calculateDistanceMeters)', () => {
    it('calculates 0 meters for identical coordinates', () => {
      const lat = 22.753333;
      const lon = 104.685278;
      const distance = calculateDistanceMeters(lat, lon, lat, lon);
      expect(distance).toBe(0);
    });

    it('accurately calculates distance between store and nearby point (~111m per 0.001 deg lat)', () => {
      // Point A: Store location
      const lat1 = 22.753333;
      const lon1 = 104.685278;
      // Point B: ~111 meters North
      const lat2 = 22.754333;
      const lon2 = 104.685278;

      const distance = calculateDistanceMeters(lat1, lon1, lat2, lon2);
      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(120);
    });

    it('calculates distance between Hanoi Opera House and Hoan Kiem Lake (~1.1 km)', () => {
      const operaHouse = { lat: 21.0242, lon: 105.8576 };
      const hoanKiem = { lat: 21.0285, lon: 105.8542 };

      const distance = calculateDistanceMeters(
        operaHouse.lat,
        operaHouse.lon,
        hoanKiem.lat,
        hoanKiem.lon
      );
      // Expected: ~600m to 1200m
      expect(distance).toBeGreaterThan(500);
      expect(distance).toBeLessThan(1000);
    });
  });

  describe('2. Watermark Vietnamese date formatting (formatVietnameseDateTime)', () => {
    it('formats date with correct Vietnamese day name and dd/MM/yyyy structure', () => {
      // 2026-10-06 is a Tuesday (Thứ Ba)
      const testDate = new Date('2026-10-06T14:30:00+07:00');
      const { timeStr, dateStr } = formatVietnameseDateTime(testDate);

      expect(timeStr).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(dateStr).toContain('Thứ Ba');
      expect(dateStr).toContain('06/10/2026');
    });

    it('formats Sunday correctly as Chủ Nhật', () => {
      // 2026-10-11 is a Sunday (Chủ Nhật)
      const sundayDate = new Date('2026-10-11T09:00:00+07:00');
      const { dateStr } = formatVietnameseDateTime(sundayDate);

      expect(dateStr).toContain('Chủ Nhật');
      expect(dateStr).toContain('11/10/2026');
    });
  });

  describe('3. Normal shift duration calculation (calculateShiftHours)', () => {
    it('calculates standard 8.5-hour shift using ISO timestamps', () => {
      const checkIn = '2026-10-06T08:00:00Z';
      const checkOut = '2026-10-06T16:30:00Z';
      const hours = calculateShiftHours(checkIn, checkOut);
      expect(hours).toBe(8.5);
    });

    it('calculates standard daytime shift using HH:mm time strings', () => {
      const hours = calculateShiftHours('08:00', '16:30');
      expect(hours).toBe(8.5);
    });

    it('returns 0 when check-out is missing or invalid', () => {
      expect(calculateShiftHours('2026-10-06T08:00:00Z', null)).toBe(0);
      expect(calculateShiftHours('2026-10-06T08:00:00Z', undefined)).toBe(0);
      expect(calculateShiftHours('16:00', '08:00')).not.toBe(0); // This is overnight
    });
  });

  describe('4. Overnight shift duration crossing midnight (calculateShiftHours)', () => {
    it('calculates overnight shift crossing midnight using ISO timestamps (22:00 to 06:00 next day)', () => {
      const checkIn = '2026-10-06T22:00:00Z';
      const checkOut = '2026-10-07T06:00:00Z';
      const hours = calculateShiftHours(checkIn, checkOut);
      expect(hours).toBe(8);
    });

    it('calculates overnight shift crossing midnight using HH:mm strings (22:00 to 06:00)', () => {
      const hours = calculateShiftHours('22:00', '06:00');
      expect(hours).toBe(8);
    });

    it('calculates overnight shift from 21:30 to 05:45', () => {
      const hours = calculateShiftHours('21:30', '05:45');
      // 2h30 before midnight + 5h45 after midnight = 8h15 = 8.25 hours
      expect(hours).toBe(8.25);
    });
  });

  describe('5. Time drift detection (> 2 minutes)', () => {
    it('detects time drift when client is 3 minutes ahead of server (> 120s)', () => {
      const serverTime = new Date('2026-10-06T10:00:00Z');
      const clientTime = new Date('2026-10-06T10:03:00Z'); // 3 minutes ahead
      const isDrift = isTimeDriftDetected(clientTime, serverTime);
      expect(isDrift).toBe(true);
    });

    it('detects time drift when client is 5 minutes behind server (> 120s)', () => {
      const serverTime = new Date('2026-10-06T10:05:00Z');
      const clientTime = new Date('2026-10-06T10:00:00Z'); // 5 minutes behind
      const isDrift = isTimeDriftDetected(clientTime, serverTime);
      expect(isDrift).toBe(true);
    });

    it('does NOT detect drift when client is within acceptable 45 seconds tolerance', () => {
      const serverTime = new Date('2026-10-06T10:00:00Z');
      const clientTime = new Date('2026-10-06T10:00:45Z'); // 45s difference
      const isDrift = isTimeDriftDetected(clientTime, serverTime);
      expect(isDrift).toBe(false);
    });

    it('does NOT detect drift at exactly 2 minutes boundary', () => {
      const serverTime = new Date('2026-10-06T10:00:00Z');
      const clientTime = new Date('2026-10-06T10:02:00Z'); // exactly 120,000ms
      const isDrift = isTimeDriftDetected(clientTime, serverTime);
      expect(isDrift).toBe(false);
    });
  });
});
