import { makeWorld, suite, across } from './lib.mjs';
const { ok, group, done } = suite('online tahkim: mandatory reason + approval, chess clock');
const MIN = 60000, INC = 5000;
async function afterFirstMove() {
  const w = makeWorld(); await w.start({ minutes: 10 });
  w.giveRack('A', [...'كتاب']); await w.call('A', 'snapshot');
  const mv = await w.call('A', 'submit_move', { placements: across(w.snap.A, 'كتاب') }); ok(mv.ok, 'A plays a word');
  await w.call('B', 'snapshot'); return w;
}

group('placed tiles remember who placed them');
{
  const w = await afterFirstMove(); const s = (await w.call('B', 'snapshot')).snapshot;
  const tiles = (s.board || s.game.board).flat().filter(Boolean);
  ok(tiles.length === 4 && tiles.every(t => t.o === 0), 'all 4 tiles carry the placer seat (A = 0): ' + tiles.map(t => t.o));
}

group('+5 s per move, nothing for pass / swap');
{
  const w = await afterFirstMove();
  const s = (await w.call('B', 'snapshot')).snapshot;
  ok(s.players[0].ms_left === 10 * MIN + INC, 'the mover got +5 s: ' + s.players[0].ms_left);
  ok(s.players[1].ms_left === 10 * MIN, 'the opponent did not');
  const p = await w.call('B', 'pass_turn'); ok(p.ok && p.snapshot.players[1].ms_left === 10 * MIN, 'a pass adds nothing');
}

group('a reason is mandatory');
{
  const w = await afterFirstMove();
  for (const bad of [undefined, '', '   ', 'ab', 42]) { const r = await w.call('B', 'request_tahkim', { reason: bad }); ok(!r.ok && r.code === 'REASON_REQUIRED', `reason ${JSON.stringify(bad)} refused (${r.code})`); }
  const long = await w.call('B', 'request_tahkim', { reason: 'x'.repeat(200) }); ok(!long.ok, 'an overlong reason is refused');
  const r = await w.call('B', 'request_tahkim', { reason: '  كتابي \n إضافة  ' });
  ok(r.ok && r.snapshot.game.status === 'tahkim_pending' && r.snapshot.game.tahkim.state === 'awaiting', 'a valid reason opens the request');
  ok(r.snapshot.game.tahkim.reason === 'كتابي إضافة', 'the reason is cleaned: ' + r.snapshot.game.tahkim.reason);
  ok(r.snapshot.waiting_seat === 0, 'the match waits for the other player');
}

group('approval: only the other player; the challenger cannot rule before it');
{
  const w = await afterFirstMove(); await w.call('B', 'request_tahkim', { reason: 'سبب التحكيم' });
  const self = await w.call('B', 'respond_tahkim', { accept: true }); ok(!self.ok && self.code === 'NOT_APPROVER', 'the challenger cannot approve their own request');
  const early = await w.call('B', 'resolve_tahkim', { verdict: 'invalid' }); ok(!early.ok, 'no verdict while awaiting approval (' + early.code + ')');
  await w.call('A', 'snapshot'); const bad = await w.call('A', 'respond_tahkim', {}); ok(!bad.ok, 'an answer must be accept true/false');
  const yes = await w.call('A', 'respond_tahkim', { accept: true }); ok(yes.ok && yes.snapshot.game.tahkim.state === 'pending', 'A approves: pending');
  ok(yes.snapshot.waiting_seat === 1, 'now the challenger rules');
  const again = await w.call('A', 'respond_tahkim', { accept: true }); ok(!again.ok && again.code === 'NOT_AWAITING', 'cannot answer twice');
  await w.call('B', 'snapshot'); const v = await w.call('B', 'resolve_tahkim', { verdict: 'invalid' });
  ok(v.ok && v.snapshot.game.status === 'active', 'the verdict goes through');
  const s = v.snapshot; ok(s.players[0].ms_left === 10 * MIN, 'a voided move earns no time: ' + s.players[0].ms_left);
  ok(s.game.current_seat === 1, 'the challenger is on turn: ' + s.game.current_seat);
}

group('declined: the move stands, the clock restarts, no second challenge');
{
  const w = await afterFirstMove(); w.clock.t += 20000; await w.call('B', 'request_tahkim', { reason: 'سبب التحكيم' });
  w.clock.t += 60000;   // the time spent waiting for the answer is nobody's
  await w.call('A', 'snapshot'); const no = await w.call('A', 'respond_tahkim', { accept: false });
  ok(no.ok && no.snapshot.game.status === 'active' && no.snapshot.game.tahkim.state === 'none', 'declined: back to play');
  ok(no.snapshot.game.tahkim_declined === 1, 'the declined move is public');
  ok(no.snapshot.players[1].ms_left === 10 * MIN - 20000, 'B was charged only the 20 s before the request: ' + no.snapshot.players[1].ms_left);
  await w.call('B', 'snapshot'); const re = await w.call('B', 'request_tahkim', { reason: 'مرة أخرى' }); ok(!re.ok && re.code === 'TAHKIM_DECLINED', 'the same move cannot be challenged again');
  ok(no.snapshot.moves[0].st === undefined, 'the move is not voided');
}

group('the challenger can withdraw while awaiting');
{
  const w = await afterFirstMove(); await w.call('B', 'request_tahkim', { reason: 'سبب التحكيم' });
  const c = await w.call('B', 'cancel_tahkim'); ok(c.ok && c.snapshot.game.status === 'active', 'withdrawn');
  const a = await w.call('A', 'respond_tahkim', { accept: true }); ok(!a.ok, 'nothing left to approve');
}

group('undo accepted gives the +5 s back');
{
  const w = await afterFirstMove(); await w.call('A', 'request_undo'); await w.call('B', 'snapshot');
  const u = await w.call('B', 'respond_undo', { accept: true }); ok(u.ok, 'undo accepted');
  ok(u.snapshot.players[0].ms_left === 10 * MIN, 'the mover is back at the clock before the move: ' + u.snapshot.players[0].ms_left);
}
done();
