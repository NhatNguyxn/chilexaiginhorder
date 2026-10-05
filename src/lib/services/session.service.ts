import { TableSession } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

let localSessions: TableSession[] = [];

export const sessionService = {
  async getActiveSessions(): Promise<TableSession[]> {
    if (!isSupabaseConfigured || !supabase) {
      return localSessions.filter((s) => s.status === 'open');
    }

    const { data, error } = await supabase
      .from('table_sessions')
      .select('*, table:tables(*)')
      .eq('status', 'open')
      .is('deleted_at', null)
      .order('opened_at', { ascending: false });

    if (error) {
      console.error('[sessionService.getActiveSessions] Error:', error.message);
      return localSessions.filter((s) => s.status === 'open');
    }
    return data || [];
  },

  async getOpenSessionByTable(tableId: string): Promise<TableSession | null> {
    if (!isSupabaseConfigured || !supabase) {
      return localSessions.find((s) => s.table_id === tableId && s.status === 'open') || null;
    }

    const { data, error } = await supabase
      .from('table_sessions')
      .select('*')
      .eq('table_id', tableId)
      .eq('status', 'open')
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      console.error('[sessionService.getOpenSessionByTable] Error:', error.message);
      return localSessions.find((s) => s.table_id === tableId && s.status === 'open') || null;
    }
    return data;
  },

  async getOrCreateOpenSession(tableId: string): Promise<TableSession> {
    const existing = await this.getOpenSessionByTable(tableId);
    if (existing) return existing;

    if (!isSupabaseConfigured || !supabase) {
      const newSession: TableSession = {
        id: 'sess-' + Date.now(),
        table_id: tableId,
        status: 'open',
        opened_at: new Date().toISOString(),
        total_amount: 0,
      };
      localSessions.push(newSession);
      return newSession;
    }

    const { data, error } = await supabase
      .from('table_sessions')
      .insert({
        table_id: tableId,
        status: 'open',
        opened_at: new Date().toISOString(),
        total_amount: 0,
      })
      .select()
      .single();

    if (error) {
      // In case another concurrent request created it first, fetch it
      const raceExisting = await this.getOpenSessionByTable(tableId);
      if (raceExisting) return raceExisting;
      throw new Error(`Lỗi khởi tạo phiên bàn: ${error.message}`);
    }
    return data;
  },

  async closeSession(sessionId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      const idx = localSessions.findIndex((s) => s.id === sessionId);
      if (idx !== -1) {
        localSessions[idx].status = 'closed';
        localSessions[idx].closed_at = new Date().toISOString();
      }
      return;
    }

    const { error } = await supabase
      .from('table_sessions')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      throw new Error(`Lỗi đóng phiên bàn: ${error.message}`);
    }
  },
};
