import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { canAccessRoute, getDefaultRedirectForRole } from '@/lib/permissions';
import { UserRole } from '@/types';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // If Supabase is not yet configured, allow traffic to prevent blocking builds
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project')) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = pathname === '/login';
  const isProtectedAdminRoute = pathname.startsWith('/admin');
  const isProtectedStaffRoute = pathname.startsWith('/staff');

  // 1. Unauthenticated users trying to access protected routes
  if (!user && (isProtectedAdminRoute || isProtectedStaffRoute)) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Authenticated user handling
  if (user) {
    // Fetch profile to verify active status and role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    // Check account active status
    if (profile && profile.is_active === false) {
      // Sign out disabled user
      await supabase.auth.signOut();
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'account_disabled');
      return NextResponse.redirect(loginUrl);
    }

    const userRole = (profile?.role as UserRole) || 'staff';

    // If user is already logged in and attempts to access /login, redirect to their home
    if (isAuthRoute) {
      const targetUrl = new URL(getDefaultRedirectForRole(userRole), request.url);
      return NextResponse.redirect(targetUrl);
    }

    // Role-based access control
    if (!canAccessRoute(userRole, pathname)) {
      // Forbidden route for role: redirect to their default home
      const defaultUrl = new URL(getDefaultRedirectForRole(userRole), request.url);
      return NextResponse.redirect(defaultUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/staff/:path*', '/login'],
};
