// Live preview of the tiles the player on turn is trying ("draft"). PURE: no DOM, no state, so it is unit-tested in Node (tests/online/draft.mjs).
//
// A draft is only a hint broadcast on the private game channel; it can never change the game (the server decides everything from submit_move).
// The sender announces the tiles' squares and letters, bound to the revision they were made on. The receiver treats every draft as untrusted input:
// it must name exactly the revision the receiver has, stay within the board and the rack size, use squares that are still empty, and carry short letters only.
import { SIZE, RACK } from '../config.js';

// A blank tile whose letter is not chosen yet has nothing to show, so it is left out rather than invalidating the whole draft.
export const encodeDraft = (rev, move) => ({ rev, c: move.map(e => [e.r, e.c, e.t.blank ? (e.t.as ? (e.t.flex ? '+' : '*') + e.t.as : '') : e.t.l]).filter(x => x[2]) });   // a blank is sent as "*letter" (the receiver shows it worth 0), an adaptive alif as "+letter" (worth its own points)

// -> [{r, c, l, blank, flex?}] (possibly empty: "nothing tried right now"), or null when the payload must be ignored.
export function decodeDraft(p, { rev, board }) {
  if (!p || typeof p !== 'object' || !Number.isInteger(p.rev) || p.rev !== rev) return null;
  if (!Array.isArray(p.c) || p.c.length > RACK) return null;
  const out = [], seen = new Set();
  for (const x of p.c) {
    if (!Array.isArray(x) || x.length !== 3) return null;
    const [r, c, raw] = x;
    if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || c < 0 || r >= SIZE || c >= SIZE) return null;
    if (typeof raw !== 'string' || raw.length < 1 || raw.length > 3) return null;   // up to 3: a marker plus ئـ (letter + tatweel)
    const flex = raw[0] === '+', blank = raw[0] === '*' || flex, l = blank ? raw.slice(1) : raw; if (!l || l.length > 2) return null;
    if (board && board[r] && board[r][c]) return null;   // that square is already taken in the receiver's board: the draft is for another position
    const k = r * SIZE + c; if (seen.has(k)) return null; seen.add(k);
    out.push({ r, c, l, blank, ...(flex ? { flex: true } : {}) });
  }
  return out;
}
