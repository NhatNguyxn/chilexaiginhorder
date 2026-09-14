import { 
  INITIAL_CATEGORIES, 
  INITIAL_MENU_ITEMS, 
  INITIAL_TABLES 
} from '@/lib/constants';
import { 
  MenuCategory, 
  MenuItem, 
  Order, 
  StaffUser, 
  Table, 
  TableSession 
} from '@/types';

// Store keys trong LocalStorage
const STORAGE_KEYS = {
  TABLES: 'chile_tables_v1',
  CATEGORIES: 'chile_categories_v1',
  MENU_ITEMS: 'chile_menu_items_v1',
  SESSIONS: 'chile_sessions_v1',
  ORDERS: 'chile_orders_v1',
  STAFF: 'chile_staff_v1',
};

class MockStore {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('chile_realtime_channel');
        this.channel.onmessage = (event) => {
          if (event.data?.type === 'SYNC') {
            this.notifyListeners();
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported', e);
      }
      this.initData();
    }
  }

  private initData() {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(STORAGE_KEYS.TABLES)) {
      localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(INITIAL_TABLES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MENU_ITEMS)) {
      localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(INITIAL_MENU_ITEMS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SESSIONS)) {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.STAFF)) {
      const defaultStaff: StaffUser[] = [
        { id: 'admin-1', full_name: 'Chị Lệ (Chủ quán)', role: 'admin', is_active: true, email: 'admin@chile.vn' },
        { id: 'staff-1', full_name: 'Nhân viên Ca Sáng', role: 'staff', is_active: true, email: 'nhanvien@chile.vn' },
      ];
      localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(defaultStaff));
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => cb());
  }

  private emitChange() {
    this.notifyListeners();
    if (this.channel) {
      this.channel.postMessage({ type: 'SYNC', timestamp: Date.now() });
    }
  }

  // --- TABLES ---
  public getTables(): Table[] {
    if (typeof window === 'undefined') return INITIAL_TABLES;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TABLES);
      return data ? JSON.parse(data) : INITIAL_TABLES;
    } catch {
      return INITIAL_TABLES;
    }
  }

  public getTableBySlug(slug: string): Table | undefined {
    return this.getTables().find((t) => t.slug === slug);
  }

  public addTable(name: string): Table {
    const tables = this.getTables();
    const slug = 'ban-' + String(tables.length + 1).padStart(2, '0');
    const newTable: Table = {
      id: 'tbl-' + Date.now(),
      name,
      slug,
      created_at: new Date().toISOString(),
    };
    tables.push(newTable);
    localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(tables));
    this.emitChange();
    return newTable;
  }

  public deleteTable(id: string) {
    const tables = this.getTables().filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(tables));
    this.emitChange();
  }

  // --- MENU CATEGORIES & ITEMS ---
  public getCategories(): MenuCategory[] {
    if (typeof window === 'undefined') return INITIAL_CATEGORIES;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return data ? JSON.parse(data) : INITIAL_CATEGORIES;
    } catch {
      return INITIAL_CATEGORIES;
    }
  }

  public getMenuItems(): MenuItem[] {
    if (typeof window === 'undefined') return INITIAL_MENU_ITEMS;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MENU_ITEMS);
      return data ? JSON.parse(data) : INITIAL_MENU_ITEMS;
    } catch {
      return INITIAL_MENU_ITEMS;
    }
  }

  public addMenuItem(item: Omit<MenuItem, 'id'>): MenuItem {
    const items = this.getMenuItems();
    const newItem: MenuItem = {
      ...item,
      id: 'item-' + Date.now(),
    };
    items.push(newItem);
    localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(items));
    this.emitChange();
    return newItem;
  }

  public updateMenuItem(id: string, updates: Partial<MenuItem>) {
    const items = this.getMenuItems().map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(items));
    this.emitChange();
  }

  public deleteMenuItem(id: string) {
    const items = this.getMenuItems().filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(items));
    this.emitChange();
  }

  public toggleItemAvailability(id: string) {
    const items = this.getMenuItems().map((item) =>
      item.id === id ? { ...item, is_available: !item.is_available } : item
    );
    localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(items));
    this.emitChange();
  }

  // --- SESSIONS & ORDERS ---
  public getSessions(): TableSession[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public getOpenSessionForTable(tableId: string): TableSession | undefined {
    return this.getSessions().find(
      (s) => s.table_id === tableId && s.status === 'open'
    );
  }

  public getOrCreateOpenSession(tableId: string): TableSession {
    const existing = this.getOpenSessionForTable(tableId);
    if (existing) return existing;

    const sessions = this.getSessions();
    const newSession: TableSession = {
      id: 'session-' + Date.now(),
      table_id: tableId,
      status: 'open',
      opened_at: new Date().toISOString(),
      closed_at: null,
      total_amount: 0,
    };
    sessions.push(newSession);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    this.emitChange();
    return newSession;
  }

  public closeSession(sessionId: string, totalAmount: number): TableSession | null {
    const sessions = this.getSessions();
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index === -1) return null;

    sessions[index].status = 'closed';
    sessions[index].closed_at = new Date().toISOString();
    sessions[index].total_amount = totalAmount;

    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    this.emitChange();
    return sessions[index];
  }

  public getOrders(): Order[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public getOrdersForTable(tableId: string): Order[] {
    const currentSession = this.getOpenSessionForTable(tableId);
    if (!currentSession) return [];
    return this.getOrders().filter(
      (o) => o.session_id === currentSession.id
    );
  }

  public placeOrder(params: {
    tableId: string;
    items: { menuItemId: string; quantity: number; note?: string }[];
    note?: string;
  }): Order {
    const session = this.getOrCreateOpenSession(params.tableId);
    const menuItems = this.getMenuItems();
    const tables = this.getTables();
    const table = tables.find((t) => t.id === params.tableId);

    const orderId = 'order-' + Date.now();
    const orderItems = params.items.map((it, idx) => {
      const mi = menuItems.find((m) => m.id === it.menuItemId);
      return {
        id: `oi-${orderId}-${idx}`,
        order_id: orderId,
        menu_item_id: it.menuItemId,
        quantity: it.quantity,
        note: it.note || '',
        price_at_order: mi ? mi.price : 0,
        menu_item: mi,
      };
    });

    const newOrder: Order = {
      id: orderId,
      session_id: session.id,
      table_id: params.tableId,
      status: 'new',
      note: params.note || '',
      created_at: new Date().toISOString(),
      items: orderItems,
      table: table,
    };

    const orders = this.getOrders();
    orders.push(newOrder);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));

    // Cập nhật tổng tiền tạm tính cho session
    const orderTotal = orderItems.reduce(
      (sum, i) => sum + i.price_at_order * i.quantity,
      0
    );
    const sessions = this.getSessions().map((s) =>
      s.id === session.id
        ? { ...s, total_amount: (s.total_amount || 0) + orderTotal }
        : s
    );
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));

    this.emitChange();
    return newOrder;
  }

  public updateOrderStatus(orderId: string, status: 'new' | 'preparing' | 'served') {
    const orders = this.getOrders().map((o) =>
      o.id === orderId ? { ...o, status } : o
    );
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    this.emitChange();
  }

  // --- STAFF ACCOUNTS ---
  public getStaff(): StaffUser[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STAFF);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public addStaff(user: Omit<StaffUser, 'id'>): StaffUser {
    const staff = this.getStaff();
    const newStaff: StaffUser = {
      ...user,
      id: 'staff-' + Date.now(),
    };
    staff.push(newStaff);
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staff));
    this.emitChange();
    return newStaff;
  }

  public toggleStaffStatus(id: string) {
    const staff = this.getStaff().map((s) =>
      s.id === id ? { ...s, is_active: !s.is_active } : s
    );
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staff));
    this.emitChange();
  }
}

export const mockStore = new MockStore();
