// ============================================
// SERVICE WORKER - DOVE FINISCONO I MIEI SOLDI
// Versione cache: aggiorna questo numero ogni volta che modifichi l'HTML
// ============================================

const CACHE_VERSION = 'v1.7';
const CACHE_NAME = `dove-finiscono-soldi-${CACHE_VERSION}`;

// File da cachare per il funzionamento offline
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-mobile.svg',
  './icon-pc.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
];

// INSTALLAZIONE: cache i file essenziali
self.addEventListener('install', (event) => {
  console.log('[SW] Installazione - Versione:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache aperta:', CACHE_NAME);
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting()) // Forza l'attivazione immediata
  );
});

// ATTIVAZIONE: elimina le vecchie cache
self.addEventListener('activate', (event) => {
  console.log('[SW] Attivazione - Versione:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Se la cache non è quella corrente, eliminala
          if (cacheName !== CACHE_NAME && cacheName.startsWith('dove-finiscono-soldi-')) {
            console.log('[SW] Eliminata vecchia cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Prende il controllo immediato
  );
});

// FETCH: strategia "cache first, then network"
self.addEventListener('fetch', (event) => {
  // Ignora le richieste non-GET
  if (event.request.method !== 'GET') return;
  
  // Ignora le richieste a Firebase (devono essere sempre live)
  if (event.request.url.includes('firebaseio.com') || 
      event.request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Se c'è in cache, restituiscila e aggiornala in background
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseClone);
                });
              }
            })
            .catch(() => {}); // Ignora errori di rete
          
          return cachedResponse;
        }
        
        // Se non è in cache, prova la rete
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Fallback: se offline e non in cache, restituisci index.html
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
      })
  );
});
