import { Table } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { getAdminClient } from '@/lib/supabase/admin';
import { SEED_TABLES } from '@/lib/services/bootstrap.service';

function generateRandomToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'tok_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  }
  return 'tok_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

// Fallback in-memory state
let localTables: Table[] = SEED_TABLES.map((t) => ({ ...t }));

export const tableService = {
  async getTables(): Promise<Table[]> {
    // 1. In browser, prefer server API for reliable auth & RLS bypass
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/admin/tables');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.tables) && data.tables.length > 0) {
            return data.tables;
          }
        }
      } catch (err) {
        console.warn('[tableService.getTables] Fetch API warning, trying fallback:', err);
      }
    }

    // 2. Server or direct Supabase client fallback
    const db = getAdminClient() || supabase;
    if (!isSupabaseConfigured || !db) {
      return [...localTables];
    }

    try {
      const { data, error } = await db
        .from('tables')
        .select('*')
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (error || !data || data.length === 0) {
        if (error) console.warn('[tableService.getTables] Warning:', error.message);
        return [...localTables];
      }
      return data;
    } catch (err) {
      console.warn('[tableService.getTables] Unexpected error:', err);
      return [...localTables];
    }
  },

  async getTableBySlug(slug: string): Promise<Table | null> {
    const db = getAdminClient() || supabase;
    if (!isSupabaseConfigured || !db) {
      return localTables.find((t) => t.slug === slug && t.is_active !== false) || null;
    }

    try {
      const { data, error } = await db
        .from('tables')
        .select('*')
        .eq('slug', slug)
        .is('deleted_at', null)
        .maybeSingle();

      if (error || !data) {
        return localTables.find((t) => t.slug === slug) || null;
      }
      return data;
    } catch {
      return localTables.find((t) => t.slug === slug) || null;
    }
  },

  async getTableByToken(token: string): Promise<Table | null> {
    const db = getAdminClient() || supabase;
    if (!isSupabaseConfigured || !db) {
      return localTables.find((t) => (t.qr_token === token || t.slug === token) && t.is_active !== false) || null;
    }

    try {
      const { data, error } = await db
        .from('tables')
        .select('*')
        .or(`qr_token.eq.${token},slug.eq.${token}`)
        .is('deleted_at', null)
        .maybeSingle();

      if (error || !data) {
        return localTables.find((t) => (t.qr_token === token || t.slug === token)) || null;
      }
      return data;
    } catch {
      return localTables.find((t) => (t.qr_token === token || t.slug === token)) || null;
    }
  },

  async createTable(name: string): Promise<Table> {
    // 1. In browser, call dedicated server API route
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/admin/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi tạo bàn');
      }
      return data.table;
    }

    // 2. Server fallback
    const slug = 'ban-' + Math.random().toString(36).substring(2, 7);
    const qr_token = generateRandomToken();

    const db = getAdminClient() || supabase;
    if (!isSupabaseConfigured || !db) {
      const newTable: Table = {
        id: 'tbl-' + Date.now(),
        name,
        slug,
        qr_token,
        is_active: true,
      };
      localTables.push(newTable);
      return newTable;
    }

    const { data, error } = await db
      .from('tables')
      .insert({
        name,
        slug,
        qr_token,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Lỗi tạo bàn mới: ${error.message}`);
    }
    return data;
  },

  async regenerateQrToken(id: string): Promise<string> {
    // 1. In browser, call dedicated server API route
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/admin/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, regenerate_token: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi đổi mã QR');
      }
      return data.table?.qr_token || '';
    }

    // 2. Server fallback
    const newToken = generateRandomToken();
    const db = getAdminClient() || supabase;
    if (!isSupabaseConfigured || !db) {
      const idx = localTables.findIndex((t) => t.id === id);
      if (idx !== -1) {
        localTables[idx].qr_token = newToken;
      }
      return newToken;
    }

    const { error } = await db
      .from('tables')
      .update({ qr_token: newToken })
      .eq('id', id);

    if (error) {
      throw new Error(`Lỗi cập nhật mã QR: ${error.message}`);
    }
    return newToken;
  },

  async deleteTable(id: string): Promise<void> {
    // 1. In browser, call dedicated server API route (handles UUID and legacy IDs cleanly)
    if (typeof window !== 'undefined') {
      const res = await fetch(`/api/admin/tables?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi xóa bàn');
      }
      return;
    }

    // 2. Server fallback
    const db = getAdminClient() || supabase;
    if (!isSupabaseConfigured || !db) {
      localTables = localTables.filter((t) => t.id !== id);
      return;
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      const { error } = await db
        .from('tables')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', id);

      if (error) {
        throw new Error(`Lỗi xóa bàn: ${error.message}`);
      }
    } else {
      localTables = localTables.filter((t) => t.id !== id);
    }
  },
};
