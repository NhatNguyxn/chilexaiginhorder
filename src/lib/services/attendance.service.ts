import { AttendanceRecord, AttendanceAdjustment, StoreSettings } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { getAdminClient } from '@/lib/supabase/admin';

const DEFAULT_SETTINGS: StoreSettings = {
  id: 'a0000000-0000-0000-0000-000000000001',
  store_name: 'Chị Lệ xai gính',
  address: 'Khu phố ẩm thực Hoàng Su Phì, Tỉnh Hà Giang',
  latitude: 22.753333,
  longitude: 104.685278,
  radius_meters: 150,
  warning_mode: 'warn_only',
  ip_whitelist: [],
  photo_retention_days: 90,
  updated_at: new Date().toISOString(),
};

let localSettings: StoreSettings = { ...DEFAULT_SETTINGS };
let localRecords: AttendanceRecord[] = [];
let localAdjustments: AttendanceAdjustment[] = [];

export const attendanceService = {
  async getSettings(): Promise<StoreSettings> {
    if (!isSupabaseConfigured || !supabase) {
      return { ...localSettings };
    }

    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return { ...localSettings };
    }
    return data;
  },

  async updateSettings(updates: Partial<StoreSettings>, updatedBy?: string): Promise<StoreSettings> {
    if (!isSupabaseConfigured || !supabase) {
      localSettings = { ...localSettings, ...updates, updated_at: new Date().toISOString() };
      return localSettings;
    }

    const { data, error } = await supabase
      .from('store_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy || null,
      })
      .eq('id', updates.id || DEFAULT_SETTINGS.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Lỗi cập nhật cấu hình quán: ${error.message}`);
    }
    return data;
  },

  async getTodayRecordsForUser(userId: string): Promise<AttendanceRecord[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfTodayIso = today.toISOString();

    const db = getAdminClient() || supabase;
    if (!isSupabaseConfigured || !db) {
      return localRecords.filter(
        (r) => r.user_id === userId && r.captured_at_server >= startOfTodayIso
      );
    }

    try {
      const { data, error } = await db
        .from('attendance_records')
        .select('*')
        .eq('user_id', userId)
        .gte('captured_at_server', startOfTodayIso)
        .order('captured_at_server', { ascending: false });

      if (error || !data) {
        console.warn('[attendanceService.getTodayRecordsForUser] Warning:', error?.message);
        return localRecords.filter(
          (r) => r.user_id === userId && r.captured_at_server >= startOfTodayIso
        );
      }
      return data;
    } catch (err) {
      console.warn('[attendanceService.getTodayRecordsForUser] Unexpected error:', err);
      return localRecords.filter(
        (r) => r.user_id === userId && r.captured_at_server >= startOfTodayIso
      );
    }
  },

  async getAllTodayRecords(): Promise<AttendanceRecord[]> {
    // 1. In browser, fetch via authenticated Admin Attendance API
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/admin/attendance?mode=today');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.records)) {
            return data.records;
          }
        }
      } catch (err) {
        console.warn('[attendanceService.getAllTodayRecords] API fetch warning, trying direct DB:', err);
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfTodayIso = today.toISOString();

    const db = getAdminClient() || supabase;
    if (!isSupabaseConfigured || !db) {
      return localRecords.filter((r) => r.captured_at_server >= startOfTodayIso);
    }

    try {
      const { data, error } = await db
        .from('attendance_records')
        .select('*')
        .gte('captured_at_server', startOfTodayIso)
        .order('captured_at_server', { ascending: false });

      if (error || !data) {
        console.warn('[attendanceService.getAllTodayRecords] Warning:', error?.message);
        return localRecords.filter((r) => r.captured_at_server >= startOfTodayIso);
      }

      // Safely attach profile data without relying on PostgREST schema cache relationship
      const userIds = Array.from(new Set(data.map((r) => r.user_id).filter(Boolean)));
      if (userIds.length > 0) {
        const { data: profiles } = await db
          .from('profiles')
          .select('*')
          .in('id', userIds);

        const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
        return data.map((r) => ({
          ...r,
          user: profileMap.get(r.user_id),
        }));
      }

      return data;
    } catch (err) {
      console.warn('[attendanceService.getAllTodayRecords] Unexpected error:', err);
      return localRecords.filter((r) => r.captured_at_server >= startOfTodayIso);
    }
  },

  async getRecords(options?: {
    userId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ records: AttendanceRecord[]; total: number }> {
    // 1. In browser, fetch via authenticated Admin Attendance API
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams();
        params.set('mode', 'history');
        if (options?.userId) params.set('user_id', options.userId);
        if (options?.status) params.set('status', options.status);
        if (options?.startDate) params.set('start_date', options.startDate);
        if (options?.endDate) params.set('end_date', options.endDate);
        if (options?.limit) params.set('limit', String(options.limit));
        if (options?.offset) params.set('offset', String(options.offset));

        const res = await fetch(`/api/admin/attendance?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.records)) {
            return { records: data.records, total: data.total ?? data.records.length };
          }
        }
      } catch (err) {
        console.warn('[attendanceService.getRecords] API fetch warning, trying direct DB:', err);
      }
    }

    const db = getAdminClient() || supabase;
    if (!isSupabaseConfigured || !db) {
      let filtered = [...localRecords];
      if (options?.userId) filtered = filtered.filter((r) => r.user_id === options.userId);
      if (options?.status) filtered = filtered.filter((r) => r.status === options.status);
      return { records: filtered.slice(options?.offset || 0, (options?.offset || 0) + (options?.limit || 50)), total: filtered.length };
    }

    try {
      let query = db
        .from('attendance_records')
        .select('*', { count: 'exact' });

      if (options?.userId) query = query.eq('user_id', options.userId);
      if (options?.status) query = query.eq('status', options.status);
      if (options?.startDate) query = query.gte('captured_at_server', options.startDate);
      if (options?.endDate) query = query.lte('captured_at_server', options.endDate);

      query = query
        .order('captured_at_server', { ascending: false })
        .range(options?.offset || 0, (options?.offset || 0) + (options?.limit || 50) - 1);

      const { data, count, error } = await query;
      if (error || !data) {
        console.warn('[attendanceService.getRecords] Warning:', error?.message);
        return { records: [], total: 0 };
      }

      // Safely attach profile data
      const userIds = Array.from(new Set(data.map((r) => r.user_id).filter(Boolean)));
      if (userIds.length > 0) {
        const { data: profiles } = await db
          .from('profiles')
          .select('*')
          .in('id', userIds);

        const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
        const enriched = data.map((r) => ({
          ...r,
          user: profileMap.get(r.user_id),
        }));
        return { records: enriched, total: count || 0 };
      }

      return { records: data, total: count || 0 };
    } catch (err) {
      console.warn('[attendanceService.getRecords] Unexpected error:', err);
      return { records: [], total: 0 };
    }
  },

  async createRecord(record: Omit<AttendanceRecord, 'id' | 'created_at'>): Promise<AttendanceRecord> {
    const newRecord: AttendanceRecord = {
      ...record,
      id: 'att-' + Date.now(),
      created_at: new Date().toISOString(),
    };

    const db = getAdminClient() || supabase;
    if (!isSupabaseConfigured || !db) {
      localRecords.unshift(newRecord);
      return newRecord;
    }

    try {
      const { data, error } = await db
        .from('attendance_records')
        .insert({
          user_id: record.user_id,
          check_type: record.check_type,
          captured_at_client: record.captured_at_client,
          captured_at_server: record.captured_at_server,
          photo_url: record.photo_url,
          location_name: record.location_name || null,
          latitude: record.latitude || null,
          longitude: record.longitude || null,
          distance_meters: record.distance_meters || null,
          device_id: record.device_id || null,
          ip_address: record.ip_address || null,
          flags: record.flags || [],
          status: record.status || 'valid',
          note: record.note || null,
        })
        .select()
        .single();

      if (error || !data) {
        console.warn('[attendanceService.createRecord] DB insert warning, falling back to local memory:', error?.message);
        localRecords.unshift(newRecord);
        return newRecord;
      }
      return data;
    } catch (err) {
      console.warn('[attendanceService.createRecord] Unexpected DB error, falling back to local memory:', err);
      localRecords.unshift(newRecord);
      return newRecord;
    }
  },

  async createAdjustment(adj: Omit<AttendanceAdjustment, 'id' | 'created_at' | 'status'>): Promise<AttendanceAdjustment> {
    const newAdj: AttendanceAdjustment = {
      ...adj,
      id: 'adj-' + Date.now(),
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const db = getAdminClient() || supabase;
    if (!isSupabaseConfigured || !db) {
      localAdjustments.unshift(newAdj);
      return newAdj;
    }

    const { data, error } = await db
      .from('attendance_adjustments')
      .insert({
        user_id: adj.user_id,
        record_id: adj.record_id || null,
        shift_date: adj.shift_date,
        check_type: adj.check_type,
        original_time: adj.original_time || null,
        requested_time: adj.requested_time,
        reason: adj.reason,
        requested_by: adj.requested_by,
        status: 'pending',
      })
      .select('*, user:profiles(*)')
      .single();

    if (error) {
      throw new Error(`Lỗi gửi yêu cầu sửa công: ${error.message}`);
    }
    return data;
  },

  async getPendingAdjustments(): Promise<AttendanceAdjustment[]> {
    const db = getAdminClient() || supabase;
    if (!isSupabaseConfigured || !db) {
      return localAdjustments.filter((a) => a.status === 'pending');
    }

    const { data, error } = await db
      .from('attendance_adjustments')
      .select('*, user:profiles(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[attendanceService.getPendingAdjustments] Error:', error.message);
      return [];
    }
    return data || [];
  },

  async reviewAdjustment(id: string, status: 'approved' | 'rejected', reviewerId: string): Promise<void> {
    const db = getAdminClient() || supabase;
    if (!isSupabaseConfigured || !db) {
      const idx = localAdjustments.findIndex((a) => a.id === id);
      if (idx !== -1) {
        localAdjustments[idx].status = status;
        localAdjustments[idx].approved_by = reviewerId;
        localAdjustments[idx].reviewed_at = new Date().toISOString();
      }
      return;
    }

    const { error } = await db
      .from('attendance_adjustments')
      .update({
        status,
        approved_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Lỗi duyệt yêu cầu sửa công: ${error.message}`);
    }
  },
};
