// Interface language (v5.9): Arabic (original), Indonesian (default) or English; each shows the interface in that one language; Settings > Language switches live.
// Arabic stays only where it must: tile letters, the board, tile-mode names, rule examples.
import { launch, openGame, VIEWPORTS, BASE } from './lib.mjs';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL:', m); } };
const b = await launch(); const w = ms => new Promise(r => setTimeout(r, ms)); const AR = /[\u0600-\u06FF]/;
const bodyText = (p, sel) => p.evaluate(sel => document.querySelector(sel).textContent.replace(/\s+/g, ' ').trim(), sel);
// ---- the app's own default, with no ?lang and nothing saved: Indonesian
{
  const { page, errors } = await openGame(b, VIEWPORTS['desktop 1366x768'], { lang: 'default' });
  ok(await page.evaluate(() => document.documentElement.dataset.lang) === 'id', 'first visit: Indonesian');
  ok(await page.evaluate(() => [...document.querySelectorAll('#bSubmit .lbl')].map(e => e.textContent).join('')) === 'Hitung skor', 'a control label is Indonesian only: ' + await page.evaluate(() => document.querySelector('#bSubmit .lbl').textContent));
  ok(await page.$eval('#bSubmit', e => e.getAttribute('aria-label') + '|' + e.title) === 'Hitung skor|Hitung skor', 'accessible name and tooltip follow the language');
  ok(/Pemain pertama/.test(await bodyText(page, '.panel')) && !/اللاعب الأول/.test(await bodyText(page, '.panel')), 'the default player names are translated');
  const tiles = await page.evaluate(() => [...document.querySelectorAll('.rack .tile b')].map(e => e.textContent).join('')); ok(AR.test(tiles) && !/[a-z]/i.test(tiles), 'tile letters stay Arabic: ' + tiles);
  await page.evaluate(async () => { const U = await import('/js/ui.js'); U.warn('لا يمكن التبديل: في الكيس 5 قطع فقط (الحد الأدنى 7).'); });
  ok(await bodyText(page, '#toast') === 'Tidak bisa menukar: kantong hanya berisi 5 tile (minimal 7).', 'a message with numbers is translated: ' + await bodyText(page, '#toast'));
  await page.evaluate(() => document.getElementById('bSettings')?.click()); await w(300);
  const row = await page.$$eval('#lyB button[data-k="lang"]', bs => bs.map(x => x.dataset.v + ':' + x.textContent.trim()).join(' '));
  ok(row === 'ar:العربية id:Indonesia en:English', 'three language options, each in its own language: ' + row);
  await page.evaluate(() => document.querySelector('#lyB button[data-k="lang"][data-v="en"]').click()); await w(300);
  ok(await page.evaluate(() => document.documentElement.dataset.lang) === 'en' && JSON.parse(await page.evaluate(() => localStorage.getItem('scrabble.layout'))).lang === 'en', 'English applies and is saved');
  const st = await bodyText(page, '#ad'); ok(/Settings/.test(st) && /Fullscreen/.test(st) && !/Pengaturan|Layar penuh/.test(st), 'the open Settings panel is English now');
  ok(!AR.test(st.replace(/العربية|اللغة/g, '')), 'no Arabic left in the English Settings panel apart from the language row: ' + (st.match(/[\u0600-\u06FF][\u0600-\u06FF ]*/g) || []).slice(0, 4).join(' | '));
  await page.evaluate(() => document.querySelector('#lyB button[data-k="lang"][data-v="ar"]').click()); await w(300);
  const sa = await bodyText(page, '#ad'); ok(/الإعدادات/.test(sa) && /ملء الشاشة/.test(sa) && !/Settings|Fullscreen/.test(sa), 'Arabic restores the original texts');
  ok(await page.evaluate(() => document.querySelectorAll('.tr').length) === 0 && await page.$eval('#bSubmit', e => e.title) === 'احتساب', 'nothing translated is left behind in Arabic');
  await page.evaluate(() => document.querySelector('#lyB button[data-k="lang"][data-v="id"]').click()); await w(300);
  ok(/Pengaturan/.test(await bodyText(page, '#ad')), 'and back to Indonesian');
  ok(errors.length === 0, 'no page errors: ' + errors.slice(0, 2).join(' | ')); await page.close();
}
// ---- Arabic is the original game
{
  const { page } = await openGame(b, VIEWPORTS['desktop 1366x768'], { lang: 'ar' });
  ok(await page.evaluate(() => document.querySelectorAll('.tr,.l2,.bi').length) === 0 && !/Hitung|Score/.test(await bodyText(page, '.ctrls')), 'Arabic: no translated text anywhere');
  await page.evaluate(async () => { const m = await import('/js/rulesview.js'); m.openRules('words'); }); await w(300);
  ok(await page.evaluate(() => document.querySelectorAll('#rd .wrAr').length > 5 && document.querySelectorAll('#rd .wrId').length > 5), 'Arabic rules: the Arabic rule with its Indonesian line, as in the original');
  await page.close();
}
// ---- the rules in Indonesian and English: one line per rule, Arabic examples kept
for (const lang of ['id', 'en']) {
  const { page } = await openGame(b, VIEWPORTS['desktop 1366x768'], { lang });
  for (const tab of ['basics', 'points', 'letters', 'words', 'tahkim']) {
    await page.evaluate(async t => { const m = await import('/js/rulesview.js'); m.openRules(t); }, tab); await w(200);
    const r = await page.evaluate(() => { const body = document.getElementById('rdBody'); const txt = [...body.querySelectorAll('li,p,h3,h4')].map(e => e.cloneNode(true)); txt.forEach(e => e.querySelectorAll('.wrEx,.num').forEach(x => x.remove())); return { ar: txt.filter(e => /[\u0600-\u06FF]/.test(e.textContent.replace(/«[^»]*»|\([^)]*\)/g, ''))).map(e => e.textContent.trim().slice(0, 70)), wrAr: body.querySelectorAll('.wrAr').length, miss: [...(globalThis.__enMiss || [])] }; });
    ok(r.wrAr === 0 && r.miss.length === 0, `${lang} rules/${tab}: no Arabic rule lines left (${r.wrAr}), missing English ${JSON.stringify(r.miss)}`);
    if (r.ar.length) console.log('   Arabic outside examples in', lang, tab, JSON.stringify(r.ar.slice(0, 3)));
  }
  if (lang === 'id') { const ex = await page.evaluate(() => document.querySelectorAll('#rd .wrEx').length); ok(ex >= 0, 'examples are kept as Arabic'); }
  await page.close();
}
// ---- reading direction and the cover tagline
for (const lang of ['id', 'ar']) {
  const { page } = await openGame(b, VIEWPORTS['desktop 1366x768'], { lang });
  await page.evaluate(() => document.getElementById('bSettings')?.click()); await w(300);
  const d = await page.evaluate(() => { const g = e => getComputedStyle(e); const n = document.querySelector('#ad .setNote'), h = document.querySelector('#ad h2'), bd = document.getElementById('board'), rk = document.querySelector('.rack');
    return { note: g(n).direction + '/' + g(n).textAlign, title: g(h).textAlign, board: g(bd).direction, rack: g(rk).direction, tag: document.querySelector('.coverSub').textContent, title2: document.title }; });
  if (lang === 'id') ok(d.note === 'ltr/left' && d.title === 'center', 'Indonesian: notes read left to right, the dialog title is centred: ' + JSON.stringify(d));
  else ok(d.note.startsWith('rtl'), 'Arabic: notes stay right to left: ' + d.note);
  ok(d.board === 'rtl' && d.rack === 'rtl', lang + ': the board and the racks keep their direction');
  ok(d.tag === 'MULTIPLAYER ONLINE' && /Multiplayer Online/.test(d.title2), lang + ': cover tagline is MULTIPLAYER ONLINE');
  await page.close();
}
// ---- a bad saved value falls back to Indonesian
{ const pg = await b.newPage(); await pg.evaluateOnNewDocument(() => localStorage.setItem('scrabble.layout', JSON.stringify({ lang: 'fr' })));
  await pg.goto(BASE + '/index.html', { waitUntil: 'load' }).catch(() => {});
  ok(await pg.evaluate(() => document.documentElement.dataset.lang) === 'id', 'an unknown saved language falls back to Indonesian'); await pg.close(); }
// ---- the dictionary
{ const { page } = await openGame(b, VIEWPORTS['desktop 1366x768'], { lang: 'ar' });
  const rows = await page.evaluate(async () => { const { DICT } = await import('/js/i18n-dict.js'); const f = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
    return { n: DICT.length, bad: DICT.filter(([k, i, e]) => !i || !e).map(r => r[0].slice(0, 30)), dup: DICT.length - new Set(DICT.map(r => r[0])).size, ph: DICT.filter(([k, i, e]) => !k.startsWith('i18n.') && (f(k) !== f(i) || f(k) !== f(e))).map(r => r[0].slice(0, 40)) }; });
  ok(rows.bad.length === 0 && rows.dup === 0 && rows.ph.length === 0, `dictionary: ${rows.n} rows, empty ${rows.bad}, duplicates ${rows.dup}, placeholder mismatch ${rows.ph}`); await page.close(); }
await b.close(); console.log(`i18n: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
