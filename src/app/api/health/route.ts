import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

  return NextResponse.json({
    status: 'ok',
    isSupabaseConfigured,
    hasUrl: Boolean(url),
    urlMasked: url ? url.slice(0, 15) + '...' : 'none',
    hasKey: Boolean(key),
    keyMasked: key ? key.slice(0, 10) + '...' : 'none',
    timestamp: new Date().toISOString(),
  });
}
