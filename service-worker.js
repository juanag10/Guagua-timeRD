const CACHE = "guaguatime-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./img/logo.png",
  "./img/ruta-27-febrero-luperon.jpg",
  "./img/ruta-maximo-gomez-independencia.jpeg",
  "./img/ruta-duarte-kennedy.jpg",
  "./carpetajason/jason1.json",
  "./carpetajason/condiciones.json",
  "./carpetajason/lang.json",
  "./carpetajason/manifest.json"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      const clone = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return resp;
    }).catch(()=>r))
  );
});
