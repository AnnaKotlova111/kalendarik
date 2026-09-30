/* Офлайн-кэш Календарика.

   Стратегия разная для страницы и для остального:
   — сама страница берётся из сети, если она есть (иначе приложение,
     установленное на телефон, месяцами показывает старую версию),
     и только при отсутствии сети — из кэша;
   — иконки и манифест берутся из кэша сразу, они меняются редко.
*/
var CACHE = 'kalendarik-v4';
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

/* Страница просит обновиться прямо сейчас */
self.addEventListener('message', function(e){
  if(e.data === 'skipWaiting') self.skipWaiting();
});

function isPage(req, url){
  return req.mode === 'navigate'
      || req.destination === 'document'
      || url.pathname.endsWith('/')
      || url.pathname.endsWith('index.html');
}

self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;

  var url;
  try{ url = new URL(e.request.url); }catch(err){ return; }
  if(url.origin !== location.origin) return;

  /* Страница: сначала сеть, кэш — на случай отсутствия интернета */
  if(isPage(e.request, url)){
    /* no-cache: не даём браузеру отдать страницу из своего HTTP-кэша,
       иначе обновление может не приезжать ещё минут десять */
    var fresh = new Request(e.request.url, {cache:'no-cache', credentials:'same-origin'});
    e.respondWith(
      fetch(fresh).then(function(res){
        if(res && res.status === 200){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){
            c.put('./index.html', copy.clone());
            c.put('./', copy);
          });
        }
        return res;
      }).catch(function(){
        return caches.match('./index.html').then(function(hit){
          return hit || caches.match('./');
        });
      })
    );
    return;
  }

  /* Остальное: из кэша, с тихим обновлением в фоне */
  e.respondWith(
    caches.match(e.request).then(function(hit){
      var net = fetch(e.request).then(function(res){
        if(res && res.status === 200 && res.type === 'basic'){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return res;
      }).catch(function(){ return hit; });
      return hit || net;
    })
  );
});
