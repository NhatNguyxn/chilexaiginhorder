-- ==============================================================================
-- SEED DATA: CHỊ LỆ XAI GÍNH (12 MÓN THỰC TẾ & 10 BÀN BAN ĐẦU)
-- ==============================================================================

-- 1. SEED DANH SÁCH 10 BÀN
INSERT INTO tables (name, slug) VALUES
  ('Bàn 01', 'ban-01'),
  ('Bàn 02', 'ban-02'),
  ('Bàn 03', 'ban-03'),
  ('Bàn 04', 'ban-04'),
  ('Bàn 05', 'ban-05'),
  ('Bàn 06', 'ban-06'),
  ('Bàn 07', 'ban-07'),
  ('Bàn 08', 'ban-08'),
  ('Bàn 09', 'ban-09'),
  ('Bàn 10', 'ban-10')
ON CONFLICT (slug) DO NOTHING;

-- 2. SEED 4 DANH MỤC MENU
INSERT INTO menu_categories (id, name, sort_order) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Trà thanh mát', 1),
  ('b2222222-2222-2222-2222-222222222222', 'Nước ép tươi', 2),
  ('c3333333-3333-3333-3333-333333333333', 'Trái cây dầm', 3),
  ('d4444444-4444-4444-4444-444444444444', 'Đặc sản Hoàng Su Phì', 4)
ON CONFLICT (id) DO NOTHING;

-- 3. SEED 12 MÓN ĂN & ĐỒ UỐNG THỰC TẾ
INSERT INTO menu_items (category_id, name, price, image_url, is_available, sort_order) VALUES
  -- Nhóm 1: Trà thanh mát
  ('a1111111-1111-1111-1111-111111111111', 'Trà chanh', 15000, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80', true, 1),
  ('a1111111-1111-1111-1111-111111111111', 'Trà tắc', 15000, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80', true, 2),
  ('a1111111-1111-1111-1111-111111111111', 'Trà chanh nha đam', 20000, 'https://images.unsplash.com/photo-1499638673689-79a0b5115d87?auto=format&fit=crop&w=600&q=80', true, 3),
  ('a1111111-1111-1111-1111-111111111111', 'Trà quấy nha đam', 20000, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80', true, 4),

  -- Nhóm 2: Nước ép tươi
  ('b2222222-2222-2222-2222-222222222222', 'Nước ép cam', 30000, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80', true, 5),
  ('b2222222-2222-2222-2222-222222222222', 'Nước ép dưa hấu', 30000, 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?auto=format&fit=crop&w=600&q=80', true, 6),
  ('b2222222-2222-2222-2222-222222222222', 'Nước ép dứa', 40000, 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=600&q=80', true, 7),
  ('b2222222-2222-2222-2222-222222222222', 'Dừa tươi', 30000, 'https://images.unsplash.com/photo-1544253109-17d4eaec9bf1?auto=format&fit=crop&w=600&q=80', true, 8),

  -- Nhóm 3: Trái cây dầm
  ('c3333333-3333-3333-3333-333333333333', 'Cóc dầm', 10000, 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80', true, 9),
  ('c3333333-3333-3333-3333-333333333333', 'Xoài dầm', 10000, 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=600&q=80', true, 10),

  -- Nhóm 4: Đặc sản Hoàng Su Phì
  ('d4444444-4444-4444-4444-444444444444', 'Nước dâu rừng Hoàng Su Phì', 20000, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80', true, 11),
  ('d4444444-4444-4444-4444-444444444444', 'Nước mận máu Hoàng Su Phì', 20000, 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=600&q=80', true, 12);
