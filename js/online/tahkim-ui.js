// The Tahkim discussion window (online). One focused, modal card over a blurred backdrop (like the pause screen), the same session on both screens: the disputed word, the reason, a chat, each player's selected verdict, and a rules reference.
// It cannot be minimized or dismissed (the dispute is the only thing to do until it is settled); only the rules section folds away.
// It draws what the server's snapshot says (game.tahkim: reason, words, votes, chat) and sends two kinds of request through the handlers it is given (a message, a verdict).
// It decides nothing: a verdict only counts when the server has seen both players choose the same one, and the server alone resolves it.
// Per-device interface state (never sent): the rules panel open or not and which categories are open, the verdict I have picked but not yet confirmed, my unsent text.
import { localize, setTxt, bt } from '../i18n.js';
import { tahkimRulesHtml } from '../tahkim-rules.js';

const VERDICT = { valid: '✔ صحيح', invalid: '✖ خطأ' };
const $ = s => document.querySelector(s);
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const hhmm = t => { try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

const ui = { built: false, sig: '', key: '', rules: false, pick: null, pickKey: '', sending: false, voting: false, h: null, rulesMode: '' };

function build() {
  if (ui.built) return; ui.built = true;
  const p = el('section', 'tkPanel'); p.id = 'tkPanel'; p.hidden = true; p.tabIndex = -1; p.setAttribute('role', 'dialog'); p.setAttribute('aria-labelledby', 'tkTitle'); p.setAttribute('aria-modal', 'true');
  p.innerHTML = `<header class="tkHead"><div class="tkHeadT"><h2 id="tkTitle" tabindex="-1">التحكيم</h2><div class="tkSub">الكلمة محل التحكيم</div></div>`
    + `<button type="button" id="tkLeave" class="btn tkHb tkLeave" aria-label="استسلام" title="استسلام"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V4M6 5h11l-2.5 3.5L17 12H6"/></svg></button></header>`
    + `<div id="tkWords" class="tkWords" aria-label="الكلمة محل التحكيم"></div>`
    + `<div id="tkWhy" class="tkWhy2"></div>`
    + `<div id="tkRulesWrap" class="tkRulesWrap"><button type="button" id="tkRulesBtn" class="tkRulesBtn" aria-expanded="false" aria-controls="tkRulesBox"><span>القواعد</span><span class="tkChev" aria-hidden="true"></span></button><div id="tkRulesBox" class="tkRulesBox" hidden></div></div>`
    + `<div id="tkLog" class="tkLog" role="log" aria-live="polite" aria-label="محادثة التحكيم"></div>`
    + `<div class="tkVerdict"><div id="tkChips" class="tkChips"></div><div id="tkStatus" class="tkStatus" role="status"></div>`
    + `<div class="tkActs" role="group" aria-label="اختيار الحكم"><button type="button" class="btn yes tkPick" data-v="valid" aria-pressed="false">✔ صحيح</button><button type="button" class="btn danger tkPick" data-v="invalid" aria-pressed="false">✖ خطأ</button>`
    + `<button type="button" id="tkConfirm" class="btn main tkConfirm"></button><button type="button" id="tkWithdraw" class="btn tkWd">سحب اختياري</button></div></div>`
    + `<form id="tkForm" class="tkComposer" autocomplete="off"><label class="vh" for="tkText">رسالة</label><textarea id="tkText" rows="1" maxlength="300" placeholder="اكتب رسالتك…" enterkeyhint="send"></textarea><button type="submit" class="btn main" id="tkSend">إرسال</button></form>`;
  const bd = el('div', 'tkBackdrop'); bd.id = 'tkBackdrop'; bd.hidden = true; bd.setAttribute('aria-hidden', 'true');
  localize(p);
  document.body.append(bd, p);
  $('#tkRulesBtn').onclick = () => setRules(!ui.rules);
  $('#tkLeave').onclick = () => ui.h?.leave?.();   // the one way out of a dispute whose other side has gone away: the usual surrender confirmation
  // Not dismissible: Escape does nothing here (it must not reach the page behind), and Tab stays inside the card.
  p.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return; }
    if (e.key !== 'Tab') return;
    const f = [...p.querySelectorAll('button,textarea,[tabindex="0"]')].filter(n => !n.disabled && !n.hidden && n.offsetParent !== null);
    if (!f.length) return; const first = f[0], last = f[f.length - 1], at = document.activeElement;
    if (e.shiftKey && (at === first || at === p)) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
  });
  p.addEventListener('click', e => {
    const b = e.target.closest('.tkPick'); if (b) { ui.pick = b.dataset.v; ui.pickKey = ui.key; paint(); return; }
  });
  $('#tkConfirm').onclick = () => vote(ui.pick);
  $('#tkWithdraw').onclick = () => { ui.pick = null; vote(null); };
  const ta = $('#tkText');
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#tkForm').requestSubmit(); } });
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 96) + 'px'; });
  $('#tkForm').addEventListener('submit', async e => {
    e.preventDefault(); const text = ta.value.replace(/\s+/g, ' ').trim(); if (!text || ui.sending) return;
    ui.sending = true; paint();
    const ok = await ui.h.send(text);   // the text stays in the box until the server has it: a failed send loses nothing
    ui.sending = false; if (ok) { ta.value = ''; ta.style.height = 'auto'; } paint(); ta.focus({ preventScroll: true });
  });
}
async function vote(v) { if (ui.voting) return; ui.voting = true; paint(); try { await ui.h.vote(v); } finally { ui.voting = false; paint(); } }
function setRules(on) {
  ui.rules = on; const box = $('#tkRulesBox'), b = $('#tkRulesBtn');
  if (on && ui.rulesMode !== ui.mode) { box.innerHTML = tahkimRulesHtml(ui.mode); ui.rulesMode = ui.mode; localize(box); }
  box.hidden = !on; b.setAttribute('aria-expanded', String(on)); $('#tkPanel').classList.toggle('rulesOn', on); if (on) box.scrollTop = 0;
}
let snap = null, ctx = null;
// Called with every snapshot (and after local interface changes). ctx: { seat, names: [n0, n1], mode, handlers: { send(text), vote(verdict) } }
export function updateTahkim(s, c) {
  const g = s.game, open = g.status === 'tahkim_pending' && g.tahkim && g.tahkim.state === 'pending';
  if (!open) return hideTahkim();
  build(); snap = s; ctx = c; ui.h = c.handlers; ui.mode = c.mode;
  const key = g.id + ':' + g.round + ':' + g.tahkim.move_number, fresh = key !== ui.key;
  if (fresh) { ui.key = key; ui.pick = null; ui.sig = ''; ui.rulesMode = ''; setRules(false); }
  ui.chatN = (g.tahkim.chat || []).length;
  paint();
  if (fresh) enter();
  return fresh;
}
// Focus mode: the page behind is blurred (backdrop) and inert, so nothing outside the card can be reached by touch, mouse, Tab or a screen reader.
function enter() {
  const app = $('main.app'); if (app) app.inert = true;
  document.documentElement.setAttribute('data-tkopen', '');
  const log = $('#tkLog'); log.scrollTop = log.scrollHeight;
  requestAnimationFrame(() => { const t = $('#tkText'); if (t && !$('#tkPanel').hidden) t.focus({ preventScroll: true }); });
}
export function hideTahkim() {
  snap = null; ctx = null;   // a request still in flight must not repaint (and re-show) the window with the old state when it finishes
  if (!ui.built) return;
  const p = $('#tkPanel'); if (p.hidden) return;
  p.hidden = true; $('#tkBackdrop').hidden = true; ui.key = ''; ui.sig = '';
  const app = $('main.app'); if (app) app.inert = false;
  document.documentElement.removeAttribute('data-tkopen');
  return false;
}
export const tahkimOpen = () => ui.built && !!ui.key;

// The disputed word(s) are marked wherever they appear in text (the reason, the chat). Text only: built with text nodes and <mark>, never innerHTML.
const norm = w => String(w).normalize('NFC');
function marked(text, words) {
  const ws = [...new Set((words || []).map(norm).filter(Boolean))].sort((a, b) => b.length - a.length);
  const frag = document.createDocumentFragment(); const t = norm(text);
  if (!ws.length) { frag.append(t); return frag; }
  let i = 0;
  while (i < t.length) {
    let hit = '', at = -1;
    for (const w of ws) { const k = t.indexOf(w, i); if (k !== -1 && (at === -1 || k < at || (k === at && w.length > hit.length))) { at = k; hit = w; } }
    if (at === -1) { frag.append(t.slice(i)); break; }
    if (at > i) frag.append(t.slice(i, at));
    frag.append(el('mark', 'tkMark', hit)); i = at + hit.length;
  }
  return frag;
}

function paint() {
  if (!snap || !ctx || !ui.built) return;
  const g = snap.game, t = g.tahkim, me = snap.me.seat, opp = 1 - me, N = ctx.names, chat = t.chat || [], votes = t.votes || [null, null];
  const p = $('#tkPanel'); if (p.hidden) p.hidden = false;
  const bd = $('#tkBackdrop'); if (bd.hidden) bd.hidden = false;
  // the disputed word(s): one large highlighted chip each
  const words = t.words || [], wKey = words.join('\u0001'), wEl = $('#tkWords');
  if (wEl.dataset.k !== wKey) { wEl.dataset.k = wKey; wEl.replaceChildren(...words.map(w => el('span', 'tkWord', w))); wEl.classList.toggle('many', words.length > 1); }
  setTxt($('#tkTitle'), `تحكيم الحركة ${t.move_number}`);
  // the reason (public, set by the challenger), with the word marked inside it
  const why = $('#tkWhy'), whyKey = `${t.challenger_seat}|${N[t.challenger_seat]}|${t.reason}|${wKey}`;
  if (why.dataset.k !== whyKey) { why.dataset.k = whyKey; const who = el('b', 'tkWhyWho', `سبب التحكيم · ${N[t.challenger_seat]}: `); why.replaceChildren(who, '«', marked(t.reason, words), '»'); }
  // chat: rebuilt only when it changed (a message arriving never touches the text box or the verdict buttons)
  const sig = chat.map(m => m.n).join(',') + '|' + N.join('|') + '|' + words.join('/'), log = $('#tkLog');
  if (sig !== ui.sig) {
    const near = log.scrollHeight - log.scrollTop - log.clientHeight < 60 || !ui.sig; ui.sig = sig;
    log.replaceChildren(...(chat.length ? chat.map(m => {
      const b = el('div', 'tkMsg' + (m.s === me ? ' mine' : '')); b.dataset.n = m.n;
      const tx = el('span', 'tkTxt'); tx.append(marked(m.t, words)); b.append(el('span', 'tkWho', N[m.s]), tx, el('span', 'tkAt', hhmm(m.at)));
      return b;
    }) : [el('p', 'tkEmpty', 'لا رسائل بعد. ناقشا الكلمة هنا؛ لا يوجد حدّ زمني، والساعتان متوقفتان.')]));
    if (near) log.scrollTop = log.scrollHeight;
  }
  // selections (both visible: the discussion is open, and a match resolves at once)
  const chips = $('#tkChips'), cs = [me, opp].map(s => `${s === me ? 'أنت' : N[s]}: ${votes[s] ? VERDICT[votes[s]] : 'لم يختر بعد'}`);
  if (chips._k !== cs.join('|')) { chips._k = cs.join('|'); chips.replaceChildren(...cs.map(t => el('span', 'tkChip', t))); localize(chips); }
  const mine = votes[me], theirs = votes[opp];
  if (ui.pickKey !== ui.key) ui.pick = mine;   // a pick not yet confirmed belongs to this session; otherwise mirror the server
  if (ui.pick == null && mine) ui.pick = mine;
  const msg = mine && theirs ? 'اختلف اختياركما: تابعا النقاش، ويمكن لكلٍّ منكما تغيير اختياره.'
    : mine ? `اخترتَ ${VERDICT[mine]} — بانتظار اختيار ${N[opp]}. لا يُحسم التحكيم إلا إذا اختار الاثنان الحكم نفسه.`
    : theirs ? `${N[opp]} اختار ${VERDICT[theirs]}. اختر حكمك ثم أكّده.`
    : 'اختر حكمك ثم أكّده. لا يُحسم التحكيم إلا إذا اختار اللاعبان الحكم نفسه.';
  setTxt($('#tkStatus'), msg);
  for (const b of p.querySelectorAll('.tkPick')) { const on = ui.pick === b.dataset.v; if (b.getAttribute('aria-pressed') !== String(on)) b.setAttribute('aria-pressed', String(on)); b.disabled = ui.voting; }
  const cf = $('#tkConfirm'), changed = ui.pick && ui.pick !== mine;
  const label = !ui.pick ? 'اختر حكمًا أولًا' : changed ? `تأكيد: ${VERDICT[ui.pick]}` : 'تم التأكيد ✔';
  setTxt(cf, label); cf.disabled = !changed || ui.voting;
  const wd = $('#tkWithdraw'); wd.hidden = !mine; wd.disabled = ui.voting;
  $('#tkSend').disabled = ui.sending; $('#tkText').readOnly = ui.sending;
  localize(p);   // the reason line and the discussion were rebuilt: their second language
}
