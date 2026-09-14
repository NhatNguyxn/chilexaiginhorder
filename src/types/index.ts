export interface Table {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
}

export interface TableSession {
  id: string;
  table_id: string;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at?: string | null;
  total_amount: number;
  table?: Table;
}

export interface MenuCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  price: number;
  image_url: string;
  is_available: boolean;
  sort_order: number;
  description?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  note?: string;
  price_at_order: number;
  menu_item?: MenuItem;
}

export interface Order {
  id: string;
  session_id: string;
  table_id: string;
  status: 'new' | 'preparing' | 'served';
  note?: string;
  created_at: string;
  items?: OrderItem[];
  table?: Table;
}

export interface StaffUser {
  id: string;
  full_name: string;
  role: 'admin' | 'staff';
  is_active: boolean;
  email?: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  note: string;
}
