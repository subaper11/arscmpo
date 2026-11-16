// Adaptive-alif mode and the expanded-only ئـ / ئ split, against the REAL server core (no browser).
import { makeWorld, across, suite } from './lib.mjs';
import { TILE_MODES, ALIF_FORMS } from './adaptive-helpers.mjs';
const { ok, group, done } = suite('adaptive alif + ئـ / ئ');
const fl = (id, v = 1) => ({ id, l: '', v, blank: true, flex: true, as: null });
const T = (id, l, v) => ({ id, l, v, blank: false, as: null });
const letters = mode => TILE_MODES[mode].tiles.filter(([l]) => l && l !== '*').map(([l]) => l);
const give = (w, k, rack) => { const { racks, players } = w.server(), pid = w.users[k]; racks[pid] = rack; players.find(p => p.player_id === pid).tile_count = rack.length; };

group('bags: each variation lives in its own mode only');
{
  const ex = letters('expanded'), ad = letters('adaptive'), ba = letters('basic');
  ok(ex.includes('ئـ') && ex.includes('ئ') && !ad.includes('ئـ') && !ba.includes('ئـ'), 'ئـ exists only in the expanded bag');
  ok(!ad.includes('ئ') && !ba.includes('ئ'), 'plain ئ is not a tile of the adaptive or the classic bag');
  const val = (mode, l) => TILE_MODES[mode].tiles.find(([x]) => x === l)[1], cnt = (mode, l) => TILE_MODES[mode].tiles.find(([x]) => x === l)[2];
  ok(val('expanded', 'ئ') > val('expanded', 'ئـ'), 'ئ is worth more than ئـ');
  ok(cnt('expanded', 'ئ') < cnt('expanded', 'ئـ'), 'ئ is rarer than ئـ');
  ok(!ba.some(l => 'أإآؤئىءة'.includes(l)), 'classic mode has no extended letters at all');
  const FL = TILE_MODES.adaptive.tiles.find(([l]) => l === '*');
  ok(FL && FL[1] === 1 && FL[2] >= 1, 'the adaptive alif is worth 1');
  ok(!TILE_MODES.expanded.tiles.some(([l]) => l === '*') && !TILE_MODES.basic.tiles.some(([l]) => l === '*'), 'the adaptive alif is only in the adaptive mode');
  ok(!ad.some(l => 'أإآؤئى'.includes(l[0]) && l !== 'ا'), 'adaptive mode has no fixed أ إ آ ؤ ئ ئـ ى tiles: the adaptive alif replaces them');
  ok(ALIF_FORMS.length === 8 && ALIF_FORMS.includes('ئـ') && ALIF_FORMS.includes('ئ'), 'the adaptive alif offers both ئـ and ئ');
  ok(ad.includes('ة') && TILE_MODES.adaptive.tiles.filter(([l]) => l === 'ة').length === 1, 'ة stays a plain tile in the adaptive mode');
}

group('adaptive game: dealing');
{
  const w = makeWorld(); await w.start({ tile_mode: 'adaptive' });
  ok(w.snap.A.game.tile_mode === 'adaptive', 'the room accepts the adaptive mode');
  const all = [...Object.values(w.server().racks).flat(), ...w.server().priv.bag].filter(Boolean);
  const flex = all.filter(t => t.flex);
  ok(flex.length === TILE_MODES.adaptive.tiles.find(([l]) => l === '*')[2], 'the bag holds exactly the adaptive alifs of the mode: ' + flex.length);
  ok(flex.every(t => t.blank && t.v === 1 && t.l === ''), 'each is a flexible tile worth 1');
  ok(all.length === TILE_MODES.adaptive.tiles.reduce((s, [, , n]) => s + n, 0), 'no tile is created or lost');
}

group('placing an adaptive alif');
for (const form of ALIF_FORMS) {
  const w = makeWorld(); await w.start({ tile_mode: 'adaptive' });
  give(w, 'A', [T('a1', 'ك', 3), T('a2', 'ت', 1), fl('af1'), T('a4', 'ب', 2), T('a5', 'م', 2), T('a6', 'د', 2), T('a7', 'ر', 1)]); await w.call('A', 'snapshot');
  const pl = across(w.snap.A, 'كتاب'); pl[2] = { tileId: 'af1', row: 7, col: 9, as: form };
  const r = await w.call('A', 'submit_move', { placements: pl });
  if (form === 'ا') {
    ok(r.ok, 'ا accepted');
    const sq = r.snapshot.board[7][9];
    ok(sq.blank && sq.flex && sq.as === 'ا' && sq.v === 1, 'the placed tile stays an adaptive alif and keeps value 1');
    ok(r.snapshot.players[0].score === (3 + 1 + 1 + 2) * 2, 'it scores its 1 point (a blank would score 0): ' + r.snapshot.players[0].score);
    ok(r.snapshot.moves[0].words[0].w === 'كتاب', 'the log records the resolved letter');
  } else ok(r.ok && r.snapshot.board[7][9].as === form && r.snapshot.moves[0].words[0].w === 'كت' + form.replace('\u0640', '') + 'ب', `alif form ${form} accepted and logged as itself (without the tatweel)`);
}
{
  const w = makeWorld(); await w.start({ tile_mode: 'adaptive' });
  const mk = () => { give(w, 'A', [T('a1', 'ك', 3), T('a2', 'ت', 1), fl('af1'), T('a4', 'ب', 2), T('a5', 'م', 2), T('a6', 'د', 2), T('a7', 'ر', 1)]); return w.call('A', 'snapshot'); };
  await mk();
  for (const [as, why] of [['ب', 'a plain letter'], ['ء', 'ء is not an alif form'], ['ئـ ', 'stray space'], ['ة', 'ة has no variations'], ['', 'no letter'], [undefined, 'nothing']]) {
    const pl = across(w.snap.A, 'كتاب'); pl[2] = { tileId: 'af1', row: 7, col: 9, ...(as === undefined ? {} : { as }) };
    const r = await w.call('A', 'submit_move', { placements: pl });
    ok(!r.ok && r.code === 'MOVE_INVALID', 'adaptive alif refused: ' + why);
  }
  const pl = across(w.snap.A, 'كتاب'); pl[0].as = 'أ';
  const r = await w.call('A', 'submit_move', { placements: pl });
  ok(!r.ok && r.code === 'BAD_REQUEST', 'a letter tile cannot be given a letter');
}
{
  const w = makeWorld(); await w.start({ tile_mode: 'adaptive' });
  give(w, 'A', [T('a1', 'ك', 3), T('a2', 'ت', 1), { id: 'bl1', l: '', v: 0, blank: true, as: null }, T('a4', 'ب', 2), T('a5', 'م', 2), T('a6', 'د', 2), T('a7', 'ر', 1)]); await w.call('A', 'snapshot');
  const pl = across(w.snap.A, 'كتاب'); pl[2] = { tileId: 'bl1', row: 7, col: 9, as: 'ئ' };
  const r = await w.call('A', 'submit_move', { placements: pl });
  ok(r.ok && r.snapshot.board[7][9].v === 0 && !r.snapshot.board[7][9].flex, 'an ordinary blank still counts 0 and is not an adaptive alif');
}

group('adaptive alif: swap, rack value, undo, voided move');
{
  const w = makeWorld(); await w.start({ tile_mode: 'adaptive' });
  give(w, 'A', [T('a1', 'ك', 3), T('a2', 'ت', 1), fl('af1'), T('a4', 'ب', 2), T('a5', 'م', 2), T('a6', 'د', 2), T('a7', 'ر', 1)]); await w.call('A', 'snapshot');
  const pl = across(w.snap.A, 'كتاب'); pl[2] = { tileId: 'af1', row: 7, col: 9, as: 'أ' };
  await w.call('A', 'submit_move', { placements: pl });
  await w.call('B', 'snapshot');
  const t = await w.call('B', 'request_tahkim', { reason: 'كلمة غير صحيحة' });
  ok(t.ok, 'tahkim opens on a move with an adaptive alif');
  await w.call('A', 'tahkim_vote', { verdict: 'invalid' }); const v = await w.call('B', 'tahkim_vote', { verdict: 'invalid' });
  ok(v.ok && v.snapshot.board[7][9] === null, 'a voided move clears the board');
  const back = w.server().racks[w.users.A].find(x => x && x.id === 'af1');
  ok(back && back.flex && back.as === null && back.v === 1, 'the adaptive alif is back on the rack, unresolved and still worth 1');
}
{
  const w = makeWorld(); await w.start({ tile_mode: 'adaptive' });
  give(w, 'A', [fl('af1'), fl('af2'), T('a3', 'ك', 3), null, null, null, null].filter(Boolean)); await w.call('A', 'snapshot');
  const sn = await w.call('A', 'swap_tiles', { tileIds: ['af1'] });
  ok(sn.ok && sn.snapshot.me.rack.every(Boolean), 'an adaptive alif can be swapped');
}

group('expanded mode: ئـ and ئ are two different tiles');
{
  const w = makeWorld(); await w.start({ tile_mode: 'expanded' });
  const all = [...Object.values(w.server().racks).flat(), ...w.server().priv.bag].filter(Boolean);
  ok(all.every(t => !t.flex), 'no adaptive alif in the expanded bag');
  const a = all.filter(t => t.l === 'ئـ'), b = all.filter(t => t.l === 'ئ');
  ok(a.length === 2 && b.length === 1 && a[0].v !== b[0].v && b[0].v > a[0].v, 'two ئـ and one more valuable ئ');
  give(w, 'A', [T('m1', 'م', 2), T('s1', 'س', 3), T('a1', 'ا', 1), T('i1', 'ئـ', 6), T('l1', 'ل', 1), T('x1', 'ك', 3), T('y1', 'ي', 1)]); await w.call('A', 'snapshot');
  const r = await w.call('A', 'submit_move', { placements: [['m1', 7], ['s1', 8], ['a1', 9], ['i1', 10], ['l1', 11]].map(([tileId, col]) => ({ tileId, row: 7, col })) });
  ok(r.ok && r.snapshot.moves[0].words[0].w === 'مسائل', 'the log shows the word without the tatweel: ' + r.snapshot.moves[0].words[0].w);
  ok(r.snapshot.board[7][10].l === 'ئـ' && r.snapshot.board[7][10].v === 6, 'the board keeps which ئ it is (and its value)');
  ok(r.snapshot.players[0].score === (2 + 3 + 1 + 6 + 1 * 2) * 2, 'scored with the right value (the star doubles the word, the DL square at column 11 doubles ل): ' + r.snapshot.players[0].score);
}
{
  const w = makeWorld(); await w.start({ tile_mode: 'expanded' });
  give(w, 'A', [T('m1', 'ش', 5), T('s1', 'ا', 1), T('a1', 'ط', 8), T('i1', 'ئ', 8), T('l1', 'ل', 1), T('x1', 'ك', 3), T('y1', 'ي', 1)]); await w.call('A', 'snapshot');
  const r = await w.call('A', 'submit_move', { placements: [['m1', 7], ['s1', 8], ['a1', 9], ['i1', 10]].map(([tileId, col]) => ({ tileId, row: 7, col })) });
  ok(r.ok && r.snapshot.moves[0].words[0].w === 'شاطئ' && r.snapshot.board[7][10].v === 8, 'the final ئ: word شاطئ and its higher value');
}
done();
