/* ============================================================================
 *  モクホ（MOKUHO）— 完全オフライン版（Reactなし / バニラJS）
 *
 *  content:// や file:// など外部CDNへアクセスできない環境（電波制限・
 *  プライベートネットワーク等）でも確実に動かすため、Reactや外部ライブラリ
 *  への依存を排し、状態管理と再描画はすべて自前の小さな仕組みで行う。
 *
 *  これまでの設計方針（ロジックとUIの分離・テーマトークン・拡張しやすい
 *  ステップ定義など）は構造として保ったまま、実装手段だけを変えている。
 * ==========================================================================*/

/* ---------- ロゴ（電球＝気づき／カップ＝一杯の時間、をモチーフにしたピクトグラム） ---------- */
const LOGO_SVG = `
<svg viewBox="0 0 400 150" class="logo-mark" role="img" aria-label="mokuho">
  <g fill="none" stroke="var(--logoMain)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
    <!-- m：2つの丸いアーチが滑らかにつながる形 -->
    <path d="M18 120 V90 C18 78 28 72 36 80 C40 84 40 88 40 92 V120 M40 92 C40 80 50 72 58 80 C62 84 62 88 62 92 V120"/>
    <!-- o -->
    <circle cx="100" cy="100" r="22"/>
    <!-- k -->
    <path d="M150 60 V120 M150 102 L178 78 M160 98 L182 120"/>
  </g>
  <!-- u（カップ）：太いU字の輪郭が文字の役割を果たし、内側をオリーブ色で塗る。右に太いリング状の取っ手。
       本体幅をo・mと釣り合う幅まで拡大（中心x=230を基準に形を保ったまま横方向にスケール）。 -->
  <g>
    <!-- 内側の塗り（オリーブ） -->
    <path d="M219 76 V100 C219 109 224 116 230 116 C236 116 241 109 241 100 V76 Z" fill="var(--logoCup)"/>
    <!-- 外枠：太いストロークのU字（h・oの本体と同じ太さに揃える） -->
    <path d="M207 72 V100 C207 113 216 123 230 123 C244 123 253 113 253 100 V72"
          fill="none" stroke="var(--logoMain)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- 取っ手：太いリング状 -->
    <path d="M253 84 C266 84 273 90 273 97 C273 104 266 110 253 110"
          fill="none" stroke="var(--logoMain)" stroke-width="7" stroke-linecap="round"/>
  </g>
  <g fill="none" stroke="var(--logoMain)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
    <!-- h -->
    <path d="M300 60 V120 M300 96 C300 84 330 84 330 96 V120"/>
    <!-- o -->
    <circle cx="368" cy="100" r="22"/>
  </g>
  <!-- 電球（気づき）: k の縦棒(x=150)の真上。茎がk本体と一直線につながる -->
  <g transform="translate(150,38)">
    <circle cx="0" cy="0" r="13" fill="none" stroke="var(--logoMain)" stroke-width="4.2"/>
    <path d="M-5 12 H5 M-4 16 H4" stroke="var(--logoMain)" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M-4 -5 L0 4 L4 -5" fill="none" stroke="var(--logoAccent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <g stroke="var(--logoMain)" stroke-width="2.6" stroke-linecap="round">
      <path d="M0 -16 V-22"/>
      <path d="M-11 -13 H-16"/>
      <path d="M11 -13 H16"/>
      <path d="M-8 -21 L-11 -24"/>
      <path d="M8 -21 L11 -24"/>
    </g>
  </g>
  <!-- カップから立つ蒸気：カップ中央（x=230）を基準に3本の湯気を対称配置 -->
  <path d="M222 60 C217 53 224 48 220 41 C225 48 216 51 222 60" fill="none" stroke="var(--logoAccent)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M230 58 C225 51 232 46 228 39 C233 46 224 49 230 58" fill="none" stroke="var(--logoAccent)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M238 60 C233 53 240 48 236 41 C241 48 232 51 238 60" fill="none" stroke="var(--logoAccent)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;


const ICONS = {
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  coffee: '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M6 2v2"/><path d="M10 2v2"/><path d="M14 2v2"/>',
  lightbulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.6.6 1.27 1.34 1.41 2.5"/>',
  check2: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  footprints: '<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/>',
  arrowLeft: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  sparkles: '<path d="M9.94 14.06 9 18l-1.94-3.94L3 13l4.06-1.94L9 7l1.94 4.06L15 13z"/><path d="M18 5l1 2 2 1-2 1-1 2-1-2-2-1z"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  pause: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
  skipForward: '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>',
  rotateCcw: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  timer: '<line x1="10" y1="2" x2="14" y2="2"/><line x1="12" y1="14" x2="15" y2="11"/><circle cx="12" cy="14" r="8"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/>',
  pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  trash2: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  barChart3: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  calendarDays: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/>',
  gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  pieChart: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  listChecks: '<path d="m3 7 2 2 4-4"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 18h8"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronUp: '<path d="m18 15-6-6-6 6"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  bookOpen: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  alertTriangle: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
};
function icon(name, cls) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" class="${cls || 'icon'}">${ICONS[name]}</svg>`;
}

/* ---------- ステップ定義（拡張ポイント：ここを直せば段階を増減できる） ---------- */
const STEPS = [
  { key: "notice", label: "気づき", hint: "心が動いた事実をそのまま。", placeholder: "例：会議で発言できなかった", icon: "lightbulb" },
  { key: "insight", label: "なるほど", hint: "そこから何がわかった？", placeholder: "例：準備不足で自信がなかった", icon: "check2" },
  { key: "action", label: "一歩", hint: "次にできる小さな行動は？", placeholder: "例：次回は要点を3つメモして臨む", icon: "footprints" },
];
// 「気づき」はタイマー対象外（いつでも書けるメモ）。思考モードは「なるほど」から始まり、
// なるほど(2分) + 一歩(3分) の合計5分とする。THINK_STEPS は STEPS のうちタイマー対象の2つ。
const THINK_STEPS = STEPS.slice(1); // [insight, action]
const THINK_DURATIONS = [2 * 60, 3 * 60];

/* ---------- カテゴリ（タグ）定義：localStorageで動的に追加・編集・削除できる ---------- */
const DEFAULT_CATEGORIES = [
  { key: "work", label: "仕事" },
  { key: "private", label: "プライベート" },
];
const CATEGORY_KEY = "mokuho.categories.v1";
const CategoryStore = {
  load() {
    try {
      const raw = localStorage.getItem(CATEGORY_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return (Array.isArray(parsed) && parsed.length > 0) ? parsed : DEFAULT_CATEGORIES.slice();
    } catch (e) { return DEFAULT_CATEGORIES.slice(); }
  },
  save(categories) {
    try { localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories)); }
    catch (e) { /* noop */ }
  },
};
// CATEGORIES は実行時に内容が入れ替わる可変配列（参照はそのまま、要素だけ差し替える）。
let CATEGORIES = CategoryStore.load();
function categoryLabel(key) {
  const c = CATEGORIES.find((c) => c.key === key);
  return c ? c.label : "";
}
function categoryKeyFromLabel(label) {
  const trimmed = label.trim();
  // 「仕事」「work」のような重複や紛れを避けるため、ラベルから安全なkeyを生成する。
  const base = trimmed.replace(/[^a-zA-Z0-9一-龠ぁ-んァ-ヶー]/g, "");
  return base || ("cat" + Date.now());
}

/* ---------- 日付ユーティリティ ---------- */
const DAY_MS = 86400000;
function toDateKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatDateKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}
function keyToNoon(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
}
function shiftDateKey(key, delta) { return toDateKey(keyToNoon(key) + delta * DAY_MS); }
function todayKey() { return toDateKey(Date.now()); }
function compareDateKey(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
function weekdayLabel(key) {
  const WD = ["日", "月", "火", "水", "木", "金", "土"];
  return WD[new Date(keyToNoon(key)).getDay()];
}
function startOfDay(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d; }
function fmtSec(sec) { const m = Math.floor(sec / 60); const s = sec % 60; return `${m}:${String(s).padStart(2, "0")}`; }
function escapeHtml(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ============================================================================
 *  永続化レイヤー（localStorage）
 *  ドメイン操作（追加/更新/削除）だけを公開し、保存方式は内部に閉じる。
 * ==========================================================================*/
const STORAGE_KEY = "mokuho.entries.v1";
const Store = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const entries = JSON.parse(raw);
      // todos プロパティが欠けている既存エントリを正規化する
      return entries.map((e) => ({
        ...e,
        todos: Array.isArray(e.todos) ? e.todos : [],
      }));
    } catch (e) {
      console.warn("読み込み失敗", e);
      return [];
    }
  },
  save(entries) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }
    catch (e) { console.warn("保存失敗", e); }
  },
};

/* ============================================================================
 *  音設定の永続化（オン／オフ）
 * ==========================================================================*/
const SOUND_KEY = "mokuho.sound.v1";
const SoundStore = {
  load() {
    try {
      const v = localStorage.getItem(SOUND_KEY);
      return v === null ? true : v === "1";
    } catch (e) { return true; }
  },
  save(enabled) {
    try { localStorage.setItem(SOUND_KEY, enabled ? "1" : "0"); }
    catch (e) { /* noop */ }
  },
};

/* ============================================================================
 *  テーマ設定の永続化（ライト／ダーク）
 * ==========================================================================*/
const THEME_KEY = "mokuho.theme.v1";
const ThemeStore = {
  load() {
    try { return localStorage.getItem(THEME_KEY) || "light"; }
    catch (e) { return "light"; }
  },
  save(theme) {
    try { localStorage.setItem(THEME_KEY, theme); }
    catch (e) { /* noop */ }
  },
};

/* ============================================================================
 *  チュートリアル既読フラグの永続化（初回起動時のスライド表示を1回だけにする）
 * ==========================================================================*/
const TUTORIAL_SEEN_KEY = "mokuho.tutorialSeen.v1";
const TutorialSeenStore = {
  load() {
    try { return localStorage.getItem(TUTORIAL_SEEN_KEY) === "1"; }
    catch (e) { return false; }
  },
  save() {
    try { localStorage.setItem(TUTORIAL_SEEN_KEY, "1"); }
    catch (e) { /* noop */ }
  },
};

/* ============================================================================
 *  下書き永続化レイヤー（localStorage）
 *  記録として確定する前の「作業中の状態」を保持する別レイヤー。
 *  リロード・アプリ切り替え・スマホの戻るボタンのいずれでも、
 *  書きかけのメモが消えないようにするためのもの。
 *  確定済みの記録(Store)とは保存先キーを分け、責務を混ぜない。
 * ==========================================================================*/
const DRAFT_KEY = "mokuho.draft.v1";
const DraftStore = {
  load() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn("下書きの読み込み失敗", e);
      return null;
    }
  },
  save(draft) {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); }
    catch (e) { console.warn("下書きの保存失敗", e); }
  },
  clear() {
    try { localStorage.removeItem(DRAFT_KEY); }
    catch (e) { /* noop */ }
  },
};

/* ============================================================================
 *  アプリ状態（単一の状態オブジェクト＋再描画関数）
 *  React版の useState 群に相当。state を直接書き換えたら render() を呼ぶ。
 * ==========================================================================*/
const state = {
  tab: "notice",                // "notice"（気づき） | "mokuho"（モクホ）
  view: "home",                // home | form | timer | detail | reflection | dayDetail | settings | categoryManage
  entries: Store.load(),
  theme: ThemeStore.load(),     // "light" | "dark"
  soundEnabled: SoundStore.load(), // true | false
  settingsPhase: "menu",        // menu | confirmReset（設定画面内の表示フェーズ）
  mokuhoFilter: "all",          // 「モクホ」タブの絞り込み（all | favorite | カテゴリkey）
  formDraft: { notice: "", insight: "", action: "" },
  formIndex: 0,
  continueEntryId: null,        // 「気づき」カードから続きを書いている場合の対象entry id
  selectedId: null,
  detailOrigin: "home",
  detailPhase: "view",         // view | edit | confirmDelete | deepDive（深掘りモード）
  detailDraft: null,
  detailCategoryQuickEdit: false, // view画面でカテゴリ変更ピッカーをインライン表示中か
  search: { open: false, query: "", theme: null }, // 全体検索（気づき／モクホ共通）のオーバーレイ状態
  selectedDay: null,
  noticeDeleteTargetId: null,   // 未達成「気づき」カードの削除確認モーダル対象id（nullなら非表示）
  categoryDraft: { mode: "idle", key: null, label: "" }, // カテゴリ管理画面の追加/編集フォーム状態
  justCompletedId: null,        // 直前に「一歩」まで入力して完了した記録のid（完了演出トリガー用）
  // 初回起動時オーバーレイ表示のスライド式チュートリアル。
  // open: 表示中か／slide: 現在のスライド番号(0始まり)。
  // どの view の上にも被せて表示するため、view切り替えとは独立して持つ。
  tutorialModal: { open: false, slide: 0 },
  // 思考モード（タイマー）は「なるほど」「一歩」の2ステップのみ対象。
  // stepIndex は THINK_STEPS / THINK_DURATIONS のインデックス（0=なるほど, 1=一歩）。
  // remaining: 直近の表示用残り秒数（毎秒更新）。
  // startedAt/baseRemaining: バックグラウンドに行っても正しく経過時間を
  // 復元できるよう、「区間の開始時刻」と「開始時点の残り秒数」を別に持つ。
  timer: {
    status: "idle", stepIndex: 0, remaining: THINK_DURATIONS[0],
    notes: { insight: "", action: "" },
    startedAt: null, baseRemaining: THINK_DURATIONS[0],
  },
  timerHandle: null,
};
// popstate（戻る/進む）による復元中は、履歴を積み直さないようにするフラグ。
let isRestoringFromHistory = false;

function persist() { Store.save(state.entries); }

/* ---------- 完了判定ヘルパー：一歩まで埋まっているか ---------- */
function isEntryComplete(entry) {
  return STEPS.every((s) => (entry[s.key] || "").trim().length > 0);
}

/* ============================================================================
 *  各ビューのレンダリング関数
 *  「状態 → HTML文字列」の純粋変換に近い形に保ち、イベントは委譲で後付けする。
 * ==========================================================================*/

function renderHeader() {
  return `
    <div class="header">
      <button class="settings-btn" data-action="goto" data-view="settings" aria-label="設定">${icon("settings", "icon")}</button>
      <div class="logo-wrap">${LOGO_SVG}</div>
      <p class="sub">目標の為の一歩</p>
    </div>
    <div class="divider"></div>
  `;
}

function renderTabs() {
  const noticeCount = state.entries.filter((e) => !isEntryComplete(e)).length;
  return `
    <div class="tabs">
      <button data-action="set-tab" data-tab="notice" class="tab-notice ${state.tab === "notice" ? "active" : ""}">
        ${icon("lightbulb", "icon-sm")} 気づき
        ${noticeCount > 0 ? `<span class="tab-badge">${noticeCount}</span>` : ""}
      </button>
      <button data-action="set-tab" data-tab="mokuho" class="tab-mokuho ${state.tab === "mokuho" ? "active" : ""}">
        ${icon("footprints", "icon-sm")} モクホ
      </button>
    </div>
  `;
}

function renderSectionDivider({ iconName, title, collapsible, open, toggleAction, searchTheme }) {
  const searchBtn = searchTheme ? `
    <button data-action="toggle-search" data-search-theme="${searchTheme}" class="icon-btn" style="margin-left:auto;flex-shrink:0;" aria-label="検索">
      ${icon("search", "icon-sm")}
    </button>
  ` : "";
  return `
    <button class="section-divider" ${collapsible ? `data-action="${toggleAction}"` : ""}>
      <div class="row">
        ${icon(iconName)}
        <span class="title">${title}</span>
        ${collapsible ? icon(open ? "chevronUp" : "chevronDown", "icon-sm") : ""}
        ${searchBtn}
      </div>
      <div class="hr"></div>
    </button>
  `;
}

function renderProgressDots(currentIndex, steps) {
  steps = steps || STEPS;
  return `
    <div class="progress-dots">
      ${steps.map((s, i) => {
        const done = i < currentIndex, active = i === currentIndex;
        const dot = `<div class="dot ${done || active ? "active" : ""}">${icon(s.icon, "icon-sm")}</div>`;
        const line = i < steps.length - 1 ? `<div class="dot-line ${done ? "done" : ""}"></div>` : "";
        return dot + line;
      }).join("")}
    </div>
  `;
}

/* ---- 完成度演出（ClarityReveal）：filled/total から見た目だけを決める。気づきテーマ（ピンク）で表現。 ---- */
function renderClarityNoise(filled, total) {
  const ratio = total > 0 ? Math.min(filled / total, 1) : 0;
  const complete = filled >= total && total > 0;
  const noiseOpacity = 0.18 * (1 - ratio);
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0.85 0 0 0 0 0.48 0 0 0 0 0.6 0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`
  );
  return `
    <div class="noise" aria-hidden="true">
      <div style="position:absolute;inset:0;opacity:${noiseOpacity};transition:opacity .7s ease-out;
        background-image:url(&quot;data:image/svg+xml;utf8,${svg}&quot;);background-size:180px 180px;"></div>
      <div style="position:absolute;inset:0;opacity:${complete ? 1 : 0};transition:opacity .7s ease-out;
        background:radial-gradient(circle at 50% 42%, rgba(217,122,153,0.16), rgba(217,122,153,0) 60%);"></div>
    </div>
  `;
}

function renderHome() {
  if (state.tab === "notice") return renderNoticeHome();
  return renderMokuhoHome();
}

/* 「気づき」タブ：一歩まで到達していない（未達成）記録の一覧。
   カードをタップすると、そのままステップ入力（なるほど→一歩）を続けられる。
   ホーム画面自体に「気づき（ステップ1）」の入力フォームを直接埋め込み、
   ボタンを押さずすぐに書き始められるようにしている。 */
function renderNoticeHome() {
  const visible = state.entries.filter((e) => !isEntryComplete(e));

  const noticeStep = STEPS[0]; // key: "notice"
  const noticeValue = state.formDraft.notice;
  const canProceed = noticeValue.trim().length > 0;

  const homeNoticeForm = `
    <div class="fade-in step-form home-notice-form" style="margin-top:0;">
      <div class="content" style="padding:12px;">
        <div class="step-head">
          ${icon(noticeStep.icon, "icon")}
          <div><h2>${noticeStep.label}</h2><p>${noticeStep.hint}</p></div>
        </div>
        <textarea class="field" rows="4" placeholder="${noticeStep.placeholder}" data-action="home-notice-input">${escapeHtml(noticeValue)}</textarea>
        <div class="btn-row" style="margin-top:16px;">
          <button class="btn btn-outline-mokuho" data-action="home-notice-later">${icon("rotateCcw", "icon-sm")} あとで</button>
          <button class="btn btn-notice" data-action="home-notice-next" ${canProceed ? "" : "disabled"}>
            つぎへ ${icon("arrowRight", "icon-sm")}
          </button>
        </div>
      </div>
    </div>
  `;

  const deleteModal = state.noticeDeleteTargetId ? `
    <div class="modal-overlay" data-action="modal-overlay-cancel" data-cancel-action="notice-delete-cancel">
      <div class="modal-card">
        <p>${icon("alertTriangle", "icon-sm")} この気づきを削除しますか？</p>
        <p>本当に削除しますか？削除すると元に戻せません。</p>
        <div class="btn-row" style="margin-top:16px;">
          <button class="btn btn-outline-mokuho" data-action="notice-delete-cancel">やめる</button>
          <button class="btn" style="background:#d9534f;color:#fff;border-color:#d9534f;" data-action="notice-delete-confirm">${icon("trash2", "icon-sm")} 削除する</button>
        </div>
      </div>
    </div>
  ` : "";

  return `
    <div class="fade-in" style="margin-top:12px;display:flex;flex-direction:column;flex:1;">
      ${homeNoticeForm}
      <div style="margin-top:24px;">
        ${renderSectionDivider({ iconName: "listChecks", title: "未達成の気づき", searchTheme: "notice" })}
        ${renderSearchBar("notice")}
        <div style="padding:16px 0;">${renderEntryList(visible, "continue-notice", "notice")}</div>
      </div>
      ${deleteModal}
    </div>
  `;
}

/* 「モクホ」タブ：一歩まで完了した記録の格納庫。タップでいつでも深掘り（編集）できる。
   タブ直下にカテゴリ（タグ）とお気に入りの絞り込みボタンを置き、選んだ条件の記録だけを表示する。
   ふりかえり分析への導線は設定画面に一本化したため、ここには置かない。 */
function renderMokuhoHome() {
  const all = state.entries.filter((e) => isEntryComplete(e));
  const filter = state.mokuhoFilter || "all";
  const visible = filter === "all" ? all
    : filter === "favorite" ? all.filter((e) => e.favorite)
    : all.filter((e) => e.category === filter);

  const filterDefs = [{ key: "all", label: "すべて" }, { key: "favorite", label: `${icon("star", "icon-sm")} お気に入り` }, ...CATEGORIES.map((c) => ({ key: c.key, label: c.label }))];
  const tagButtons = filterDefs.map((c) => `
    <button class="${c.key === filter ? "active" : ""}" data-action="set-mokuho-filter" data-filter="${c.key}" style="${c.key === "favorite" ? "display:inline-flex;align-items:center;gap:4px;" : ""}">${c.label}</button>
  `).join("");

  return `
    <div class="fade-in" style="margin-top:20px;display:flex;flex-direction:column;flex:1;">
      <div class="tag-filter">${tagButtons}</div>
      <div style="margin-top:20px;">
        ${renderSectionDivider({ iconName: "listChecks", title: "完了したモクホ", searchTheme: "mokuho" })}
        ${renderSearchBar("mokuho")}
        <div style="padding:16px 0;">${renderEntryList(visible, "open-detail-home", "mokuho")}</div>
      </div>
    </div>
  `;
}

/* 検索バー：気づき／モクホの各ホーム画面、セクション見出し直下にインラインで表示する。
   state.search.open が true のテーマだけ描画し、入力ごとに renderEntryList 側の
   フィルタリングが効くようにする（入力イベントは委譲側で即 render() を呼ぶ）。 */
function renderSearchBar(theme) {
  if (!state.search.open || state.search.theme !== theme) return "";
  const themeClass = theme === "notice" ? "notice" : "mokuho";
  return `
    <div class="fade-in" style="margin-top:10px;display:flex;gap:8px;align-items:center;">
      <input type="text" class="field" data-action="search-input" data-search-theme="${theme}"
        placeholder="${theme === "notice" ? "気づき・なるほど・一歩から検索" : "気づき・なるほど・一歩から検索"}"
        value="${escapeHtml(state.search.query)}"
        style="margin-top:0;padding:10px 14px;font-size:14px;border-color:var(--${themeClass}Border);background:var(--${themeClass}Bg);color:var(--${themeClass}Text);" />
      <button class="icon-btn" data-action="toggle-search" data-search-theme="${theme}" aria-label="検索を閉じる" style="flex-shrink:0;">
        ${icon("x", "icon-sm")}
      </button>
    </div>
  `;
}

function renderEntryList(entries, selectAction, theme) {
  // 全体検索：該当テーマで検索バーが開いていれば、気づき／なるほど／一歩の
  // テキストを対象に部分一致でフィルタリングする（大文字小文字は区別しない）。
  if (state.search.open && state.search.theme === theme && state.search.query.trim()) {
    const q = state.search.query.trim().toLowerCase();
    entries = entries.filter((e) =>
      STEPS.some((s) => (e[s.key] || "").toLowerCase().includes(q))
    );
  }

  const isSearching = state.search.open && state.search.theme === theme && state.search.query.trim();

  if (entries.length === 0) {
    const emptyText = isSearching ? "検索結果が見つかりませんでした。"
      : theme === "notice" ? "未達成の気づきはありません。"
      : theme === "mokuho" ? "まだ完了したモクホがありません。"
      : "この日の記録はありません。";
    const emptySub = isSearching ? "別のキーワードで試してみましょう。" : "最初の気づきを残してみましょう。";
    return `
      <div class="empty">
        ${icon("inbox", "icon")}
        <p>${emptyText}<br/>${emptySub}</p>
      </div>
    `;
  }
  // 「気づき」（未達成）「モクホ」（完了済み）一覧はどちらも横長カードで統一する。
  // 「気づき」には思考モードボタンを併設し、「モクホ」にはカテゴリバッジを表示する。
  if (theme === "notice" || theme === "mokuho") {
    return `
      <div class="list-wide">
        ${entries.map((e) => renderGoalCardWide(e, selectAction, theme)).join("")}
      </div>
    `;
  }
  return `
    <div class="grid2">
      ${entries.map((e) => {
        const entryTheme = theme === "auto" ? (isEntryComplete(e) ? "mokuho" : "notice") : theme;
        const entryAction = theme === "auto" ? (entryTheme === "notice" ? "continue-notice" : "open-detail-day") : selectAction;
        return renderGoalCard(e, entryAction, entryTheme);
      }).join("")}
    </div>
  `;
}

/* 横長カード共通レイアウト：日付＋本文を横に並べ、一行で内容が見渡せるようにする
   （スマホでのタップ領域も広く取る）。カテゴリ（タグ）が設定されていれば右上に表示する。
   カード本体はクリック可能な要素として data-action を持つが、内部にお気に入り／削除の
   ボタンをネストするため <button> ではなく role="button" の <div> として実装する。
   「気づき」テーマの場合は右側に思考モード即時開始ボタンと削除ボタンを並べ、
   「モクホ」テーマの場合は左上にお気に入りスターを表示する。 */
function renderGoalCardWide(entry, selectAction, theme) {
  const title = entry.notice.trim() || "（気づき未入力）";
  const d = new Date(entry.createdAt);
  const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;
  const themeClass = theme === "mokuho" ? "card-mokuho" : "card-notice";
  const tagBadge = entry.category ? `<span class="tag-badge">${escapeHtml(categoryLabel(entry.category))}</span>` : "";
  const favBtn = theme === "mokuho" ? `
    <button class="fav-btn ${entry.favorite ? "active" : ""}" data-action="toggle-favorite" data-id="${entry.id}" aria-label="お気に入り">
      ${icon("star", "icon-sm")}
    </button>
  ` : "";

  const cardBody = `
    <div class="card-wide ${themeClass}" data-action="${selectAction}" data-id="${entry.id}" role="button" tabindex="0">
      ${tagBadge}
      ${favBtn}
      <div class="date">${dateLabel}</div>
      <div class="title">${escapeHtml(title)}</div>
      <div class="bottom">
        ${(() => {
          const todos = entry.todos || [];
          if (theme === "mokuho" && todos.length > 0) {
            const done = todos.filter((t) => t.done).length;
            const all  = todos.length;
            const pct  = Math.round(done / all * 100);
            return `<span style="font-size:10px;font-weight:800;letter-spacing:0.03em;
              padding:2px 7px;border-radius:999px;
              background:${done === all ? "var(--mokuhoMain)" : "var(--mokuhoBg)"};
              color:${done === all ? "#fff" : "var(--mokuhoText)"};
              border:1.5px solid ${done === all ? "var(--mokuhoMain)" : "var(--mokuhoBorder)"};
              white-space:nowrap;">${done}/${all}</span>`;
          }
          return "";
        })()}
        ${entry.action.trim() ? icon("footprints", "icon-sm") : ""}
        ${icon(theme === "mokuho" ? "check2" : "lightbulb", "icon-sm")}
      </div>
    </div>
  `;

  if (theme !== "notice") {
    return `<div class="wide-row">${cardBody}</div>`;
  }

  return `
    <div class="wide-row">
      ${cardBody}
      <button class="think-btn" data-action="start-thinking-from-card" data-id="${entry.id}">
        ${icon("timer", "icon-sm")}
        <span class="lbl">思考<br/>モード</span>
      </button>
      <button class="delete-btn" data-action="notice-ask-delete" data-id="${entry.id}" aria-label="削除">
        ${icon("trash2", "icon-sm")}
      </button>
    </div>
  `;
}

function renderGoalCard(entry, selectAction, theme) {
  const title = entry.notice.trim() || "（気づき未入力）";
  const d = new Date(entry.createdAt);
  const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;
  const themeClass = theme === "notice" ? "card-notice" : "card-mokuho";
  return `
    <button class="card ${themeClass}" data-action="${selectAction}" data-id="${entry.id}">
      <div>
        <div class="date">${dateLabel}</div>
        <div class="title">${escapeHtml(title)}</div>
      </div>
      <div class="bottom">
        ${entry.action.trim() ? icon("footprints", "icon-sm") : "<span></span>"}
        ${icon(theme === "notice" ? "lightbulb" : "check2", "icon-sm")}
      </div>
    </button>
  `;
}

/* これまでに入力済みのステップ内容を、確認用に視覚的に残して表示する。
   draft: { notice, insight, action } のような値の入った draft オブジェクト。
   uptoIndex: STEPS のうち何番目より前を表示するか（exclusive）。
   コピーボタンは data 属性に値を埋め込まず、同じカード内の .text 要素から
   実際の表示テキストを読み取る（引用符や改行を含む文字列でも安全に扱える）。 */
function renderPrevStepsPreview(draft, uptoIndex) {
  const prev = STEPS.slice(0, uptoIndex).filter((s) => (draft[s.key] || "").trim().length > 0);
  if (prev.length === 0) return "";
  return `
    <div class="prev-steps">
      ${prev.map((s) => `
        <div class="prev-step-card">
          <div class="row" style="justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:8px;">${icon(s.icon, "icon-sm")}<h4>${s.label}</h4></div>
            <button class="copy-btn" data-action="copy-card-text">${icon("copy", "icon-sm")}</button>
          </div>
          <div class="text">${escapeHtml(draft[s.key])}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderForm() {
  const step = STEPS[state.formIndex];
  const value = state.formDraft[step.key];
  const isFirst = state.formIndex === 0;
  const isLast = state.formIndex === STEPS.length - 1;
  const canProceed = value.trim().length > 0;
  const filledCount = STEPS.filter((s) => state.formDraft[s.key].trim().length > 0).length;
  const complete = filledCount === STEPS.length;

  return `
    <div class="fade-in step-form" style="margin-top:8px;">
      ${renderClarityNoise(filledCount, STEPS.length)}
      <div class="content">
        ${renderProgressDots(state.formIndex)}
        <div class="badge-wrap ${complete ? "show" : ""}">
          <div class="badge">${icon("sparkles", "icon-sm")} 3つの問いが揃いました</div>
        </div>
        ${renderPrevStepsPreview(state.formDraft, state.formIndex)}
        <div class="step-head">
          ${icon(step.icon, "icon")}
          <div><h2>${step.label}</h2><p>${step.hint}</p></div>
        </div>
        <textarea class="field" rows="5" placeholder="${step.placeholder}" data-action="form-input" autofocus>${escapeHtml(value)}</textarea>
        <div class="field-count">${filledCount} / ${STEPS.length} ステップ入力済み</div>
        <div class="btn-row" style="margin-top:24px;">
          <button class="btn btn-outline-notice" data-action="form-back">${icon("arrowLeft", "icon-sm")} ${isFirst ? "やめる" : "もどる"}</button>
          <button class="btn ${isLast ? "btn-mokuho" : "btn-notice"}" data-action="form-next" ${canProceed ? "" : "disabled"}>
            ${isLast ? icon("check", "icon-sm") + " モクホとして記録する" : "つぎへ " + icon("arrowRight", "icon-sm")}
          </button>
        </div>
        ${filledCount > 0 && !complete ? `
          <button data-action="form-save-partial" style="margin-top:16px;width:100%;background:none;border:none;color:var(--fgMuted);font-size:13px;text-decoration:underline;">
            ここまでで保存する（気づきタブに残します）
          </button>
        ` : ""}
      </div>
    </div>
  `;
}

function renderTimerRing(progress, label, caption) {
  const size = 220, sw = 10, r = (size - sw) / 2, c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(Math.max(progress, 0), 1));
  const stroke = "#d97a99";
  const track = "rgba(217,122,153,0.18)";
  return `
    <div class="timer-ring-wrap">
      <svg width="${size}" height="${size}" style="transform:rotate(-90deg);">
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${track}" stroke-width="${sw}"/>
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${sw}"
          stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}"
          style="transition: stroke-dashoffset .9s linear;"/>
      </svg>
      <div class="center">
        <div class="caption">${caption}</div>
        <div class="label">${label}</div>
      </div>
    </div>
  `;
}

/* 思考モード中にメモを取るための小型リング。中央には残り秒数のみを表示する。 */
function renderTimerRingMini(progress, label) {
  const size = 56, sw = 5, r = (size - sw) / 2, c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(Math.max(progress, 0), 1));
  const stroke = "#d97a99";
  const track = "rgba(217,122,153,0.18)";
  return `
    <div class="timer-ring-mini">
      <svg width="${size}" height="${size}" style="transform:rotate(-90deg);">
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${track}" stroke-width="${sw}"/>
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${sw}"
          stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}"
          style="transition: stroke-dashoffset .9s linear;"/>
      </svg>
      <div class="center"><div class="label">${label}</div></div>
    </div>
  `;
}

function renderTimer() {
  const t = state.timer;
  const step = THINK_STEPS[t.stepIndex];
  const finished = t.status === "finished";
  const stepTotal = THINK_DURATIONS[t.stepIndex];
  const progress = stepTotal > 0 ? 1 - t.remaining / stepTotal : 0;

  if (finished) {
    return `
      <div class="fade-in" style="display:flex;flex-direction:column;align-items:center;padding:24px 0;">
        ${renderProgressDots(THINK_STEPS.length, THINK_STEPS)}
        <div style="width:80px;height:80px;border-radius:999px;border:2px solid var(--noticeMain);display:flex;align-items:center;justify-content:center;margin-top:8px;color:var(--noticeMain);">
          ${icon("check", "icon")}
        </div>
        <h2 style="font-size:24px;font-weight:800;margin-top:20px;">思考おつかれさま</h2>
        <p style="text-align:center;font-size:13px;color:var(--fgMuted);margin-top:8px;">5分間の思考が完了しました。<br/>メモした内容をそのまま記録に残しましょう。</p>
        <div class="btn-stack" style="width:100%;margin-top:28px;">
          <button class="btn btn-notice" data-action="timer-close-to-form">メモを記録する</button>
          <button class="btn btn-outline-notice" data-action="timer-reset">${icon("rotateCcw", "icon-sm")} もう一度</button>
        </div>
      </div>
    `;
  }

  // 開始前（idle）：これから始める導入として、大きいリングのまま落ち着いた見せ方にする。
  // 「気づき」の内容はここでも確認用メモとして表示し、思考モードに入る前から
  // 何について考えるのかを見失わないようにする。
  if (t.status === "idle") {
    return `
      <div class="fade-in" style="display:flex;flex-direction:column;align-items:center;">
        ${renderPrevStepsPreview({ notice: state.formDraft.notice }, 1)}
        ${renderProgressDots(0, THINK_STEPS)}
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          ${icon(step.icon, "icon")}
          <div style="text-align:left;"><h2 style="font-size:20px;font-weight:800;margin:0;">${step.label}</h2><p style="font-size:13px;color:var(--fgMuted);margin:2px 0 0;">${step.hint}</p></div>
        </div>
        ${renderTimerRing(0, fmtSec(THINK_DURATIONS[0]), `ステップ 1 / ${THINK_STEPS.length}`)}
        <div class="btn-row" style="width:100%;margin-top:32px;">
          <button class="btn btn-notice" data-action="timer-start">${icon("play", "icon-sm")} はじめる</button>
        </div>
        <button data-action="goto" data-view="form" style="margin-top:24px;background:none;border:none;color:var(--fgMuted);font-size:13px;text-decoration:underline;">思考モードを閉じる</button>
      </div>
    `;
  }

  // 実行中／一時停止中：タイマーを小さくして上部に固定し、その場でメモを取れるようにする。
  const hasAnyNote = THINK_STEPS.some((s) => (t.notes[s.key] || "").trim().length > 0);
  let controls = "";
  if (t.status === "running") {
    controls = `
      <button data-action="timer-pause" aria-label="一時停止">${icon("pause", "icon-sm")}</button>
    `;
  } else if (t.status === "paused") {
    controls = `
      <button data-action="timer-resume" aria-label="再開">${icon("play", "icon-sm")}</button>
      <button data-action="timer-reset" aria-label="リセット">${icon("rotateCcw", "icon-sm")}</button>
    `;
  }
  const isLastThinkStep = t.stepIndex === THINK_STEPS.length - 1;

  return `
    <div class="fade-in">
      <div class="timer-compact-bar">
        ${renderTimerRingMini(progress, fmtSec(t.remaining))}
        <div class="timer-compact-info">
          <div class="step-name">${icon(step.icon, "icon-sm")} ${step.label}</div>
          <div class="step-hint">${step.hint}</div>
        </div>
        <div class="timer-compact-controls">${controls}</div>
      </div>
      <div class="hr"></div>

      <div class="timer-note-area">
        ${renderPrevStepsPreview({ notice: state.formDraft.notice, insight: t.notes.insight, action: t.notes.action }, t.stepIndex + 1)}
        ${renderProgressDots(t.stepIndex, THINK_STEPS)}
        <textarea class="field" rows="7" placeholder="${step.placeholder}" data-action="timer-note-input">${escapeHtml(t.notes[step.key])}</textarea>
        <div class="timer-note-hint">考えながら、思いついたことをそのままメモしましょう。</div>
      </div>

      <div class="btn-row" style="margin-top:20px;">
        <button class="btn btn-outline-notice" data-action="timer-step-back">${icon("arrowLeft", "icon-sm")} もどる</button>
        <button class="btn btn-notice" data-action="timer-skip">${isLastThinkStep ? "終える" : "つぎへ"} ${icon("arrowRight", "icon-sm")}</button>
      </div>

      <div class="btn-stack" style="margin-top:14px;">
        <button class="btn btn-outline-notice" data-action="timer-close-to-form">${icon("arrowRight", "icon-sm")} フォームへ移って続きを書く</button>
        ${hasAnyNote ? `
          <button data-action="timer-save-partial" style="background:none;border:none;color:var(--fgMuted);font-size:13px;text-decoration:underline;padding:4px;">
            ここまでで保存して終わる（気づきタブに残します）
          </button>
        ` : ""}
      </div>
    </div>
  `;
}

function renderDetail() {
  const entry = state.entries.find((e) => e.id === state.selectedId);
  if (!entry) return "";
  const phase = state.detailPhase;
  const d = new Date(entry.createdAt);
  const dateLabel = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  const draft = state.detailDraft || entry;

  const categoryHtml = phase === "edit" ? `
    <div class="detail-step" style="margin-top:8px;">
      <div class="row">${icon("listChecks", "icon-sm")}<h3>カテゴリ</h3></div>
      <div class="category-picker">
        <button class="${!draft.category ? "active" : ""}" data-action="detail-set-category" data-category="">未設定</button>
        ${CATEGORIES.map((c) => `
          <button class="${draft.category === c.key ? "active" : ""}" data-action="detail-set-category" data-category="${c.key}">${escapeHtml(c.label)}</button>
        `).join("")}
      </div>
    </div>
  ` : (
    state.detailCategoryQuickEdit ? `
      <div class="detail-step" style="margin-top:8px;">
        <div class="row">${icon("listChecks", "icon-sm")}<h3>カテゴリ</h3></div>
        <div class="category-picker">
          <button class="${!entry.category ? "active" : ""}" data-action="detail-quick-set-category" data-category="">未設定</button>
          ${CATEGORIES.map((c) => `
            <button class="${entry.category === c.key ? "active" : ""}" data-action="detail-quick-set-category" data-category="${c.key}">${escapeHtml(c.label)}</button>
          `).join("")}
        </div>
        <button data-action="detail-quick-category-cancel" style="margin-top:10px;background:none;border:none;color:var(--fgMuted);font-size:12px;text-decoration:underline;padding:0;">閉じる</button>
      </div>
    ` : `
      <div class="detail-step" style="margin-top:8px;">
        <div class="row" style="justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:8px;">${icon("listChecks", "icon-sm")}<h3>カテゴリ</h3></div>
          <button class="copy-btn" data-action="detail-quick-category-open">${icon("pencil", "icon-sm")} 変更</button>
        </div>
        <div class="text">${entry.category ? `<span style="display:inline-block;font-size:12px;font-weight:800;letter-spacing:0.03em;
          padding:4px 12px;border-radius:999px;border:2px solid var(--mokuhoMain);color:var(--mokuhoText);">${escapeHtml(categoryLabel(entry.category))}</span>`
          : `<span style="color:var(--fgMuted);">未設定</span>`}</div>
      </div>
    `
  );

  const stepsHtml = STEPS.map((s) => {
    if (phase === "edit") {
      return `
        <div class="detail-step">
          <div class="row">${icon(s.icon, "icon-sm")}<h3>${s.label}</h3></div>
          <textarea class="field" rows="3" data-action="detail-input" data-key="${s.key}" placeholder="${s.placeholder}">${escapeHtml(draft[s.key])}</textarea>
        </div>
      `;
    }
    const hasText = entry[s.key].trim().length > 0;
    const text = hasText ? escapeHtml(entry[s.key]) : `<span style="color:var(--fgMuted);">（未入力）</span>`;
    // 「一歩」のみ：テキストがある＆まだTODO未変換 → 「リストへ変換」ボタンを右上に添える
    const convertBtn = (s.key === "action" && hasText && phase === "view") ? `
      <button class="todo-convert-btn" data-action="todo-convert-action" data-entry-id="${entry.id}">
        ${icon("listChecks", "icon-sm")} リストへ変換
      </button>
    ` : "";
    return `
      <div class="detail-step">
        <div class="row" style="justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:8px;">${icon(s.icon, "icon-sm")}<h3>${s.label}</h3></div>
          <div style="display:flex;align-items:center;gap:4px;">
            ${convertBtn}
            ${hasText ? `<button class="copy-btn" data-action="copy-step-text" data-key="${s.key}">${icon("copy", "icon-sm")} コピー</button>` : ""}
          </div>
        </div>
        <div class="text">${text}</div>
      </div>
    `;
  }).join("");

  // TODOリスト（view フェーズのみ表示）
  const todos = entry.todos || [];
  const todoHtml = (phase === "view") ? (() => {
    const checkSvg = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
    const dragSvg = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="16" x2="20" y2="16"/></svg>`;
    const trashSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
    const items = todos.map((t, i) => `
      <div class="todo-item${t.done ? " todo-done" : ""}" data-todo-index="${i}">
        <button class="todo-drag-handle" data-action="todo-drag-handle" aria-label="並べ替え">${dragSvg}</button>
        <button class="todo-check" data-action="todo-toggle" data-entry-id="${entry.id}" data-todo-index="${i}" aria-label="完了切り替え">
          ${t.done ? checkSvg : ""}
        </button>
        <span class="todo-text" data-action="todo-text-edit" data-entry-id="${entry.id}" data-todo-index="${i}">${escapeHtml(t.text)}</span>
        <button class="todo-delete-btn" data-action="todo-delete" data-entry-id="${entry.id}" data-todo-index="${i}" aria-label="削除">${trashSvg}</button>
      </div>
    `).join("");
    return `
      <div class="todo-section" id="todo-section-${entry.id}">
        ${renderSectionDivider({ iconName: "listChecks", title: "TODOリスト" })}
        <div class="todo-list" id="todo-list-${entry.id}">${items}</div>
        <div class="todo-add-row">
          <input type="text" placeholder="タスクを追加…" data-action="todo-add-input" data-entry-id="${entry.id}" maxlength="100" />
          <button class="todo-add-btn" data-action="todo-add" data-entry-id="${entry.id}" aria-label="追加">＋</button>
        </div>
      </div>
    `;
  })() : "";

  let extra = "";
  if (phase === "edit") {
    extra = `
      <div class="btn-row" style="margin-top:28px;">
        <button class="btn btn-outline-mokuho" data-action="detail-cancel-edit">${icon("x", "icon-sm")} やめる</button>
        <button class="btn btn-mokuho" data-action="detail-save">${icon("check", "icon-sm")} 保存する</button>
      </div>
    `;
  } else if (phase === "confirmDelete") {
    extra = `
      <div class="confirm-box">
        <p>この記録を削除しますか？</p>
        <p>削除すると元に戻せません。</p>
        <div class="btn-row" style="margin-top:16px;">
          <button class="btn btn-outline-mokuho" data-action="detail-cancel-delete">やめる</button>
          <button class="btn btn-mokuho" data-action="detail-confirm-delete">${icon("trash2", "icon-sm")} 削除する</button>
        </div>
      </div>
    `;
  }

  const copyAllBtn = (phase === "view") ? `
    <button class="copy-all-btn" data-action="copy-all-text">${icon("copy", "icon-sm")} 全内容をコピー</button>
  ` : "";

  const topRight = phase === "view" ? `
    <div style="display:flex;gap:4px;">
      <button class="icon-btn" data-action="detail-start-edit">${icon("pencil", "icon-sm")}</button>
      <button class="icon-btn" data-action="detail-ask-delete">${icon("trash2", "icon-sm")}</button>
    </div>
  ` : "";

  return `
    <div class="fade-in">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <button class="back-link" data-action="${phase === "view" ? "detail-back" : "detail-cancel-edit"}">
          ${icon("arrowLeft", "icon-sm")} ${phase === "view" ? "一覧へもどる" : "キャンセル"}
        </button>
        ${topRight}
      </div>
      <p style="margin-top:16px;font-size:12px;letter-spacing:0.1em;color:var(--fgMuted);">${dateLabel}</p>
      ${stepsHtml}
      ${categoryHtml}
      ${todoHtml}
      ${copyAllBtn}
      ${extra}
    </div>
  `;
}

/* ---- 振り返り分析の集計（useReflectionAnalytics 相当） ---- */
function computeAnalytics(entries, weeks) {
  weeks = weeks || 12;
  const filledOf = (e) => STEPS.reduce((n, s) => n + (e[s.key].trim() ? 1 : 0), 0);
  const byDay = new Map();
  const status = { complete: 0, incomplete: 0 };
  const clarityCounts = new Array(STEPS.length + 1).fill(0);
  let claritySum = 0;

  for (const e of entries) {
    const key = toDateKey(e.createdAt);
    byDay.set(key, (byDay.get(key) || 0) + 1);
    if (isEntryComplete(e)) status.complete += 1; else status.incomplete += 1;
    const f = filledOf(e);
    clarityCounts[f] += 1;
    claritySum += f;
  }

  const today = startOfDay(Date.now());
  const days = weeks * 7;
  const heatmap = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    const key = toDateKey(d.getTime());
    heatmap.push({ date: key, count: byDay.get(key) || 0 });
  }

  const weekCount = heatmap.slice(-7).reduce((n, c) => n + c.count, 0);

  let streak = 0;
  const hasToday = (byDay.get(toDateKey(today.getTime())) || 0) > 0;
  let cursor = hasToday ? today.getTime() : today.getTime() - DAY_MS;
  while ((byDay.get(toDateKey(cursor)) || 0) > 0) { streak += 1; cursor -= DAY_MS; }

  const clarity = clarityCounts.map((count, filled) => ({ filled, count }));

  return {
    total: entries.length, weekCount, streak, heatmap, weeks,
    clarity, avgClarity: entries.length ? claritySum / entries.length : 0, status,
  };
}

/* ============================================================================
 *  設定画面
 *  ふりかえり分析・テーマ切替・チュートリアル・インポート／エクスポート・
 *  データリセットを縦一列に並べる。気づき＝ピンク／モクホ＝紺のトーンを
 *  そのまま踏襲し、危険操作（リセット）だけ警告色で区別する。
 * ==========================================================================*/
function renderSettings() {
  if (state.settingsPhase === "confirmReset") {
    return `
      <div class="fade-in" style="margin-top:20px;">
        <button class="back-link" data-action="settings-cancel-reset">${icon("arrowLeft", "icon-sm")} もどる</button>
        <div class="confirm-box" style="border-color:#d9534f;">
          <p style="color:#d9534f;">${icon("alertTriangle", "icon-sm")} すべてのデータを消去します</p>
          <p>気づき・モクホの記録、下書き、テーマ設定がすべて削除されます。この操作は取り消せません。先にエクスポートでバックアップを取ることをおすすめします。</p>
        </div>
        <div class="btn-row" style="margin-top:20px;">
          <button class="btn btn-outline-mokuho" data-action="settings-cancel-reset">やめる</button>
          <button class="btn" style="background:#d9534f;color:#fff;border-color:#d9534f;" data-action="settings-confirm-reset">完全に削除する</button>
        </div>
      </div>
    `;
  }

  const themeLabel = state.theme === "dark" ? "ダークモード" : "ライトモード";
  const themeNextLabel = state.theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え";
  const themeIcon = state.theme === "dark" ? "moon" : "sun";

  return `
    <div class="fade-in" style="margin-top:20px;">
      <button class="back-link" data-action="goto" data-view="home">${icon("arrowLeft", "icon-sm")} ホームへ戻る</button>

      <div class="settings-list">
        <button class="settings-item theme-mokuho" data-action="goto" data-view="reflection">
          <div class="ic">${icon("barChart3", "icon-sm")}</div>
          <div class="body">
            <div class="ttl">ふり返り分析</div>
            <div class="desc">これまでの記録の傾向を確認する</div>
          </div>
          <div class="chev">${icon("chevronRight", "icon-sm")}</div>
        </button>

        <button class="settings-item theme-mokuho" data-action="settings-toggle-theme">
          <div class="ic">${icon(themeIcon, "icon-sm")}</div>
          <div class="body">
            <div class="ttl">テーマ設定（現在：${themeLabel}）</div>
            <div class="desc">${themeNextLabel}</div>
          </div>
          <div class="chev">${icon("chevronRight", "icon-sm")}</div>
        </button>

        <button class="settings-item theme-notice" data-action="tutorial-open">
          <div class="ic">${icon("bookOpen", "icon-sm")}</div>
          <div class="body">
            <div class="ttl">チュートリアル</div>
            <div class="desc">アプリの使い方をかんたんに確認する</div>
          </div>
          <div class="chev">${icon("chevronRight", "icon-sm")}</div>
        </button>

        <button class="settings-item theme-mokuho" data-action="goto" data-view="categoryManage">
          <div class="ic">${icon("listChecks", "icon-sm")}</div>
          <div class="body">
            <div class="ttl">カテゴリ管理</div>
            <div class="desc">「仕事」「プライベート」などのタグを追加・編集・削除する</div>
          </div>
          <div class="chev">${icon("chevronRight", "icon-sm")}</div>
        </button>

        <div class="settings-section-label">サウンド</div>

        <button class="settings-item theme-mokuho" data-action="settings-toggle-sound">
          <div class="ic" style="background:${state.soundEnabled ? "var(--mokuhoMain)" : "var(--borderMuted)"};">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-sm">
              ${state.soundEnabled
                ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>'
                : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'}
            </svg>
          </div>
          <div class="body">
            <div class="ttl">効果音（現在：${state.soundEnabled ? "オン" : "オフ"}）</div>
            <div class="desc">${state.soundEnabled ? "タップ音・完了音をオフにする" : "タップ音・完了音をオンにする"}</div>
          </div>
          <div style="flex-shrink:0;width:44px;height:26px;border-radius:999px;background:${state.soundEnabled ? "var(--mokuhoMain)" : "var(--borderMuted)"};
            position:relative;transition:background .2s;">
            <div style="position:absolute;top:3px;${state.soundEnabled ? "right:3px;" : "left:3px;"}width:20px;height:20px;
              border-radius:999px;background:#fff;transition:left .2s,right .2s;box-shadow:0 1px 3px rgba(0,0,0,.25);"></div>
          </div>
        </button>

        <div class="settings-section-label">データ管理</div>

        <button class="settings-item theme-mokuho" data-action="settings-import">
          <div class="ic">${icon("upload", "icon-sm")}</div>
          <div class="body">
            <div class="ttl">インポート</div>
            <div class="desc">バックアップしたJSONファイルから読み込む</div>
          </div>
          <div class="chev">${icon("chevronRight", "icon-sm")}</div>
        </button>

        <button class="settings-item theme-mokuho" data-action="settings-export">
          <div class="ic">${icon("download", "icon-sm")}</div>
          <div class="body">
            <div class="ttl">エクスポート</div>
            <div class="desc">記録をJSONファイルとして保存する</div>
          </div>
          <div class="chev">${icon("chevronRight", "icon-sm")}</div>
        </button>

        <div class="settings-section-label">危険な操作</div>

        <button class="settings-item theme-danger" data-action="settings-ask-reset">
          <div class="ic">${icon("trash2", "icon-sm")}</div>
          <div class="body">
            <div class="ttl">データリセット</div>
            <div class="desc">すべての記録を完全に消去する</div>
          </div>
          <div class="chev">${icon("chevronRight", "icon-sm")}</div>
        </button>
      </div>
    </div>
  `;
}

/* ============================================================================
 *  チュートリアル（初回起動時オーバーレイ／設定画面から再表示）
 *
 *  「気づき→なるほど→一歩」の3ステップと、その他の主要機能を
 *  1画面1トピックのスライド形式で説明する。どの view の上にも被せて
 *  表示できる独立モーダルとして実装し、render() の最後に重ねて描く。
 * ==========================================================================*/
const TUTORIAL_SLIDES = [
  {
    icon: "bookOpen",
    theme: "mokuho",
    title: "モクホへようこそ",
    body: "モクホは、日々の「気づき」を「一歩」のアクションに変えるための、完全オフラインの思考整理アプリです。データはすべて端末内に保存され、ネットには送信されません。",
  },
  {
    icon: "lightbulb",
    theme: "notice",
    title: "① 気づき",
    body: "心が動いた出来事を、ホーム画面の入力欄にそのまま書きます。考えはまとめなくてOK。「あとで」を押せば一旦保存され、後から続きを書けます。",
  },
  {
    icon: "check2",
    theme: "mokuho",
    title: "② なるほど（2分思考）",
    body: "気づきから「何がわかったか」を深掘りします。未達成カードの思考モードボタンから開始すると、2分間タイマーが進行します。",
  },
  {
    icon: "footprints",
    theme: "mokuho",
    title: "③ 一歩（3分思考）",
    body: "次にできる小さな行動を3分で考えます。ここまで書き終えると「モクホ」タブに記録が完了し、保管庫に積み重なっていきます。",
  },
  {
    icon: "barChart3",
    theme: "mokuho",
    title: "ふり返り分析",
    body: "設定画面の「ふり返り分析」から、記録の傾向やヒートマップ、カテゴリ別の内訳を確認できます。お気に入り登録やカテゴリ分けも設定画面から行えます。",
  },
  {
    icon: "download",
    theme: "notice",
    title: "バックアップを忘れずに",
    body: "設定画面の「エクスポート」で、すべての記録をJSONファイルとして保存できます。「インポート」で別の端末や復元時に読み込めます。「データリセット」は全消去なのでご注意ください。",
  },
];

function renderTutorialModal() {
  const tm = state.tutorialModal;
  if (!tm.open) return "";
  const total = TUTORIAL_SLIDES.length;
  const idx = Math.min(Math.max(tm.slide, 0), total - 1);
  const slide = TUTORIAL_SLIDES[idx];
  const isFirst = idx === 0;
  const isLast = idx === total - 1;
  const themeClass = slide.theme === "notice" ? "notice" : "mokuho";
  const iconBg = slide.theme === "notice" ? "var(--noticeMain)" : "var(--mokuhoMain)";
  const textColor = slide.theme === "notice" ? "var(--noticeText)" : "var(--mokuhoText)";

  const dots = TUTORIAL_SLIDES.map((_, i) => `
    <span style="width:${i === idx ? "20px" : "8px"};height:8px;border-radius:999px;
      background:${i === idx ? "var(--fg)" : "var(--borderMuted)"};
      transition:width .2s, background-color .2s;display:inline-block;"></span>
  `).join("");

  return `
    <div class="modal-overlay" style="z-index:90;" data-action="tutorial-overlay-noop">
      <div class="modal-card" style="max-width:340px;text-align:center;padding:30px 20px 22px;position:relative;" data-action="tutorial-swipe-area">
        <button data-action="tutorial-skip" style="position:absolute;top:14px;right:14px;background:none;border:none;color:var(--fgMuted);font-size:12px;font-weight:800;padding:6px;">スキップ</button>

        <div style="width:64px;height:64px;border-radius:999px;background:${iconBg};color:#fff;
          display:flex;align-items:center;justify-content:center;margin:6px auto 16px;">
          ${icon(slide.icon, "icon")}
        </div>

        <p style="font-weight:800;font-size:17px;margin:0;color:${textColor};">${slide.title}</p>
        <p style="font-size:13.5px;line-height:1.8;color:var(--fg);margin:14px 0 0;text-align:left;">${slide.body}</p>

        <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-top:22px;">${dots}</div>

        <div class="btn-row" style="margin-top:18px;">
          <button class="btn btn-outline-${themeClass}" data-action="tutorial-prev" ${isFirst ? "disabled" : ""}>
            ${icon("arrowLeft", "icon-sm")} もどる
          </button>
          <button class="btn btn-${themeClass}" data-action="${isLast ? "tutorial-finish" : "tutorial-next"}">
            ${isLast ? "はじめる" : "つぎへ"} ${isLast ? icon("check", "icon-sm") : icon("arrowRight", "icon-sm")}
          </button>
        </div>
      </div>
    </div>
  `;
}

/* ============================================================================
 *  カテゴリ管理画面：CATEGORIES（localStorageで永続化）の追加・編集・削除。
 *  カテゴリ名はラベルを変更するだけで、紐づくkeyは記録側のentry.categoryと
 *  一致させたまま保つ（keyを変えると既存記録の紐付けが切れてしまうため）。
 * ==========================================================================*/
function renderCategoryManage() {
  const draft = state.categoryDraft;
  const usageCount = (key) => state.entries.filter((e) => e.category === key).length;

  const rows = CATEGORIES.map((c) => {
    if (draft.mode === "edit" && draft.key === c.key) {
      return `
        <div class="category-row">
          <input class="field name" data-action="category-edit-input" value="${escapeHtml(draft.label)}" />
          <button class="icon-btn" data-action="category-edit-confirm" aria-label="保存">${icon("check", "icon-sm")}</button>
          <button class="icon-btn" data-action="category-edit-cancel" aria-label="キャンセル">${icon("x", "icon-sm")}</button>
        </div>
      `;
    }
    const count = usageCount(c.key);
    return `
      <div class="category-row">
        <div class="name">${escapeHtml(c.label)}${count > 0 ? `<span style="color:var(--fgMuted);font-weight:400;font-size:12px;"> ・${count}件で使用中</span>` : ""}</div>
        <button class="icon-btn" data-action="category-edit-start" data-key="${c.key}" aria-label="編集">${icon("pencil", "icon-sm")}</button>
        <button class="icon-btn" data-action="category-ask-delete" data-key="${c.key}" aria-label="削除">${icon("trash2", "icon-sm")}</button>
      </div>
    `;
  }).join("");

  const addRow = draft.mode === "add" ? `
    <div class="category-add-row">
      <input class="field" data-action="category-add-input" value="${escapeHtml(draft.label)}" placeholder="新しいカテゴリ名" />
      <button class="btn btn-mokuho" style="width:auto;padding:0 18px;" data-action="category-add-confirm">${icon("check", "icon-sm")}</button>
      <button class="btn btn-outline-mokuho" style="width:auto;padding:0 18px;" data-action="category-add-cancel">${icon("x", "icon-sm")}</button>
    </div>
  ` : `
    <button class="settings-item theme-mokuho" style="margin-top:14px;" data-action="category-add-start">
      <div class="ic">${icon("plus", "icon-sm")}</div>
      <div class="body"><div class="ttl">新しいカテゴリを追加</div></div>
    </button>
  `;

  const confirmDeleteModal = draft.mode === "confirmDelete" ? `
    <div class="modal-overlay" data-action="modal-overlay-cancel" data-cancel-action="category-delete-cancel">
      <div class="modal-card">
        <p>${icon("alertTriangle", "icon-sm")} 「${escapeHtml(categoryLabel(draft.key))}」を削除しますか？</p>
        <p>このカテゴリが付いている記録は「未設定」に戻ります。タグ自体は削除され、元に戻せません。</p>
        <div class="btn-row" style="margin-top:16px;">
          <button class="btn btn-outline-mokuho" data-action="category-delete-cancel">やめる</button>
          <button class="btn" style="background:#d9534f;color:#fff;border-color:#d9534f;" data-action="category-delete-confirm">削除する</button>
        </div>
      </div>
    </div>
  ` : "";

  return `
    <div class="fade-in" style="margin-top:20px;">
      <button class="back-link" data-action="goto" data-view="settings">${icon("arrowLeft", "icon-sm")} 設定へ戻る</button>
      <div style="margin-top:20px;">${renderSectionDivider({ iconName: "listChecks", title: "カテゴリ管理" })}</div>
      <div class="settings-list" style="margin-top:14px;">${rows}</div>
      ${addRow}
      ${confirmDeleteModal}
    </div>
  `;
}

function renderReflection() {
  const a = computeAnalytics(state.entries, 12);
  return `
    <div class="fade-in">
      <button class="back-link" data-action="goto" data-view="home">${icon("arrowLeft", "icon-sm")} もどる</button>
      <h2 style="font-size:24px;font-weight:800;margin-top:16px;">ふりかえり</h2>

      <div style="margin-top:20px;" class="summary-grid">
        <div class="summary-card"><div class="val">${a.total}</div><div class="lbl">総記録</div></div>
        <div class="summary-card"><div class="val">${a.streak}</div><div class="lbl">連続日数</div></div>
        <div class="summary-card"><div class="val">${a.weekCount}</div><div class="lbl">今週</div></div>
      </div>

      <div style="margin-top:32px;">
        ${renderSectionDivider({ iconName: "calendarDays", title: "記録の連続性" })}
        <div style="padding:16px 0;">
          ${renderHeatmap(a.heatmap, a.weeks)}
          <p class="heatmap-hint">色のついた日をタップすると、その日の記録を見られます。</p>
        </div>
      </div>

      <div style="margin-top:16px;">
        ${renderSectionDivider({ iconName: "gauge", title: "完成度の分布" })}
        <div style="padding:16px 0;">${renderClarityBar(a.clarity, a.avgClarity)}</div>
      </div>

      <div style="margin-top:16px;">
        ${renderSectionDivider({ iconName: "pieChart", title: "気づき／モクホの比率" })}
        <div style="padding:16px 0;">${renderCategorySplit(a.status)}</div>
      </div>
    </div>
  `;
}

function renderHeatmap(days, weeks) {
  const opacityOf = (c) => (c <= 0 ? 0.06 : Math.min(0.25 + c * 0.25, 1));
  const base = "58,90,140"; // モクホ（紺）テーマで統一
  const columns = [];
  for (let w = 0; w < weeks; w++) columns.push(days.slice(w * 7, w * 7 + 7));

  return `
    <div class="heatmap" id="heatmap-scroll">
      ${columns.map((col) => `
        <div class="col">
          ${col.map((cell) => {
            const interactive = cell.count > 0;
            const isSelected = state.selectedDay && cell.date === state.selectedDay;
            const cls = `cell ${interactive ? "interactive" : ""} ${isSelected ? "selected" : ""}`;
            const style = `background-color: rgba(${base},${opacityOf(cell.count)});`;
            const dataSel = isSelected ? `data-selected="1"` : "";
            if (interactive) {
              return `<button class="${cls}" style="${style}" data-action="select-day" data-date="${cell.date}" title="${cell.date}：${cell.count}件" ${dataSel}></button>`;
            }
            return `<div class="${cls}" style="${style}" title="${cell.date}：${cell.count}件" ${dataSel}></div>`;
          }).join("")}
        </div>
      `).join("")}
    </div>
  `;
}

function renderClarityBar(buckets, avg) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const labels = ["未着手", "気づきのみ", "なるほどまで", "一歩まで"];
  const base = "58,90,140"; // モクホ（紺）テーマで統一
  const rows = buckets.slice().reverse().map((b) => `
    <div class="clarity-row">
      <span class="lbl">${labels[b.filled] || b.filled + "段階"}</span>
      <div class="bar-bg"><div class="bar-fg" style="width:${(b.count / max) * 100}%;background-color:rgba(${base},${b.filled === STEPS.length ? 1 : 0.35});"></div></div>
      <span class="num">${b.count}</span>
    </div>
  `).join("");
  return `<div style="display:flex;flex-direction:column;gap:8px;">${rows}<p class="clarity-avg">平均完成度 ${avg.toFixed(1)} / ${STEPS.length}</p></div>`;
}

function renderCategorySplit(status) {
  const total = status.complete + status.incomplete;
  const completePct = total ? (status.complete / total) * 100 : 0;
  return `
    <div>
      <div class="split-bar">
        <div style="width:${completePct}%;background-color:var(--mokuhoMain);"></div>
        <div style="width:${100 - completePct}%;background-color:var(--noticeMain);"></div>
      </div>
      <div class="split-legend">
        <span class="item" style="color:var(--mokuhoText);">${icon("check2", "icon-sm")} モクホ ${status.complete}</span>
        <span class="item" style="color:var(--noticeText);">気づき ${status.incomplete} ${icon("lightbulb", "icon-sm")}</span>
      </div>
    </div>
  `;
}

function renderDayDetail() {
  const dateKey = state.selectedDay;
  const dayEntries = state.entries.filter((e) => toDateKey(e.createdAt) === dateKey);
  const isToday = compareDateKey(dateKey, todayKey()) >= 0;
  const prevKey = shiftDateKey(dateKey, -1);
  const nextKey = shiftDateKey(dateKey, 1);

  return `
    <div class="fade-in">
      <button class="back-link" data-action="goto" data-view="reflection">${icon("arrowLeft", "icon-sm")} ふりかえりへもどる</button>

      <div class="day-nav">
        <button data-action="change-day" data-date="${prevKey}">${icon("chevronLeft", "icon-sm")}</button>
        <div class="center-label">
          <div class="d">${formatDateKey(dateKey)}</div>
          <div class="w">${weekdayLabel(dateKey)}曜日 · ${dayEntries.length} 件</div>
        </div>
        <button data-action="change-day" data-date="${nextKey}" ${isToday ? "disabled" : ""}>${icon("chevronRight", "icon-sm")}</button>
      </div>

      <div style="margin-top:24px;">${renderEntryList(dayEntries, "open-detail-day", "auto")}</div>
    </div>
  `;
}

/* ============================================================================
 *  メインレンダラー：state.view に応じて画面を切り替える
 * ==========================================================================*/
function render() {
  document.body.classList.toggle("theme-dark", state.theme === "dark");
  let body = "";
  if (state.view === "home") body = renderHome();
  else if (state.view === "form") body = renderForm();
  else if (state.view === "timer") body = renderTimer();
  else if (state.view === "detail") body = renderDetail();
  else if (state.view === "reflection") body = renderReflection();
  else if (state.view === "dayDetail") body = renderDayDetail();
  else if (state.view === "settings") body = renderSettings();
  else if (state.view === "categoryManage") body = renderCategoryManage();

  const tabsHtml = state.view === "home" ? `<div style="margin-top:20px;">${renderTabs()}</div>` : "";

  document.getElementById("root").innerHTML = `
    <div class="app">
      ${renderHeader()}
      ${tabsHtml}
      ${body}
    </div>
    <input type="file" id="importFileInput" accept="application/json" style="display:none;" />
    ${renderTutorialModal()}
  `;

  const importInput = document.getElementById("importFileInput");
  if (importInput) importInput.addEventListener("change", handleImportFileChosen);

  // チュートリアルモーダル：左右スワイプでスライド送り
  if (state.tutorialModal.open) {
    const swipeEl = document.querySelector('[data-action="tutorial-swipe-area"]');
    if (swipeEl) bindTutorialSwipe(swipeEl);
  }

  // ヒートマップ：選択日のセルへ自動スクロール
  if (state.view === "reflection" && state.selectedDay) {
    const container = document.getElementById("heatmap-scroll");
    const target = container && container.querySelector('[data-selected="1"]');
    if (container && target) {
      const left = target.offsetLeft - container.clientWidth / 2 + target.clientWidth / 2;
      const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      container.scrollTo({ left: Math.max(0, left), behavior: prefersReduced ? "auto" : "smooth" });
    }
  }

  // 「一歩」まで入力して記録が完了した直後だけ、1回限りの完了演出を再生する。
  if (state.justCompletedId) {
    playCompletionCelebration();
    state.justCompletedId = null;
  }

  // 詳細画面でTODOリストが表示されているなら長押しドラッグ並び替えをバインドする。
  if (state.view === "detail") {
    const todoList = document.querySelector(".todo-list");
    if (todoList) bindTodoDragSort(todoList);
  }
}

/* ============================================================================
 *  タイマーのインターバル制御（useThinkingTimer 相当）
 * ==========================================================================*/
/* 実時刻ベースの残り秒数計算。
   running中は startedAt からの経過秒を baseRemaining から引く。
   バックグラウンドに行って戻ってきても、setIntervalが止まっていた分は
   ここで正しく巻き戻せる（＝アプリ切り替えからの復帰に対応する）。 */
function computeRemaining(t) {
  if (t.status !== "running" || !t.startedAt) return t.baseRemaining;
  const elapsed = Math.floor((Date.now() - t.startedAt) / 1000);
  return Math.max(0, t.baseRemaining - elapsed);
}

function timerTick() {
  const t = state.timer;
  t.remaining = computeRemaining(t);

  if (t.remaining <= 0) {
    // 経過秒数によっては複数ステップ分一気に進んでいる可能性があるため、
    // ステップを順番に消化していく（バックグラウンドに長時間置かれた場合も対応）。
    let overflow = Math.floor((Date.now() - t.startedAt) / 1000) - t.baseRemaining;
    let next = t.stepIndex;
    while (overflow >= 0) {
      next += 1;
      if (next >= THINK_DURATIONS.length) { next = THINK_DURATIONS.length; break; }
      overflow -= THINK_DURATIONS[next];
    }
    if (next >= THINK_DURATIONS.length) {
      t.status = "finished";
      t.startedAt = null;
      clearInterval(state.timerHandle);
      state.timerHandle = null;
    } else {
      t.stepIndex = next;
      t.baseRemaining = -overflow;
      t.startedAt = Date.now();
      t.remaining = t.baseRemaining;
    }
    persistDraft();
    render();
    return;
  }
  updateTimerCompactDisplay();
}

function updateTimerCompactDisplay() {
  const t = state.timer;
  const stepTotal = THINK_DURATIONS[t.stepIndex];
  const progress = stepTotal > 0 ? 1 - t.remaining / stepTotal : 0;
  const root = document.getElementById("root");

  const labelEl = root.querySelector(".timer-ring-mini .label");
  if (labelEl) labelEl.textContent = fmtSec(t.remaining);

  const circle = root.querySelector(".timer-ring-mini circle:nth-child(2)");
  if (circle) {
    const r = parseFloat(circle.getAttribute("r"));
    const c = 2 * Math.PI * r;
    const offset = c * (1 - Math.min(Math.max(progress, 0), 1));
    circle.setAttribute("stroke-dashoffset", offset);
  }
}
function timerStart() {
  state.timer = {
    status: "running", stepIndex: 0, remaining: THINK_DURATIONS[0],
    notes: { insight: "", action: "" },
    startedAt: Date.now(), baseRemaining: THINK_DURATIONS[0],
  };
  if (state.timerHandle) clearInterval(state.timerHandle);
  state.timerHandle = setInterval(timerTick, 1000);
  persistDraft();
  render();
}
function timerPause() {
  const t = state.timer;
  t.remaining = computeRemaining(t);
  t.baseRemaining = t.remaining;
  t.status = "paused";
  t.startedAt = null;
  clearInterval(state.timerHandle); state.timerHandle = null;
  persistDraft();
  render();
}
function timerResume() {
  const t = state.timer;
  t.status = "running";
  t.startedAt = Date.now();
  // baseRemaining は一時停止時点の残り秒数のまま（pause時に確定済み）。
  if (state.timerHandle) clearInterval(state.timerHandle);
  state.timerHandle = setInterval(timerTick, 1000);
  persistDraft();
  render();
}
function timerSkip() {
  const t = state.timer;
  if (t.status === "idle" || t.status === "finished") return;
  const next = t.stepIndex + 1;
  if (next >= THINK_DURATIONS.length) {
    t.status = "finished";
    t.startedAt = null;
    clearInterval(state.timerHandle); state.timerHandle = null;
  } else {
    t.stepIndex = next;
    t.baseRemaining = THINK_DURATIONS[next];
    t.remaining = THINK_DURATIONS[next];
    if (t.status === "running") t.startedAt = Date.now();
  }
  persistDraft();
  render();
}
/* 「もどる」：1つ前のステップに戻り、そのステップのタイマーをやり直す。
   「なるほど」（stepIndex=0）でこれを押した場合は、思考モードより前の
   「気づき」入力フォームへ戻る（タイマーは終了せず一時停止のまま保持する）。 */
function timerStepBack() {
  const t = state.timer;
  if (t.status === "idle" || t.status === "finished") return;
  if (t.stepIndex === 0) {
    timerPause();
    navigateTo("form");
    return;
  }
  const prev = t.stepIndex - 1;
  t.stepIndex = prev;
  t.baseRemaining = THINK_DURATIONS[prev];
  t.remaining = THINK_DURATIONS[prev];
  if (t.status === "running") t.startedAt = Date.now();
  persistDraft();
  render();
}

/* ============================================================================
 *  効果音（AudioContext）
 *  外部ファイルなし・オシレーターのみで合成する。
 *  ブラウザのオートプレイポリシーに対応するため、AudioContext は
 *  最初のユーザー操作時に resume() し、以降は使い回す。
 * ==========================================================================*/
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    try {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return null; }
  }
  if (_audioCtx.state === "suspended") {
    _audioCtx.resume().catch(() => {});
  }
  return _audioCtx;
}

// ユーザーの初回操作で AudioContext を resume しておく（オートプレイ制限対策）
document.addEventListener("pointerdown", function _resumeCtx() {
  getAudioCtx();
  document.removeEventListener("pointerdown", _resumeCtx);
}, { once: true, passive: true });

function playSound(type) {
  if (!state.soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;

  if (type === "tap") {
    // ピコッ：短いサイン波
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.09);

  } else if (type === "complete") {
    // ポン：低音サイン波
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(320, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.18);
    gain1.gain.setValueAtTime(0.35, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.23);

    // パチパチ：高周波の短いサイン波を4発、時間をずらして重ねる
    const sparkFreqs = [1200, 1800, 1500, 2100];
    const sparkDelays = [0.18, 0.28, 0.38, 0.46];
    sparkFreqs.forEach((freq, i) => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "sine";
      const t = ctx.currentTime + sparkDelays[i];
      osc2.frequency.setValueAtTime(freq, t);
      osc2.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.05);
      gain2.gain.setValueAtTime(0.12, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      osc2.start(t);
      osc2.stop(t + 0.08);
    });
  }
}

/* ============================================================================
 *  TODOリスト ドラッグ並べ替え（シングルトン・FLIP方式 v2）
 *
 *  改善点：
 *  ① ドラッグ開始閾値 12px（スクロールと並べ替えの誤検知を低減）
 *  ② 判定ゾーン：アイテム高さの上20%・下20%をバッファとして除いた
 *     「中央60%帯」に指が入ったら切り替え → 隣接アイテムへの移動が快適に
 *  ③ FLIP改良：DOM移動後に rAF 1回で transition を有効化
 *     （no-transition / transform の競合タイミングを排除）
 *  ④ ph 参照をDOMノードで直接保持 → lastPh の index ズレを根絶
 * ==========================================================================*/

// シングルトン状態（モジュールスコープ・アプリ起動時に1度だけ登録）
const _drag = {
  listEl:      null,   // render() ごとに差し替える
  pending:     null,   // touchstart で登録した候補アイテム
  dragEl:      null,   // ドラッグ中アイテム（position:fixed）
  ph:          null,   // プレースホルダー div
  phBefore:    null,   // ph が現在「この要素の前」に入っている（DOMノード参照）
  dragIndex:   -1,
  startX:      0,
  startY:      0,
  offsetX:     0,
  offsetY:     0,
};

/* アイテム一覧（ドラッグ中の要素とプレースホルダーは除く） */
function _dragItems() {
  return _drag.listEl
    ? Array.from(_drag.listEl.querySelectorAll(
        ".todo-item:not(.todo-dragging)"))
    : [];
}

function _dragEntryId() {
  if (!_drag.listEl) return null;
  const btn = _drag.listEl.querySelector("[data-entry-id]");
  return btn ? btn.dataset.entryId : null;
}

/* ── FLIP アニメーション ───────────────────────────────────────────────────
   1. DOM 移動前に各要素の top を記録（First）
   2. DOM 移動後に呼ぶ → 差分を transform で瞬時に逆適用（Invert）
   3. rAF 1回後に transform = "" へ遷移（Play）                          */
function _flip(snapshots) {
  const movers = [];
  snapshots.forEach(({ el, top: firstTop }) => {
    if (!_drag.listEl || !_drag.listEl.contains(el)) return;
    const lastTop = el.getBoundingClientRect().top;
    const dy = firstTop - lastTop;
    if (Math.abs(dy) < 0.5) return;
    // 瞬時に逆変形（transition なし）
    el.style.transition = "none";
    el.style.transform  = `translateY(${dy}px)`;
    movers.push(el);
  });
  if (movers.length === 0) return;
  // 次フレームで transition を復活させ 0 へ戻す
  requestAnimationFrame(() => {
    movers.forEach((el) => {
      el.style.transition = "";   // CSS の .todo-item transition が効く
      el.style.transform  = "";
    });
  });
}

/* ── プレースホルダーをドラッグ位置に合わせて移動 ──────────────────────────
   判定：指の Y がアイテムの「上端+20% ～ 下端-20%」の帯に入ったら
   そのアイテムを「追い越した」とみなす。
   この帯を使うことで境界線ぴったりでなくても切り替わる。              */
function _movePh(clientY) {
  if (!_drag.ph || !_drag.listEl) return;

  const items = _dragItems();

  // 指の Y が属するアイテムを特定
  let target = null;   // 指がこのアイテムの上半分にいる → ph をその前に挿入
  for (const it of items) {
    const r      = it.getBoundingClientRect();
    const buf    = r.height * 0.20;            // 上下20%バッファ
    const zoneTop = r.top    + buf;
    const zoneMid = r.top    + r.height / 2;

    if (clientY < zoneMid) {
      // 指はこのアイテムの上半分（バッファ込み）
      target = it;
      break;
    }
    // 下半分：次のアイテムの判定へ
  }
  // target===null なら末尾に挿入

  // 変化がなければ何もしない（DOM参照比較）
  const same = target
    ? (_drag.ph.nextSibling === target)       // ph の次が target なら位置同じ
    : (_drag.ph === _drag.listEl.lastElementChild ||
       !_drag.ph.nextElementSibling);
  if (same) return;

  // FLIP: First 座標を記録してから DOM 移動
  const snaps = items.map((el) => ({ el, top: el.getBoundingClientRect().top }));
  if (target) {
    _drag.listEl.insertBefore(_drag.ph, target);
  } else {
    _drag.listEl.appendChild(_drag.ph);
  }
  _flip(snaps);
}

/* ── ドラッグ開始 ─────────────────────────────────────────────────────────── */
function _startDrag(item, cx, cy) {
  _drag.dragEl    = item;
  _drag.dragIndex = Array.from(
    _drag.listEl.querySelectorAll(".todo-item")
  ).indexOf(item);

  const rect     = item.getBoundingClientRect();
  _drag.offsetX  = cx - rect.left;
  _drag.offsetY  = cy - rect.top;

  // プレースホルダーを元位置に挿入（まず item の直前に）
  const ph = document.createElement("div");
  ph.className      = "todo-placeholder";
  ph.style.height   = rect.height + "px";
  ph.style.width    = rect.width  + "px";
  _drag.listEl.insertBefore(ph, item);
  _drag.ph = ph;

  // item を fixed に切り替え
  item.classList.add("todo-dragging");
  item.style.left  = rect.left  + "px";
  item.style.top   = rect.top   + "px";
  item.style.width = rect.width + "px";

  document.body.classList.add("is-sorting");
}

/* ── クリーンアップ ───────────────────────────────────────────────────────── */
function _dragCleanup() {
  if (_drag.dragEl) {
    _drag.dragEl.classList.remove("todo-dragging");
    _drag.dragEl.style.cssText = "";
  }
  if (_drag.ph && _drag.ph.parentNode) _drag.ph.remove();
  Object.assign(_drag, {
    pending: null, dragEl: null, ph: null, phBefore: null, dragIndex: -1,
  });
  document.body.classList.remove("is-sorting");
}

/* ── document レベル イベントリスナー（アプリ起動時に1度だけ登録） ─────────── */
document.addEventListener("touchstart", (ev) => {
  if (!_drag.listEl) return;
  const handle = ev.target.closest("[data-action='todo-drag-handle']");
  if (!handle || !_drag.listEl.contains(handle)) return;
  const item = handle.closest(".todo-item");
  if (!item) return;
  _dragCleanup();
  _drag.pending = item;
  _drag.startX  = ev.touches[0].clientX;
  _drag.startY  = ev.touches[0].clientY;
}, { passive: true });

document.addEventListener("touchmove", (ev) => {
  if (!_drag.pending && !_drag.dragEl) return;

  const cx = ev.touches[0].clientX;
  const cy = ev.touches[0].clientY;

  if (!_drag.dragEl) {
    // ── 閾値判定（12px）──
    const dx = Math.abs(cx - _drag.startX);
    const dy = Math.abs(cy - _drag.startY);
    if (dx < 12 && dy < 12) return;
    _startDrag(_drag.pending, cx, cy);
    _drag.pending = null;
  }

  ev.preventDefault();   // ページスクロール抑制

  // ドラッグアイテムを指に追従
  _drag.dragEl.style.left = (cx - _drag.offsetX) + "px";
  _drag.dragEl.style.top  = (cy - _drag.offsetY) + "px";

  // プレースホルダーを移動（判定ゾーン方式）
  _movePh(cy);
}, { passive: false });

document.addEventListener("touchend", () => {
  if (!_drag.dragEl) { _drag.pending = null; return; }

  const entryId = _dragEntryId();
  const entry   = entryId ? state.entries.find((e) => e.id === entryId) : null;

  if (entry && _drag.ph && _drag.ph.parentNode) {
    // ph の DOM 上の位置からドロップ先インデックスを計算
    const allChildren = Array.from(_drag.listEl.children);
    let newIndex = allChildren.indexOf(_drag.ph);
    // dragEl は fixed なので children に含まれないが、
    // 元のインデックスより後ろに ph があれば -1 補正
    if (_drag.dragIndex < newIndex) newIndex -= 1;

    const origIndex = _drag.dragIndex;
    _dragCleanup();

    if (newIndex !== origIndex && newIndex >= 0) {
      const todos = (entry.todos || []).slice();
      const [moved] = todos.splice(origIndex, 1);
      todos.splice(newIndex, 0, moved);
      updateEntry(entry.id, { todos });
      playDropSound();
      render();
      // render() 後、移動先のアイテムにフラッシュ演出を付与
      requestAnimationFrame(() => {
        const items = document.querySelectorAll(".todo-item");
        if (items[newIndex]) {
          items[newIndex].classList.remove("flash-highlight"); // 連続操作でリセット
          void items[newIndex].offsetWidth;                    // reflow で animation を再起動
          items[newIndex].classList.add("flash-highlight");
          items[newIndex].addEventListener("animationend", () => {
            items[newIndex].classList.remove("flash-highlight");
          }, { once: true });
        }
      });
      return;
    }
  }

  _dragCleanup();
  // 順序変化なし → render は不要（画面そのまま）
}, { passive: true });

document.addEventListener("touchcancel", () => {
  _dragCleanup();
}, { passive: true });

/* render() 後に呼ぶ：listEl 参照を差し替えるだけ */
function bindTodoDragSort(listEl) {
  _drag.listEl = listEl;
}

/* ドロップ確定音（短いポン） */
function playDropSound() {
  if (!state.soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.28, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
}


/* ============================================================================
 *  完了演出：「一歩」まで入力して記録が完了した瞬間に、
 *  背景の紺色フラッシュ＋キラキラ（紙吹雪状のパーティクル）を1回だけ再生する。
 *  どちらもpointer-events:noneのオーバーレイで、操作を妨げない。
 *  アニメーション終了後は自動的にDOMから取り除く。
 * ==========================================================================*/
function playCompletionCelebration() {
  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  playSound("complete");

  const flash = document.createElement("div");
  flash.className = "complete-flash";
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 1000);

  if (prefersReduced) return; // 動きに敏感な人のためパーティクルは省略する

  const layer = document.createElement("div");
  layer.className = "complete-particles";
  const colors = ["#3a5a8c", "#d97a99", "#e0c25a", "#7aa6d9"];
  const count = 24;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "complete-particle";
    const angle = Math.random() * Math.PI * 2;
    const distance = 90 + Math.random() * 160;
    const px = Math.cos(angle) * distance;
    const py = Math.sin(angle) * distance - 40; // やや上方向に散らす
    p.style.setProperty("--px", `${px}px`);
    p.style.setProperty("--py", `${py}px`);
    p.style.setProperty("--pr", `${Math.floor(Math.random() * 360)}deg`);
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 0.15}s`;
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 1400);
}

function timerReset() {
  clearInterval(state.timerHandle); state.timerHandle = null;
  state.timer = {
    status: "idle", stepIndex: 0, remaining: THINK_DURATIONS[0],
    notes: { insight: "", action: "" },
    startedAt: null, baseRemaining: THINK_DURATIONS[0],
  };
  persistDraft();
  render();
}

/* ============================================================================
 *  チュートリアルモーダルの開閉・スライド送り
 *
 *  どの view の上にも被せて表示する独立モーダルのため、navigateTo（view切替）
 *  とは別に、Androidの戻るボタンで「モーダルだけ閉じる」を実現するための
 *  履歴エントリを1つ積む。popstate側で tutorialModal.open を見て処理する。
 * ==========================================================================*/
/* チュートリアルモーダルのスワイプ操作。
   再描画ごとに要素は作り直されるため、毎回 render() 後に呼び出して付け直す。
   横方向の移動が一定以上かつ縦移動より優位な場合のみスライド送りと判定する。 */
function bindTutorialSwipe(el) {
  let startX = 0, startY = 0, tracking = false;
  el.addEventListener("touchstart", (ev) => {
    if (ev.touches.length !== 1) return;
    startX = ev.touches[0].clientX;
    startY = ev.touches[0].clientY;
    tracking = true;
  }, { passive: true });
  el.addEventListener("touchend", (ev) => {
    if (!tracking) return;
    tracking = false;
    const touch = ev.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) tutorialGo(1); else tutorialGo(-1);
  }, { passive: true });
}

function openTutorial() {
  state.tutorialModal = { open: true, slide: 0 };
  if (!isRestoringFromHistory) {
    history.pushState({ mokuhoTutorial: true }, "", "");
  }
  render();
}
function closeTutorial() {
  state.tutorialModal.open = false;
  TutorialSeenStore.save();
  if (!isRestoringFromHistory && history.state && history.state.mokuhoTutorial) {
    history.back();
    return;
  }
  render();
}
function tutorialGo(delta) {
  const total = TUTORIAL_SLIDES.length;
  const next = state.tutorialModal.slide + delta;
  if (next < 0) return;
  if (next >= total) { closeTutorial(); return; }
  state.tutorialModal.slide = next;
  render();
}

/* ============================================================================
 *  画面遷移（スマホの戻るボタン対応）
 *
 *  すべての画面遷移はここを必ず通す。これにより、
 *  - history.pushState で履歴を1つ積む（スマホの戻る＝popstateで前の画面に戻れる）
 *  - 遷移の直前に下書き（フォーム入力・タイマーメモ）を保存する
 *  という2つを一箇所で保証できる。
 * ==========================================================================*/
function navigateTo(view, extra) {
  state.view = view;
  if (extra) Object.assign(state, extra);

  // popstate（戻る/進む操作）からの復元中は履歴を積み直さない。
  // 積み直すと「戻る→戻った先からさらにpushState」で履歴が壊れてループする。
  if (!isRestoringFromHistory) {
    history.pushState({ mokuhoView: view }, "", "");
  }
  persistDraft();
  render();
}

/* ============================================================================
 *  下書きの永続化／復元
 *  確定保存(Store)とは別に、「今まさに書きかけの内容」を保つレイヤー。
 *  view・formDraft・formIndex・timer・detailDraft 等、再開に必要な情報を一式持つ。
 * ==========================================================================*/
function persistDraft() {
  // ホーム画面など「何も書きかけがない」状態では下書きを残さない。
  const hasFormDraft = STEPS.some((s) => (state.formDraft[s.key] || "").trim().length > 0);
  const hasTimerNote = THINK_STEPS.some((s) => (state.timer.notes[s.key] || "").trim().length > 0);
  const timerActive = state.timer.status === "running" || state.timer.status === "paused";

  if (!hasFormDraft && !hasTimerNote && !timerActive && state.view !== "form" && state.view !== "timer") {
    DraftStore.clear();
    return;
  }

  DraftStore.save({
    view: state.view,
    tab: state.tab,
    formDraft: state.formDraft,
    formIndex: state.formIndex,
    continueEntryId: state.continueEntryId,
    timer: state.timer,
  });
}

function restoreDraft() {
  const draft = DraftStore.load();
  if (!draft) return;

  if (draft.tab) state.tab = draft.tab;
  if (draft.formDraft) state.formDraft = draft.formDraft;
  if (typeof draft.formIndex === "number") state.formIndex = draft.formIndex;
  if (draft.continueEntryId) state.continueEntryId = draft.continueEntryId;

  if (draft.timer) {
    state.timer = draft.timer;
    // running中だった場合、実時刻で残り秒数を計算し直してから再開する。
    // （バックグラウンドやリロードで止まっていた時間も正しく差し引かれる）
    if (state.timer.status === "running") {
      state.timer.remaining = computeRemaining(state.timer);
      if (state.timer.remaining <= 0) {
        // 復元した瞬間にはすでに時間切れだった場合は安全に一時停止扱いにする。
        state.timer.status = "paused";
        state.timer.baseRemaining = 0;
        state.timer.remaining = 0;
        state.timer.startedAt = null;
      } else {
        state.timerHandle = setInterval(timerTick, 1000);
      }
    }
  }

  // 復元先のビューが今も書きかけの内容を持つものであれば、そこへ戻す。
  if (draft.view === "form" || draft.view === "timer") {
    state.view = draft.view;
  }
}

/* ============================================================================
 *  データ操作（useMokuhoEntries 相当）
 * ==========================================================================*/
function addEntry(data) {
  const entry = {
    id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2),
    createdAt: Date.now(),
    category: "",
    favorite: false,
    ...data,
    // todos は必ず配列として保証（data.todos が配列でない場合は空配列にフォールバック）
    todos: Array.isArray(data && data.todos) ? data.todos : [],
  };
  state.entries = [entry, ...state.entries];
  persist();
  return entry;
}
function updateEntry(id, patch) {
  let updated = null;
  state.entries = state.entries.map((e) => {
    if (e.id !== id) return e;
    updated = {
      todos: [],          // フォールバック（古いエントリに todos がない場合の安全策）
      ...e,
      ...patch,
    };
    return updated;
  });
  persist();
  return updated;
}
function removeEntry(id) {
  state.entries = state.entries.filter((e) => e.id !== id);
  persist();
}

/* フォームの下書きを保存する。「気づき」カードから続きを書いていた場合（continueEntryId）は
   既存の記録を更新し、それ以外（新規記録）は新しい記録として追加する。
   保存後、3ステップすべてが揃って「完了」になった場合は justCompletedId をセットし、
   次の render() で完了演出（背景フラッシュ＋キラキラ）を1回だけ再生する。 */
function saveFormDraft() {
  let saved;
  if (state.continueEntryId) {
    saved = updateEntry(state.continueEntryId, { ...state.formDraft });
  } else {
    saved = addEntry({ ...state.formDraft });
  }
  if (saved && isEntryComplete(saved)) {
    state.justCompletedId = saved.id;
  }
}

/* ============================================================================
 *  データ管理（インポート／エクスポート／リセット）
 *  記録（entries）をJSONファイルとして書き出し・読み込みする。
 *  バージョン情報を含めることで、将来の形式変更にも対応しやすくしておく。
 * ==========================================================================*/
/* ============================================================================
 *  クリップボードコピー（ステップ単体／全内容）
 *  Clipboard APIを優先し、使えない環境（file://での実行など）では
 *  textareaを使ったフォールバック（execCommand）に切り替える。
 *  成功・失敗いずれの場合も画面下に短いトーストを出してフィードバックする。
 * ==========================================================================*/
function copyToClipboard(text) {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => showCopyToast("コピーしました"),
      () => copyToClipboardFallback(text)
    );
  } else {
    copyToClipboardFallback(text);
  }
}
function copyToClipboardFallback(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showCopyToast("コピーしました");
  } catch (e) {
    showCopyToast("コピーに失敗しました");
  }
}
let copyToastTimer = null;
function showCopyToast(message) {
  const old = document.getElementById("copyToast");
  if (old) old.remove();
  const toast = document.createElement("div");
  toast.id = "copyToast";
  toast.className = "copy-toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  if (copyToastTimer) clearTimeout(copyToastTimer);
  copyToastTimer = setTimeout(() => { toast.remove(); }, 1800);
}

function exportData() {
  const payload = {
    app: "mokuho",
    exportedAt: new Date().toISOString(),
    version: 1,
    entries: state.entries,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  a.href = url;
  a.download = `mokuho_backup_${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleImportFileChosen(ev) {
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = ""; // 同じファイルを連続で選んでも change が発火するようにする
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const importedEntries = Array.isArray(data) ? data : (Array.isArray(data.entries) ? data.entries : null);
      if (!importedEntries) {
        alert("読み込めませんでした。MOKUHOからエクスポートしたJSONファイルを選んでください。");
        return;
      }
      // 既存データに追記する。idが重複するものはインポート側を新しいidに振り直す。
      const existingIds = new Set(state.entries.map((e) => e.id));
      const normalized = importedEntries.map((e) => {
        const id = (!e.id || existingIds.has(e.id))
          ? ((window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2))
          : e.id;
        existingIds.add(id);
        return {
          id,
          createdAt: typeof e.createdAt === "number" ? e.createdAt : Date.now(),
          notice: e.notice || "", insight: e.insight || "", action: e.action || "",
          category: e.category || "",
          favorite: !!e.favorite,
        };
      });
      state.entries = [...normalized, ...state.entries];
      persist();
      alert(`${normalized.length}件の記録を読み込みました。`);
      render();
    } catch (e) {
      alert("ファイルの読み込みに失敗しました。JSON形式を確認してください。");
    }
  };
  reader.readAsText(file);
}

function resetAllData() {
  state.entries = [];
  persist();
  DraftStore.clear();
  state.formDraft = { notice: "", insight: "", action: "" };
  state.formIndex = 0;
  state.continueEntryId = null;
  timerReset();
}

/* ============================================================================
 *  イベント委譲：ルート要素のクリック/入力をすべてここで受ける
 * ==========================================================================*/
document.getElementById("root").addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;

  // タップ音（data-action を持つクリック可能要素すべてに適用）
  // 音のオン/オフ切り替えボタン自体にも鳴るが、その場合は切替後の状態で再生される
  // （toggle後に state.soundEnabled が更新されるため問題ない）。
  // tutorial-overlay-noop や modal-overlay-cancel の余白タップは除外する。
  if (action !== "tutorial-overlay-noop" && action !== "modal-overlay-cancel") {
    playSound("tap");
  }

  if (action === "set-tab") {
    state.tab = el.dataset.tab;
    state.view = "home";
    state.search = { open: false, query: "", theme: null };
    persistDraft(); render(); return;
  }
  if (action === "set-mokuho-filter") { state.mokuhoFilter = el.dataset.filter; render(); return; }
  if (action === "goto") { navigateTo(el.dataset.view); return; }

  // 全体検索（気づき／モクホ共通）：セクション見出しの虫眼鏡ボタンで開閉する。
  if (action === "toggle-search") {
    const theme = el.dataset.searchTheme;
    if (state.search.open && state.search.theme === theme) {
      state.search = { open: false, query: "", theme: null };
      render();
    } else {
      state.search = { open: true, query: "", theme };
      render();
      const root = document.getElementById("root");
      const input = root.querySelector('[data-action="search-input"]');
      if (input) input.focus();
    }
    return;
  }

  // チュートリアルモーダル
  if (action === "tutorial-open") { openTutorial(); return; }
  if (action === "tutorial-next") { tutorialGo(1); return; }
  if (action === "tutorial-prev") { tutorialGo(-1); return; }
  if (action === "tutorial-skip" || action === "tutorial-finish") { closeTutorial(); return; }
  if (action === "tutorial-overlay-noop" || action === "tutorial-swipe-area") { return; }

  // モーダル背景（余白部分）をタップした場合のキャンセル処理。
  // ev.target が overlay 自身のときだけ閉じる（カード内のボタンは個別の
  // data-action を持つため、ここには到達しない）。
  if (action === "modal-overlay-cancel") {
    if (ev.target === el) {
      const cancelAction = el.dataset.cancelAction;
      if (cancelAction === "notice-delete-cancel") { state.noticeDeleteTargetId = null; render(); }
      else if (cancelAction === "category-delete-cancel") { state.categoryDraft = { mode: "idle", key: null, label: "" }; render(); }
    }
    return;
  }

  // 設定画面
  if (action === "settings-toggle-theme") {
    state.theme = state.theme === "dark" ? "light" : "dark";
    ThemeStore.save(state.theme);
    render();
    return;
  }
  if (action === "settings-toggle-sound") {
    state.soundEnabled = !state.soundEnabled;
    SoundStore.save(state.soundEnabled);
    render();
    return;
  }
  if (action === "settings-export") { exportData(); return; }
  if (action === "settings-import") {
    const input = document.getElementById("importFileInput");
    if (input) input.click();
    return;
  }
  if (action === "settings-ask-reset") { state.settingsPhase = "confirmReset"; render(); return; }
  if (action === "settings-cancel-reset") { state.settingsPhase = "menu"; render(); return; }
  if (action === "settings-confirm-reset") {
    resetAllData();
    state.settingsPhase = "menu";
    navigateTo("home");
    return;
  }

  // カテゴリ管理
  if (action === "category-add-start") { state.categoryDraft = { mode: "add", key: null, label: "" }; render(); return; }
  if (action === "category-add-cancel") { state.categoryDraft = { mode: "idle", key: null, label: "" }; render(); return; }
  if (action === "category-add-confirm") {
    const label = state.categoryDraft.label.trim();
    if (!label) { state.categoryDraft = { mode: "idle", key: null, label: "" }; render(); return; }
    let key = categoryKeyFromLabel(label);
    // 既存keyと衝突したら末尾に番号を振って一意にする。
    const existingKeys = new Set(CATEGORIES.map((c) => c.key));
    let suffix = 2;
    while (existingKeys.has(key)) { key = categoryKeyFromLabel(label) + suffix; suffix += 1; }
    CATEGORIES.push({ key, label });
    CategoryStore.save(CATEGORIES);
    state.categoryDraft = { mode: "idle", key: null, label: "" };
    render();
    return;
  }
  if (action === "category-edit-start") {
    const c = CATEGORIES.find((c) => c.key === el.dataset.key);
    state.categoryDraft = { mode: "edit", key: el.dataset.key, label: c ? c.label : "" };
    render(); return;
  }
  if (action === "category-edit-cancel") { state.categoryDraft = { mode: "idle", key: null, label: "" }; render(); return; }
  if (action === "category-edit-confirm") {
    const label = state.categoryDraft.label.trim();
    if (label) {
      CATEGORIES = CATEGORIES.map((c) => (c.key === state.categoryDraft.key ? { ...c, label } : c));
      CategoryStore.save(CATEGORIES);
    }
    state.categoryDraft = { mode: "idle", key: null, label: "" };
    render();
    return;
  }
  if (action === "category-ask-delete") {
    state.categoryDraft = { mode: "confirmDelete", key: el.dataset.key, label: "" };
    render(); return;
  }
  if (action === "category-delete-cancel") { state.categoryDraft = { mode: "idle", key: null, label: "" }; render(); return; }
  if (action === "category-delete-confirm") {
    const key = state.categoryDraft.key;
    CATEGORIES = CATEGORIES.filter((c) => c.key !== key);
    CategoryStore.save(CATEGORIES);
    // このカテゴリが付いていた記録は「未設定」に戻す。
    state.entries = state.entries.map((e) => (e.category === key ? { ...e, category: "" } : e));
    persist();
    if (state.mokuhoFilter === key) state.mokuhoFilter = "all";
    state.categoryDraft = { mode: "idle", key: null, label: "" };
    render();
    return;
  }

  // ホーム画面に埋め込んだ「気づき」フォーム（ステップ1）
  if (action === "home-notice-later") {
    // その時点の入力を「未達成の気づき」として保存し、フォームをクリアする。
    if (state.formDraft.notice.trim()) {
      saveFormDraft();
    }
    state.formDraft = { notice: "", insight: "", action: "" };
    state.formIndex = 0;
    state.continueEntryId = null;
    persistDraft();
    render();
    return;
  }
  if (action === "home-notice-next") {
    if (!state.formDraft.notice.trim()) return;
    state.formIndex = 1; // 「なるほど」へ
    navigateTo("form");
    return;
  }

  // フォーム
  if (action === "form-back") {
    if (state.formIndex === 0) {
      state.formDraft = { notice: "", insight: "", action: "" };
      state.formIndex = 0;
      state.continueEntryId = null;
      navigateTo("home");
    } else {
      state.formIndex -= 1;
      persistDraft();
      render();
    }
    return;
  }
  if (action === "form-next") {
    const step = STEPS[state.formIndex];
    if (!state.formDraft[step.key].trim()) return;
    if (state.formIndex === STEPS.length - 1) {
      saveFormDraft();
      state.formDraft = { notice: "", insight: "", action: "" };
      state.formIndex = 0;
      state.continueEntryId = null;
      navigateTo("home");
    } else {
      state.formIndex += 1;
      persistDraft();
      render();
    }
    return;
  }
  if (action === "form-save-partial") {
    // 1つでも入力があれば、未完成のまま「気づき」として保存する。
    saveFormDraft();
    state.formDraft = { notice: "", insight: "", action: "" };
    state.formIndex = 0;
    state.continueEntryId = null;
    navigateTo("home");
    return;
  }

  // タイマー
  if (action === "timer-start") { timerStart(); return; }
  if (action === "timer-pause") { timerPause(); return; }
  if (action === "timer-resume") { timerResume(); return; }
  if (action === "timer-skip") { timerSkip(); return; }
  if (action === "timer-step-back") { timerStepBack(); return; }
  if (action === "timer-reset") { timerReset(); return; }
  if (action === "timer-close-to-form") {
    // タイマー中に書いたメモを記録フォームの下書きへ引き継ぐ（リセットより先に行う）。
    // 「気づき」の内容（state.formDraft.notice）は思考モード開始時から保持され続けているため、
    // ここで空文字に上書きせず、そのまま残す。
    // 思考モードは「なるほど」からなので、フォームも formIndex=1（なるほど）から再開する。
    state.formDraft = { notice: state.formDraft.notice, ...state.timer.notes };
    state.formIndex = 1;
    timerReset();
    navigateTo("form");
    return;
  }
  if (action === "timer-save-partial") {
    // タイマーを中断し、ここまでのメモを保存する。continueEntryId があれば
    // 既存の「気づき」を更新し、なければ気づき本文も含めて新規保存する。
    if (state.continueEntryId) {
      updateEntry(state.continueEntryId, { ...state.timer.notes });
    } else {
      addEntry({ notice: state.formDraft.notice, ...state.timer.notes });
    }
    state.continueEntryId = null;
    state.formDraft = { notice: "", insight: "", action: "" };
    timerReset();
    navigateTo("home");
    return;
  }

  // 「気づき」カードをタップ：そのままステップ入力（なるほど→一歩）を続けられる画面に進む
  if (action === "continue-notice") {
    const entry = state.entries.find((e) => e.id === el.dataset.id);
    if (!entry) return;
    state.formDraft = { notice: entry.notice, insight: entry.insight, action: entry.action };
    state.continueEntryId = entry.id;
    state.formIndex = entry.insight.trim() ? 2 : 1;
    navigateTo("form");
    return;
  }

  // 未達成の「気づき」カード横の「思考モード」ボタン：
  // その気づきを選択した状態で、タイマー（なるほど2分）を即座に開始し、
  // 「なるほど」を入力するステップへそのまま遷移する。
  if (action === "start-thinking-from-card") {
    const entry = state.entries.find((e) => e.id === el.dataset.id);
    if (!entry) return;
    state.formDraft = { notice: entry.notice, insight: entry.insight, action: entry.action };
    state.continueEntryId = entry.id;
    state.formIndex = 1; // 「なるほど」
    state.timer = {
      status: "running", stepIndex: 0, remaining: THINK_DURATIONS[0],
      notes: { insight: entry.insight || "", action: entry.action || "" },
      startedAt: Date.now(), baseRemaining: THINK_DURATIONS[0],
    };
    if (state.timerHandle) clearInterval(state.timerHandle);
    state.timerHandle = setInterval(timerTick, 1000);
    navigateTo("timer");
    return;
  }

  // 「モクホ」カード左上のお気に入りスター：完了した記録だけが対象。
  if (action === "toggle-favorite") {
    const entry = state.entries.find((e) => e.id === el.dataset.id);
    if (!entry) return;
    updateEntry(entry.id, { favorite: !entry.favorite });
    render();
    return;
  }

  // 未達成「気づき」カードの削除（確認モーダル付き）
  if (action === "notice-ask-delete") { state.noticeDeleteTargetId = el.dataset.id; render(); return; }
  if (action === "notice-delete-cancel") { state.noticeDeleteTargetId = null; render(); return; }
  if (action === "notice-delete-confirm") {
    if (state.noticeDeleteTargetId) removeEntry(state.noticeDeleteTargetId);
    state.noticeDeleteTargetId = null;
    render();
    return;
  }

  // 一覧→詳細（「モクホ」タブ：完了済み記録をタップでいつでも深掘り）
  if (action === "open-detail-home" || action === "open-detail-day") {
    state.selectedId = el.dataset.id;
    state.detailOrigin = action === "open-detail-home" ? "home" : "dayDetail";
    state.detailPhase = "view";
    state.detailDraft = null;
    state.detailCategoryQuickEdit = false;
    navigateTo("detail");
    return;
  }

  // 詳細
  if (action === "detail-back") { state.detailCategoryQuickEdit = false; navigateTo(state.detailOrigin); return; }
  if (action === "detail-start-edit") {
    const entry = state.entries.find((e) => e.id === state.selectedId);
    state.detailDraft = { notice: entry.notice, insight: entry.insight, action: entry.action, category: entry.category || "" };
    state.detailPhase = "edit";
    state.detailCategoryQuickEdit = false;
    render(); return;
  }
  if (action === "detail-cancel-edit") { state.detailPhase = "view"; render(); return; }
  if (action === "detail-set-category") {
    state.detailDraft.category = el.dataset.category;
    render(); return;
  }

  // view画面でのカテゴリ即時変更（編集モードに入らず、選んだ瞬間に保存する）
  if (action === "detail-quick-category-open") { state.detailCategoryQuickEdit = true; render(); return; }
  if (action === "detail-quick-category-cancel") { state.detailCategoryQuickEdit = false; render(); return; }
  if (action === "detail-quick-set-category") {
    const entry = state.entries.find((e) => e.id === state.selectedId);
    if (entry) updateEntry(entry.id, { category: el.dataset.category });
    state.detailCategoryQuickEdit = false;
    render(); return;
  }
  if (action === "detail-save") {
    const entry = state.entries.find((e) => e.id === state.selectedId);
    const patch = {};
    Object.keys(state.detailDraft).forEach((k) => { if (state.detailDraft[k] !== entry[k]) patch[k] = state.detailDraft[k]; });
    if (Object.keys(patch).length > 0) updateEntry(entry.id, patch);
    state.detailPhase = "view";
    render(); return;
  }
  if (action === "detail-ask-delete") { state.detailPhase = "confirmDelete"; render(); return; }
  if (action === "detail-cancel-delete") { state.detailPhase = "view"; render(); return; }
  if (action === "detail-confirm-delete") {
    removeEntry(state.selectedId);
    navigateTo(state.detailOrigin);
    return;
  }

  // コピー機能：ステップ単位／全内容
  if (action === "copy-step-text") {
    const entry = state.entries.find((e) => e.id === state.selectedId);
    if (entry) copyToClipboard(entry[el.dataset.key] || "");
    return;
  }
  if (action === "copy-card-text") {
    const card = el.closest(".prev-step-card");
    const textEl = card ? card.querySelector(".text") : null;
    if (textEl) copyToClipboard(textEl.textContent || "");
    return;
  }
  if (action === "copy-all-text") {
    const entry = state.entries.find((e) => e.id === state.selectedId);
    if (entry) {
      const text = STEPS.map((s) => `【${s.label}】\n${entry[s.key] || ""}`).join("\n\n");
      copyToClipboard(text);
    }
    return;
  }

  // ふりかえり／日別
  if (action === "select-day") { state.selectedDay = el.dataset.date; navigateTo("dayDetail"); return; }
  if (action === "change-day") {
    if (el.disabled) return;
    state.selectedDay = el.dataset.date;
    render(); return;
  }

  // TODOリスト操作
  if (action === "todo-toggle") {
    const entry = state.entries.find((e) => e.id === el.dataset.entryId);
    if (!entry) return;
    const todos = (entry.todos || []).slice();
    const idx = parseInt(el.dataset.todoIndex, 10);
    if (isNaN(idx) || !todos[idx]) return;
    todos[idx] = { ...todos[idx], done: !todos[idx].done };
    updateEntry(entry.id, { todos });
    if (todos[idx].done) playSound("tap");
    render();
    return;
  }
  if (action === "todo-delete") {
    const entry = state.entries.find((e) => e.id === el.dataset.entryId);
    if (!entry) return;
    const todos = (entry.todos || []).filter((_, i) => i !== parseInt(el.dataset.todoIndex, 10));
    updateEntry(entry.id, { todos });
    render();
    return;
  }
  if (action === "todo-add") {
    const entryId = el.dataset.entryId;
    const inputEl = document.querySelector(`[data-action="todo-add-input"][data-entry-id="${entryId}"]`);
    const text = inputEl ? inputEl.value.trim() : "";
    if (!text) return;
    const entry = state.entries.find((e) => e.id === entryId);
    if (!entry) return;
    const todos = [...(entry.todos || []), { id: Date.now() + "-" + Math.random().toString(36).slice(2), text, done: false }];
    updateEntry(entry.id, { todos });
    render();
    // 追加後、入力欄にフォーカスを戻す（連続追加しやすいように）
    const newInput = document.querySelector(`[data-action="todo-add-input"][data-entry-id="${entryId}"]`);
    if (newInput) { newInput.value = ""; newInput.focus(); }
    return;
  }
  if (action === "todo-convert-action") {
    // 「一歩」の文章をTODOリストの先頭項目として取り込む
    const entry = state.entries.find((e) => e.id === el.dataset.entryId);
    if (!entry || !entry.action.trim()) return;
    const newTodo = { id: Date.now() + "-" + Math.random().toString(36).slice(2), text: entry.action.trim(), done: false };
    const todos = [newTodo, ...(entry.todos || [])];
    updateEntry(entry.id, { todos });
    render();
    return;
  }

  // TODOテキストのインライン編集（テキスト部分タップで開始）
  if (action === "todo-text-edit") {
    // テキストを input に差し替えてフォーカス
    const span = el;
    const idx  = parseInt(el.dataset.todoIndex, 10);
    const entryId = el.dataset.entryId;
    const entry = state.entries.find((e) => e.id === entryId);
    if (!entry || isNaN(idx)) return;
    const input = document.createElement("input");
    input.type = "text";
    input.className = "todo-text-input";
    input.value = entry.todos[idx].text;
    input.maxLength = 100;
    input.dataset.action = "todo-text-edit-input";
    input.dataset.entryId = entryId;
    input.dataset.todoIndex = String(idx);
    span.replaceWith(input);
    input.focus();
    input.select();
    // blur / Enter で確定
    const commit = () => {
      const newText = input.value.trim();
      if (newText && newText !== entry.todos[idx].text) {
        const todos = (entry.todos || []).slice();
        todos[idx] = { ...todos[idx], text: newText };
        updateEntry(entry.id, { todos });
      }
      render();
    };
    input.addEventListener("blur", commit, { once: true });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); input.blur(); } });
    return;
  }
});

document.getElementById("root").addEventListener("input", (ev) => {
  const el = ev.target;
  if (el.dataset.action === "home-notice-input") {
    state.formDraft.notice = el.value;
    // カーソル位置を保つため、textarea自体は再描画せず「つぎへ」ボタンの有効/無効だけ更新する。
    const root = document.getElementById("root");
    const nextBtn = root.querySelector('[data-action="home-notice-next"]');
    if (nextBtn) nextBtn.disabled = !el.value.trim();
    schedulePersistDraft();
    return;
  }
  if (el.dataset.action === "form-input") {
    const step = STEPS[state.formIndex];
    state.formDraft[step.key] = el.value;
    // テキスト入力中の全体再描画はカーソル位置を壊すため、
    // 進捗表示やノイズ演出など周辺パーツだけを軽く更新する。
    renderFormSideEffectsOnly();
    schedulePersistDraft();
    return;
  }
  if (el.dataset.action === "category-add-input") { state.categoryDraft.label = el.value; return; }
  if (el.dataset.action === "category-edit-input") { state.categoryDraft.label = el.value; return; }
  if (el.dataset.action === "detail-input") {
    state.detailDraft[el.dataset.key] = el.value;
    return;
  }
  if (el.dataset.action === "timer-note-input") {
    const step = THINK_STEPS[state.timer.stepIndex];
    state.timer.notes[step.key] = el.value;
    // タイマーは1秒ごとに再描画されるため、メモ欄自体は再生成せず
    // 値を state に保持するだけにする（カーソル位置を壊さないため）。
    schedulePersistDraft();
    return;
  }
  if (el.dataset.action === "search-input") {
    state.search.query = el.value;
    // リスト側の再描画が必要だが、input要素自体が作り直されると
    // カーソル位置とフォーカスが失われるため、render() 後に復元する。
    const caret = el.selectionStart;
    render();
    const root = document.getElementById("root");
    const newInput = root.querySelector('[data-action="search-input"]');
    if (newInput) {
      newInput.focus();
      try { newInput.setSelectionRange(caret, caret); } catch (e) { /* noop */ }
    }
    return;
  }
});

// 1文字ごとの保存は過剰なため、入力が少し止まったタイミングでまとめて保存する。
let persistDraftTimer = null;
function schedulePersistDraft() {
  if (persistDraftTimer) clearTimeout(persistDraftTimer);
  persistDraftTimer = setTimeout(persistDraft, 400);
}

/* 入力中はカーソル位置維持のため、textarea自体は再描画せず周辺だけ更新する */
function renderFormSideEffectsOnly() {
  const filledCount = STEPS.filter((s) => state.formDraft[s.key].trim().length > 0).length;
  const complete = filledCount === STEPS.length;
  const root = document.getElementById("root");

  const countEl = root.querySelector(".field-count");
  if (countEl) countEl.textContent = `${filledCount} / ${STEPS.length} ステップ入力済み`;

  const badgeWrap = root.querySelector(".badge-wrap");
  if (badgeWrap) badgeWrap.className = `badge-wrap ${complete ? "show" : ""}`;

  const nextBtn = root.querySelector('[data-action="form-next"]');
  if (nextBtn) {
    const step = STEPS[state.formIndex];
    const canProceed = state.formDraft[step.key].trim().length > 0;
    nextBtn.disabled = !canProceed;
  }

  // ノイズ層の不透明度だけ更新
  const noiseLayers = root.querySelectorAll(".noise > div");
  if (noiseLayers.length === 2) {
    const ratio = Math.min(filledCount / STEPS.length, 1);
    noiseLayers[0].style.opacity = 0.18 * (1 - ratio);
    noiseLayers[1].style.opacity = complete ? 1 : 0;
  }
}

/* ============================================================================
 *  スマホの戻るボタン対応（popstate）
 *
 *  Androidの戻る操作は、ブラウザ上では「履歴を1つ戻る」として届く。
 *  navigateTo() で積んだ履歴を辿ってビューを戻すだけにし、
 *  履歴を再度積み直さないよう isRestoringFromHistory で抑制する。
 * ==========================================================================*/
window.addEventListener("popstate", (ev) => {
  isRestoringFromHistory = true;

  // チュートリアルモーダルが開いている場合は、戻る操作でモーダルだけ閉じる
  // （openTutorial が積んだ履歴エントリ1個分に対応）。view遷移は行わない。
  if (state.tutorialModal.open) {
    state.tutorialModal.open = false;
    TutorialSeenStore.save();
    render();
    isRestoringFromHistory = false;
    return;
  }

  // 履歴に積んだ view 情報があれば優先して使う。なければ簡易フォールバックとして
  // 詳細→一覧、日別→ふりかえり、フォーム/タイマー→ホーム、という安全な戻り先にする。
  const fallback = {
    detail: state.detailOrigin,
    dayDetail: "reflection",
    form: "home",
    timer: "home",
    settings: "home",
    categoryManage: "settings",
  };
  const wasFormOrTimer = state.view === "form" || state.view === "timer";
  const timerActive = state.timer.status === "running" || state.timer.status === "paused";
  const targetView = (ev.state && ev.state.mokuhoView) || fallback[state.view] || "home";
  if (wasFormOrTimer && targetView === "home" && !timerActive) {
    state.formDraft = { notice: "", insight: "", action: "" };
    state.formIndex = 0;
    state.continueEntryId = null;
  }
  state.view = targetView;
  persistDraft();
  render();
  isRestoringFromHistory = false;
});

/* ============================================================================
 *  リロード・アプリ切り替えへの耐性
 *
 *  デバウンス保存（schedulePersistDraft）だけでは、入力直後に即アプリを
 *  切り替えた場合に保存が間に合わない可能性があるため、
 *  ページが隠れる/閉じられる瞬間にも同期的に保存を確定させる。
 * ==========================================================================*/
function flushDraftNow() {
  if (persistDraftTimer) { clearTimeout(persistDraftTimer); persistDraftTimer = null; }
  persistDraft();
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushDraftNow();
});
window.addEventListener("pagehide", flushDraftNow);
window.addEventListener("beforeunload", flushDraftNow);

/* ============================================================================
 *  初期描画
 *  下書きを復元してから初期 history エントリを積み、最初の画面を描く。
 * ==========================================================================*/
restoreDraft();
history.replaceState({ mokuhoView: state.view }, "");
render();

// 初回起動（チュートリアル未読）の場合のみ、自動でスライドを表示する。
// render() 済みの状態に対して openTutorial() で履歴を1つ積んで重ねる。
if (!TutorialSeenStore.load()) {
  openTutorial();
}
