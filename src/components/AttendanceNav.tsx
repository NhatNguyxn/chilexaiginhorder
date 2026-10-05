'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarCheck2, History, CalendarRange, SlidersHorizontal, Download } from 'lucide-react';

export default function AttendanceNav() {
  const pathname = usePathname();

  const links = [
    {
      label: 'Hôm nay',
      href: '/admin/attendance/today',
      icon: CalendarCheck2,
    },
    {
      label: 'Lịch sử & Xuất file',
      href: '/admin/attendance/history',
      icon: History,
    },
    {
      label: 'Báo cáo tháng',
      href: '/admin/attendance/monthly',
      icon: CalendarRange,
    },
    {
      label: 'Cấu hình quán & GPS',
      href: '/admin/attendance/settings',
      icon: SlidersHorizontal,
    },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2 border-b border-brass/20 mb-6">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              isActive
                ? 'bg-pine text-kraft shadow-sm'
                : 'bg-kraft-card border border-brass/30 text-pine hover:bg-kraft-dark/40'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
