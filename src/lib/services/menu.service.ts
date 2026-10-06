import { MenuCategory, MenuItem } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { INITIAL_CATEGORIES, INITIAL_MENU_ITEMS } from '@/lib/constants';

let localCategories: MenuCategory[] = [...INITIAL_CATEGORIES];
let localItems: MenuItem[] = [...INITIAL_MENU_ITEMS];

export const menuService = {
  async getCategories(): Promise<MenuCategory[]> {
    if (!isSupabaseConfigured || !supabase) {
      return [...localCategories];
    }

    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.warn('[menuService.getCategories] Warning:', error.message);
      return [...localCategories];
    }
    return data;
  },

  async getMenuItems(): Promise<MenuItem[]> {
    if (!isSupabaseConfigured || !supabase) {
      return [...localItems];
    }

    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.warn('[menuService.getMenuItems] Warning:', error.message);
      return [...localItems];
    }
    return data;
  },

  async createMenuItem(item: Omit<MenuItem, 'id'>): Promise<MenuItem> {
    if (!isSupabaseConfigured || !supabase) {
      const newItem: MenuItem = {
        ...item,
        id: 'item-' + Date.now(),
      };
      localItems.push(newItem);
      return newItem;
    }

    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        category_id: item.category_id,
        name: item.name,
        price: Math.round(Number(item.price)), // Integer VND
        image_url: item.image_url || '/logo.png',
        is_available: item.is_available ?? true,
        sort_order: item.sort_order || 0,
        description: item.description || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Lỗi tạo món: ${error.message}`);
    }
    return data;
  },

  async updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem> {
    if (!isSupabaseConfigured || !supabase) {
      const idx = localItems.findIndex((i) => i.id === id);
      if (idx !== -1) {
        localItems[idx] = { ...localItems[idx], ...updates };
        return localItems[idx];
      }
      throw new Error('Không tìm thấy món');
    }

    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.price !== undefined) payload.price = Math.round(Number(updates.price));
    if (updates.category_id !== undefined) payload.category_id = updates.category_id;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.is_available !== undefined) payload.is_available = updates.is_available;
    if (updates.image_url !== undefined) payload.image_url = updates.image_url;
    if (updates.sort_order !== undefined) payload.sort_order = updates.sort_order;

    const { data, error } = await supabase
      .from('menu_items')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Lỗi cập nhật món: ${error.message}`);
    }
    return data;
  },

  async deleteMenuItem(id: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      localItems = localItems.filter((i) => i.id !== id);
      return;
    }

    // Soft delete
    const { error } = await supabase
      .from('menu_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new Error(`Lỗi xóa món: ${error.message}`);
    }
  },
};
