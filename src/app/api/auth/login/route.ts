import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getAdminClient } from '@/lib/supabase/admin';
import { getDefaultRedirectForRole } from '@/lib/permissions';
import { UserRole } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const cleanUsername = String(username || '').trim().toLowerCase();
    const cleanPassword = String(password || '');

    if (!cleanUsername || !cleanPassword) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' },
        { status: 400 }
      );
    }

    const internalEmail = cleanUsername.includes('@')
      ? cleanUsername
      : `${cleanUsername}@quan.local`;

    const adminClient = getAdminClient();

    // Self-healing bootstrap for the requested Admin account (0333859626)
    if (adminClient && cleanUsername === '0333859626') {
      try {
        const { data: usersData } = await adminClient.auth.admin.listUsers();
        const existing = usersData?.users.find(
          (u) => u.email?.toLowerCase() === internalEmail.toLowerCase()
        );

        if (!existing) {
          // Create admin user automatically with confirmed email
          const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
            email: internalEmail,
            password: cleanPassword,
            email_confirm: true,
            user_metadata: {
              username: '0333859626',
              full_name: 'Admin (Chủ quán)',
            },
          });

          if (createErr) {
            console.error('[Auth API] Error creating admin user:', createErr.message);
          } else if (created?.user) {
            await adminClient.from('profiles').upsert({
              id: created.user.id,
              username: '0333859626',
              full_name: 'Admin (Chủ quán)',
              role: 'owner',
              is_active: true,
              hourly_rate: 0,
            });
          }
        } else {
          // Update password, ensure email is confirmed, and ensure profile is active owner
          await adminClient.auth.admin.updateUserById(existing.id, {
            password: cleanPassword,
            email_confirm: true,
            user_metadata: {
              username: '0333859626',
              full_name: 'Admin (Chủ quán)',
            },
          });

          await adminClient.from('profiles').upsert({
            id: existing.id,
            username: '0333859626',
            full_name: 'Admin (Chủ quán)',
            role: 'owner',
            is_active: true,
            hourly_rate: 0,
          });
        }
      } catch (adminErr) {
        console.error('[Auth API] Admin bootstrap error:', adminErr);
      }
    }

    // Authenticate with Supabase SSR Server Client to write HTTP-Only session cookies
    const cookieStore = await cookies();
    const serverClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    });

    const { data: authData, error: authError } =
      await serverClient.auth.signInWithPassword({
        email: internalEmail,
        password: cleanPassword,
      });

    if (authError || !authData.user) {
      console.error('[Auth API] signInWithPassword error:', authError);
      let message = 'Tên đăng nhập hoặc mật khẩu không chính xác.';
      if (authError?.message?.includes('Email not confirmed')) {
        message = 'Tài khoản chưa được kích hoạt xác nhận email trong Supabase Auth.';
      } else if (authError?.message) {
        message = `Lỗi đăng nhập: ${authError.message}`;
      }
      return NextResponse.json({ error: message }, { status: 401 });
    }

    // Verify profile role & active status
    const db = adminClient || serverClient;
    const { data: profile, error: profileErr } = await db
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (profileErr || !profile) {
      // If profile is missing for 0333859626, auto-create it
      if (cleanUsername === '0333859626' && adminClient) {
        await adminClient.from('profiles').upsert({
          id: authData.user.id,
          username: '0333859626',
          full_name: 'Admin (Chủ quán)',
          role: 'owner',
          is_active: true,
          hourly_rate: 0,
        });
      } else {
        return NextResponse.json(
          { error: 'Không tìm thấy hồ sơ nhân sự liên kết với tài khoản này.' },
          { status: 403 }
        );
      }
    }

    const currentProfile = profile || { role: 'owner', is_active: true };

    if (currentProfile.is_active === false) {
      await serverClient.auth.signOut();
      return NextResponse.json(
        { error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ chủ quán.' },
        { status: 403 }
      );
    }

    const role = (currentProfile.role || 'staff') as UserRole;
    const redirectUrl = getDefaultRedirectForRole(role);

    return NextResponse.json({
      success: true,
      user: authData.user,
      session: authData.session,
      role,
      redirect: redirectUrl,
    });
  } catch (error: unknown) {
    console.error('[Auth API] Unhandled error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Đã xảy ra lỗi máy chủ trong quá trình xác thực.',
      },
      { status: 500 }
    );
  }
}
