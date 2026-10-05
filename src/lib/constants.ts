import { MenuCategory, MenuItem, Table } from '@/types';

export const STORE_NAME = 'Chị Lệ xai gính';
export const STORE_TAGLINE = 'Nước mát mỗi ngày & Đặc sản Hoàng Su Phì';
export const STORE_PHONE = '0333859626';
export const STORE_PHONE_DISPLAY = '0333 859 626';

export const INITIAL_CATEGORIES: MenuCategory[] = [
  { id: 'cat-1', name: 'Trà thanh mát', sort_order: 1 },
  { id: 'cat-2', name: 'Nước ép tươi', sort_order: 2 },
  { id: 'cat-3', name: 'Trái cây dầm', sort_order: 3 },
  { id: 'cat-4', name: 'Đặc sản Hoàng Su Phì', sort_order: 4 },
];

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  // Trà thanh mát
  {
    id: 'item-1',
    category_id: 'cat-1',
    name: 'Trà chanh',
    price: 15000,
    image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
    is_available: true,
    sort_order: 1,
  },
  {
    id: 'item-2',
    category_id: 'cat-1',
    name: 'Trà tắc',
    price: 15000,
    image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80',
    is_available: true,
    sort_order: 2,
  },
  {
    id: 'item-3',
    category_id: 'cat-1',
    name: 'Trà chanh nha đam',
    price: 20000,
    image_url: 'https://images.unsplash.com/photo-1499638673689-79a0b5115d87?auto=format&fit=crop&w=600&q=80',
    is_available: true,
    sort_order: 3,
  },
  {
    id: 'item-4',
    category_id: 'cat-1',
    name: 'Trà quấy nha đam',
    price: 20000,
    image_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
    is_available: true,
    sort_order: 4,
  },

  // Nước ép tươi
  {
    id: 'item-5',
    category_id: 'cat-2',
    name: 'Nước ép cam',
    price: 30000,
    image_url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
    is_available: true,
    sort_order: 5,
  },
  {
    id: 'item-6',
    category_id: 'cat-2',
    name: 'Nước ép dưa hấu',
    price: 30000,
    image_url: 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?auto=format&fit=crop&w=600&q=80',
    is_available: true,
    sort_order: 6,
  },
  {
    id: 'item-7',
    category_id: 'cat-2',
    name: 'Nước ép dứa',
    price: 40000,
    image_url: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=600&q=80',
    is_available: true,
    sort_order: 7,
  },
  {
    id: 'item-8',
    category_id: 'cat-2',
    name: 'Dừa tươi',
    price: 30000,
    image_url: 'https://images.unsplash.com/photo-1544253109-17d4eaec9bf1?auto=format&fit=crop&w=600&q=80',
    is_available: true,
    sort_order: 8,
  },

  // Trái cây dầm
  {
    id: 'item-9',
    category_id: 'cat-3',
    name: 'Cóc dầm',
    price: 10000,
    image_url: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80',
    is_available: true,
    sort_order: 9,
  },
  {
    id: 'item-10',
    category_id: 'cat-3',
    name: 'Xoài dầm',
    price: 10000,
    image_url: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=600&q=80',
    is_available: true,
    sort_order: 10,
  },

  // Đặc sản Hoàng Su Phì
  {
    id: 'item-11',
    category_id: 'cat-4',
    name: 'Nước dâu rừng Hoàng Su Phì',
    price: 20000,
    image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
    is_available: true,
    sort_order: 11,
  },
  {
    id: 'item-12',
    category_id: 'cat-4',
    name: 'Nước mận máu Hoàng Su Phì',
    price: 20000,
    image_url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=600&q=80',
    is_available: true,
    sort_order: 12,
  },
];

export const INITIAL_TABLES: Table[] = [
  { id: 'tbl-1', name: 'Bàn 01', slug: 'ban-01', qr_token: 'tbl_tok_8f93ab01e4a749c0' },
  { id: 'tbl-2', name: 'Bàn 02', slug: 'ban-02', qr_token: 'tbl_tok_4d71ce02b9f348a1' },
  { id: 'tbl-3', name: 'Bàn 03', slug: 'ban-03', qr_token: 'tbl_tok_1a55fe03c2d641b2' },
  { id: 'tbl-4', name: 'Bàn 04', slug: 'ban-04', qr_token: 'tbl_tok_7c33bb04e9a842c3' },
  { id: 'tbl-5', name: 'Bàn 05', slug: 'ban-05', qr_token: 'tbl_tok_2f88aa05d1b745d4' },
  { id: 'tbl-6', name: 'Bàn 06', slug: 'ban-06', qr_token: 'tbl_tok_9b22ee06a4f944e5' },
  { id: 'tbl-7', name: 'Bàn 07', slug: 'ban-07', qr_token: 'tbl_tok_3e44dd07b8c643f6' },
  { id: 'tbl-8', name: 'Bàn 08', slug: 'ban-08', qr_token: 'tbl_tok_6a11cc08f5e347a7' },
  { id: 'tbl-9', name: 'Bàn 09', slug: 'ban-09', qr_token: 'tbl_tok_5c77bb09c6d246b8' },
  { id: 'tbl-10', name: 'Bàn 10', slug: 'ban-10', qr_token: 'tbl_tok_0d99aa10e7b145c9' },
];

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}
