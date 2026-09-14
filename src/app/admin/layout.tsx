'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { QrCode, UtensilsCrossed, Users, ArrowLeft } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    {
      label: 'Bàn & Mã QR',
      href: '/admin/tables',
      icon: QrCode,
    },
    {
      label: 'Thực Đơn & Món',
      href: '/admin/menu',
      icon: UtensilsCrossed,
    },
    {
      label: 'Tài Khoản Nhân Viên',
      href: '/admin/staff',
      icon: Users,
    },
  ];

  return (
    <div className="min-h-screen bg-kraft flex flex-col">
      <Navbar role="admin" />

      {/* Admin Subheader & Tab Navigation */}
      <div className="bg-kraft-card border-b border-brass/20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/staff"
              className="inline-flex items-center gap-1 text-xs font-semibold text-pine-2 hover:text-pine px-2 py-1 rounded-lg bg-kraft border border-brass/30 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Về màn hình Quầy</span>
            </Link>
            <span className="text-brass/40">|</span>
            <span className="font-serif font-bold text-pine text-sm">
              Khu Vực Quản Trị
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-moss text-white shadow-sm'
                      : 'bg-kraft-soft border border-brass/30 text-pine hover:bg-kraft-dark/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
