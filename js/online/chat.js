// Match chat (online). It lives in the word-log panel as its own tab (الدردشة), separate from the word log and from the Tahkim log.
// The server keeps the conversation in games.ext.chat and sends it with every snapshot (see supabase/functions/_shared/core/engine.js, chatMessage); this module
//  * draws it (text nodes only: a message can never inject markup),
//  * counts unread messages from the OTHER player (chat only: the badge never counts words or Tahkim records) and shows a short preview toast while the chat is not on screen,
//  * sends a message through the handler it is given (it never talks to the network itself).
// Unread bookkeeping is per device and per game (localStorage, so a refresh does not turn old messages into new ones); nothing here is sent anywhere.
import { localize, setTxt, bt } from '../i18n.js';
import { $ } from '../state.js';
import { nameIso } from '../names.js';
import { haptic } from '../haptics.js';
import { CHAT_MSG_MAX } from '../config.js';
import { setTabsOnline, setBadge, setOpenerBadge, currentTab, onTab } from '../histtabs.js';
import { isLogShown, openLog } from '../histview.js';

const SEEN = 'eas.chat.seen.', MUTE = 'eas.chat.mute', QUICK = ['حظًا موفقًا', 'شكرًا', 'هل أنت جاهز؟', 'لحظة من فضلك', 'أحسنت!'];
const TOAST_MS = 5200;
const st = { id: '', seen: 0, sig: '', sending: false, wired: false, toastT: 0, handler: null, mute: false, lastTkLog: null, tkUnread: 0 };
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const hhmm = t => { try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
const load = k => { try { return localStorage.getItem(k); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(k, String(v)); } catch { /* storage unavailable: unread simply restarts */ } };

const visible = () => isLogShown() && currentTab() === 'chat' && !document.hidden;

function wire() {
  if (st.wired) return; st.wired = true;
  st.mute = load(MUTE) === '1'; paintMute();
  $('#chMute').onclick = () => { st.mute = !st.mute; save(MUTE, st.mute ? '1' : '0'); paintMute(); if (st.mute) hideToast(); };
  $('#chQuick').replaceChildren(...QUICK.map(t => { const b = el('button', 'btn chChip', t); b.type = 'button'; b.onclick = () => send(t); return b; }));
  localize($('#chQuick'));
  const ta = $('#chText');
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#chForm').requestSubmit(); } });
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 92) + 'px'; });
  $('#chForm').addEventListener('submit', async e => { e.preventDefault(); const text = ta.value.replace(/\s+/g, ' ').trim(); if (!text) return; if (await send(text)) { ta.value = ''; ta.style.height = 'auto'; } ta.focus({ preventScroll: true }); });
  // The preview toast: a tap opens the chat.
  const t = el('button', 'chToast'); t.type = 'button'; t.id = 'chToast'; t.hidden = true; t.setAttribute('aria-label', bt('رسالة جديدة، اضغط لفتح الدردشة')); t.title = bt('رسالة جديدة، اضغط لفتح الدردشة');
  t.append(el('b', 'chToastWho'), el('span', 'chToastTx')); t.onclick = () => { hideToast(); openLog('chat'); };
  document.body.append(t);
  onTab(() => markReadIfVisible());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) markReadIfVisible(); });
  // the log panel opening or closing (drawer button, docked toggle) changes what is on screen
  for (const id of ['bLog', 'hToggle']) $('#' + id).addEventListener('click', () => setTimeout(markReadIfVisible, 0));
}
function paintMute() { const b = $('#chMute'); b.setAttribute('aria-pressed', String(st.mute)); setTxt(b.querySelector('.lbl'), st.mute ? 'الإشعارات مكتومة' : 'كتم'); b.title = bt(st.mute ? 'إلغاء كتم الإشعارات' : 'كتم إشعارات الرسائل'); }
function hideToast() { clearTimeout(st.toastT); const t = $('#chToast'); if (t) t.hidden = true; }
function showToast(m) {
  if (st.mute || visible()) return;
  const t = $('#chToast'), tx = [...m.t].slice(0, 70).join('') + ([...m.t].length > 70 ? '…' : '');
  t.querySelector('.chToastWho').textContent = nameIso(m.s); t.querySelector('.chToastTx').textContent = tx;
  t.hidden = false; clearTimeout(st.toastT); st.toastT = setTimeout(hideToast, TOAST_MS);
}
async function send(text) {
  if (st.sending || !st.handler) return false;
  st.sending = true; paintSend();
  try { return await st.handler(text); } finally { st.sending = false; paintSend(); }
}
function paintSend() { $('#chSend').disabled = st.sending; $('#chText').readOnly = st.sending; for (const b of $('#chQuick').children) b.disabled = st.sending; }

let lastSnap = null;
function unreadCount(chat, me) { return chat.filter(m => m.n > st.seen && m.s !== me).length; }
function paintBadges(chat, me) { const n = unreadCount(chat, me); setBadge('chat', n); setOpenerBadge(n); }   // the opener shows chat only; Tahkim has its own dot on its tab
function markReadIfVisible() {
  if (!lastSnap) return;
  const chat = lastSnap.game.chat || [];
  if (visible() && chat.length) { const top = chat[chat.length - 1].n; if (top > st.seen) { st.seen = top; save(SEEN + st.id, top); } hideToast(); }
  // Tahkim records: their dot clears when that tab is on screen
  if (isLogShown() && currentTab() === 'tahkim' && !document.hidden) { st.tkUnread = 0; setBadge('tahkim', 0); }
  paintBadges(chat, lastSnap.me.seat);
  if (visible()) scrollEnd();
}
function scrollEnd() { const l = $('#chLog'); l.scrollTop = l.scrollHeight; }

function paintLog(snap) {
  const chat = snap.game.chat || [], me = snap.me.seat, N = [nameIso(0), nameIso(1)];
  const sig = chat.map(m => m.n).join(',') + '|' + N.join('|') + '|' + me, log = $('#chLog');
  if (sig === st.sig) return; st.sig = sig;
  const near = log.scrollHeight - log.scrollTop - log.clientHeight < 70 || !log.children.length;
  log.replaceChildren(...(chat.length ? chat.map(m => {
    const li = el('li', 'chMsg' + (m.s === me ? ' mine' : ' theirs')); li.dataset.n = m.n; li.dataset.o = m.s;
    const who = el('span', 'chWho'), tx = el('span', 'chTx'), at = el('span', 'chAt', hhmm(m.at));
    who.textContent = m.s === me ? 'أنت' : N[m.s]; tx.dir = 'auto'; tx.textContent = m.t;
    li.append(who, tx, at); return li;
  }) : [el('li', 'chEmpty', 'لا رسائل بعد. اكتب أول رسالة، أو اختر ردًا سريعًا.')]));
  localize(log);
  if (near) scrollEnd();
}

// Called with every snapshot. handlers: { send(text) -> Promise<boolean> }
export function updateChat(snap, old, handlers) {
  const g = snap.game, on = ['active', 'tahkim_pending', 'finished'].includes(g.status);
  setTabsOnline(on); if (!on) { setOpenerBadge(0); return; }
  wire(); st.handler = handlers.send; lastSnap = snap;
  const chat = g.chat || [], me = snap.me.seat;
  if (st.id !== g.id) {   // first snapshot of this game on this device: what was said before is not "new"
    st.id = g.id; st.sig = ''; const saved = +load(SEEN + g.id);
    st.seen = Number.isFinite(saved) && saved > 0 ? saved : (chat.length ? chat[chat.length - 1].n : 0);
    st.lastTkLog = (g.tahkim_log || []).length; st.tkUnread = 0; setBadge('tahkim', 0);
    if (chat.length && st.seen === 0) st.seen = chat[chat.length - 1].n;
  }
  paintLog(snap);
  // new messages from the other player: a preview while the chat is not on screen
  if (old && old.game.id === g.id) {
    const had = Math.max(0, ...(old.game.chat || []).map(m => m.n));
    const fresh = chat.filter(m => m.n > had && m.s !== me);
    if (fresh.length && !visible()) { showToast(fresh[fresh.length - 1]); haptic('tick'); }
  }
  // a new Tahkim record: its own dot, unless the Tahkim tab is on screen
  const tk = (g.tahkim_log || []).length;
  if (tk > st.lastTkLog && !(isLogShown() && currentTab() === 'tahkim')) { st.tkUnread = 1; setBadge('tahkim', 1); }
  st.lastTkLog = tk;
  markReadIfVisible();
}
export const chatMax = CHAT_MSG_MAX;
