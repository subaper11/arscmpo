// Draws the opponent's tentative tiles as SOLID tiles, the same ones the mover sees on their own screen (pending look: golden tint, their colour, point value, cast shadow).
// They live on empty squares only: a `.gh` marker class on the square plus one real `.tile.ghostT` child. The board's own rendering and its cache are never touched
// (a square that really changes is rewritten by renderBoard, which drops the ghost with it; every other square keeps its ghost, and paintGhosts() re-checks them after each render).
// Painting is idempotent and incremental: a square whose ghost has not changed is not written again, so nothing repaints (= nothing flickers) while the opponent thinks.
import { SIZE, FACE, GLYPH } from '../config.js';

let painted = false;
const sig = g => g.l + '|' + g.v + '|' + g.o + '|' + (g.blank ? 1 : 0) + (g.flex ? 'f' : '');

function tileEl(g) {
  const d = document.createElement('div'), b = document.createElement('b'), i = document.createElement('i');
  d.className = 'tile cur dim ghostT' + (g.blank ? ' blank' : '') + (g.flex ? ' flex' : '');
  if (g.o === 0 || g.o === 1) d.dataset.o = g.o;
  d.setAttribute('aria-hidden', 'true');
  const gl = GLYPH[g.l]; if (gl) b.style.transform = `translate(${gl[0]}em,${gl[1]}em)`;
  b.textContent = FACE[g.l] || g.l; i.textContent = g.v;
  d.append(b, i); return d;
}
const childOf = el => el.querySelector(':scope > .ghostT');

// cells: [{ r, c, l, v, o, blank }] or null / [] to clear.
export function paintGhosts(cells) {
  const kids = document.getElementById('board')?.children;
  if (!kids || (!painted && !(cells && cells.length))) return;
  const want = new Map((cells || []).map(g => [g.r * SIZE + g.c, g]));
  for (let i = 0; i < kids.length; i++) {
    const el = kids[i], g = want.get(i), has = childOf(el);
    if (!g) { if (has) has.remove(); if (el._gh !== undefined) { el._gh = undefined; el.classList.remove('gh'); } continue; }
    if (has && el._gh === sig(g) && el.classList.contains('gh')) continue;   // unchanged: not written again
    if (has) has.remove();
    el.append(tileEl(g)); el._gh = sig(g); el.classList.add('gh');
  }
  painted = want.size > 0;
}
