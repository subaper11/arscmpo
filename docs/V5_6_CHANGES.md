# v5.6.0 — adaptive alif, split ئـ / ئ, roomier rules, tidier settings, match chat

## Deploy (order matters)
1. Run `supabase/migrations/20261108000008_eas_v5_6_adaptive_mode.sql` (replaces the `tile_mode` check so `'adaptive'` is allowed; safe to re-run).
2. Redeploy the Edge Function `eas-game` (the chat action and the adaptive tiles live in `_shared`; `node tools/sync-edge-shared.mjs` already ran).
3. Deploy the static files. Until step 1 is done, creating an *adaptive* room fails; the other modes and everything else keep working.
Both players should be on 5.6.0 to see the chat (an older page simply has no chat tab).

## Tile modes
- **Adaptive alif (new mode `adaptive`)**: 6 flexible tiles worth **1 point**, each becomes one of ا أ إ آ ؤ ى ئـ ئ when placed (both hamza-on-ya forms, 8 choices). The mode has no fixed أ إ آ ؤ ئ ى tiles; ة stays a plain tile (×3) with no variations; ء ×2 and 2 ordinary blanks stay; 4 plain ا remain. 91 tiles.
  The adaptive alif is a blank that keeps its value (it scores its 1 point, premium squares apply). The chosen form is fixed once the move is sent; a voided move gives the tile back unresolved.
  Look: teal-tinted tile, dashed inner line, a plain ا with a faint ghost of hamza above / below and madda; once placed it shows its letter and a small dot.
- **Expanded mode only**: two hamza-on-ya tiles: **ئـ** (joining, ×2, value 6) and **ئ** (final, ×1, value 8). Bag is now 102 tiles. Words show a plain ئ for both.
- **Classic (`basic`)**: unchanged, no extended letters.
- Neither new tile exists outside its mode (checked by tests/online/adaptive.mjs).

## Word rules
- Removed «اللام الملتصقة بالفعل المضارع» from the allowed list and its mention in the judge's question 2.

## Settings and rules
- Settings: **Essentials** card on top (fullscreen, How to play, pause), then **Match** (draw, racks, live preview, touch), then **Looks and layout**, then a collapsed **More options** (install / connection check). On iPhone, where Safari has no Fullscreen API, a Home Screen tip replaces the dead button.
- **How to play** is a full-height view (full-screen on phones) with tabs: Basics, Points, Letters (per mode), Words, Tahkim. Built from the same constants as the engine.

## Match chat
- The word-log panel has tabs: الكلمات | الدردشة | التحكيم (online only; offline the panel is unchanged).
- Chat unread badge counts only the other player's chat messages (on the tab and on the log buttons); Tahkim has its own amber dot. A preview toast shows the sender and the first line while the chat is not on screen; mute button; quick replies; Enter sends.
- Server: action `chat_message`, stored in `games.ext.chat` (newest 80, ≤200 chars, 1 message / 0.7 s per player, control and bidi-override characters stripped). Works during the match, a pause, a Tahkim and after the match; a chat message never makes the other player's pending move "stale"; a rematch keeps the conversation.

## Tests
New: `online/adaptive.mjs` (40), `online/chat.mjs` (39); parity now covers the adaptive mode; draft tests extended. All node suites pass (see `tests/run-all.mjs`).
Not run here (no Playwright/Python browser in this environment): `tests/e2e`, `tests/layout/*` Python suites; the two assertions that referred to the old Settings rules list were updated by hand. Please run `node tests/run-all.mjs` once on your machine.
