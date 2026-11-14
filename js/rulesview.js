// "How to play": the game's rules in a roomy, full-height view of their own (Settings only carries a button that opens it).
// One source of truth: every section is built by js/tahkim-rules.js / js/wordrules.js from the same constants and tile tables the engine uses,
// so what a player reads here cannot drift from what the game does. Pure interface: nothing here touches game state.
import { TILE_MODES } from './modes.js';
import { app } from './state.js';
import { turn, endRules, scoring, letters, tilesTable, tahkimRules, ul } from './tahkim-rules.js';
import { rulesHtml, CHECK, L, idEn, one } from './wordrules.js';
import { localize, sec, getLang } from './i18n.js';

const $ = s => document.querySelector(s);
const TABS = [
  ['basics', 'الأساسيات', 'Dasar', () => `<h3>سير الدور</h3>${ul(turn())}<h3>نهاية اللعبة</h3>${ul(endRules())}`],
  ['scoring', 'النقاط', 'Poin', () => ul(scoring())],
  ['letters', 'الحروف', 'Huruf', null],
  ['words', 'الكلمات', 'Kata', () => rulesHtml()],
  ['tahkim', 'التحكيم', 'Tahkim', () => `${ul(tahkimRules())}<h3>أسئلة الحكم</h3><ol class="wrList chk">${CHECK.map(([a, i]) => L(a, i)).join('')}</ol>`]
];
const st = { tab: 'basics', mode: null, built: false, opener: null };

function lettersBody() {
  const ids = Object.keys(TILE_MODES), cur = st.mode;
  const seg = `<div class="rdSeg" role="group" aria-label="نمط الحروف">${ids.map(id => `<button type="button" class="btn rdChip" data-mode="${id}" aria-pressed="${id === cur}">${TILE_MODES[id].labelAr}</button>`).join('')}</div>`;
  const d = getLang() === 'ar' ? TILE_MODES[cur].descAr : (sec(TILE_MODES[cur].descAr) || TILE_MODES[cur].descAr);
  return `${seg}<p class="rdDesc" lang="${getLang() === 'ar' ? 'ar' : getLang()}">${d.replace(/\n/g, ' · ')}</p>`;
}
function paint() {
  const body = $('#rdBody');
  const t = TABS.find(x => x[0] === st.tab);
  body.innerHTML = `<div class="rdIn">${t[3] ? t[3]() : lettersBody()}</div>`; localize(body);
  for (const b of $('#rdTabs').children) b.setAttribute('aria-selected', String(b.dataset.tab === st.tab)), b.tabIndex = b.dataset.tab === st.tab ? 0 : -1;
  body.setAttribute('aria-labelledby', 'rdTab-' + st.tab); body.scrollTop = 0;
}
document.addEventListener('eas:lang', () => {   // Settings > Language: the tab captions and the open page follow
  if (!st.built) return;
  TABS.forEach(([id, ar, idn]) => { const b = $('#rdTab-' + id); if (b) b.innerHTML = tabText(ar, idn); });
  paint();
});
const tabText = (ar, idn) => (getLang() === 'ar' ? `<span lang="ar">${ar}</span><small lang="id" dir="ltr">${idn}</small>` : `<span lang="${getLang()}" dir="ltr">${idEn(idn)}</span>`);
function build() {
  if (st.built) return; st.built = true;
  $('#rdTabs').innerHTML = TABS.map(([id, ar, idn]) => `<button type="button" role="tab" class="rdTab" id="rdTab-${id}" data-tab="${id}" aria-controls="rdBody">${tabText(ar, idn)}</button>`).join('');
  $('#rdTabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { st.tab = b.dataset.tab; paint(); b.focus(); } });
  $('#rdTabs').addEventListener('keydown', e => {   // arrows move between tabs (RTL: the right arrow goes to the previous one)
    const i = TABS.findIndex(x => x[0] === st.tab), rtl = getComputedStyle($('#rd')).direction === 'rtl', d = e.key === 'ArrowRight' ? (rtl ? -1 : 1) : e.key === 'ArrowLeft' ? (rtl ? 1 : -1) : 0;
    if (!d) return; e.preventDefault(); st.tab = TABS[(i + d + TABS.length) % TABS.length][0]; paint(); $('#rdTab-' + st.tab).focus();
  });
  $('#rdBody').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b) { st.mode = b.dataset.mode; paint(); $('#rdBody').querySelector(`[data-mode="${st.mode}"]`)?.focus(); } });
  $('#rdClose').onclick = () => $('#rd').close();
  $('#rd').addEventListener('close', () => { const o = st.opener; st.opener = null; if (o && o.isConnected) o.focus({ preventScroll: true }); });
  $('#rd').addEventListener('click', e => { if (e.target === $('#rd')) $('#rd').close(); });   // a tap on the backdrop closes it
}
// tab: optional section to open; mode: the tile mode whose letters are shown first (default: the mode in play).
export function openRules(tab = null, mode = null) {
  build();
  st.opener = document.activeElement;
  st.mode = TILE_MODES[mode] ? mode : (TILE_MODES[app.pendingMode || app.mode] ? (app.pendingMode || app.mode) : Object.keys(TILE_MODES)[0]);
  if (tab && TABS.some(x => x[0] === tab)) st.tab = tab;
  paint();
  if (!$('#rd').open) $('#rd').showModal();
  $('#rdTab-' + st.tab).focus({ preventScroll: true });
}
export function initRulesView() { for (const b of document.querySelectorAll('[data-rules]')) b.addEventListener('click', () => openRules(b.dataset.rules === '1' ? null : b.dataset.rules)); }
