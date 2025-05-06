const APP_VERSION = '1.0.3';
const CACHE_NAME = `story-app-cache-v${APP_VERSION}`;
const RUNTIME_CACHE = 'runtime-cache-v3';
const OFFLINE_CACHE = 'offline-cache-v3';
const HOME_CACHE = 'home-cache-v2';
const API_CACHE = 'api-cache-v1';

// Precached assets - App Shell + Critical Resources
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/styles/styles.css',
  '/scripts/index.js',
  '/scripts/app.js',
  '/scripts/routes/routes.js',
  '/scripts/pages/home-page.js',
  '/public/images/icon-192x192.png',
  '/public/images/icon-512x512.png',
  '/public/images/logo.png',
  '/public/images/default-avatar.png',
  '/favicon.png',
  '/manifest.json'
];

// Home-specific assets
const HOME_ASSETS = [
  '/',
  '/index.html',
  '/styles/styles.css',
  '/scripts/home-page.js',
  '/public/images/logo.png'
];

// External resources
const EXTERNAL_RESOURCES = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// ================= INSTALL =================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version', APP_VERSION);
  event.waitUntil(
    caches.open(HOME_CACHE)
      .then(cache => {
        console.log('[SW] Caching home assets');
        return cache.addAll(HOME_ASSETS);
      })
      .then(() => caches.open(CACHE_NAME))
      .then(cache => {
        console.log('[SW] Caching core assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Caching external resources');
        return caches.open(RUNTIME_CACHE)
          .then(cache => cache.addAll(EXTERNAL_RESOURCES));
      })
      .then(() => self.skipWaiting())
  );
});

// ================= ACTIVATE =================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new version');
  const cacheWhitelist = [CACHE_NAME, RUNTIME_CACHE, OFFLINE_CACHE, HOME_CACHE, API_CACHE];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => !cacheWhitelist.includes(name))
          .map(name => {
            console.log('[SW] Deleting old cache', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// ================= FETCH HANDLER =================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Home page cache-first strategy
  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      caches.match(request, { cacheName: HOME_CACHE })
        .then(cached => cached || fetch(request))
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // API endpoints - with IndexedDB fallback
  if (url.pathname === '/api/stories') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache API response
          const clone = response.clone();
          caches.open(API_CACHE)
            .then(cache => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          // Fallback 1: Check runtime cache
          const cached = await caches.match(request);
          if (cached) return cached;
          
          // Fallback 2: Request from client via IndexedDB
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'get-offline-stories'
            });
          });
          
          // Return empty array as temporary response
          return new Response(JSON.stringify([]), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Other API endpoints (network first)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(API_CACHE)
            .then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets (cache first)
  if (['style', 'script', 'font', 'image'].includes(request.destination)) {
    event.respondWith(
      caches.match(request)
        .then(cached => {
          if (cached) return cached;
          
          // Special handling for images
          if (request.destination === 'image') {
            return fetch(request).catch(() => {
              return caches.match('/public/images/default-avatar.png');
            });
          }
          
          return fetch(request);
        })
    );
    return;
  }

  // Default network first for other pages
  event.respondWith(
    fetch(request)
      .catch(() => caches.match('/offline.html'))
  );
});

// ================= MESSAGE HANDLER =================
self.addEventListener('message', (event) => {
  // Handle IndexedDB response for offline stories
  if (event.data.type === 'offline-stories-response') {
    console.log('[SW] Received offline stories from client');
    const response = new Response(JSON.stringify(event.data.stories), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    event.waitUntil(
      caches.open(API_CACHE)
        .then(cache => cache.put('/api/stories', response))
    );
  }

  // Handle story caching from client
  if (event.data.type === 'cache-story') {
    const { storyId, storyData } = event.data;
    const url = `/api/stories/${storyId}`;
    const response = new Response(JSON.stringify(storyData), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`[SW] Caching story ${storyId}`);
    event.waitUntil(
      caches.open(RUNTIME_CACHE)
        .then(cache => cache.put(url, response))
    );
  }
});

// ================= BACKGROUND SYNC =================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-stories') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(
      syncStories().then(() => {
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'sync-completed' });
          });
        });
      })
    );
  }
});

async function syncStories() {
  // Implement your story synchronization logic here
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    const requests = await cache.keys();
    const storyRequests = requests.filter(req => 
      req.url.includes('/api/stories/')
    );
    
    // Process each cached story
    for (const request of storyRequests) {
      const response = await cache.match(request);
      if (response) {
        const story = await response.json();
        // Try to sync with server
        // await syncStoryWithServer(story);
      }
    }
    
    console.log('[SW] Background sync completed');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// ================= PUSH NOTIFICATIONS =================
self.addEventListener('push', (event) => {
  const payload = event.data?.json() || {
    title: 'New Story Available',
    body: 'Check out the latest story!',
    icon: '/public/images/icon-192x192.png',
    badge: '/public/images/badge.png',
    data: { url: '/' }
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      data: payload.data,
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clients => {
      // Focus existing client if available
      for (const client of clients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});