/* Kaokoko Service Worker
   GitHubでファイルを更新したら、次に開いたときにすぐ新しい内容が反映されるようにしています。

   方式：「ネットワーク優先」
   - オンライン時：必ず最新のファイルを取得しに行く（＝更新がすぐ反映される）
   - オフライン時：直前にキャッシュした内容を表示する（＝オフラインでも開ける）

   CACHE_NAME はファイル整理用のラベルです。手動で番号を上げる必要はありませんが、
   大きな変更をしたときの目印として上げておくと管理しやすくなります。
*/
const CACHE_NAME = "kaokoko-cache-v3";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon.png",
  "./icon-180.png"
];

/* インストール時：アプリシェルを一括キャッシュ（オフライン用の初期データ） */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* 有効化時：古いバージョンのキャッシュを削除し、すぐにこのSWに切り替える */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* リクエスト時：ネットワーク優先。取れた最新版は次回オフライン用にキャッシュへ保存。
   オフラインで取得できない場合のみ、キャッシュ（最後にオンラインだった時点の内容）を使う。 */
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match("./index.html"))
      )
  );
});
