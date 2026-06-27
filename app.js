"use strict";

/* Service Worker registration（PWA化・オフライン対応・自動更新） */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('Service Worker registered', reg);
        // ページを開いたタイミングで「新しいバージョンがあるか」をすぐ確認する
        reg.update().catch(() => {});
      })
      .catch(err => console.error('Service Worker registration failed', err));

    // 新しいService Workerに切り替わったら、自動で1回だけ画面をリロードして最新版を表示する
    let alreadyRefreshed = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (alreadyRefreshed) return;
      alreadyRefreshed = true;
      window.location.reload();
    });
  });
}

/* ============================================================
   Kaokoko v9 — 睡眠と心のバランス記録（PWA構成・自動更新対応）
   ============================================================ */

/* ---- localStorage ラッパー（失敗時はメモリで継続）---- */
const Store = {
  mem:{},
  get(k){ try{ return localStorage.getItem(k); }catch(e){ return this.mem[k] ?? null; } },
  set(k,v){ try{ localStorage.setItem(k,v); }catch(e){ this.mem[k]=v; } },
  del(k){ try{ localStorage.removeItem(k); }catch(e){ delete this.mem[k]; } }
};
const K_DIARIES="kaokoko_diaries", K_DRAFTS="kaokoko_drafts", K_THEME="kaokoko_theme", K_REMINDER="kaokoko_reminder";

function loadJSON(k,def){ try{ return JSON.parse(Store.get(k)) || def; }catch(e){ return def; } }
let diaries = loadJSON(K_DIARIES,{});   // { 'YYYY-MM-DD': {id,date,stamp,sleep_hours,memo} }
let drafts  = loadJSON(K_DRAFTS,{});    // { 'YYYY-MM-DD': {stamp,sleep,memo} }
let reminder = loadJSON(K_REMINDER,{enabled:false, time:"21:00"});
function saveDiaries(){ Store.set(K_DIARIES, JSON.stringify(diaries)); }
function saveDrafts(){ Store.set(K_DRAFTS, JSON.stringify(drafts)); }
function saveReminder(){ Store.set(K_REMINDER, JSON.stringify(reminder)); }

/* ---- スタンプ（5種固定）---- */
const STAMPS=[
  {e:"😆", label:"すごく笑顔", color:"#f4955f"},
  {e:"🙂", label:"にっこり",   color:"#e9c06b"},
  {e:"😐", label:"普通の顔",   color:"#8fb8c2"},
  {e:"😡", label:"怒ってる",   color:"#f06b78"},
  {e:"😭", label:"泣いてる",   color:"#7e9cc7"}
];
const STAMP_COLOR={}, STAMP_LABEL={};
STAMPS.forEach(s=>{ STAMP_COLOR[s.e]=s.color; STAMP_LABEL[s.e]=s.label; });
const STAMP_LIST = STAMPS.map(s=>s.e);

/* ---- 睡眠時間の選択肢（1時間単位・両端は「以下／以上」）---- */
const SLEEP_HOURS=[1,2,3,4,5,6,7,8,9,10,11,12];
function sleepLabel(h){
  if(h==null) return null;
  if(h<=1) return "1時間以下";
  if(h>=12) return "12時間以上";
  return `${h}時間`;
}

const WD=["日","月","火","水","木","金","土"];

/* ---- 日付ユーティリティ（ローカル基準）---- */
function pad(n){ return String(n).padStart(2,"0"); }
function dateStr(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function todayStr(){ return dateStr(new Date()); }
function addDays(ds,n){ const [y,m,d]=ds.split("-").map(Number); return dateStr(new Date(y,m-1,d+n)); }
function daysInMonth(y,m){ return new Date(y,m,0).getDate(); }
function firstWeekday(y,m){ return new Date(y,m-1,1).getDay(); }
function dowOf(ds){ const [y,m,d]=ds.split("-").map(Number); return new Date(y,m-1,d).getDay(); }
function fmtHeaderDate(s){ const [y,m,d]=s.split("-").map(Number); const wd=WD[new Date(y,m-1,d).getDay()]; return {y,m,d,wd}; }
function genId(d){ try{ return crypto.randomUUID(); }catch(e){ return d+"-"+Date.now(); } }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

/* ---- 旧データ（顔文字16種＋スコア）からの自動移行 ---- */
function migrateDiaries(){
  const scoreToStamp={1:"😭",2:"😡",3:"😐",4:"🙂",5:"😆"};
  let changed=false;
  for(const ds in diaries){
    const e=diaries[ds];
    if(!e.stamp || !STAMP_LIST.includes(e.stamp)){
      if(e.mood_emoji && STAMP_LIST.includes(e.mood_emoji)) e.stamp=e.mood_emoji;
      else e.stamp = scoreToStamp[e.mood_score] || "😐";
      changed=true;
    }
    if(e.sleep_hours===undefined){ e.sleep_hours=null; changed=true; }
    if("mood_emoji" in e || "mood_score" in e){ delete e.mood_emoji; delete e.mood_score; changed=true; }
  }
  if(changed) saveDiaries();
}
migrateDiaries();

/* ---- 連続記録 ---- */
function computeStreak(){
  let start=todayStr();
  if(!diaries[start]) start=addDays(todayStr(),-1);
  if(!diaries[start]) return 0;
  let cur=0, cursor=start;
  while(diaries[cursor]){ cur++; cursor=addDays(cursor,-1); }
  return cur;
}
function computeLongest(){
  const dates=Object.keys(diaries).sort();
  if(!dates.length) return 0;
  let longest=1, run=1;
  for(let i=1;i<dates.length;i++){ if(addDays(dates[i-1],1)===dates[i]) run++; else run=1; if(run>longest) longest=run; }
  return longest;
}

/* ============================================================
   ナビゲーション（History API主体・戻るボタン対応）
   ============================================================ */
let currentScreen="home", historyOk=true, manualStack=[{screen:"home"}];
function showScreen(state){
  state = state || {screen:"home"};
  currentScreen = state.screen;
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  const el=document.getElementById("screen-"+state.screen); if(el) el.classList.add("active");
  window.scrollTo(0,0);
  if(state.screen==="home") renderHome();
  else if(state.screen==="input") openInput(state.date);
  else if(state.screen==="report") renderReport();
  else if(state.screen==="settings") syncSettings();
}
function navigate(screen, data){
  const state=Object.assign({screen}, data||{});
  showScreen(state);
  if(historyOk){ try{ history.pushState(state,""); }catch(e){ historyOk=false; manualStack.push(state); } }
  else manualStack.push(state);
}
function goBack(){
  if(historyOk){ history.back(); }
  else if(manualStack.length>1){ manualStack.pop(); showScreen(manualStack[manualStack.length-1]); }
}
window.addEventListener("popstate", e=> showScreen(e.state || {screen:"home"}) );

/* ============================================================
   ホーム
   ============================================================ */
const today=new Date();
let viewYM={ y:today.getFullYear(), m:today.getMonth()+1 };
function renderHome(){ renderTodayCard(); renderCalendar(); maybeShowNudge(); }

function renderTodayCard(){
  const ds=todayStr(), h=fmtHeaderDate(ds), e=diaries[ds];
  document.getElementById("today-date").textContent=`${h.m}月${h.d}日（${h.wd}）`;
  const body=document.getElementById("today-body");
  if(e){
    const sleepTxt = (e.sleep_hours!=null) ? `🛌 ${sleepLabel(e.sleep_hours)}` : "🛌 睡眠時間 未記録";
    body.innerHTML = `<div class="today-recorded"><span class="today-emo">${e.stamp}</span><div class="today-info"><div class="today-sleep">${sleepTxt}</div><div class="today-edit-hint">タップして編集</div></div></div>`;
  }else{
    body.innerHTML = `<div class="today-empty"><div class="today-empty-text">きょうは まだ記録していません</div><span class="today-cta">きろくする</span></div>`;
  }
  const cur=computeStreak(), sEl=document.getElementById("today-streak");
  if(cur>=1){ sEl.style.display="block"; sEl.textContent = e ? `🔥 ${cur}日つづけて記録中` : `🔥 ${cur}日連続・今日でのばそう`; }
  else sEl.style.display="none";
  document.getElementById("today-card").style.setProperty("--mood-tint", e ? (STAMP_COLOR[e.stamp]+"55") : "rgba(244,122,94,.16)");
}
document.getElementById("today-card").addEventListener("click", ()=> navigate("input",{date:todayStr()}));

function renderCalendar(){
  document.getElementById("home-month").textContent=`${viewYM.y}年${viewYM.m}月`;
  const cal=document.getElementById("calendar");
  const fw=firstWeekday(viewYM.y,viewYM.m), dim=daysInMonth(viewYM.y,viewYM.m), ts=todayStr();
  let html="";
  for(let i=0;i<fw;i++) html+=`<div class="cell blank"></div>`;
  for(let d=1;d<=dim;d++){
    const ds=`${viewYM.y}-${pad(viewYM.m)}-${pad(d)}`, e=diaries[ds];
    const isToday = ds===ts ? " today" : "";
    if(e){ const c=STAMP_COLOR[e.stamp]||"#ccc";
      html+=`<button class="cell has${isToday}" data-date="${ds}" style="background:${c}1f"><span class="day">${d}</span><span class="emo">${e.stamp}</span></button>`;
    }else{
      html+=`<button class="cell empty-day${isToday}" data-date="${ds}"><span class="day">${d}</span><span class="add">+</span></button>`;
    }
  }
  cal.innerHTML=html;
}

/* ============================================================
   入力（自動保存つき）
   ============================================================ */
let editingDate=todayStr();
let form={stamp:null, sleep:null, memo:""};

function openInput(date){
  editingDate = date || todayStr();
  const dr=drafts[editingDate], ex=diaries[editingDate];
  if(dr) form={stamp:dr.stamp??null, sleep:(dr.sleep!=null?dr.sleep:null), memo:dr.memo??""};
  else if(ex) form={stamp:ex.stamp, sleep:(ex.sleep_hours!=null?ex.sleep_hours:null), memo:ex.memo||""};
  else form={stamp:null, sleep:null, memo:""};
  const h=fmtHeaderDate(editingDate);
  document.getElementById("input-date").innerHTML=`<b>${h.m}月${h.d}日</b>（${h.wd}）`;
  document.getElementById("memo").value=form.memo;
  document.getElementById("memo-count").textContent=`${form.memo.length} / 140`;
  document.getElementById("input-delete").hidden = !diaries[editingDate];
  updateInputUI(false);
}
function updateInputUI(pop){
  document.querySelectorAll("#stamp-row button").forEach(b=>{
    const sel = b.dataset.emoji===form.stamp;
    b.classList.toggle("sel", sel);
    if(sel){
      b.style.background = STAMP_COLOR[form.stamp]+"1f";
      b.style.outlineColor = STAMP_COLOR[form.stamp];
      if(pop){ b.classList.remove("spop"); void b.offsetWidth; b.classList.add("spop"); }
    }else{ b.style.background=""; b.style.outlineColor=""; }
  });
  const cap=document.getElementById("stamp-caption");
  cap.textContent = form.stamp ? STAMP_LABEL[form.stamp] : "タップしてえらんでね";
  cap.classList.toggle("active", !!form.stamp);

  const sel=document.getElementById("sleep-select");
  sel.value = (form.sleep!=null) ? String(form.sleep) : "";
  sel.classList.toggle("placeholder", form.sleep==null);

  document.getElementById("save-btn").disabled = !form.stamp;
}
function persistDraft(){ drafts[editingDate]={stamp:form.stamp, sleep:form.sleep, memo:form.memo}; saveDrafts(); }
function selectStamp(emoji){ form.stamp=emoji; updateInputUI(true); persistDraft(); }
function selectSleep(val){ form.sleep = val ? Number(val) : null; updateInputUI(false); persistDraft(); }
function saveEntry(){
  if(!form.stamp){ toast("顔をえらんでね"); return; }
  const ex=diaries[editingDate];
  diaries[editingDate]={ id: ex?ex.id:genId(editingDate), date:editingDate, stamp:form.stamp, sleep_hours:form.sleep, memo:form.memo.trim() };
  saveDiaries(); delete drafts[editingDate]; saveDrafts();
  toast("保存しました 🌙"); goBack();
}
function deleteEntry(){
  openConfirm({ title:"この日の記録を削除しますか？", body:"選んだ日の記録を削除します。元に戻せません。", confirmLabel:"削除する", danger:true,
    onConfirm:()=>{ delete diaries[editingDate]; delete drafts[editingDate]; saveDiaries(); saveDrafts(); toast("削除しました"); goBack(); } });
}

/* コントロール生成（1回） */
(function buildControls(){
  let s=""; STAMPS.forEach(st=> s+=`<button data-emoji="${st.e}">${st.e}</button>`);
  document.getElementById("stamp-row").innerHTML=s;

  let opts=`<option value="" disabled selected>選んでください</option>`;
  SLEEP_HOURS.forEach(h=> opts+=`<option value="${h}">${sleepLabel(h)}</option>`);
  document.getElementById("sleep-select").innerHTML=opts;
})();

/* ============================================================
   レポート（週 / 月 / 年）
   ============================================================ */
let reportPeriod="month";
let reportCursor=todayStr();
function updateSegUI(){ document.querySelectorAll("#period-seg button").forEach(b=> b.classList.toggle("on", b.dataset.p===reportPeriod)); }
function setPeriod(p){ reportPeriod=p; renderReport(); }
function shiftPeriod(delta){
  if(reportPeriod==="week") reportCursor=addDays(reportCursor, delta*7);
  else if(reportPeriod==="month"){ const [y,m]=reportCursor.split("-").map(Number); let mm=m+delta,yy=y; if(mm<1){mm=12;yy--;} if(mm>12){mm=1;yy++;} reportCursor=`${yy}-${pad(mm)}-01`; }
  else { const [y]=reportCursor.split("-").map(Number); reportCursor=`${y+delta}-01-01`; }
  renderReport();
}
function periodRange(){
  const c=reportCursor;
  if(reportPeriod==="week"){ const start=addDays(c,-dowOf(c)); return {start, end:addDays(start,6)}; }
  if(reportPeriod==="month"){ const [y,m]=c.split("-").map(Number); return {start:`${y}-${pad(m)}-01`, end:`${y}-${pad(m)}-${pad(daysInMonth(y,m))}`}; }
  const [y]=c.split("-").map(Number); return {start:`${y}-01-01`, end:`${y}-12-31`};
}
function periodLabel(){
  if(reportPeriod==="week"){ const {start,end}=periodRange(); const a=fmtHeaderDate(start), b=fmtHeaderDate(end); return `${a.m}/${a.d}〜${b.m}/${b.d}`; }
  if(reportPeriod==="month"){ const [y,m]=reportCursor.split("-").map(Number); return `${y}年${m}月`; }
  const [y]=reportCursor.split("-").map(Number); return `${y}年`;
}
function entriesInRange(s,e){
  const out=[];
  for(const ds in diaries){ if(ds>=s && ds<=e){ const en=diaries[ds]; out.push({date:ds, stamp:en.stamp, sleep_hours:en.sleep_hours, memo:en.memo||""}); } }
  out.sort((a,b)=> a.date<b.date?-1:1);
  return out;
}

function renderReport(){
  updateSegUI();
  document.getElementById("rep-label").textContent=periodLabel();
  const {start,end}=periodRange();
  const entries=entriesInRange(start,end);
  const body=document.getElementById("report-body");
  if(entries.length===0){
    body.innerHTML=`<div class="empty-state"><span class="big">🌙</span>この期間の記録はまだありません<br>ホームから記録してみましょう</div>`;
    return;
  }
  const withSleep = entries.filter(e=>e.sleep_hours!=null);
  const avgSleep = withSleep.length ? (withSleep.reduce((a,e)=>a+e.sleep_hours,0)/withSleep.length).toFixed(1) : "–";
  const cur=computeStreak(), longest=computeLongest();

  // チャート用データ
  let points=[], xMax=1, xLabels=[], chartTitle="睡眠とこころの推移";
  if(reportPeriod==="week"){
    points = withSleep.map(e=>({x:dowOf(e.date)+1, h:e.sleep_hours, emoji:e.stamp}));
    xMax=7; for(let i=1;i<=7;i++) xLabels.push({x:i,text:WD[i-1]});
  }else if(reportPeriod==="month"){
    const [yy,mm]=reportCursor.split("-").map(Number); const dim=daysInMonth(yy,mm);
    points = withSleep.map(e=>({x:Number(e.date.split("-")[2]), h:e.sleep_hours, emoji:e.stamp}));
    xMax=dim; xLabels=(dim<=1?[1]:[1,Math.ceil(dim/2),dim]).map(d=>({x:d,text:String(d)}));
  }else{
    const byMonth={};
    entries.forEach(e=>{ const mo=Number(e.date.split("-")[1]); (byMonth[mo]=byMonth[mo]||[]).push(e); });
    points = Object.entries(byMonth).map(([mo,arr])=>{
      const sl=arr.filter(e=>e.sleep_hours!=null);
      const avgH = sl.length ? sl.reduce((a,e)=>a+e.sleep_hours,0)/sl.length : null;
      if(avgH==null) return null;
      const cnt={}; arr.forEach(e=>cnt[e.stamp]=(cnt[e.stamp]||0)+1);
      const modal=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0][0];
      return {x:Number(mo), h:avgH, emoji:modal};
    }).filter(Boolean);
    xMax=12; xLabels=[1,4,7,10,12].map(mo=>({x:mo,text:mo+"月"}));
    chartTitle="月ごとの平均睡眠とこころ";
  }
  const chartHtml = points.length ? chartSVG(points, xMax, xLabels) : `<div class="review-empty">睡眠時間の記録がまだありません</div>`;

  // きもちの割合
  const dist={}; STAMPS.forEach(s=>dist[s.e]=0);
  entries.forEach(e=>{ if(dist[e.stamp]!=null) dist[e.stamp]++; });
  const total=entries.length;
  let distHtml=""; STAMPS.forEach(s=>{ const pct=total?Math.round((dist[s.e]||0)/total*100):0;
    distHtml+=`<div class="dist-row"><span class="emo">${s.e}</span><span class="dist-bar"><i style="width:${pct}%;background:${s.color}"></i></span><span class="cnt">${dist[s.e]||0}件</span></div>`; });

  // ハイライト（睡眠の長短）
  let hlHtml;
  if(withSleep.length){
    const sortedSleep=withSleep.slice().sort((a,b)=>a.sleep_hours-b.sleep_hours);
    const least=sortedSleep[0], most=sortedSleep[sortedSleep.length-1];
    function hlRow(lbl,ent){ const h=fmtHeaderDate(ent.date); const mm=ent.memo?`<div class="mm">${escapeHtml(ent.memo)}</div>`:"";
      return `<div class="hl-row" data-date="${ent.date}"><span class="emo">${ent.stamp}</span><div class="meta"><div class="lbl">${lbl}</div><div class="dt">${h.m}月${h.d}日（${h.wd}）・${sleepLabel(ent.sleep_hours)}</div>${mm}</div></div>`; }
    hlHtml=hlRow("よく眠れた日",most);
    if(most.date!==least.date) hlHtml+=`<div class="hl-divider"></div>`+hlRow("あまり眠れなかった日",least);
  }else{
    hlHtml=`<div class="review-empty">睡眠時間の記録がまだありません</div>`;
  }

  // メモ振り返り
  let withMemo=entries.filter(e=>e.memo && e.memo.trim());
  const capped=withMemo.length>20; withMemo=withMemo.slice(-20).reverse();
  let reviewHtml = withMemo.length ? withMemo.map(e=>{ const h=fmtHeaderDate(e.date);
      return `<div class="review-item" data-date="${e.date}"><span class="emo">${e.stamp}</span><div class="body"><div class="dt">${h.m}月${h.d}日（${h.wd}）</div><div class="tx">${escapeHtml(e.memo)}</div></div></div>`;
    }).join("") + (capped?`<div class="review-empty" style="padding-top:10px;">最近の20件を表示中</div>`:"") : `<div class="review-empty">この期間のメモはまだありません</div>`;

  body.innerHTML=`
    <div class="report-summary">
      <div class="stat-card"><div class="num">${avgSleep}</div><div class="lbl">平均睡眠時間</div></div>
      <div class="stat-card"><div class="num">${entries.length}</div><div class="lbl">記録した日</div></div>
      <div class="stat-card"><div class="num">🔥${cur}</div><div class="lbl">連続記録</div></div>
    </div>
    <div class="longest-line">最長 ${longest}日連続</div>
    <div class="card"><h3>${chartTitle}</h3>${chartHtml}</div>
    <div class="card"><h3>ハイライト</h3>${hlHtml}</div>
    <div class="card"><h3>メモの振り返り</h3>${reviewHtml}</div>
    <div class="card"><h3>きもちの割合</h3>${distHtml}</div>`;
}

/* 睡眠の折れ線＋その日のスタンプを連動表示するチャート */
function chartSVG(points, xMax, xLabels){
  const W=320,H=190,padL=24,padR=14,padT=20,padB=28;
  const innerW=W-padL-padR, innerH=H-padT-padB, maxY=12;
  const xFor=x=> xMax<=1 ? padL+innerW/2 : padL+innerW*(x-1)/(xMax-1);
  const yFor=h=> padT+innerH*(1-(Math.min(h,maxY)/maxY));
  let grid="";
  [0,3,6,9,12].forEach(v=>{ const y=yFor(v).toFixed(1);
    grid+=`<line class="grid" x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}"/>`;
    grid+=`<text class="ytick" x="${padL-6}" y="${(+y+3).toFixed(1)}" text-anchor="end">${v}</text>`;
  });
  let xlab=""; xLabels.forEach(l=>{ xlab+=`<text class="xtick" x="${xFor(l.x).toFixed(1)}" y="${H-9}" text-anchor="middle">${l.text}</text>`; });
  const pts=points.slice().sort((a,b)=>a.x-b.x);
  let area="",line="",markers="";
  if(pts.length){
    const coords=pts.map(p=>`${xFor(p.x).toFixed(1)},${yFor(p.h).toFixed(1)}`);
    if(pts.length>1){
      line=`<polyline class="line" points="${coords.join(" ")}"/>`;
      const baseY=yFor(0).toFixed(1);
      area=`<polygon class="area" points="${xFor(pts[0].x).toFixed(1)},${baseY} ${coords.join(" ")} ${xFor(pts[pts.length-1].x).toFixed(1)},${baseY}"/>`;
    }
    markers=pts.map(p=>`<text class="emoji-mark" x="${xFor(p.x).toFixed(1)}" y="${(yFor(p.h)+5).toFixed(1)}" text-anchor="middle">${p.emoji}</text>`).join("");
  }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${area}${line}${markers}${xlab}</svg>`;
}

/* ============================================================
   テーマ & 設定
   ============================================================ */
function applyTheme(t){
  document.documentElement.setAttribute("data-theme",t);
  Store.set(K_THEME,t);
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute("content", t==="dark" ? "#211a16" : "#fff5ef");
}
function syncSettings(){
  const t=document.documentElement.getAttribute("data-theme");
  document.getElementById("theme-toggle").checked = t==="dark";
  document.getElementById("theme-thumb").textContent = t==="dark" ? "🌙" : "☀️";
  updateReminderUI();
}

/* ============================================================
   リマインダー（開いたときにお知らせ＋通知許可があれば通知も）
   ============================================================ */
let reminderTimer=null, nudgeDismissed=false;
function isPastReminderTime(){
  if(!reminder.time) return false;
  const [hh,mm]=reminder.time.split(":").map(Number);
  const now=new Date();
  return now.getHours()>hh || (now.getHours()===hh && now.getMinutes()>=mm);
}
function maybeShowNudge(){
  const banner=document.getElementById("nudge");
  const due = reminder.enabled && !diaries[todayStr()] && isPastReminderTime() && !nudgeDismissed;
  banner.style.display = due ? "flex" : "none";
}
function scheduleReminder(){
  clearTimeout(reminderTimer);
  if(!reminder.enabled) return;
  const [hh,mm]=reminder.time.split(":").map(Number);
  const now=new Date(); const target=new Date(); target.setHours(hh,mm,0,0);
  if(target<=now) return;
  reminderTimer=setTimeout(()=>{
    if(reminder.enabled && !diaries[todayStr()]){
      if("Notification" in window && Notification.permission==="granted"){
        try{ new Notification("Kaokoko", {body:"きょうの睡眠とこころを記録しましょう 🌙"}); }catch(e){}
      }
      nudgeDismissed=false;
      if(currentScreen==="home") maybeShowNudge();
    }
  }, target-now);
}
function updateReminderUI(){
  document.getElementById("reminder-toggle").checked=reminder.enabled;
  document.getElementById("reminder-time").value=reminder.time;
  document.getElementById("reminder-time-row").classList.toggle("off", !reminder.enabled);
  const note=document.getElementById("reminder-note");
  if(!reminder.enabled) note.textContent="";
  else if(!("Notification" in window)) note.textContent="この端末では通知に未対応です。アプリを開いたときのお知らせのみ有効です。";
  else if(Notification.permission==="granted") note.textContent="通知ON（アプリを開いている間）＋アプリを開いたときにもお知らせします。";
  else if(Notification.permission==="denied") note.textContent="通知はブロック中。アプリを開いたときのお知らせのみ有効です。";
  else note.textContent="アプリを開いたときにお知らせします（通知を許可すると、開いている間は通知も出ます）。";
}

/* ============================================================
   バックアップ / 復元 / 全消去
   ============================================================ */
function exportData(){
  const data={ app:"Kaokoko", version:9, exportedAt:new Date().toISOString(), diaries };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=`kaokoko_backup_${todayStr()}.json`;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); },120);
  toast("エクスポートしました");
}
function importData(file){
  const r=new FileReader();
  r.onload=()=>{
    try{
      const parsed=JSON.parse(r.result), incoming=parsed.diaries||parsed; let n=0;
      const scoreToStamp={1:"😭",2:"😡",3:"😐",4:"🙂",5:"😆"};
      for(const [date,e] of Object.entries(incoming)){
        if(!e || typeof e!=="object") continue;
        let stamp=e.stamp;
        if(!stamp || !STAMP_LIST.includes(stamp)){
          if(e.mood_emoji && STAMP_LIST.includes(e.mood_emoji)) stamp=e.mood_emoji;
          else if(e.mood_score) stamp=scoreToStamp[e.mood_score]||"😐";
        }
        if(!stamp) continue;
        diaries[date]={ id:e.id||genId(date), date, stamp, sleep_hours:(e.sleep_hours!=null?Number(e.sleep_hours):null), memo:e.memo||"" };
        n++;
      }
      saveDiaries(); if(currentScreen==="home") renderHome();
      toast(`${n}件を読み込みました`);
    }catch(err){ toast("読み込めませんでした"); }
  };
  r.readAsText(file);
}
function clearAll(){ diaries={}; drafts={}; saveDiaries(); saveDrafts(); toast("すべて消去しました"); }

/* ============================================================
   モーダル & トースト
   ============================================================ */
let modalConfirmCb=null;
function openConfirm(opt){
  document.getElementById("modal-title").textContent=opt.title||"確認";
  document.getElementById("modal-body").textContent=opt.body||"";
  const c=document.getElementById("modal-confirm");
  c.textContent=opt.confirmLabel||"OK"; c.classList.toggle("danger", !!opt.danger);
  modalConfirmCb=opt.onConfirm||null;
  document.getElementById("modal").classList.add("show");
}
function closeModal(){ document.getElementById("modal").classList.remove("show"); modalConfirmCb=null; }
let toastTimer=null;
function toast(msg){ const t=document.getElementById("toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove("show"),1800); }

/* ============================================================
   イベント結線
   ============================================================ */
document.getElementById("nav-report").onclick   = ()=>{ reportCursor=todayStr(); navigate("report"); };
document.getElementById("nav-settings").onclick = ()=>navigate("settings");
document.getElementById("fab-add").onclick      = ()=>navigate("input",{date:todayStr()});
document.getElementById("input-back").onclick    = goBack;
document.getElementById("input-delete").onclick  = deleteEntry;
document.getElementById("report-back").onclick   = goBack;
document.getElementById("settings-back").onclick = goBack;
document.getElementById("nudge-close").onclick   = ()=>{ nudgeDismissed=true; document.getElementById("nudge").style.display="none"; };

function changeMonth(delta){ let m=viewYM.m+delta,y=viewYM.y; if(m<1){m=12;y--;} if(m>12){m=1;y++;} viewYM={y,m}; renderCalendar(); }
document.getElementById("home-prev").onclick=()=>changeMonth(-1);
document.getElementById("home-next").onclick=()=>changeMonth(1);

document.getElementById("period-seg").addEventListener("click", e=>{ const b=e.target.closest("button[data-p]"); if(b) setPeriod(b.dataset.p); });
document.getElementById("rep-prev").onclick=()=>shiftPeriod(-1);
document.getElementById("rep-next").onclick=()=>shiftPeriod(1);

document.getElementById("calendar").addEventListener("click", e=>{ const cell=e.target.closest(".cell[data-date]"); if(cell) navigate("input",{date:cell.dataset.date}); });
document.getElementById("report-body").addEventListener("click", e=>{ const el=e.target.closest("[data-date]"); if(el) navigate("input",{date:el.dataset.date}); });

document.getElementById("stamp-row").addEventListener("click", e=>{ const b=e.target.closest("button[data-emoji]"); if(b) selectStamp(b.dataset.emoji); });
document.getElementById("sleep-select").addEventListener("change", e=> selectSleep(e.target.value));
const memoEl=document.getElementById("memo");
memoEl.addEventListener("input", ()=>{ form.memo=memoEl.value; document.getElementById("memo-count").textContent=`${form.memo.length} / 140`; persistDraft(); });
document.getElementById("save-btn").onclick=saveEntry;

document.getElementById("btn-export").onclick=exportData;
document.getElementById("btn-import").onclick=()=>document.getElementById("import-file").click();
document.getElementById("import-file").addEventListener("change", e=>{ const f=e.target.files[0]; if(f) importData(f); e.target.value=""; });
document.getElementById("theme-toggle").addEventListener("change", e=>{ applyTheme(e.target.checked?"dark":"light"); syncSettings(); });

document.getElementById("reminder-toggle").addEventListener("change", e=>{
  reminder.enabled=e.target.checked; saveReminder();
  if(reminder.enabled && "Notification" in window && Notification.permission==="default"){
    Notification.requestPermission().then(()=>updateReminderUI());
  }
  updateReminderUI(); scheduleReminder();
});
document.getElementById("reminder-time").addEventListener("change", e=>{
  reminder.time=e.target.value || "21:00"; saveReminder(); scheduleReminder(); updateReminderUI();
});

document.getElementById("btn-clear").onclick=()=>openConfirm({
  title:"本当に消去しますか？", body:"すべての記録が完全に削除されます。元に戻せません。", confirmLabel:"消去する", danger:true,
  onConfirm:()=>{ clearAll(); if(currentScreen==="home") renderHome(); }
});

document.getElementById("modal-cancel").onclick=closeModal;
document.getElementById("modal-confirm").onclick=()=>{ const cb=modalConfirmCb; closeModal(); if(cb) cb(); };
document.getElementById("modal").addEventListener("click", e=>{ if(e.target.id==="modal") closeModal(); });

document.addEventListener("visibilitychange", ()=>{
  if(document.hidden){ if(currentScreen==="input") persistDraft(); }
  else { scheduleReminder(); if(currentScreen==="home") maybeShowNudge(); }
});

/* ============================================================
   初期化
   ============================================================ */
(function init(){
  const saved=Store.get(K_THEME);
  const t = saved || (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark":"light");
  applyTheme(t);
  updateReminderUI();
  scheduleReminder();
  try{ history.replaceState({screen:"home"},""); }catch(e){ historyOk=false; }
  showScreen({screen:"home"});
})();
