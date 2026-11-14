// Interface language: Arabic (the original game), Indonesian (the default) or English (Settings > Language). Each shows the interface in that one language.
// The game is written in Arabic; for Indonesian and English this file swaps the Arabic texts for their translation after a screen is built (never per frame), and swaps them back
// for Arabic. Translations live in js/i18n-*.js as [arabic, indonesian, english] rows keyed by the exact Arabic text, so every sentence is written once and can be corrected
// in one place. A key may hold {a} {b}... for the parts that change (names, numbers). A text with no row simply stays Arabic.
//   localize(root)   translates every dictionary-known Arabic text, tooltip and name inside root (fresh = true: from the original Arabic again, after a language change)
//   sec(text)        the translation of an Arabic text in the current language ('' for Arabic or when there is none)
//   bt(text)         the text to put in a tooltip or an accessible name: the translation, or the text itself
// Stays Arabic in every language: the tile letters and the board, the tile-mode names, the examples in the rules, and technical terms that must be written in Arabic script.
import { DICT } from './i18n-dict.js';

const AR = /[\u0600-\u06FF]/, esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exact = new Map(), tpls = [];
for (const [k, id, en] of DICT) {
  if (/\{\w+\}/.test(k)) {
    const names = [], re = new RegExp('^' + esc(k).replace(/\\\{(\w+)\\\}/g, (_, n) => { names.push(n); return '([\\s\\S]*?)'; }) + '$');
    tpls.push({ re, names, v: [id, en] });
  } else exact.set(k, [id, en]);
}
tpls.sort((a, b) => b.re.source.length - a.re.source.length);   // the most specific template first

export const getLang = () => {
  const v = typeof document !== 'undefined' ? document.documentElement.dataset.lang : '';
  return v === 'ar' || v === 'en' ? v : 'id';
};
const idx = () => (getLang() === 'en' ? 1 : 0);

// A value captured by a template ("{a}") is translated too when it is itself a known text (a label, a reason, a default name...), keeping its spaces and a leading " · " or "— ".
function part(v) {
  const t = v.trim(); if (!t || !AR.test(t)) return v;
  const lead = v.slice(0, v.indexOf(t)), tail = v.slice(v.indexOf(t) + t.length);
  const whole = exact.get(t); if (whole) return lead + whole[idx()] + tail;
  const m = t.match(/^([·—\-–،,:\s]+)([\s\S]+)$/), core = m ? m[2].trim() : t, sep = m ? m[1] : '';
  const e = exact.get(core), s = e ? e[idx()] : lookupTpl(core);
  return s ? lead + sep + s + tail : lead + '\u2068' + t + '\u2069' + tail;   // an Arabic name or label that stays Arabic inside a translated sentence is isolated, so the sentence keeps its order
}
function lookupTpl(t) {
  for (const p of tpls) {
    const m = t.match(p.re); if (!m) continue;
    return p.v[idx()].replace(/\{(\w+)\}/g, (_, n) => { const i = p.names.indexOf(n); return i < 0 ? '' : part(m[i + 1]); });
  }
  return '';
}
export function sec(text) {
  if (getLang() === 'ar') return '';
  const t = String(text ?? '').trim(); if (!t || !AR.test(t)) return '';
  const e = exact.get(t); return e ? e[idx()] : lookupTpl(t);
}
export const bt = text => sec(text) || text;
// The original Arabic text of an element, whether or not its text is currently translated.
export const arText = el => [...el.childNodes].map(n => n.nodeType === 3 ? n.data : n.classList?.contains('tr') ? (n.dataset.ar ?? n.textContent) : n.textContent).join('');
// Words that exist in the three languages and sit next to the Arabic in a page of rules: pick by language.
export const L3 = (ar, id, en) => { const l = getLang(); return l === 'ar' ? ar : l === 'en' ? en : id; };

const SKIP = 'script,style,textarea,input,select,svg,.tr,[data-no-i18n],[data-i18n],#board,.rack,.tile,.wrEx,.num,.en';
function restore(root) {
  root.querySelectorAll?.('.tr[data-ar]').forEach(w => w.replaceWith(document.createTextNode(w.dataset.ar)));
  root.querySelectorAll?.('[data-i18n]').forEach(el => { if (el._orig !== undefined) { el.innerHTML = el._orig; el._orig = undefined; } });
  root.querySelectorAll?.('[data-c-title],[data-c-placeholder],[data-c-aria-label]').forEach(el => ATTRS.forEach(a => { if (el.hasAttribute('data-c-' + a)) { if (el.getAttribute(a) === el.getAttribute('data-c-' + a)) el.setAttribute(a, el.getAttribute('data-o-' + a)); el.removeAttribute('data-c-' + a); el.removeAttribute('data-o-' + a); } }));
}
function wrapText(n) {
  const raw = n.data, t = raw.trim(); if (!AR.test(t)) return;
  const s = sec(t); if (!s) return;
  const lead = raw.slice(0, raw.indexOf(t)), tail = raw.slice(raw.indexOf(t) + t.length);
  const w = document.createElement('span'); w.className = 'tr'; w.dataset.ar = t; w.textContent = s;
  const frag = document.createDocumentFragment();
  if (lead) frag.append(lead); frag.append(w); if (tail) frag.append(tail);
  n.replaceWith(frag);
}
const ATTRS = ['title', 'aria-label', 'placeholder'];
function attrs(el) {
  for (const a of ATTRS) {
    const cur = el.getAttribute(a); if (cur == null) continue;
    const comp = el.getAttribute('data-c-' + a), orig = comp !== null && cur === comp ? el.getAttribute('data-o-' + a) : cur;
    if (!AR.test(orig)) continue;
    const s = sec(orig);
    if (!s) { if (comp !== null) { el.setAttribute(a, orig); el.removeAttribute('data-c-' + a); el.removeAttribute('data-o-' + a); } continue; }
    el.setAttribute('data-o-' + a, orig); el.setAttribute('data-c-' + a, s); el.setAttribute(a, s);
  }
}
export function localize(root = document.body, fresh = false) {
  if (!root || typeof document === 'undefined' || typeof document.createTreeWalker !== 'function' || typeof NodeFilter === 'undefined') return;   // (a page without a real DOM, such as a unit test, has nothing to translate)
  const isEl = root.nodeType === 1, base = isEl ? root : document.body;
  if (fresh) restore(base);
  if (getLang() === 'ar') return;
  if (isEl && (root.hasAttribute('title') || root.hasAttribute('placeholder') || root.hasAttribute('aria-label'))) attrs(root);
  base.querySelectorAll('[title],[placeholder],[aria-label]').forEach(attrs);
  const tw = document.createTreeWalker(base, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, { acceptNode: n => n.nodeType === 1 ? (n.matches(SKIP) && n !== base ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP) : AR.test(n.data) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
  const list = []; for (let n = tw.nextNode(); n; n = tw.nextNode()) list.push(n);
  list.forEach(wrapText);
  // an element whose text is mixed with markup (a sentence with an English word in it) names its own row: data-i18n="key"; its whole content is swapped
  (isEl ? [root, ...base.querySelectorAll('[data-i18n]')] : [...document.querySelectorAll('[data-i18n]')]).forEach(el => {
    if (!el.matches?.('[data-i18n]')) return;
    const row = exact.get(el.dataset.i18n); if (!row) return;
    if (el._orig === undefined) el._orig = el.innerHTML;
    el.innerHTML = row[idx()];
  });
}
// Set the text of an element only when it changed (it may be called every render), then translate it.
export function setTxt(el, text) { if (el._s !== text) { el._s = text; el.textContent = text; localize(el); } }
export function initI18n() {
  localize(document.body);
  document.addEventListener('eas:lang', () => { localize(document.body, true); document.documentElement.lang = getLang() === 'ar' ? 'ar' : getLang(); });   // Settings > Language: from the Arabic again
}
