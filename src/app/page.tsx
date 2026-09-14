'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { STORE_NAME, STORE_TAGLINE } from '@/lib/constants';
import { mockStore } from '@/lib/mock-store';
import { Table } from '@/types';
import { QrCode, LayoutDashboard, Shield, Sparkles, UtensilsCrossed } from 'lucide-react';

export default function HomePage() {
  const [tables, setTables] = useState<Table[]>([]);

  useEffect(() => {
    setTables(mockStore.getTables());
  }, []);

  return (
    <main className="min-h-screen bg-kraft flex flex-col justify-between p-4 md:p-8">
      <div className="max-w-3xl mx-auto w-full space-y-8 my-auto">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-full overflow-hidden border-2 border-brass shadow-md">
            <Image
              src="/logo.png"
              alt={STORE_NAME}
              width={96}
              height={96}
              className="object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="font-serif font-bold text-3xl md:text-4xl text-pine">
              {STORE_NAME}
            </h1>
            <p className="text-sm md:text-base text-moss font-medium mt-1">
              {STORE_TAGLINE}
            </p>
          </div>
        </div>

        {/* Action Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Khách gọi món */}
          <div className="bg-kraft-card border-2 border-brass/40 rounded-2xl p-6 shadow-card flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-full bg-clay/10 text-clay flex items-center justify-center mb-3">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <h2 className="font-serif font-bold text-xl text-pine">
                Khách gọi món tại bàn
              </h2>
              <p className="text-xs text-pine-2 mt-1 leading-relaxed">
                Khách quét mã QR dán trên bàn bằng điện thoại để xem menu và đặt món trực tiếp, không cần tải app hay đăng ký tài khoản.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-pine mb-1.5">
                Chọn bàn trải nghiệm thử:
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {tables.slice(0, 10).map((t) => (
                  <Link
                    key={t.id}
                    href={`/order/${t.slug}`}
                    className="py-2 text-center text-xs font-bold rounded-lg border border-brass/50 bg-kraft hover:bg-brass hover:text-pine transition shadow-sm tap-active"
                  >
                    {t.name.replace('Bàn ', 'B')}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Nhân viên & Bếp */}
          <div className="bg-kraft-card border-2 border-brass/40 rounded-2xl p-6 shadow-card flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-full bg-brass/20 text-pine flex items-center justify-center mb-3">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <h2 className="font-serif font-bold text-xl text-pine">
                Nhân viên & Quản lý bếp
              </h2>
              <p className="text-xs text-pine-2 mt-1 leading-relaxed">
                Nhận đơn hàng thời gian thực (Real-time kèm chuông ting), cập nhật trạng thái pha chế, tính tiền và đóng bàn.
              </p>
            </div>

            <div className="space-y-2">
              <Link
                href="/staff"
                className="w-full py-2.5 bg-pine hover:bg-pine-2 text-kraft font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow tap-active"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Mở Dashboard Nhân Viên</span>
              </Link>

              <Link
                href="/admin/tables"
                className="w-full py-2 border border-brass text-pine hover:bg-kraft text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 tap-active"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Quản trị viên (Menu, Nhân viên, In QR)</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Thông tin hỗ trợ */}
        <div className="text-center pt-4">
          <p className="text-xs text-moss font-medium">
            💡 Gợi ý: Mở 1 tab Khách (<code className="bg-kraft-dark px-1.5 py-0.5 rounded text-pine font-mono font-bold">/order/ban-01</code>) và 1 tab Nhân Viên (<code className="bg-kraft-dark px-1.5 py-0.5 rounded text-pine font-mono font-bold">/staff</code>) cạnh nhau để thử chuông báo đơn mới!
          </p>
        </div>
      </div>

      <footer className="text-center text-xs text-moss py-4 border-t border-brass/20 mt-8 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-3xl mx-auto w-full">
        <span>© 2026 {STORE_NAME} — Hệ thống gọi món tại bàn thông minh</span>
        <Link
          href="/login"
          className="text-pine-2 hover:text-pine underline font-semibold transition"
        >
          Đăng nhập nhân sự
        </Link>
      </footer>
    </main>
  );
}
