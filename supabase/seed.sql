-- ==============================================================================
-- SEED DATA: CHỊ LỆ XAI GÍNH
-- ==============================================================================

-- 1. DANH MỤC MENU (MENU_CATEGORIES)
INSERT INTO menu_categories (id, name, sort_order, is_active)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Trà thanh mát', 1, true),
  ('c0000000-0000-0000-0000-000000000002', 'Nước ép tươi', 2, true),
  ('c0000000-0000-0000-0000-000000000003', 'Trái cây dầm', 3, true),
  ('c0000000-0000-0000-0000-000000000004', 'Đặc sản Hoàng Su Phì', 4, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order;

-- 2. MÓN ĂN & ĐỒ UỐNG (MENU_ITEMS)
INSERT INTO menu_items (id, category_id, name, price, image_url, is_available, sort_order)
VALUES
  -- Trà thanh mát
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Trà chanh', 15000, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80', true, 1),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Trà tắc', 15000, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80', true, 2),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Trà chanh nha đam', 20000, 'https://images.unsplash.com/photo-1499638673689-79a0b5115d87?auto=format&fit=crop&w=600&q=80', true, 3),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Trà quấy nha đam', 20000, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80', true, 4),

  -- Nước ép tươi
  ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002', 'Nước ép cam', 30000, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80', true, 5),
  ('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000002', 'Nước ép dưa hấu', 30000, 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?auto=format&fit=crop&w=600&q=80', true, 6),
  ('d0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000002', 'Nước ép dứa', 40000, 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=600&q=80', true, 7),
  ('d0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000002', 'Dừa tươi', 30000, 'https://images.unsplash.com/photo-1544253109-17d4eaec9bf1?auto=format&fit=crop&w=600&q=80', true, 8),

  -- Trái cây dầm
  ('d0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000003', 'Cóc dầm', 10000, 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80', true, 9),
  ('d0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000003', 'Xoài dầm', 10000, 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=600&q=80', true, 10),

  -- Đặc sản Hoàng Su Phì
  ('d0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000004', 'Nước dâu rừng Hoàng Su Phì', 20000, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80', true, 11),
  ('d0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000004', 'Nước mận máu Hoàng Su Phì', 20000, 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=600&q=80', true, 12)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url,
  is_available = EXCLUDED.is_available,
  sort_order = EXCLUDED.sort_order;

-- 3. DANH SÁCH BÀN (TABLES)
-- Khởi tạo 10 bàn kèm slug và qr_token ngẫu nhiên
INSERT INTO tables (id, name, slug, qr_token, is_active)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Bàn 01', 'ban-01', 'tbl_tok_8f93ab01e4a749c0', true),
  ('b0000000-0000-0000-0000-000000000002', 'Bàn 02', 'ban-02', 'tbl_tok_4d71ce02b9f348a1', true),
  ('b0000000-0000-0000-0000-000000000003', 'Bàn 03', 'ban-03', 'tbl_tok_1a55fe03c2d641b2', true),
  ('b0000000-0000-0000-0000-000000000004', 'Bàn 04', 'ban-04', 'tbl_tok_7c33bb04e9a842c3', true),
  ('b0000000-0000-0000-0000-000000000005', 'Bàn 05', 'ban-05', 'tbl_tok_2f88aa05d1b745d4', true),
  ('b0000000-0000-0000-0000-000000000006', 'Bàn 06', 'ban-06', 'tbl_tok_9b22ee06a4f944e5', true),
  ('b0000000-0000-0000-0000-000000000007', 'Bàn 07', 'ban-07', 'tbl_tok_3e44dd07b8c643f6', true),
  ('b0000000-0000-0000-0000-000000000008', 'Bàn 08', 'ban-08', 'tbl_tok_6a11cc08f5e347a7', true),
  ('b0000000-0000-0000-0000-000000000009', 'Bàn 09', 'ban-09', 'tbl_tok_5c77bb09c6d246b8', true),
  ('b0000000-0000-0000-0000-000000000010', 'Bàn 10', 'ban-10', 'tbl_tok_0d99aa10e7b145c9', true)
ON CONFLICT (slug) DO NOTHING;
