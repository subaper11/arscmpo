# v5.7.0 — adaptive board, quieter just-played marker

## What changed
- **Adaptive board** (css/style.css "Adaptive board", named container `board`; works in the normal layout and in Floating Workspace, rack tiles untouched). Widths are the board's inner width (about 20-25 px less than its outer width):
  - premium squares: >=580 `x2 حرف` | 440-579 `x2 ح` | 340-439 `x2` | <340 pips (round = letter x2/x3, square = word x2/x3; star stays ★)
  - tile values on the board: hidden below 420 (the letter stays); the adaptive alif drops its ghost letters and dashed border there
  - Settings > Looks and layout > "قيم القطع على اللوح": automatic (default) or always shown (`data-tvals="on"`)
  - long-press (450 ms) on a scored tile whose value is hidden shows a small bubble with letter and value (js/peek.js; pending tiles ignored; the click that ends the press is swallowed)
- **Just-played marker** (online): an inset ring along the tile edge plus a small proportional corner pip (no pixel floor), pip dropped below 340. The word flash is now a ring and glow, no colour fill (the fill hid the letters).
- `APP_VERSION` 5.7.0; `js/peek.js` added to the service worker precache (VERSION re-stamped).

## Not changed on purpose
- Online play already shows one scoreboard (the match card holds both names, scores and clocks; only your rack panel is shown), so no merge was needed. Offline keeps two panels.
- Unread badges already share one style; the bag-count badge means something else and is left alone.

## Tests
New `tests/layout/adaptive.mjs` (20 checks, added to run-all). Run here: log-icon, floating, layering, fluid, tools, collapse, feel, adaptive, logic engine/endgame/names, pwa/static, edge-shared sync, float_modules all pass. `layout/history-toggle.mjs` has 9 failures that are identical on the untouched v5.6.0 zip (environment, not this change). `contrast.py` reports 1 failure that was not compared with v5.6.0. Not run: online server suites, python e2e, pwa/e2e. No visual check on a real device.
