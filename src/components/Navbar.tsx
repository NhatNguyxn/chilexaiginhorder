'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { STORE_NAME } from '@/lib/constants';
import { Coffee, LayoutDashboard, Shield, QrCode } from 'lucide-react';

export default function Navbar({ role = 'staff' }: { role?: 'staff' | 'admin' }) {
  const pathname = usePathname();

  return (
    <header className="bg-kraft-card border-b border-brass/30 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-brass shadow-sm relative flex-shrink-0">
            <Image
              src="/logo.png"
              alt={STORE_NAME}
              width={40}
              height={40}
              className="object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-pine text-base leading-tight">
              {STORE_NAME}
            </span>
            <span className="text-[10px] text-moss uppercase tracking-wider font-semibold">
              {role === 'admin' ? 'Quản trị viên' : 'Quản lý quầy & bếp'}
            </span>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 md:gap-2">
          <Link
            href="/staff"
            className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-medium flex items-center gap-1.5 transition ${
              pathname === '/staff'
                ? 'bg-pine text-kraft shadow-sm'
                : 'text-pine hover:bg-kraft-dark/40'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Đơn hàng</span>
          </Link>

          <Link
            href="/admin/tables"
            className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-medium flex items-center gap-1.5 transition ${
              pathname.startsWith('/admin')
                ? 'bg-pine text-kraft shadow-sm'
                : 'text-pine hover:bg-kraft-dark/40'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Quản trị</span>
            <span className="sm:hidden">Admin</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
