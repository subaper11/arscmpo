// Match chat (online): a conversation separate from the Tahkim discussion, kept in games.ext.chat. REAL server core, in-memory store.
import { makeWorld, suite } from './lib.mjs';
import { CHAT_KEEP, CHAT_MSG_MAX, CHAT_GAP_MS } from '../../supabase/functions/_shared/game/config.js';
const { ok, group, done } = suite('match chat');

group('lobby: no chat before the match');
{
  const w = makeWorld(); await w.room();
  const r = await w.call('A', 'chat_message', { text: 'مرحبا' });
  ok(!r.ok && r.code === 'WRONG_STATUS', 'the lobby has no chat action');
}

group('sending and reading');
{
  const w = makeWorld(); await w.start();
  const r = await w.call('A', 'chat_message', { text: '  مرحبًا   بك  ' });
  ok(r.ok && r.snapshot.game.chat.length === 1, 'a message is stored');
  const m = r.snapshot.game.chat[0];
  ok(m.t === 'مرحبًا بك' && m.s === w.snap.A.me.seat && m.n === 1 && typeof m.at === 'number', 'text is trimmed and collapsed; sender seat, number and time are server-set');
  const b = await w.call('B', 'snapshot');
  ok(b.snapshot.game.chat.length === 1 && b.snapshot.game.chat[0].t === 'مرحبًا بك', 'the opponent receives it in the next snapshot');
  ok(r.snapshot.game.revision > w.snap.B.game.revision - 1, 'the chat is a normal revision bump (that is what wakes the other browser)');
  ok(!('chat' in r.snapshot.me), 'it is public game data, not part of a private rack');
  w.clock.t += CHAT_GAP_MS + 1;
  const b2 = await w.call('B', 'chat_message', { text: 'أهلًا' });
  ok(b2.ok && b2.snapshot.game.chat.map(x => x.n).join() === '1,2' && b2.snapshot.game.chat[1].s !== m.s, 'numbers increase, the other seat is recorded');
}

group('it never touches the game');
{
  const w = makeWorld(); await w.start();
  const before = w.snap.A.game, scoreBefore = JSON.stringify(w.snap.A.players), turn = before.current_seat, board = JSON.stringify(before.board);
  const notMyTurn = w.who(1 - turn);
  const r = await w.call(notMyTurn, 'chat_message', { text: 'سؤال سريع' });
  ok(r.ok, 'the player who is NOT on turn can chat');
  const s = r.snapshot;
  ok(s.game.current_seat === turn && JSON.stringify(s.game.board) === board && JSON.stringify(s.players.map(p => [p.score, p.tile_count])) === JSON.stringify(JSON.parse(scoreBefore).map(p => [p.score, p.tile_count])), 'turn, board, scores and tile counts are untouched');
  ok(s.game.status === 'active' && s.game.turn_started_at === before.turn_started_at && s.game.tahkim.state === before.tahkim.state, 'status and clock are untouched');
  const r2 = await w.call(w.who(turn), 'pass_turn');
  ok(r2.ok, 'a chat message does not make the next move stale (moves are pinned to the revision, the chat is not)');
  const w2 = makeWorld(); await w2.start();
  const mv = w2.who(w2.turn()), ot = w2.who(1 - w2.snap.A.me.seat === w2.turn() ? w2.turn() : 1 - w2.turn());
  const stale = w2.snap[mv].game.revision;
  await w2.call(w2.who(1 - w2.turn()), 'chat_message', { text: 'مرحبا' });
  w2.clock.t += CHAT_GAP_MS + 1; await w2.call(w2.who(1 - w2.turn()), 'chat_message', { text: 'ما زلت أفكر؟' });
  const still = await w2.raw(mv, { action: 'pass_turn', game_id: w2.gameId, client_action_id: 'e0000000-0000-4000-8000-000000000002', base_revision: stale });
  ok(still.ok, 'two chat messages later a move built on the OLD revision is still accepted: ' + (still.code || 'ok'));
  const w3 = makeWorld(); await w3.start();
  const old = w3.snap[w3.who(w3.turn())].game.revision;
  await w3.call(w3.who(w3.turn()), 'pass_turn');
  const after = await w3.raw(w3.who(w3.turn()), { action: 'pass_turn', game_id: w3.gameId, client_action_id: 'e0000000-0000-4000-8000-000000000003', base_revision: old });
  ok(!after.ok && after.code === 'STALE_STATE', 'a real game change still makes an old revision stale');
  const w4 = makeWorld(); await w4.start();
  const old4 = w4.snap[w4.who(w4.turn())].game.revision;
  w4.clock.t += CHAT_GAP_MS + 1; await w4.call(w4.who(1 - w4.turn()), 'chat_message', { text: 'ثم' });
  await w4.call(w4.who(w4.turn()), 'pass_turn'); await w4.call(w4.who(w4.turn()), 'pass_turn');
  const mixed = await w4.raw(w4.who(w4.turn()), { action: 'pass_turn', game_id: w4.gameId, client_action_id: 'e0000000-0000-4000-8000-000000000004', base_revision: old4 });
  ok(!mixed.ok && mixed.code === 'STALE_STATE', 'chat plus a real change in between is still stale');
}
{
  const w = makeWorld(); await w.start();
  const a = await w.call('A', 'chat_message', { text: 'واحد' });
  ok(a.ok, 'A chats');
  const ruleSeat = w.turn(), mover = w.who(ruleSeat);
  const pass = await w.call(mover, 'pass_turn');
  ok(pass.ok, 'the mover is still able to play with a stale-looking revision after the other chatted (their own snapshot was refreshed by the reply)');
}

group('chat is not the Tahkim discussion');
{
  const w = makeWorld(); await w.start();
  await w.call('A', 'chat_message', { text: 'محادثة' });
  const g = (await w.call('A', 'snapshot')).snapshot.game;
  ok(g.chat.length === 1 && !(g.tahkim.chat && g.tahkim.chat.length) && !(g.tahkim_log || []).length, 'the match chat and the Tahkim chat / log are separate');
}

group('also while paused, in a Tahkim discussion, and after the match');
{
  const w = makeWorld(); await w.start();
  const mover = w.who(w.turn());
  const p = await w.call(mover, 'pause_game'); ok(p.ok, 'paused');
  w.clock.t += CHAT_GAP_MS + 1;
  const c = await w.call(w.who(1 - w.snap[mover].me.seat), 'chat_message', { text: 'نكمل؟' });
  ok(c.ok && c.snapshot.game.pause, 'chat works during a pause (and does not end it)');
  await w.call(mover, 'resume_game');
}
{
  const w = makeWorld(); await w.start();
  // A plays a move, B opens a Tahkim discussion
  const rack = w.snap.A.me.rack.filter(Boolean).slice(0, 2);
  const mv = await w.call('A', 'submit_move', { placements: rack.map((t, i) => ({ tileId: t.id, row: 7, col: 7 + i, ...(t.blank ? { as: 'ا' } : {}) })) });
  if (mv.ok) {
    await w.call('B', 'snapshot');
    const t = await w.call('B', 'request_tahkim', { reason: 'هذه ليست كلمة' });
    ok(t.ok && t.snapshot.game.status === 'tahkim_pending', 'tahkim opened');
    w.clock.t += CHAT_GAP_MS + 1;
    const c = await w.call('A', 'chat_message', { text: 'سأشرح لك في الدردشة' });
    ok(c.ok && c.snapshot.game.chat.length === 1 && c.snapshot.game.tahkim.state === 'pending' && !c.snapshot.game.tahkim.chat.length, 'match chat works inside a Tahkim without writing into it');
  } else ok(true, 'skipped: the random rack did not make a legal word');
}
{
  const w = makeWorld(); await w.start();
  await w.call(w.who(w.turn()), 'resign_game');
  w.clock.t += CHAT_GAP_MS + 1;
  const c = await w.call('A', 'chat_message', { text: 'مباراة جميلة' });
  ok(c.ok && c.snapshot.game.status === 'finished' && c.snapshot.game.chat.length === 1, 'players can still talk after the match has ended');
}

group('validation');
{
  const w = makeWorld(); await w.start();
  for (const [text, why] of [['', 'empty'], ['   ', 'only spaces'], ['\n\t\u0000', 'only control characters'], [undefined, 'missing'], [42, 'not a string']]) {
    const r = await w.call('A', 'chat_message', { text }); ok(!r.ok && r.code === 'EMPTY_MESSAGE', 'refused: ' + why);
  }
  const long = await w.call('A', 'chat_message', { text: 'ا'.repeat(CHAT_MSG_MAX + 1) });
  ok(!long.ok && long.code === 'BAD_REQUEST', 'longer than the limit is refused');
  const edge = await w.call('A', 'chat_message', { text: 'ا'.repeat(CHAT_MSG_MAX) });
  ok(edge.ok, 'exactly the limit is accepted');
  w.clock.t += CHAT_GAP_MS + 1;
  const ctl = await w.call('A', 'chat_message', { text: 'a\u0000b\u202ec\r\nd' });
  ok(ctl.ok && ctl.snapshot.game.chat[1].t === 'a b c d', 'control and bidi-override characters are removed: ' + JSON.stringify(ctl.snapshot.game.chat[1]?.t));
  w.clock.t += CHAT_GAP_MS + 1;
  const html = await w.call('A', 'chat_message', { text: '<img src=x onerror=alert(1)>' });
  ok(html.ok && html.snapshot.game.chat[2].t === '<img src=x onerror=alert(1)>', 'markup is stored as plain text (the page only ever shows it with textContent)');
}
{
  const w = makeWorld(); await w.start();
  const nm = await w.raw('C', { action: 'chat_message', game_id: w.gameId, client_action_id: 'c0000000-0000-4000-8000-000000000000', text: 'hi' });
  ok(!nm.ok && nm.code === 'NOT_MEMBER', 'a stranger cannot post');
}

group('rate limit and idempotency');
{
  const w = makeWorld(); await w.start();
  const a = await w.call('A', 'chat_message', { text: 'واحد' });
  const b = await w.call('A', 'chat_message', { text: 'اثنان' });
  ok(a.ok && !b.ok && b.code === 'RATE_LIMITED', 'a second message inside the gap is refused');
  const other = await w.call('B', 'chat_message', { text: 'رد' });
  ok(other.ok, 'the limit is per player');
  w.clock.t += CHAT_GAP_MS + 1;
  const c = await w.call('A', 'chat_message', { text: 'ثلاثة' });
  ok(c.ok, 'allowed again after the gap');
  const id = 'd0000000-0000-4000-8000-000000000001'; w.clock.t += CHAT_GAP_MS + 1;
  const body = { action: 'chat_message', game_id: w.gameId, client_action_id: id, text: 'مرة واحدة' };
  const r1 = await w.raw('A', body), r2 = await w.raw('A', body);
  ok(r1.ok && r2.ok && r2.snapshot.game.chat.filter(m => m.t === 'مرة واحدة').length === 1, 'a retried send (same client_action_id) is stored once');
}

group('size is bounded');
{
  const w = makeWorld(); await w.start();
  for (let i = 1; i <= CHAT_KEEP + 15; i++) { w.clock.t += CHAT_GAP_MS + 1; const r = await w.call(i % 2 ? 'A' : 'B', 'chat_message', { text: 'رسالة ' + i }); if (!r.ok) { ok(false, 'send ' + i + ' failed: ' + r.code); break; } }
  const g = (await w.call('A', 'snapshot')).snapshot.game;
  ok(g.chat.length === CHAT_KEEP, 'only the newest ' + CHAT_KEEP + ' messages are kept: ' + g.chat.length);
  ok(g.chat[g.chat.length - 1].n === CHAT_KEEP + 15 && g.chat[0].n === 16 && g.chat.every((m, i, a) => !i || m.n === a[i - 1].n + 1), 'numbering keeps counting up and stays contiguous');
}

group('a rematch keeps the conversation');
{
  const w = makeWorld(); await w.start();
  await w.call('A', 'chat_message', { text: 'قبل' });
  await w.call(w.who(w.turn()), 'resign_game');
  await w.call('A', 'rematch'); await w.call('B', 'rematch');
  const s = (await w.call('A', 'snapshot')).snapshot;
  ok(s.game.status === 'active' && s.game.round === 2 && s.game.chat.length === 1 && s.game.chat[0].t === 'قبل', 'a new round does not wipe the chat');
}
done();
