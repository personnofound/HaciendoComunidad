// service-worker.js

const CACHE_NAME = 'haciendo-comunidad-shell-v25';

const SHELL_FILES = [
  './',
  './index.html',
  './css/styles.css',
  './js/config.js',
  './js/utils.js',
  './js/cache.js',
  './js/firebase-init.js',
  './js/fotos.js',
  './js/avisos-config.js',
  './js/aviso.js',
  './js/sismos.js',
  './js/notificaciones.js',
  './js/tutorial.js',
  './js/tema.js',
  './js/auth.js',
  './js/datos.js',
  './js/mapa.js',
  './js/desaparecidos.js',
  './js/comunidad.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  const isThirdParty =
    url.origin.includes('googleapis.com') ||
    url.origin.includes('firebaseio.com') ||
    url.origin.includes('firebaseapp.com') ||
    url.origin.includes('firebasestorage.app') ||
    url.origin.includes('gstatic.com') ||
    url.origin.includes('unpkg.com') ||
    url.origin.includes('openstreetmap.org') ||
    url.origin.includes('seismicportal.eu');

  if (isThirdParty || event.request.method !== 'GET') {
    return; // deja pasar a la red normalmente
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached || caches.match('./offline.html'));
      return cached || network;
    })
  );
});