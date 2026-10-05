'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { STORE_NAME } from '@/lib/constants';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { ROLE_LABELS } from '@/lib/permissions';
import { UserRole, UserProfile } from '@/types';
import { LayoutDashboard, Shield, LogOut, Camera } from 'lucide-react';

export default function Navbar({ role = 'staff' }: { role?: 'staff' | 'admin' }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setProfile(data);
          });
      }
    });
  }, []);

  const handleSignOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    router.push('/login');
    router.refresh();
  };

  const userRole = (profile?.role as UserRole) || (role === 'admin' ? 'manager' : 'staff');

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
              {profile ? ROLE_LABELS[profile.role] || profile.role : role === 'admin' ? 'Quản trị viên' : 'Quầy & Gọi món'}
            </span>
          </div>
        </Link>

        {/* Navigation Tabs & User controls */}
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

          {/* Quick Attendance link */}
          <Link
            href="/staff/attendance"
            className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-medium flex items-center gap-1.5 transition ${
              pathname.startsWith('/staff/attendance')
                ? 'bg-pine text-kraft shadow-sm'
                : 'text-pine hover:bg-kraft-dark/40'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Chấm công</span>
          </Link>

          {(userRole === 'owner' || userRole === 'manager') && (
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
          )}

          {/* Sign out button */}
          <button
            onClick={handleSignOut}
            className="p-2 rounded-full text-pine-2 hover:text-clay hover:bg-kraft transition ml-1"
            title="Đăng xuất khỏi hệ thống"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </nav>
      </div>
    </header>
  );
}
