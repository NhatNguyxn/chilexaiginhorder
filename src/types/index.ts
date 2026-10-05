export type UserRole = 'owner' | 'manager' | 'cashier' | 'staff';

export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  hourly_rate: number; // Integer VND
  created_at?: string;
  updated_at?: string;
}

// Legacy alias for compatibility
export type StaffUser = UserProfile;

export interface Table {
  id: string;
  name: string;
  slug: string;
  qr_token?: string;
  is_active?: boolean;
  created_at?: string;
  deleted_at?: string | null;
}

export interface TableSession {
  id: string;
  table_id: string;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at?: string | null;
  total_amount: number; // Integer VND
  created_at?: string;
  deleted_at?: string | null;
  table?: Table;
}

export interface MenuCategory {
  id: string;
  name: string;
  sort_order: number;
  is_active?: boolean;
  created_at?: string;
  deleted_at?: string | null;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  price: number; // Integer VND
  image_url: string;
  is_available: boolean;
  sort_order: number;
  description?: string;
  created_at?: string;
  deleted_at?: string | null;
}

export type OrderStatus = 'new' | 'preparing' | 'served' | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  note?: string;
  price_at_order: number; // Integer VND
  created_at?: string;
  deleted_at?: string | null;
  menu_item?: MenuItem;
}

export interface Order {
  id: string;
  session_id: string;
  table_id: string;
  status: OrderStatus;
  cancellation_reason?: string | null;
  note?: string;
  total_amount?: number;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  items?: OrderItem[];
  table?: Table;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  note: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

// Attendance Types (Phases 2 & 3)
export type AttendanceCheckType = 'check_in' | 'check_out';
export type AttendanceStatus = 'valid' | 'flagged' | 'adjusted' | 'auto_closed';
export type AdjustmentStatus = 'pending' | 'approved' | 'rejected';
export type GeofenceMode = 'warn_only' | 'require_note' | 'block';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  check_type: AttendanceCheckType;
  captured_at_client: string;
  captured_at_server: string;
  photo_url: string;
  location_name?: string;
  latitude?: number | null;
  longitude?: number | null;
  distance_meters?: number | null;
  device_id?: string | null;
  ip_address?: string | null;
  flags: string[];
  status: AttendanceStatus;
  note?: string | null;
  created_at: string;
  user?: UserProfile;
}

export interface AttendanceAdjustment {
  id: string;
  record_id?: string | null;
  user_id: string;
  shift_date: string;
  check_type: AttendanceCheckType;
  original_time?: string | null;
  requested_time: string;
  reason: string;
  status: AdjustmentStatus;
  requested_by: string;
  approved_by?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  user?: UserProfile;
  reviewer?: UserProfile;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  warning_mode: GeofenceMode;
  ip_whitelist: string[];
  photo_retention_days: number;
  updated_at: string;
  updated_by?: string | null;
}
