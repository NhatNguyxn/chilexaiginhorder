'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { STORE_NAME } from '@/lib/constants';
import { Shield, Coffee, UserCheck, ArrowRight, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDemoLogin = (role: 'admin' | 'staff') => {
    setLoading(true);
    // Simulating authentication and redirecting
    setTimeout(() => {
      if (role === 'admin') {
        router.push('/admin/tables');
      } else {
        router.push('/staff');
      }
    }, 400);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      // Default staff redirect
      router.push('/staff');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-kraft flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-kraft-card border border-brass/40 rounded-3xl shadow-card overflow-hidden p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-brass mx-auto shadow-md relative">
            <Image
              src="/logo.png"
              alt={STORE_NAME}
              fill
              sizes="64px"
              className="object-cover"
            />
          </div>
          <div>
            <h1 className="font-serif font-bold text-2xl text-pine">
              {STORE_NAME}
            </h1>
            <p className="text-xs text-moss font-semibold uppercase tracking-wider mt-0.5">
              Hệ thống Quản lý Quầy & Gọi món
            </p>
          </div>
        </div>

        {/* Quick 1-Click Access for Demo / Testing */}
        <div className="bg-kraft-soft border border-brass/30 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-pine uppercase tracking-wide flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-moss" />
            <span>Đăng nhập nhanh 1 chạm:</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDemoLogin('staff')}
              disabled={loading}
              className="py-2.5 px-3 rounded-xl bg-pine hover:bg-pine/90 text-kraft text-xs font-bold transition flex items-center justify-center gap-1.5 tap-active shadow-sm"
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Vào Quầy (Staff)</span>
            </button>
            <button
              onClick={() => handleDemoLogin('admin')}
              disabled={loading}
              className="py-2.5 px-3 rounded-xl bg-moss hover:bg-moss/90 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 tap-active shadow-sm"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Vào Quản Trị (Admin)</span>
            </button>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-brass/20 w-full" />
          <span className="bg-kraft-card px-3 text-[11px] text-pine-2 font-medium">
            Hoặc nhập tài khoản
          </span>
          <div className="border-t border-brass/20 w-full" />
        </div>

        {/* Login Form */}
        <form onSubmit={handleFormSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-pine mb-1">
              Email hoặc Số điện thoại
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nhanvien@chile.vn hoặc 0333859626"
              className="w-full px-3.5 py-2.5 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-pine text-sm placeholder:text-pine-2/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-pine mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-pine text-sm placeholder:text-pine-2/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-pine text-kraft rounded-xl font-serif font-bold text-sm shadow hover:bg-pine/90 transition flex items-center justify-center gap-2 tap-active disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            <span>{loading ? 'Đang xác thực...' : 'Đăng nhập'}</span>
          </button>
        </form>

        {/* Return to Customer page */}
        <div className="text-center pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-pine-2 hover:text-pine font-semibold transition"
          >
            <span>Quay lại trang chủ quán</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
