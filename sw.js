/* Офлайн-кэш Календарика */
var CACHE = 'kalendarik-v3';
var FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(FILES.map(function(f){
        return c.add(new Request(f, {cache:'reload'})).catch(function(){});
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

/* Сначала кэш — приложение открывается мгновенно и без сети.
   Свежую версию подтягиваем в фоне. */
self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function(hit){
      var net = fetch(e.request).then(function(res){
        if(res && res.status === 200 && res.type === 'basic'){
          caches.open(CACHE).then(function(c){ c.put(e.request, res.clone()); });
        }
        return res;
      }).catch(function(){ return hit; });
      return hit || net;
    })
  );
});
