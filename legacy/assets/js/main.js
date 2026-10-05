/**
 * CHI LỆ XAI GÍNH - CORE JAVASCRIPT
 * Landing Page giới thiệu món đồ ăn đồ uống (Thuần giới thiệu, không giỏ hàng)
 * Hotline & Zalo: 0333859626
 */

const STORE_PHONE = '0333859626';
const STORE_PHONE_DISPLAY = '0333 859 626';

// ==========================================
// 1. DỮ LIỆU MENU 12 MÓN THỰC TẾ
// ==========================================
const MENU_ITEMS = [
  // --- TRÀ THANH MÁT ---
  {
    id: 'tra-chanh',
    name: 'Trà Chanh',
    category: 'tea',
    price: 15000,
    formattedPrice: '15.000đ',
    desc: 'Trà nhài ủ lạnh thơm thanh khiết, kết hợp cốt chanh tươi chua dịu giải nhiệt tức thì.',
    img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
    tag: 'Quen thuộc'
  },
  {
    id: 'tra-tac',
    name: 'Trà Tắc',
    category: 'tea',
    price: 15000,
    formattedPrice: '15.000đ',
    desc: 'Vị quất (tắc) tươi chua thanh thơm nồng nàn quyện cùng trà lài đậm vị.',
    img: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80',
    tag: 'Giải khát'
  },
  {
    id: 'tra-chanh-nha-dam',
    name: 'Trà Chanh Nha Đam',
    category: 'tea',
    price: 20000,
    formattedPrice: '20.000đ',
    desc: 'Trà chanh tươi mát thêm thạch nha đam ngâm đường phèn giòn sần sật thanh mát.',
    img: 'https://images.unsplash.com/photo-1499638673689-79a0b5115d87?auto=format&fit=crop&w=600&q=80',
    tag: 'Bán chạy'
  },
  {
    id: 'tra-quay-nha-dam',
    name: 'Trà Quấy Nha Đam',
    category: 'tea',
    price: 20000,
    formattedPrice: '20.000đ',
    desc: 'Công thức trà quấy truyền thống hòa quyện nha đam tươi giòn mát dịu, ngọt thanh vị xưa.',
    img: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
    tag: 'Đặc trưng'
  },

  // --- NƯỚC ÉP TƯƠI & DỪA ---
  {
    id: 'nuoc-ep-cam',
    name: 'Nước Ép Cam',
    category: 'juice',
    price: 30000,
    formattedPrice: '30.000đ',
    desc: 'Cam tươi vắt nguyên chất tại chỗ, mọng nước, giàu vitamin C tự nhiên cho ngày khỏe khoắn.',
    img: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
    tag: 'Nguyên chất'
  },
  {
    id: 'nuoc-ep-dua-hau',
    name: 'Nước Ép Dưa Hấu',
    category: 'juice',
    price: 30000,
    formattedPrice: '30.000đ',
    desc: 'Dưa hấu chín đỏ ngọt lịm ép tươi mát lành, giải khát cực đã những ngày oi bức.',
    img: 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?auto=format&fit=crop&w=600&q=80',
    tag: 'Tươi ngọt'
  },
  {
    id: 'ep-dua',
    name: 'Ép Dứa (Thơm)',
    category: 'juice',
    price: 40000,
    formattedPrice: '40.000đ',
    desc: 'Dứa mật chín vàng ép lấy trọn vị chua ngọt đậm đà, thơm nức mũi và hỗ trợ tiêu hóa.',
    img: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=600&q=80',
    tag: 'Thơm ngọt'
  },
  {
    id: 'dua-tuoi',
    name: 'Dừa Tươi',
    category: 'juice',
    price: 30000,
    formattedPrice: '30.000đ',
    desc: 'Nước dừa xiêm ngọt lịm tự nhiên nguyên trái, kèm cùi dừa non mềm bùi thanh khiết.',
    img: 'https://images.unsplash.com/photo-1544253109-17d4eaec9bf1?auto=format&fit=crop&w=600&q=80',
    tag: 'Tự nhiên 100%'
  },

  // --- TRÁI CÂY DẦM ---
  {
    id: 'coc-dam',
    name: 'Cóc Dầm',
    category: 'fruit',
    price: 10000,
    formattedPrice: '10.000đ',
    desc: 'Cóc non bao tử giòn sần sật, ngấm đều gia vị mắm ớt chua cay mặn ngọt ăn là ghiền.',
    img: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80',
    tag: 'Ăn vặt hot'
  },
  {
    id: 'xoai-dam',
    name: 'Xoài Dầm',
    category: 'fruit',
    price: 10000,
    formattedPrice: '10.000đ',
    desc: 'Xoài keo non giòn rụm dầm ớt tươi và muối tôm đường, vị chua ngọt kích thích vị giác.',
    img: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=600&q=80',
    tag: 'Chua cay'
  },

  // --- ĐẶC SẢN HOÀNG SU PHÌ ---
  {
    id: 'nuoc-dau-rung-hoang-su-phi',
    name: 'Nước Dâu Rừng Hoàng Su Phì',
    category: 'specialty',
    price: 20000,
    formattedPrice: '20.000đ',
    desc: 'Dâu rừng hoang dã hái từ núi đồi Hoàng Su Phì, ủ thảo mộc men lá thanh mát, vị chua ngọt sâu lắng.',
    img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
    tag: 'Đặc sản núi'
  },
  {
    id: 'nuoc-man-mau-hoang-su-phi',
    name: 'Nước Mận Máu Hoàng Su Phì',
    category: 'specialty',
    price: 20000,
    formattedPrice: '20.000đ',
    desc: 'Mận máu đỏ thẫm Hoàng Su Phì ủ mật mía tự nhiên, sắc đỏ ruby quyến rũ vị chua thanh dịu ngọt.',
    img: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=600&q=80',
    tag: 'Signature'
  }
];

// ==========================================
// 2. HIỂN THỊ MENU & BỘ LỌC TƯƠNG TÁC
// ==========================================
function renderMenu(itemsToRender) {
  const container = document.getElementById('menu-items-grid');
  if (!container) return;

  if (itemsToRender.length === 0) {
    container.innerHTML = `
      <div class="no-results-msg">
        <p>Không tìm thấy món phù hợp với từ khóa của bạn.</p>
        <button class="btn btn-outline" style="margin-top:14px; padding:8px 18px;" onclick="resetSearch()">Xem tất cả menu</button>
      </div>
    `;
    return;
  }

  container.innerHTML = itemsToRender.map(item => `
    <div class="menu-card" data-id="${item.id}" data-category="${item.category}" onclick="openItemModal('${item.id}')">
      <div class="menu-card-img-wrap">
        <img src="${item.img}" alt="${item.name}" class="menu-card-img" loading="lazy">
      </div>
      <div class="menu-card-content">
        <div>
          <div class="menu-card-header">
            <h4 class="menu-card-title">${item.name}</h4>
            <span class="menu-card-price">${item.formattedPrice}</span>
          </div>
          <p class="menu-card-desc">${item.desc}</p>
        </div>
        <div class="menu-card-actions">
          <span class="menu-card-tag">${item.tag}</span>
          <a href="https://zalo.me/${STORE_PHONE}?text=${encodeURIComponent('Chào quán Chị Lệ, mình muốn đặt món: ' + item.name + ' (' + item.formattedPrice + ')')}" 
             target="_blank" 
             rel="noopener" 
             class="btn-card-inquire" 
             onclick="event.stopPropagation();" 
             title="Nhắn Zalo đặt món">
            <span>Đặt Zalo</span>
          </a>
        </div>
      </div>
    </div>
  `).join('');
}

function filterCategory(catName) {
  document.querySelectorAll('.cat-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.category === catName);
  });

  const searchInput = document.getElementById('menu-search-input');
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

  let filtered = MENU_ITEMS;
  if (catName !== 'all') {
    filtered = filtered.filter(i => i.category === catName);
  }
  if (query) {
    filtered = filtered.filter(i => i.name.toLowerCase().includes(query) || i.desc.toLowerCase().includes(query));
  }

  renderMenu(filtered);
}

function handleSearch(query) {
  const activeTab = document.querySelector('.cat-tab.active');
  const catName = activeTab ? activeTab.dataset.category : 'all';
  const q = query.trim().toLowerCase();

  let filtered = MENU_ITEMS;
  if (catName !== 'all') {
    filtered = filtered.filter(i => i.category === catName);
  }
  if (q) {
    filtered = filtered.filter(i => i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q));
  }
  renderMenu(filtered);
}

function resetSearch() {
  const input = document.getElementById('menu-search-input');
  if (input) input.value = '';
  filterCategory('all');
}

// ==========================================
// 3. POPUP CHI TIẾT MÓN (XEM & NHẮN ZALO TRỰC TIẾP)
// ==========================================
function openItemModal(itemId) {
  const item = MENU_ITEMS.find(i => i.id === itemId);
  if (!item) return;

  const modal = document.getElementById('item-customize-modal');
  if (!modal) return;

  document.getElementById('modal-item-img').src = item.img;
  document.getElementById('modal-item-name').textContent = item.name;
  document.getElementById('modal-item-price').textContent = item.formattedPrice;
  document.getElementById('modal-item-desc').textContent = item.desc;

  const zaloBtn = document.getElementById('modal-zalo-btn');
  if (zaloBtn) {
    zaloBtn.href = `https://zalo.me/${STORE_PHONE}?text=${encodeURIComponent('Chào quán Chị Lệ xai gính, mình muốn gọi món: ' + item.name + ' (' + item.formattedPrice + ')')}`;
  }

  modal.classList.add('active');
}

function closeItemModal() {
  const modal = document.getElementById('item-customize-modal');
  if (modal) modal.classList.remove('active');
}

// ==========================================
// 4. SỰ KIỆN KHỞI TẠO TRANG (DOM READY)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  renderMenu(MENU_ITEMS);

  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  const mobileToggle = document.querySelector('.mobile-toggle');
  const navMenu = document.querySelector('.nav-menu');
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });

    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
      });
    });
  }

  const searchInput = document.getElementById('menu-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      handleSearch(e.target.value);
    });
  }

  // Đóng modal khi click ra ngoài overlay
  const modalOverlay = document.getElementById('item-customize-modal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeItemModal();
      }
    });
  }
});
