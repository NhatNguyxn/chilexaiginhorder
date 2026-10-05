import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isServiceRoleConfigured = Boolean(
  supabaseUrl &&
  serviceRoleKey &&
  !supabaseUrl.includes('your-project') &&
  serviceRoleKey !== 'your-service-role-key'
);

export function getAdminClient(): SupabaseClient | null {
  if (typeof window !== 'undefined') {
    throw new Error('FATAL: Supabase Admin Client (Service Role) cannot be used in browser context!');
  }

  if (!isServiceRoleConfigured) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
