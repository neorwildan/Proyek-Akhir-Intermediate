const APP_VERSION = '1.0.0';
const CACHE_NAME = `story-app-cache-${APP_VERSION}`;
const RUNTIME_CACHE = 'runtime-cache';

// Daftar asset yang akan di-cache saat install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/styles/styles.css',
  '/scripts/index.js',
  '/public/images/icon-192x192.png',
  '/public/images/icon-512x512.png',
  '/public/images/default-avatar.png',
  '/public/images/logo.png',
  '/favicon.png',
  '/fallback.html',
  '/offline.css'
];

// Daftar strategi caching untuk berbagai tipe request
const CACHE_STRATEGIES = {
  static: 'CacheFirst',
  images: 'CacheFirst',
  api: 'NetworkFirst',
  pages: 'NetworkFirst',
  external: 'StaleWhileRevalidate'
};

// Install Service Worker dan precache asset penting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching core assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Skip waiting');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('Service Worker: Installation failed', err);
      })
  );
});

// Aktifkan Service Worker dan bersihkan cache lama
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, RUNTIME_CACHE];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('Service Worker: Claiming clients');
      return self.clients.claim();
    })
  );
});

// Strategi caching: Cache First dengan fallback ke network
const cacheFirst = async (request) => {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return caches.match('/fallback.html');
  }
};

// Strategi caching: Network First dengan fallback ke cache
const networkFirst = async (request) => {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    throw new Error('Network response not OK');
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || caches.match('/fallback.html');
  }
};

// Strategi caching: Stale While Revalidate
const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Lakukan fetch di background untuk update cache
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null); // Abaikan error fetch

  // Return cached response jika ada, jika tidak tunggu network response
  return cachedResponse || fetchPromise;
};

// Tentukan strategi caching berdasarkan request
const getCacheStrategy = (request) => {
  const url = new URL(request.url);
  
  // API endpoints
  if (url.pathname.startsWith('/api/')) {
    return CACHE_STRATEGIES.api;
  }
  
  // Halaman HTML
  if (request.headers.get('Accept').includes('text/html')) {
    return CACHE_STRATEGIES.pages;
  }
  
  // Asset statis (CSS, JS)
  if (request.destination === 'style' || request.destination === 'script') {
    return CACHE_STRATEGIES.static;
  }
  
  // Gambar
  if (request.destination === 'image') {
    return CACHE_STRATEGIES.images;
  }
  
  // Resource eksternal
  if (url.origin !== self.location.origin) {
    return CACHE_STRATEGIES.external;
  }
  
  // Default
  return CACHE_STRATEGIES.static;
};

// Handle fetch events dengan strategi yang sesuai
self.addEventListener('fetch', (event) => {
  // 1. Skip request non-GET dan chrome-extension
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // 2. Tentukan strategi caching
  const strategy = getCacheStrategy(event.request);
  
  // 3. Handle berdasarkan strategi dengan network status reporting
  switch (strategy) {
    case 'NetworkFirst':
      event.respondWith(
        networkFirstWithStatus(event.request)
      );
      break;
      
    case 'StaleWhileRevalidate':
      event.respondWith(
        staleWhileRevalidateWithStatus(event.request)
      );
      break;
      
    case 'CacheFirst':
    default:
      event.respondWith(
        cacheFirstWithStatus(event.request)
      );
      break;
  }
});

// Enhanced strategies dengan network status reporting
async function networkFirstWithStatus(request) {
  try {
    const response = await fetch(request);
    reportNetworkStatus(true);
    return response;
  } catch (error) {
    reportNetworkStatus(false);
    const cachedResponse = await caches.match(request);
    return cachedResponse || caches.match('/offline.html');
  }
}

async function staleWhileRevalidateWithStatus(request) {
  const cache = await caches.open('runtime-cache');
  const cachedResponse = await cache.match(request);
  
  // Background fetch untuk update
  const fetchPromise = fetch(request)
    .then(networkResponse => {
      reportNetworkStatus(true);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    })
    .catch(() => reportNetworkStatus(false));

  return cachedResponse || fetchPromise;
}

async function cacheFirstWithStatus(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;
  
  try {
    const networkResponse = await fetch(request);
    reportNetworkStatus(true);
    const cache = await caches.open('runtime-cache');
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    reportNetworkStatus(false);
    return caches.match('/offline.html');
  }
}

// Fungsi untuk mengirim status jaringan ke client
function reportNetworkStatus(isOnline) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ 
        type: 'network-status', 
        isOnline,
        timestamp: Date.now() 
      });
    });
  });
}

// Background Sync (jika didukung)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-stories') {
    console.log('Background sync for stories');
    // Implementasi sync data di sini
  }
});

// Periodic Sync (jika didukung)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-stories') {
    console.log('Periodic sync for stories');
    // Implementasi periodic sync di sini
  }
});

// Push Notification Handler
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  const payload = event.data?.json() || {
    title: 'Story Update',
    body: 'Ada pembaruan cerita baru',
    icon: '/public/images/icon-192x192.png',
    badge: '/public/images/badge.png',
    data: { url: '/' }
  };

  const showNotification = (title, options) => {
    const defaultOptions = {
      icon: '/public/images/icon-192x192.png',
      badge: '/public/images/badge.png',
      vibrate: [200, 100, 200],
      data: { url: '/', storyId: null },
      ...options
    };

    return self.registration.showNotification(title, defaultOptions);
  };

  event.waitUntil(
    (async () => {
      // Cek apakah ada clients yang terbuka
      const allClients = await self.clients.matchAll();
      
      // Jika ada client yang terbuka, mungkin tidak perlu notifikasi
      if (allClients.length > 0) {
        // Kirim message ke client
        allClients.forEach(client => {
          client.postMessage({
            type: 'push-notification',
            payload: payload
          });
        });
        
        // Tampilkan notifikasi hanya jika payload memaksa
        if (payload.forceShow) {
          return showNotification(payload.title, payload);
        }
      } else {
        // Tampilkan notifikasi jika tidak ada client terbuka
        return showNotification(payload.title, payload);
      }
    })()
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const notificationData = event.notification.data || { url: '/' };
  const urlToOpen = new URL(notificationData.url, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      // Cari tab yang sudah terbuka dengan URL yang sama
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // Buka tab baru jika tidak ditemukan
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })()
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification);
});