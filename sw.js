/* ============================================================================
 *  モクホ Service Worker（更新反映を強化した版）
 *
 *  方針：
 *   - install 時は {cache:"reload"} でHTTPキャッシュを迂回し、常に最新バイトを
 *     CACHE_NAME に取り込む（古い app.js を掴む事故を防ぐ）。
 *   - HTML（ナビゲーション）は「ネットワーク優先 → 失敗時キャッシュ」。
 *     これで index.html は常に最新を取りに行き、SW更新の検知も働きやすい。
 *   - app.js / style.css / 画像は Cache First（CACHE_NAME が変われば新版を取得済み）。
 *   - skipWaiting + clients.claim で新SWを即時有効化。
 *
 *  ※ CACHE_NAME は GitHub Actions が push 時に日時へ自動書き換えします。
 *    下の CACHE_NAME を定義している1行（この書式）は変更しないでください。
 *    ワークフローの sed がその1行だけを置換します。
 * ==========================================================================*/

const CACHE_NAME = "mokuho-v1";

// インストール時にキャッシュするファイル一覧
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon.png",
  "./icon-180.png",
  "./icon-192.png",
];

// ── install：全アセットを“最新バイトで”事前キャッシュ ──────────────────────
self.addEventListener("install", (ev) => {
  ev.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(ASSETS.map(async (url) => {
      try {
        // {cache:"reload"} でブラウザのHTTPキャッシュを使わず、必ず取得し直す
        const res = await fetch(new Request(url, { cache: "reload" }));
        if (res && res.ok) await cache.put(url, res);
      } catch (e) {
        // アイコン欠けなどの取得失敗は致命ではないので無視（installは継続）
      }
    }));
    await self.skipWaiting();
  })());
});

// ── activate：古いキャッシュを削除 ───────────────────────────────────────
self.addEventListener("activate", (ev) => {
  ev.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

// ── fetch ────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (ev) => {
  // http(s) 以外（chrome-extension:// 等）はスルー
  if (!ev.request.url.startsWith("http")) return;

  // HTML（ページ遷移）はネットワーク優先 → 失敗時のみキャッシュ（オフライン対応）
  if (ev.request.mode === "navigate") {
    ev.respondWith((async () => {
      try {
        const fresh = await fetch(ev.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(ev.request, fresh.clone());
        return fresh;
      } catch (e) {
        return (
          (await caches.match(ev.request)) ||
          (await caches.match("./index.html")) ||
          Response.error()
        );
      }
    })());
    return;
  }

  // それ以外（app.js / style.css / 画像など）は Cache First
  ev.respondWith(
    caches.match(ev.request).then((cached) => {
      if (cached) return cached;
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
