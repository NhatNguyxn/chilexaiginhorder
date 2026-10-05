import { AuditLog } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

let localAuditLogs: AuditLog[] = [];

export interface CreateAuditLogParams {
  action: string;
  entity_type: string;
  entity_id?: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  user_id?: string;
}

export const auditService = {
  async log(params: CreateAuditLogParams): Promise<void> {
    const logEntry: AuditLog = {
      id: 'log-' + Date.now(),
      user_id: params.user_id || null,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id || null,
      old_data: params.old_data || null,
      new_data: params.new_data || null,
      ip_address: params.ip_address || null,
      created_at: new Date().toISOString(),
    };

    if (!isSupabaseConfigured || !supabase) {
      localAuditLogs.unshift(logEntry);
      return;
    }

    try {
      await supabase.from('audit_logs').insert({
        user_id: params.user_id || null,
        action: params.action,
        entity_type: params.entity_type,
        entity_id: params.entity_id || null,
        old_data: params.old_data || null,
        new_data: params.new_data || null,
        ip_address: params.ip_address || null,
        user_agent: params.user_agent || null,
      });
    } catch (err) {
      console.error('[auditService.log] Failed to write audit log:', err);
    }
  },

  async getLogs(limit: number = 50): Promise<AuditLog[]> {
    if (!isSupabaseConfigured || !supabase) {
      return localAuditLogs.slice(0, limit);
    }

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[auditService.getLogs] Error:', error.message);
      return localAuditLogs.slice(0, limit);
    }
    return data || [];
  },
};
