# v5.8.0 — Graphics levels (also contains everything in V5_7_CHANGES.md)

## Settings > Graphics (`data-gfx` on <html>, saved in scrabble.layout, set before first paint)
- **low (default for everyone, the base game)**: no blur, no filters, flat board (no big board shadow, no per-square or per-tile shadows), no looping animations, the picked tile has a still ring.
- **mid**: no blur, no filters; board and tile shadows back; looping cues back; the picked tile pulses by opacity (composited) instead of a glowing shadow.
- **high**: exactly the previous look (blur, glow, shadows, immediate snapping).
- An unknown or missing saved value means low. People who already had the game get low until they change it.
- css/gfx.css (loaded last) holds all the per-level rules; high is "nothing applies".

## Resize cost (js/scale.js)
Snapping the cells to whole pixels changes the board's padding, which was a second full layout of the 225 cells on every resize frame. Low and mid snap immediately when the size jumps (mode switch, rotation) but, while the size keeps changing (a drag), wait until it has settled for 120 ms. High snaps on every frame as before.
Measured in headless Chromium (software rendering, relative numbers only), 40 resize frames: layouts 79 (high) vs 40 (mid) vs ~41 (low); main-thread time about 3.2 s (high), 1.9 s (mid), 1.5 s (low).

## Tests
New `tests/layout/gfx.mjs` (12 checks, added to run-all.mjs). See the end of this file for the suite results of this build.

## Suite results of this build (headless Chromium here)
Pass: log-icon 509, gfx 12, floating 242, layering 146, fluid 220, tools 69, collapse 84, feel 72, adaptive 20, logic engine 142 / endgame 21 / names 22 / startup, pwa/static 460, edge-shared sync, float_modules 51.
Same on the untouched v5.6.0: `layout/history-toggle.mjs` 9 failures (239 passed) and `contrast.py` 1 failure (pink tile, blank letter 4.49 < 4.5).
Not run: online server suites, python e2e, pwa/e2e. No test on a real phone or GPU; the timings above are relative.
