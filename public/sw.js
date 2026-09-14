// Service Worker cho Chị Lệ xai gính PWA & Web Push Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Xử lý thông báo đẩy (Web Push)
self.addEventListener('push', (event) => {
  let data = { title: 'Chị Lệ xai gính', body: 'Có đơn hàng mới vừa đặt!' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/staff',
    },
    actions: [
      { action: 'open', title: 'Xem đơn ngay' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Đơn món mới!', options)
  );
});

// Khi nhấn vào thông báo đẩy
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/staff';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes('/staff') && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
