import { Table } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { INITIAL_TABLES } from '@/lib/constants';

function generateRandomToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'tok_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  }
  return 'tok_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

// Fallback in-memory state for local testing when Supabase env is not configured
let localTables: Table[] = INITIAL_TABLES.map((t) => ({
  ...t,
  qr_token: 'tbl_' + t.slug.replace('-', '_'),
  is_active: true,
}));

export const tableService = {
  async getTables(): Promise<Table[]> {
    if (!isSupabaseConfigured || !supabase) {
      return [...localTables];
    }

    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.warn('[tableService.getTables] Warning:', error.message);
      return [...localTables];
    }
    return data;
  },

  async getTableBySlug(slug: string): Promise<Table | null> {
    if (!isSupabaseConfigured || !supabase) {
      return localTables.find((t) => t.slug === slug && t.is_active !== false) || null;
    }

    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('slug', slug)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !data) {
      return localTables.find((t) => t.slug === slug) || null;
    }
    return data;
  },

  async getTableByToken(token: string): Promise<Table | null> {
    if (!isSupabaseConfigured || !supabase) {
      return localTables.find((t) => (t.qr_token === token || t.slug === token) && t.is_active !== false) || null;
    }

    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .or(`qr_token.eq.${token},slug.eq.${token}`)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !data) {
      return localTables.find((t) => (t.qr_token === token || t.slug === token)) || null;
    }
    return data;
  },

  async createTable(name: string): Promise<Table> {
    const slug = 'ban-' + Math.random().toString(36).substring(2, 7);
    const qr_token = generateRandomToken();

    if (!isSupabaseConfigured || !supabase) {
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

    const { data, error } = await supabase
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
    const newToken = generateRandomToken();

    if (!isSupabaseConfigured || !supabase) {
      const idx = localTables.findIndex((t) => t.id === id);
      if (idx !== -1) {
        localTables[idx].qr_token = newToken;
      }
      return newToken;
    }

    const { error } = await supabase
      .from('tables')
      .update({ qr_token: newToken })
      .eq('id', id);

    if (error) {
      throw new Error(`Lỗi cập nhật mã QR: ${error.message}`);
    }
    return newToken;
  },

  async deleteTable(id: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      localTables = localTables.filter((t) => t.id !== id);
      return;
    }

    // Soft delete
    const { error } = await supabase
      .from('tables')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new Error(`Lỗi xóa bàn: ${error.message}`);
    }
  },
};
