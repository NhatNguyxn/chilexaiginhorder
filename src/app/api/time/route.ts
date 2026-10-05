import { NextResponse } from 'next/server';

export async function GET() {
  const now = new Date();

  const formattedDate = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'full',
    timeStyle: 'medium',
  }).format(now);

  const isoVN = now.toISOString();

  return NextResponse.json({
    server_time: isoVN,
    unix_ms: now.getTime(),
    timezone: 'Asia/Ho_Chi_Minh',
    formatted: formattedDate,
  });
}
