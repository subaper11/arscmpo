import { suite } from './lib.mjs';
import { encodeDraft, decodeDraft } from '../../js/online/draft.js';
const { ok, group, done } = suite('live preview payloads (untrusted input)');
const empty = Array.from({ length: 15 }, () => Array(15).fill(null)), t = (l, blank = false) => ({ t: { l, blank, as: blank ? l : null } });
group('round trip');
{
  const p = encodeDraft(7, [{ r: 7, c: 7, ...t('م') }, { r: 7, c: 8, ...t('ب', true) }, { r: 7, c: 9, t: { l: '', blank: true, as: null } }]);
  ok(p.rev === 7 && p.c.length === 2, 'encoded (a blank without a chosen letter is left out)');
  const d = decodeDraft(JSON.parse(JSON.stringify(p)), { rev: 7, board: empty });
  ok(d && d.length === 2 && d[0].l === 'م', 'decoded after a JSON round trip');
  ok(JSON.stringify(decodeDraft({ rev: 7, c: [] }, { rev: 7, board: empty })) === '[]', 'an empty draft is valid: it clears the ghosts');
}
{
  const p = JSON.parse(JSON.stringify(encodeDraft(3, [{ r: 7, c: 7, ...t('ب', true) }, { r: 7, c: 8, ...t('م') }])));
  const d = decodeDraft(p, { rev: 3, board: empty });
  ok(d[0].blank === true && d[0].l === 'ب' && d[1].blank === false && d[1].l === 'م', 'a blank travels as a blank (the receiver shows it worth 0), a letter as a letter');
  ok(decodeDraft({ rev: 3, c: [[1, 1, '*']] }, { rev: 3, board: empty }) === null, 'a blank marker without a letter is rejected');
}
group('everything else is ignored');
const bad = [null, 'x', 5, {}, { rev: 6, c: [] }, { rev: '7', c: [] }, { rev: 7 }, { rev: 7, c: 'x' }, { rev: 7, c: Array(8).fill([0, 0, 'م']) },
  { rev: 7, c: [[0, 0]] }, { rev: 7, c: [[0, 0, 'م', 1]] }, { rev: 7, c: [[-1, 0, 'م']] }, { rev: 7, c: [[0, 15, 'م']] }, { rev: 7, c: [[1.5, 0, 'م']] },
  { rev: 7, c: [['0', 0, 'م']] }, { rev: 7, c: [[0, 0, 5]] }, { rev: 7, c: [[0, 0, '']] }, { rev: 7, c: [[0, 0, 'ممم']] }, { rev: 7, c: [[0, 0, 'م'], [0, 0, 'ب']] }, { rev: 7, c: [{ r: 0 }] }];
bad.forEach((p, i) => ok(decodeDraft(p, { rev: 7, board: empty }) === null, 'rejected #' + i + ': ' + JSON.stringify(p)));
const taken = empty.map(r => [...r]); taken[7][7] = { id: 'x' };
ok(decodeDraft({ rev: 7, c: [[7, 7, 'م']] }, { rev: 7, board: taken }) === null, 'a square that is already taken is rejected (the draft is for another position)');
ok(decodeDraft({ rev: 8, c: [[7, 7, 'م']] }, { rev: 7, board: empty }) === null, 'a draft for another revision is rejected');
ok(decodeDraft({ rev: 7, c: [[7, 7, '<img src=x onerror=1>']] }, { rev: 7, board: empty }) === null, 'long / markup-like letters are rejected');
// adaptive alif and the joining ئـ
{
  const ctx = { rev: 7, board: empty };
  const flex = { t: { blank: true, flex: true, as: 'أ', l: '' }, r: 7, c: 7 }, blank = { t: { blank: true, as: 'ب', l: '' }, r: 7, c: 8 }, jy = { t: { blank: false, l: 'ئـ' }, r: 7, c: 9 };
  const d = decodeDraft(encodeDraft(7, [flex, blank, jy]), ctx);
  ok(d && d[0].flex && d[0].blank && d[0].l === 'أ', 'an adaptive alif travels as an adaptive alif');
  ok(d && !d[1].flex && d[1].blank, 'a plain blank stays a plain blank');
  ok(d && d[2].l === 'ئـ' && !d[2].blank, 'the joining ئـ (letter + tatweel) survives the draft');
  ok(decodeDraft({ rev: 7, c: [[7, 7, '+ءxx']] }, ctx) === null, 'an over-long marked letter is rejected');
}
done();
