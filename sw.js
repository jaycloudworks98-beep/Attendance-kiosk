// TeamTrack Kiosk — service worker
// Purpose: makes the app installable (PWA) and caches the shell for faster loads.
// Note: face-recognition models and Supabase data still load from the network.

var CACHE = 'teamtrack-kiosk-v1';
var SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // cache what we can; ignore failures so install never breaks
      return Promise.allSettled(SHELL.map(function (u) { return c.add(u); }));
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // Never cache Supabase API or face-model downloads — always go to network.
  if (url.hostname.indexOf('supabase') !== -1 ||
      url.hostname.indexOf('vladmandic') !== -1 ||
      url.hostname.indexOf('jsdelivr') !== -1) {
    return; // let the browser handle it normally (network)
  }

  // For our own files: network-first, fall back to cache when offline.
  e.respondWith(
    fetch(req).then(function (res) {
      try {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      } catch (err) {}
      return res;
    }).catch(function () {
      return caches.match(req).then(function (m) { return m || caches.match('./index.html'); });
    })
  );
});
