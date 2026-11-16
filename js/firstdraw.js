// "Who starts?": each player draws one tile, the higher value starts (a blank counts 0), a tie is drawn again: the way a real game of Scrabble begins.
//   Local play : interactive. Each player taps their own tile to draw it; the tiles come from the bag (js/firstdraw.js → startLocalDraw).
//   Online     : the SERVER draws (engine.drawFirst) and both browsers play the same recorded draw, so neither player can influence it; auto-played, skippable.
// One card on a dimmed, blurred backdrop (like the pause card): tiles rise in, tiles flip, the winner lifts and glows, the loser steps back. Nothing else moves.
// Reduced motion keeps every state and drops the movement.
import { S, app } from './state.js';
import { lockGame } from './float.js';
import { GLYPH, FACE } from './config.js';
import { tileValue } from './modes.js';
import { haptic } from './haptics.js';
import { nameIso } from './names.js';
import { notice, render } from './ui.js';
import { firstDrawOn } from './prefs.js';
import { L3, bt } from './i18n.js';

// Every string here is built at run time (and often holds a player's name), so the page-wide translator never sees it: each one picks its own language with L3 (ar, id, en).
// A default player name (اللاعب الأول) is translated with bt; a name the player typed stays as typed.

const val = t => t.blank ? 0 : t.v;   // the draw's tiles are already plain {l, v, blank}: an adaptive alif is drawn as the ا it is worth
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const front = t => {   // the same tile look as the board and racks (css/style.css .tile), at a fixed size
  const L = t.blank ? '' : t.l, g = GLYPH[L];
  const d = el('div', 'tile' + (t.blank ? ' blank' : '')), b = el('b', '', FACE[L] || L), i = el('i', '', String(val(t)));
  if (g) b.style.transform = `translate(${g[0]}em,${g[1]}em)`;
  d.append(b, i); return d;
};
const pts = t => t.blank ? L3('قطعة فارغة · 0', 'Tile kosong · 0', 'Blank · 0') : `${val(t)} ${L3(val(t) === 1 ? 'نقطة' : 'نقاط', 'poin', val(t) === 1 ? 'pt' : 'pts')}`;

export function firstDraw({ names, auto = null, pick = null, onDone }) {
  if (document.getElementById('fdOv')) return;   // one draw at a time
  const back = document.activeElement, still = matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const root = el('div', 'fdOv'); root.id = 'fdOv';
  const card = el('div', 'fdCard'); card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-labelledby', 'fdT'); card.tabIndex = -1;
  names = names.map(bt);
  const title = el('h2', '', L3('من يبدأ؟', 'Siapa mulai?', 'Who starts?')); title.id = 'fdT';
  const sub = el('p', 'fdSub'), stage = el('div', 'fdStage'), msg = el('p', 'fdMsg'); msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
  const go = el('button', 'btn main', L3('ابدأ اللعب', 'Mulai bermain', 'Start playing')); go.type = 'button'; go.hidden = true;
  const skip = el('button', 'btn', auto ? L3('تخطّي', 'Lewati', 'Skip') : L3('تخطّي (قرعة عشوائية)', 'Lewati (undian acak)', 'Skip (random draw)')); skip.type = 'button';
  const act = el('div', 'fdAct'); act.append(go, skip);
  card.append(title, sub, stage, msg, act); root.append(card); document.body.append(root); lockGame('overlay', true);
  requestAnimationFrame(() => { root.classList.add('on'); (auto ? skip : card).focus({ preventScroll: true }); });

  let alive = true, roundNo = 0, pair = null, shown = [false, false], tiles = [], winner = null;
  const timers = new Set(), later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, still ? Math.min(ms, 250) : ms); timers.add(t); };
  const finish = (seat, how) => {
    if (!alive) return; alive = false; timers.forEach(clearTimeout); document.removeEventListener('keydown', onKey, true); lockGame('overlay', false);
    root.classList.remove('on'); root.classList.add('out'); setTimeout(() => root.remove(), still ? 0 : 260);
    if (back && back.isConnected && back.focus) back.focus({ preventScroll: true });
    onDone?.(seat, how);
  };

  function build(p) {
    pair = p; shown = [false, false]; winner = null; stage.replaceChildren(); tiles = []; go.hidden = true;
    sub.textContent = auto ? (roundNo ? L3('تعادل — سحبة جديدة', 'Seri — tarikan baru', 'Tie — new draw') : L3('يسحب كل لاعب قطعة، وصاحب القيمة الأعلى يبدأ', 'Tiap pemain menarik satu tile, nilai tertinggi mulai', 'Each player draws a tile; the higher value starts'))
      : (roundNo ? L3('تعادل — اسحبا من جديد', 'Seri — tarik lagi', 'Tie — draw again') : L3('اضغط على قطعتك لتسحبها، وصاحب القيمة الأعلى يبدأ', 'Ketuk tile Anda untuk menariknya, nilai tertinggi mulai', 'Tap your tile to draw it; the higher value starts'));
    msg.textContent = '';
    [0, 1].forEach(i => {
      const slot = el('div', 'fdSlot'), nm = el('div', 'fdName', names[i]);
      const t = el('button', 'fdTile'); t.type = 'button'; t.setAttribute('aria-label', `${L3('قطعة', 'Tile', 'Tile')} ${names[i]}${auto ? '' : L3(' — اضغط للسحب', ' — ketuk untuk menarik', ' — tap to draw')}`);
      const inn = el('div', 'fdIn'), bk = el('div', 'fdFace fdBack'), fr = el('div', 'fdFace fdFront');
      bk.append(el('div', 'tile back')); fr.append(front(p[i])); inn.append(bk, fr); t.append(inn);
      const v = el('div', 'fdVal', ' ');
      t.style.setProperty('--d', `${i * 0.12}s`);
      if (!auto) { t.classList.add('ready'); t.onclick = () => reveal(i); } else t.tabIndex = -1;
      slot.append(nm, t, v); stage.append(slot); tiles.push({ slot, t, v });
      if (i === 0) stage.append(el('div', 'fdVs', L3('؟', '?', '?')));
    });
    if (auto) { later(750, () => reveal(0)); later(1450, () => reveal(1)); }
  }
  function reveal(i) {
    if (!alive || shown[i]) return; shown[i] = true;
    const { t, v } = tiles[i]; t.classList.remove('ready'); t.classList.add('flip'); t.disabled = true; v.textContent = pts(pair[i]); haptic('tick');
    const q = `\u2068${pair[i].l}\u2069`;   // the bare letter, isolated: quote marks around one Arabic letter flip sides inside an Indonesian / English sentence
    msg.textContent = shown[0] && shown[1] ? '' : L3(`${names[i]} سحب ${pair[i].blank ? 'قطعة فارغة' : `«${pair[i].l}»`}`, `${names[i]} menarik ${pair[i].blank ? 'tile kosong' : q}`, `${names[i]} drew ${pair[i].blank ? 'a blank' : q}`);
    if (shown[0] && shown[1]) later(800, judge);
  }
  function judge() {
    const a = val(pair[0]), b = val(pair[1]);
    if (a === b) {
      tiles.forEach(x => x.t.classList.add('tie'));
      const more = auto ? roundNo + 1 < auto.rounds.length : true;
      msg.textContent = more ? L3('تعادل! نسحب من جديد', 'Seri! Tarik lagi', 'Tie! Drawing again') : L3('تعادل متكرر — القرعة تختار', 'Seri berulang — diundi', 'Repeated tie — decided by lot');
      if (more) { later(1500, () => { roundNo++; build(auto ? auto.rounds[roundNo] : pick()); rise(); }); return; }
      return decide(auto.seat);
    }
    decide(a > b ? 0 : 1);
  }
  function decide(seat) {
    winner = seat; tiles.forEach((x, i) => x.slot.classList.add(i === seat ? 'win' : 'lose'));
    msg.textContent = L3(`${names[seat]} يبدأ اللعب`, `${names[seat]} mulai bermain`, `${names[seat]} starts`); sub.textContent = ''; haptic('score');
    go.hidden = false; skip.hidden = true;
    if (auto) later(2600, () => finish(seat, 'draw'));
    requestAnimationFrame(() => go.focus({ preventScroll: true }));
  }
  const rise = () => { stage.classList.remove('rise'); void stage.offsetWidth; stage.classList.add('rise'); };

  go.onclick = () => finish(winner, 'draw');
  skip.onclick = () => finish(auto ? auto.seat : (Math.random() < 0.5 ? 0 : 1), 'skip');
  // On the document, not on the card: focus can be on the page for a moment (a tile that was just tapped is disabled), and Escape / Tab must still work.
  const onKey = e => {
    if (e.key === 'Escape') { e.preventDefault(); if (winner != null) finish(winner, 'draw'); else skip.click(); }
    else if (e.key === 'Tab') {
      const bs = [...card.querySelectorAll('button:not([hidden]):not(:disabled)')]; e.preventDefault(); if (!bs.length) return;
      const i = bs.indexOf(document.activeElement); bs[e.shiftKey ? (i <= 0 ? bs.length - 1 : i - 1) : (i + 1) % bs.length].focus();
    }
  };
  document.addEventListener('keydown', onKey, true);
  build(auto ? auto.rounds[0] : pick()); rise();
}

// ---------- local play ----------
// Two tiles taken at random from the bag (not removed: they go back, as in a real game). EAS_FIRSTDRAW_PICK is a test hook, like EAS_BACKEND_FACTORY.
const pickLocal = () => {
  const hooked = window.EAS_FIRSTDRAW_PICK?.(); if (Array.isArray(hooked) && hooked.length === 2) return hooked;   // test hook; anything else falls back to real bag tiles
  const bag = S.bag, i = Math.floor(Math.random() * bag.length); let j = Math.floor(Math.random() * (bag.length - 1)); if (j >= i) j++;
  return [bag[i], bag[j]].map(t => (t.flex ? { l: 'ا', v: t.v, blank: false } : { l: t.blank ? '' : t.l, v: tileValue(t), blank: !!t.blank }));
};
// Called right after a new local game has been created. A display is needed (no overlay in a headless test harness) and the setting must be on (Settings → بداية المباراة).
export function startLocalDraw() {
  if (app.net || !S.board || typeof matchMedia !== 'function' || !firstDrawOn()) return;
  S.hold = true;
  firstDraw({
    names: [nameIso(0), nameIso(1)], pick: pickLocal,
    onDone: seat => { S.hold = false; S.cur = seat; S.last = performance.now(); S.sel.clear(); render(); notice(`${nameIso(seat)} يبدأ اللعب`); }
  });
}
