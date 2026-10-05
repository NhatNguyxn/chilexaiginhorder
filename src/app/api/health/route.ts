import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

  let pingStatus = 'untested';
  let pingError = null;
  let tablesExist = false;
  let tablesError = null;

  if (url) {
    try {
      const res = await fetch(`${url}/auth/v1/health`, {
        headers: { apikey: key },
      });
      pingStatus = `HTTP ${res.status}`;
    } catch (err: unknown) {
      pingStatus = 'fetch_failed';
      pingError = err instanceof Error ? err.message : String(err);
    }
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.from('tables').select('count', { count: 'exact', head: true });
      if (error) {
        tablesError = error.message;
      } else {
        tablesExist = true;
      }
    } catch (err: unknown) {
      tablesError = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json({
    status: 'ok',
    isSupabaseConfigured,
    url,
    keyMasked: key ? `${key.slice(0, 15)}...${key.slice(-5)}` : 'none',
    supabasePing: pingStatus,
    supabasePingError: pingError,
    tablesExist,
    tablesError,
    timestamp: new Date().toISOString(),
  });
}
