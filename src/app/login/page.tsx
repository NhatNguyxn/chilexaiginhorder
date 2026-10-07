'use client';

import { useState, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { STORE_NAME } from '@/lib/constants';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { getDefaultRedirectForRole } from '@/lib/permissions';
import { UserRole } from '@/types';
import { Lock, User, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect');
  const errorParam = searchParams.get('error');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    errorParam === 'account_disabled'
      ? 'Tài khoản của bạn đã bị khóa hoặc vô hiệu hóa. Vui lòng liên hệ chủ quán.'
      : ''
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setErrorMessage('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setLoading(true);

    try {
      // 1. Call server-side authentication route
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        setErrorMessage(
          resData.error || 'Tên đăng nhập hoặc mật khẩu không chính xác.'
        );
        setLoading(false);
        return;
      }

      // 2. Synchronize client-side Supabase session if browser client exists
      if (resData.session && supabase) {
        try {
          await supabase.auth.setSession({
            access_token: resData.session.access_token,
            refresh_token: resData.session.refresh_token,
          });
        } catch (syncErr) {
          console.warn('[Login Page] Client session sync warning:', syncErr);
        }
      }

      // 3. Navigate to target dashboard with hard reload to apply session cookies
      const target = redirectTarget || resData.redirect || '/admin/tables';
      window.location.href = target;
    } catch (err: unknown) {
      console.error('Login error:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Không thể kết nối đến máy chủ xác thực. Vui lòng thử lại.'
      );
      setLoading(false);
    }
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
              priority
            />
          </div>
          <div>
            <h1 className="font-serif font-bold text-2xl text-pine">
              {STORE_NAME}
            </h1>
            <p className="text-xs text-moss font-semibold uppercase tracking-wider mt-0.5">
              Hệ thống Vận hành Quầy & Điểm danh
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-clay/10 border border-clay/30 flex items-start gap-2.5 text-xs text-clay">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-pine mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-moss" />
              <span>Tên đăng nhập / Số điện thoại</span>
            </label>
            <input
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="0333859626, admin, nv_..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-pine text-sm placeholder:text-pine-2/50 font-medium"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-pine flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-moss" />
                <span>Mật khẩu</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-moss hover:text-pine font-medium flex items-center gap-1 transition select-none"
              >
                {showPassword ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Ẩn mật khẩu</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Hiện mật khẩu</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border border-brass/40 bg-kraft focus:outline-none focus:ring-2 focus:ring-moss text-pine text-sm placeholder:text-pine-2/50 font-medium tracking-normal"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-pine-2 hover:text-pine rounded-lg transition"
                tabIndex={-1}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-pine-2/80 mt-1">
              💡 Mẹo di động: Nhấn <strong>Hiện mật khẩu</strong> để kiểm tra tránh gõ nhầm dấu tiếng Việt hoặc thừa/thiếu ký tự @.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-pine text-kraft rounded-xl font-serif font-bold text-sm shadow hover:bg-pine/90 transition flex items-center justify-center gap-2 tap-active disabled:opacity-50 mt-2"
          >
            <Lock className="w-4 h-4" />
            <span>{loading ? 'Đang xác thực...' : 'Đăng nhập vào hệ thống'}</span>
          </button>
        </form>

        {/* Back to Home Link */}
        <div className="text-center pt-2 border-t border-brass/20">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-pine-2 hover:text-pine font-semibold transition"
          >
            <span>Quay lại trang chủ quán</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-kraft flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-moss border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
