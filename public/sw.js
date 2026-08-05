// Service Worker for NIHAD BUSINESS POINT PWA & Push Notifications

const CACHE_NAME = 'nihad-business-point-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Serve cached assets when offline if available
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((response) => {
        if (response) return response;
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Handle push notification events from server / background
self.addEventListener('push', (event) => {
  let data = {
    title: 'NIHAD BUSINESS POINT',
    body: 'আপনার অ্যাকাউন্টে একটি নতুন বার্তা এসেছে!',
    icon: '/icon-192.png',
    url: '/'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200, 100, 200, 100, 400],
    tag: data.tag || ('nihad-notif-' + Date.now()),
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'অ্যাপ খুলুন' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'NIHAD BUSINESS POINT', options)
  );
});

// Handle direct message from client app to present persistent background notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const payload = event.data.payload || {};
    self.registration.showNotification(payload.title || 'NIHAD BUSINESS POINT', {
      body: payload.body || '',
      icon: payload.icon || '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200, 100, 200, 100, 400],
      tag: payload.tag || ('notif-' + Date.now()),
      renotify: true,
      requireInteraction: true,
      data: { url: payload.url || '/' }
    });
  }
});

// When user taps on the phone notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
