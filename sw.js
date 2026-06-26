/* ============================================================================
 *  モクホ Service Worker
 *  戦略：Cache First（初回インストール時に全アセットをキャッシュ、
 *         以降はキャッシュから返し、ネットワーク不要でオフライン動作）
 *
 *  バージョンを上げるたびに CACHE_NAME を変更すると古いキャッシュが自動削除される。
 * ==========================================================================*/

const CACHE_NAME = "mokuho-v2";

// インストール時にキャッシュするファイル一覧
const ASSETS = [
  "./",
  "./index.html",
  "./src/notes/style.css",
  "./src/notes/app.js",
  "./icon.png",
  "./icon-180.png",
  "./icon-192.png",
  "./manifest.json",
];

// ── install：全アセットを事前キャッシュ ──────────────────────────────────
self.addEventListener("install", (ev) => {
  ev.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  // 新しい SW を即座に有効化（古い SW の待機をスキップ）
  self.skipWaiting();
});

// ── activate：古いキャッシュを削除 ───────────────────────────────────────
self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // 開いているすべてのページをこの SW の管理下に置く
  self.clients.claim();
});

// ── fetch：Cache First 戦略 ───────────────────────────────────────────────
self.addEventListener("fetch", (ev) => {
  // chrome-extension:// など http(s) 以外はスルー
  if (!ev.request.url.startsWith("http")) return;

  ev.respondWith(
    caches.match(ev.request).then((cached) => {
      if (cached) return cached;
      // キャッシュにない場合はネットワークから取得してキャッシュに追加
      return fetch(ev.request).then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(ev.request, clone));
        return response;
      });
    })
  );
});
