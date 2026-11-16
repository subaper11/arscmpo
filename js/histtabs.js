// The word-log panel has three tabs: الكلمات (words), الدردشة (chat, online only) and التحكيم (Tahkim records, online only).
// Offline the tab bar is hidden and the panel is exactly the word log it always was. Pure interface: nothing here touches game state.
// Badges: chat shows a count of unread messages (chat only: never the word log or the Tahkim log); Tahkim shows its own, urgent-looking dot.
import { $ } from './state.js';

const TABS = ['words', 'chat', 'tahkim'], PANE = { words: 'hPaneW', chat: 'hPaneC', tahkim: 'hPaneT' }, BTN = { words: 'hTabW', chat: 'hTabC', tahkim: 'hTabT' };
const st = { tab: 'words', online: false };
const listeners = new Set();
export const onTab = fn => listeners.add(fn);
export const currentTab = () => st.tab;

export function showTab(t) {
  if (!TABS.includes(t) || (!st.online && t !== 'words')) t = 'words';
  st.tab = t;
  for (const k of TABS) {
    $('#' + PANE[k]).hidden = k !== t;
    const b = $('#' + BTN[k]); b.setAttribute('aria-selected', String(k === t)); b.tabIndex = k === t ? 0 : -1;
  }
  $('#hist').dataset.tab = t;
  listeners.forEach(fn => fn(t));
}
export function setTabsOnline(on) {
  on = !!on; if (st.online === on) return;
  st.online = on; $('#hTabs').hidden = !on; $('#hist').classList.toggle('hasTabs', on);
  showTab(on ? st.tab : 'words');
}
// n: a count (0 hides it); the Tahkim badge is a plain dot.
export function setBadge(which, n) {
  const el = $(which === 'chat' ? '#hBadgeC' : '#hBadgeT'), txt = which === 'chat' ? (n > 9 ? '9+' : String(n)) : '!';
  el.hidden = !n; if (n && el.textContent !== txt) el.textContent = txt;
}
// The unread count also shows on the buttons that open the panel (#bLog in the drawer layout, the show/hide toggle in the docked one) through a data attribute CSS draws.
export function setOpenerBadge(n) {
  for (const id of ['bLog', 'hToggle']) { const b = $('#' + id); if (!b) continue; if (n) b.dataset.unread = n > 9 ? '9+' : String(n); else delete b.dataset.unread; }
}
export function initHistTabs() {
  $('#hTabs').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) showTab(b.dataset.t); });
  $('#hTabs').addEventListener('keydown', e => {
    const d = e.key === 'ArrowRight' ? -1 : e.key === 'ArrowLeft' ? 1 : 0;   // the log is right-to-left: the right arrow is the previous tab
    if (!d) return; e.preventDefault(); const t = TABS[(TABS.indexOf(st.tab) + d + TABS.length) % TABS.length]; showTab(t); $('#' + BTN[t]).focus();
  });
}
