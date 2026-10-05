self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let data = { title: 'Our Love Diary 💌', body: 'Hôm nay có lời nhắc kỷ niệm.' };
  try { data = event.data ? event.data.json() : data; } catch {}
  event.waitUntil(self.registration.showNotification(data.title || 'Our Love Diary 💌', {
    body: data.body || 'Hôm nay có lời nhắc kỷ niệm.',
    icon: '/mon-qua-nho/assets/images/couple.svg',
    badge: '/mon-qua-nho/assets/images/couple.svg',
    data: data.url || '/',
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data || '/'));
});
