import { UserRole } from '@/types';

export type PermissionAction =
  | 'manage_staff'
  | 'view_staff'
  | 'reset_staff_password'
  | 'manage_menu'
  | 'manage_tables'
  | 'regenerate_qr'
  | 'view_orders'
  | 'update_order_status'
  | 'cancel_order'
  | 'checkout_table'
  | 'view_attendance'
  | 'approve_attendance'
  | 'check_in_out'
  | 'view_reports'
  | 'manage_settings';

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Chủ quán',
  manager: 'Quản lý',
  cashier: 'Thu ngân',
  staff: 'Nhân viên phục vụ / Pha chế',
};

export const PERMISSION_MATRIX: Record<PermissionAction, UserRole[]> = {
  manage_staff: ['owner'],
  view_staff: ['owner', 'manager'],
  reset_staff_password: ['owner'],
  manage_menu: ['owner', 'manager'],
  manage_tables: ['owner', 'manager'],
  regenerate_qr: ['owner', 'manager'],
  view_orders: ['owner', 'manager', 'cashier', 'staff'],
  update_order_status: ['owner', 'manager', 'cashier', 'staff'],
  cancel_order: ['owner', 'manager', 'cashier'],
  checkout_table: ['owner', 'manager', 'cashier'],
  view_attendance: ['owner', 'manager'],
  approve_attendance: ['owner', 'manager'],
  check_in_out: ['owner', 'manager', 'cashier', 'staff'],
  view_reports: ['owner', 'manager'],
  manage_settings: ['owner'],
};

export function hasPermission(role: UserRole | undefined | null, action: PermissionAction): boolean {
  if (!role) return false;
  const allowedRoles = PERMISSION_MATRIX[action];
  return allowedRoles ? allowedRoles.includes(role) : false;
}

export function canAccessRoute(role: UserRole | undefined | null, pathname: string): boolean {
  if (!role) return false;

  // Staff routes accessible to all active roles
  if (pathname === '/staff' || pathname.startsWith('/staff/')) {
    return true;
  }

  // Admin routes
  if (pathname.startsWith('/admin')) {
    // Only owner & manager have admin portal access
    if (role !== 'owner' && role !== 'manager') {
      return false;
    }

    // Settings page in attendance or admin is restricted to owner
    if (pathname.includes('/settings') && role !== 'owner') {
      return false;
    }

    return true;
  }

  return true;
}

export function getDefaultRedirectForRole(role: UserRole): string {
  switch (role) {
    case 'owner':
    case 'manager':
      return '/admin/tables';
    case 'cashier':
    case 'staff':
    default:
      return '/staff';
  }
}
