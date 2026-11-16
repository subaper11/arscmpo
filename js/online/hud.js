// Online match card: "Player 1 vs Player 2" with the room details underneath (markup: #netBar in index.html, styles: css/online.css).
// Online, each player sees ONLY their own rack (the opponent's tiles are never shown or even rendered), and the space the second rack used to take is spent on this
// card, kept deliberately minimal: name, score and clock per player (the player on turn is outlined), and beneath it the room code and the match buttons
// (session.js owns those and paints them). A dot appears only when someone is NOT connected; the opponent's tile count is in the card's accessible name.
// Pure presentation: it reads the game state and the snapshot, writes DOM only when a value changed, and decides nothing about the match.
import { localize } from '../i18n.js';
import { $, S, app, fmt } from '../state.js';
import { nameOf } from '../names.js';
import { setText, setAttr, setClass } from '../ui.js';

const SEATS = [0, 1], last = { game: -1, score: [null, null] };
const card = i => document.getElementById('mhP' + i);

const clockClass = () => S.players.map(p => 'mhClock' + (p.ms < 60000 ? ' low' : '') + (p.ms < 10000 ? ' crit' : '') + (p.ms === 0 ? ' out' : '') + (!S.started && !S.ended ? ' wait' : ''));

// Clocks only: called every tick (the text is rewritten only when the second changes).
export function paintHudClocks() {
  if (!S.players) return;
  const cls = clockClass();
  for (const i of SEATS) {
    const el = card(i)?.querySelector('.mhClock'); if (!el) continue;
    setText(el, fmt(S.players[i].ms)); setClass(el, cls[i]);
  }
}

// Everything else: called when a snapshot is applied and when presence / connection / pause state changes.
export function paintHud() {
  const net = app.net, snap = net?.snap;
  if (!net || !snap || !S.players) return;
  const me = net.seat, g = snap.game, live = !S.ended && ['active', 'tahkim_pending'].includes(g.status);
  if (last.game !== app.gameId) { last.game = app.gameId; last.score = [null, null]; }
  for (const i of SEATS) {
    const el = card(i); if (!el) continue;
    const you = i === me, on = live && S.cur === i, score = S.players[i].score;
    const tiles = snap.players.find(p => p.seat === i)?.tile_count ?? 0;
    const online = you ? net.view.state !== 'OFFLINE' && net.view.state !== 'RECONNECTING' : net.view.opp;
    const name = nameOf(i);
    setText(el.querySelector('.mhName bdi'), name);
    const sc = el.querySelector('.mhScore'); setText(sc, String(score));
    if (last.score[i] !== null && last.score[i] !== score) { sc.classList.remove('pop'); void sc.offsetWidth; sc.classList.add('pop'); }   // only a score that really changed
    last.score[i] = score;
    setAttr(el, 'data-you', you); setAttr(el, 'data-on', on); setAttr(el, 'data-online', online);
    setAttr(el, 'aria-current', on);
    setAttr(el, 'aria-label', `${name}${you ? ' (أنت)' : ''}: ${score} نقطة، ${tiles} قطع على الرف${on ? '، دوره الآن' : ''}، ${online ? 'متصل' : 'غير متصل'}`);
    setAttr(el.querySelector('.mhDot'), 'title', 'غير متصل');
    // the rack panels: only mine is shown (css: html[data-online] .panel[data-you="false"]); a caption on it says whose turn it is
    const panel = $('#pn' + i); if (panel) { setAttr(panel, 'data-you', you); setAttr(panel, 'data-on-turn', on); }
  }
  rackCaption(me, live);
  paintHudClocks();
}

// "رفّك" + the turn, above my rack (built once, text written only when it changes).
function rackCaption(me, live) {
  const panel = $('#pn' + me); if (!panel) return;
  let cap = panel.querySelector('.rkCap');
  if (!cap) { cap = document.createElement('div'); cap.className = 'rkCap'; cap.innerHTML = '<span class="rkT">رفّك</span><span class="rkS" role="status"></span>'; localize(cap); panel.insertBefore(cap, panel.querySelector('.rack')); }
  const g = app.net.snap.game, opp = nameOf(1 - me);
  const t = !live ? '' : g.status === 'tahkim_pending' ? 'التحكيم قائم' : g.pause ? 'اللعبة متوقفة' : S.cur === me ? 'دورك الآن' : `بانتظار ${opp}`;
  setText(cap.querySelector('.rkS'), t); setAttr(cap, 'data-on', live && !g.pause && g.status === 'active' && S.cur === me);
}
