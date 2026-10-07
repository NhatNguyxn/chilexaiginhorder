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

// Canonical owner credentials
const OWNER_USERNAME = '0333859626';
const OWNER_CANONICAL_PASSWORD = 'MebanManh@@@626';

/**
 * Normalizes username input:
 * - Trims whitespace and invisible unicode characters
 * - Maps phone number variations (e.g. +84..., 0333 859 626, 0333.859.626) to standard 0333859626
 * - Allows 'admin' alias to map to 0333859626
 */
function normalizeUsername(input: string): string {
  let cleaned = String(input || '').trim().toLowerCase();
  // Strip zero-width / invisible chars
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');

  if (cleaned === 'admin') {
    return OWNER_USERNAME;
  }

  // Check phone number format
  const digitsOnly = cleaned.replace(/[\s.\-()]/g, '');
  if (digitsOnly.startsWith('+84') && digitsOnly.length === 12) {
    return '0' + digitsOnly.slice(3);
  }
  if (digitsOnly.startsWith('84') && digitsOnly.length === 11) {
    return '0' + digitsOnly.slice(2);
  }
  if (/^0\d{9,10}$/.test(digitsOnly)) {
    return digitsOnly;
  }

  return cleaned;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const cleanUsername = normalizeUsername(username);
    const cleanPassword = String(password || '').trim();

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

    // Self-healing bootstrap & guarantee for the Owner account (0333859626)
    if (cleanUsername === OWNER_USERNAME) {
      if (!adminClient) {
        return NextResponse.json(
          {
            error:
              'Thiếu biến môi trường SUPABASE_SERVICE_ROLE_KEY trên Vercel. Vui lòng kiểm tra lại.',
          },
          { status: 500 }
        );
      }

      try {
        const { data: usersData, error: listErr } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (listErr) {
          console.error('[Auth API] listUsers error:', listErr);
        }

        const existing = usersData?.users?.find(
          (u) => u.email?.toLowerCase() === internalEmail.toLowerCase()
        );

        let adminUserId: string | null = null;

        if (existing) {
          // Always ensure owner account in GoTrue is fixed strictly to OWNER_CANONICAL_PASSWORD
          const { error: updateErr } = await adminClient.auth.admin.updateUserById(existing.id, {
            password: OWNER_CANONICAL_PASSWORD,
            email_confirm: true,
            user_metadata: {
              username: OWNER_USERNAME,
              full_name: 'Admin (Chủ quán)',
            },
          });
          if (updateErr) {
            console.warn('[Auth API] updateUserById warning:', updateErr);
          }
          adminUserId = existing.id;
        } else {
          // Create fresh admin user with confirmed email and exact password
          const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
            email: internalEmail,
            password: OWNER_CANONICAL_PASSWORD,
            email_confirm: true,
            user_metadata: {
              username: OWNER_USERNAME,
              full_name: 'Admin (Chủ quán)',
            },
          });

          if (createErr) {
            if (createErr.message?.toLowerCase().includes('already been registered')) {
              console.log('[Auth API] Admin user already registered in GoTrue, proceeding to authenticate...');
            } else {
              console.error('[Auth API] createUser error:', createErr);
              return NextResponse.json(
                { error: `Lỗi tạo tài khoản GoTrue: ${createErr.message}` },
                { status: 500 }
              );
            }
          }

          if (created?.user) {
            adminUserId = created.user.id;
          }
        }

        // Upsert profile for this user if ID is available
        if (adminUserId) {
          const { error: profileUpsertErr } = await adminClient.from('profiles').upsert({
            id: adminUserId,
            username: OWNER_USERNAME,
            full_name: 'Admin (Chủ quán)',
            role: 'owner',
            is_active: true,
            hourly_rate: 0,
          });

          if (profileUpsertErr) {
            console.error('[Auth API] profile upsert error:', profileUpsertErr);
          }
        }
      } catch (adminErr: unknown) {
        console.error('[Auth API] Admin bootstrap error:', adminErr);
        return NextResponse.json(
          {
            error: `Lỗi hệ thống xác thực tài khoản chủ quán: ${
              adminErr instanceof Error ? adminErr.message : 'Không xác định'
            }`,
          },
          { status: 500 }
        );
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
      const errMsg = authError?.message?.toLowerCase() || '';
      if (errMsg.includes('email not confirmed')) {
        message = 'Tài khoản chưa được kích hoạt xác nhận trong hệ thống.';
      } else if (errMsg.includes('invalid login credentials')) {
        message =
          'Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại (chú ý tắt gõ dấu tiếng Việt và nhập đúng số ký tự @).';
      } else if (errMsg.includes('too many requests')) {
        message = 'Đã thao tác quá nhanh hoặc thử sai nhiều lần. Vui lòng đợi 1-2 phút rồi thử lại.';
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
