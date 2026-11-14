// Graphics levels (v5.8): default low, css per level, the setting persists, resize snapping is deferred below high.
import { launch, openGame, VIEWPORTS } from './lib.mjs';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL:', m); } };
const b = await launch(); const { page, errors } = await openGame(b, VIEWPORTS['desktop 1366x768']);
ok(await page.evaluate(() => document.documentElement.dataset.gfx) === 'low', 'first visit: graphics = low');
const probe = () => page.evaluate(() => {
  let ov = document.getElementById('tov'); if (!ov) { ov = document.createElement('div'); ov.id = 'tov'; ov.className = 'mOv'; document.body.append(ov); }
  const sq = document.querySelector('#board .sq.k0'), bd = document.getElementById('board'), t = document.querySelector('.rack .tile'); t.classList.add('pick');
  const g = (e, p) => getComputedStyle(e)[p];
  return { blur: g(ov, 'backdropFilter'), sq: g(sq, 'boxShadow'), board: g(bd, 'boxShadow'), anim: g(t, 'animationName'), gap: g(document.querySelector('#board'), 'backgroundImage') };
});
const set = v => page.evaluate(v => { document.documentElement.dataset.gfx = v; }, v);
// snapping: count the padding writes during a 20-step drag-resize: high writes (nearly) every step, low/mid write once when it settles; a single jump snaps at once in every level
const burst = async lvl => { await set(lvl); return page.evaluate(() => new Promise(res => { const bd = document.getElementById('board'); bd.style.maxWidth = 'none'; let n = 0, i = 0; const sp = CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty = function (k, v) { if (k === '--bpad') n++; return sp.call(this, k, v); };
  const f = () => { bd.style.width = (500 + (i % 2 ? 37 : 0) + i * 3) + 'px'; if (++i < 20) setTimeout(f, 20); else setTimeout(() => { const during = n; setTimeout(() => { CSSStyleDeclaration.prototype.setProperty = sp; res({ during, after: n }); }, 500); }, 0); };
  f(); })); };
const hi = await burst('high'), lo = await burst('low'), mi = await burst('mid');
ok(hi.during >= 3 && hi.during > lo.during + 1, `high: the padding keeps being re-snapped during the drag (${hi.during} writes vs ${lo.during} on low)`);
ok(lo.during <= 2 && lo.after > lo.during && mi.during <= 2, `low/mid: snapping is deferred during the drag (${lo.during} / ${mi.during} writes), then done once it settled (${lo.after})`);
const jump = async lvl => { await set(lvl); return page.evaluate(() => new Promise(res => { const bd = document.getElementById('board'); bd.style.maxWidth = 'none'; setTimeout(() => { bd.style.width = '541px'; setTimeout(() => { const cs = getComputedStyle(bd); res((bd.getBoundingClientRect().width - parseFloat(cs.borderLeftWidth) * 2 - parseFloat(cs.paddingLeft) * 2) % 15); }, 160); }, 300); })); };
const j = await jump('low'); ok(Math.abs(j) < 0.05 || Math.abs(j - 15) < 0.05, `low: a single jump in size snaps at once (${j.toFixed(2)})`);
let p = await probe();
ok(p.blur === 'none' && p.sq === 'none' && p.anim === 'none' && !/gradient/.test(p.gap), `low: no blur, flat squares, still pick ring, flat board (${p.blur} | ${p.sq.slice(0, 20)} | ${p.anim})`);
await set('mid'); p = await probe();
ok(p.blur === 'none' && p.sq !== 'none' && p.anim === 'gfxPick' && /gradient/.test(p.gap), `mid: no blur, square shadows back, cheap pick pulse (${p.anim})`);
await set('high'); p = await probe();
ok(/blur/.test(p.blur) && p.sq !== 'none' && p.anim !== 'gfxPick', `high: blur and shadows back as before (${p.blur}); (the test browser reports no animation name for the original blink either)`);
// setting row persists
await set('low'); await page.evaluate(() => document.getElementById('tov')?.remove());
const row = await page.$('#lyB button[data-k="gfx"][data-v="high"]'); ok(!!row, 'Settings has the Graphics row');
if (row) { await row.evaluate(e => e.click()); ok(await page.evaluate(() => document.documentElement.dataset.gfx === 'high' && JSON.parse(localStorage.getItem('scrabble.layout')).gfx === 'high'), 'choosing high applies and saves');
  await (await page.$('#lyB button[data-k="gfx"][data-v="low"]')).evaluate(e => e.click()); ok(await page.evaluate(() => document.documentElement.dataset.gfx === 'low'), 'back to low'); }
// bad saved value -> low
const pg2 = await b.newPage(); await pg2.evaluateOnNewDocument(() => localStorage.setItem('scrabble.layout', JSON.stringify({ gfx: 'ultra' })));
await pg2.goto(page.url()); ok(await pg2.evaluate(() => document.documentElement.dataset.gfx) === 'low', 'an unknown saved value falls back to low'); await pg2.close(); await page.bringToFront();
ok(errors.length === 0, 'no page errors: ' + errors.slice(0, 2).join(' | '));
await b.close(); console.log(`gfx: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
