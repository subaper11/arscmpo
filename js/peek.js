// Long-press (touch) or hold (mouse) on a scored tile of a small board: a bubble shows its letter and value while the board hides the values (css "Adaptive board").
// Pending tiles are left alone (they are being moved), and the click that ends a long-press is swallowed so nothing is selected by accident.
const HOLD = 450, MOVE = 8, SHOW = 1800;
let timer = 0, bubble = null, hideT = 0, sx = 0, sy = 0, swallow = 0;

const hidden = t => { const i = t.querySelector(':scope > i'); return !!i && getComputedStyle(i).display === 'none'; };
function clear() { clearTimeout(timer); timer = 0; }
function hide() { clearTimeout(hideT); bubble?.remove(); bubble = null; }
function show(t) {
  hide();
  const b = t.querySelector(':scope > b')?.textContent || '', v = t.querySelector(':scope > i')?.textContent || '', r = t.getBoundingClientRect();
  bubble = document.createElement('div'); bubble.className = 'tvPeek'; bubble.setAttribute('aria-hidden', 'true');
  bubble.innerHTML = '<strong></strong><span></span>'; bubble.firstChild.textContent = b; bubble.lastChild.textContent = v ? 'قيمة ' + v : '';
  bubble.style.left = Math.min(innerWidth - 40, Math.max(40, r.left + r.width / 2)) + 'px'; bubble.style.top = Math.max(40, r.top - 6) + 'px';
  document.body.append(bubble); hideT = setTimeout(hide, SHOW);
}

export function initPeek() {
  const board = document.getElementById('board'); if (!board) return;
  board.addEventListener('pointerdown', e => {
    clear(); const t = e.target.closest?.('.sq.has:not(.mv) .tile'); if (!t || e.button > 0 || !hidden(t)) return;
    sx = e.clientX; sy = e.clientY;
    timer = setTimeout(() => { timer = 0; swallow = Date.now() + 700; show(t); }, HOLD);
  });
  board.addEventListener('pointermove', e => { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > MOVE) clear(); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) board.addEventListener(ev, clear);
  board.addEventListener('contextmenu', e => { if (bubble || timer) e.preventDefault(); });   // a touch long-press would open the browser's menu
  board.addEventListener('click', e => { if (Date.now() < swallow) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  document.addEventListener('pointerdown', e => { if (bubble && !e.target.closest?.('#board')) hide(); });
}
