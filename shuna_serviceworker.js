// Shuna AI Companion - Service Worker
// Version 1.0

const CACHE_NAME = 'shuna-ai-v1.0';
const OFFLINE_URL = './index.html';

// Files to cache for offline functionality
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  // Add any additional assets here
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('🎭 Shuna Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching essential files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Shuna installed and ready for offline use!');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Shuna Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Shuna Service Worker activated!');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Cache the fetched response
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // If offline and requesting HTML, return cached offline page
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match(OFFLINE_URL);
            }
          });
      })
  );
});

// Handle background sync for conversation saving
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Background sync triggered');
    
    event.waitUntil(
      // Perform background sync tasks
      doBackgroundSync()
    );
  }
});

// Background sync function
async function doBackgroundSync() {
  try {
    // Get stored data that needs to be synced
    const clients = await self.clients.matchAll();
    
    if (clients.length > 0) {
      // Notify client that background sync is happening
      clients[0].postMessage({
        type: 'BACKGROUND_SYNC',
        message: 'Syncing data...'
      });
    }
    
    console.log('✅ Background sync completed');
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// Handle push notifications (for future features)
self.addEventListener('push', (event) => {
  console.log('📬 Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Shuna has something to tell you!',
    icon: './icon-192x192.png',
    badge: './icon-96x96.png',
    vibrate: [100, 50, 100],
    tag: 'shuna-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Open Shuna',
        icon: './icon-96x96.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: './icon-96x96.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Shuna AI Companion', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        // Check if app is already open
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if app is not open
        if (self.clients.openWindow) {
          return self.clients.openWindow('./');
        }
      })
    );
  }
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
        
      case 'GET_VERSION':
        event.ports[0].postMessage({ version: CACHE_NAME });
        break;
        
      case 'CACHE_CONVERSATION':
        // Cache conversation data for offline access
        cacheConversationData(event.data.data);
        break;
        
      default:
        console.log('Unknown message type:', event.data.type);
    }
  }
});

// Cache conversation data
async function cacheConversationData(data) {
  try {
    const cache = await caches.open(CACHE_NAME + '-data');
    const response = new Response(JSON.stringify(data));
    await cache.put('/conversations', response);
    console.log('💾 Conversation data cached');
  } catch (error) {
    console.error('❌ Failed to cache conversation data:', error);
  }
}

// Error handling
self.addEventListener('error', (event) => {
  console.error('❌ Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Service Worker unhandled rejection:', event.reason);
});

console.log('🎭 Shuna Service Worker loaded successfully!');