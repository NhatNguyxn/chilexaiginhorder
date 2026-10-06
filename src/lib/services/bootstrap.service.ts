import { SupabaseClient } from '@supabase/supabase-js';

export const SEED_CATEGORIES = [
  { id: 'c0000000-0000-0000-0000-000000000001', name: 'Trà thanh mát', sort_order: 1, is_active: true },
  { id: 'c0000000-0000-0000-0000-000000000002', name: 'Nước ép tươi', sort_order: 2, is_active: true },
  { id: 'c0000000-0000-0000-0000-000000000003', name: 'Trái cây dầm', sort_order: 3, is_active: true },
  { id: 'c0000000-0000-0000-0000-000000000004', name: 'Đặc sản Hoàng Su Phì', sort_order: 4, is_active: true },
];

export const SEED_TABLES = [
  { id: 'b0000000-0000-0000-0000-000000000001', name: 'Bàn 01', slug: 'ban-01', qr_token: 'tbl_tok_8f93ab01e4a749c0', is_active: true },
  { id: 'b0000000-0000-0000-0000-000000000002', name: 'Bàn 02', slug: 'ban-02', qr_token: 'tbl_tok_4d71ce02b9f348a1', is_active: true },
  { id: 'b0000000-0000-0000-0000-000000000003', name: 'Bàn 03', slug: 'ban-03', qr_token: 'tbl_tok_1a55fe03c2d641b2', is_active: true },
  { id: 'b0000000-0000-0000-0000-000000000004', name: 'Bàn 04', slug: 'ban-04', qr_token: 'tbl_tok_7c33bb04e9a842c3', is_active: true },
  { id: 'b0000000-0000-0000-0000-000000000005', name: 'Bàn 05', slug: 'ban-05', qr_token: 'tbl_tok_2f88aa05d1b745d4', is_active: true },
  { id: 'b0000000-0000-0000-0000-000000000006', name: 'Bàn 06', slug: 'ban-06', qr_token: 'tbl_tok_9b22ee06a4f944e5', is_active: true },
  { id: 'b0000000-0000-0000-0000-000000000007', name: 'Bàn 07', slug: 'ban-07', qr_token: 'tbl_tok_3e44dd07b8c643f6', is_active: true },
  { id: 'b0000000-0000-0000-0000-000000000008', name: 'Bàn 08', slug: 'ban-08', qr_token: 'tbl_tok_6a11cc08f5e347a7', is_active: true },
  { id: 'b0000000-0000-0000-0000-000000000009', name: 'Bàn 09', slug: 'ban-09', qr_token: 'tbl_tok_5c77bb09c6d246b8', is_active: true },
  { id: 'b0000000-0000-0000-0000-000000000010', name: 'Bàn 10', slug: 'ban-10', qr_token: 'tbl_tok_0d99aa10e7b145c9', is_active: true },
];

export const SEED_MENU_ITEMS = [
  { id: 'd0000000-0000-0000-0000-000000000001', category_id: 'c0000000-0000-0000-0000-000000000001', name: 'Trà chanh', price: 15000, image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80', is_available: true, sort_order: 1 },
  { id: 'd0000000-0000-0000-0000-000000000002', category_id: 'c0000000-0000-0000-0000-000000000001', name: 'Trà tắc', price: 15000, image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80', is_available: true, sort_order: 2 },
  { id: 'd0000000-0000-0000-0000-000000000003', category_id: 'c0000000-0000-0000-0000-000000000001', name: 'Trà chanh nha đam', price: 20000, image_url: 'https://images.unsplash.com/photo-1499638673689-79a0b5115d87?auto=format&fit=crop&w=600&q=80', is_available: true, sort_order: 3 },
  { id: 'd0000000-0000-0000-0000-000000000004', category_id: 'c0000000-0000-0000-0000-000000000001', name: 'Trà quấy nha đam', price: 20000, image_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80', is_available: true, sort_order: 4 },
  { id: 'd0000000-0000-0000-0000-000000000005', category_id: 'c0000000-0000-0000-0000-000000000002', name: 'Nước ép cam', price: 30000, image_url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80', is_available: true, sort_order: 5 },
  { id: 'd0000000-0000-0000-0000-000000000006', category_id: 'c0000000-0000-0000-0000-000000000002', name: 'Nước ép dưa hấu', price: 30000, image_url: 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?auto=format&fit=crop&w=600&q=80', is_available: true, sort_order: 6 },
  { id: 'd0000000-0000-0000-0000-000000000007', category_id: 'c0000000-0000-0000-0000-000000000002', name: 'Nước ép dứa', price: 40000, image_url: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=600&q=80', is_available: true, sort_order: 7 },
  { id: 'd0000000-0000-0000-0000-000000000008', category_id: 'c0000000-0000-0000-0000-000000000002', name: 'Dừa tươi', price: 30000, image_url: 'https://images.unsplash.com/photo-1544253109-17d4eaec9bf1?auto=format&fit=crop&w=600&q=80', is_available: true, sort_order: 8 },
  { id: 'd0000000-0000-0000-0000-000000000009', category_id: 'c0000000-0000-0000-0000-000000000003', name: 'Cóc dầm', price: 10000, image_url: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80', is_available: true, sort_order: 9 },
  { id: 'd0000000-0000-0000-0000-000000000010', category_id: 'c0000000-0000-0000-0000-000000000003', name: 'Xoài dầm', price: 10000, image_url: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=600&q=80', is_available: true, sort_order: 10 },
  { id: 'd0000000-0000-0000-0000-000000000011', category_id: 'c0000000-0000-0000-0000-000000000004', name: 'Nước dâu rừng Hoàng Su Phì', price: 20000, image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80', is_available: true, sort_order: 11 },
  { id: 'd0000000-0000-0000-0000-000000000012', category_id: 'c0000000-0000-0000-0000-000000000004', name: 'Nước mận máu Hoàng Su Phì', price: 20000, image_url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=600&q=80', is_available: true, sort_order: 12 },
];

let isBootstrapping = false;

/**
 * Ensures tables, menu_categories, and menu_items exist in Supabase.
 * If empty, automatically populates them with default store data.
 */
export async function ensureInitialStoreData(db: SupabaseClient | null): Promise<void> {
  if (!db || isBootstrapping) return;
  isBootstrapping = true;

  try {
    // 1. Check and seed tables
    const { count: tableCount } = await db
      .from('tables')
      .select('*', { count: 'exact', head: true });

    if (tableCount === 0 || tableCount === null) {
      console.log('[Bootstrap] Seeding tables into Supabase...');
      await db.from('tables').upsert(SEED_TABLES, { onConflict: 'slug' });
    }

    // 2. Check and seed categories
    const { count: catCount } = await db
      .from('menu_categories')
      .select('*', { count: 'exact', head: true });

    if (catCount === 0 || catCount === null) {
      console.log('[Bootstrap] Seeding menu categories into Supabase...');
      await db.from('menu_categories').upsert(SEED_CATEGORIES, { onConflict: 'id' });
    }

    // 3. Check and seed menu items
    const { count: itemCount } = await db
      .from('menu_items')
      .select('*', { count: 'exact', head: true });

    if (itemCount === 0 || itemCount === null) {
      console.log('[Bootstrap] Seeding menu items into Supabase...');
      await db.from('menu_items').upsert(SEED_MENU_ITEMS, { onConflict: 'id' });
    }

    // 4. Update store_settings to real store location
    await db.from('store_settings').upsert({
      id: 'a0000000-0000-0000-0000-000000000001',
      store_name: 'Chị Lệ xai gính',
      address: 'Quảng trường Nguyễn Tất Thành, Tỉnh Tuyên Quang',
      latitude: 21.8197,
      longitude: 105.2172,
      radius_meters: 150,
      warning_mode: 'warn_only',
      photo_retention_days: 90,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[Bootstrap] Auto-seed warning:', err);
  } finally {
    isBootstrapping = false;
  }
}
