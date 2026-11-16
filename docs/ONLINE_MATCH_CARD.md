# Online match card (UI only, online mode only)
1. Online, only your own rack is shown. The opponent's panel and tiles are not drawn at all (ui.js skips them); their tile count is on the card.
2. The online info section is now a "Player 1 VS Player 2" card (js/online/hud.js, #netBar): per player a presence dot, name, score, tiles left and clock, with tags "you" / "turn" on the top edge and the player on turn lit.
   Underneath: status line, room code (click to copy), pause, claim / rematch, surrender. Clocks moved here from the panels.
3. A one-line caption above your rack says whose turn it is.
4. The card answers to its own width (container queries): phone, side column, landscape phone, floating module. Duel layout and Floating Workspace defaults handle the single rack.
Local play is untouched. APP_VERSION is unchanged on purpose (UI-only; a bump would block pause/undo/Tahkim between mixed versions).

## Update: solid live preview + minimal card
- Live preview (js/online/ghost.js): the opponent's tentative tiles are now real, opaque tiles (pending look, their colour, point value; blanks show 0), not dashed translucent boxes.
  Anti-flicker: ghosts are painted incrementally (unchanged squares are never rewritten), a take-back / empty draft waits ~0.4 s before it clears (pick-up-and-put-down is one gesture),
  an absent opponent keeps the preview 3 s, and adding/moving tiles is sent immediately (the presence layer already coalesces ~120 ms). Draft format: blanks travel as "*letter" (old format still valid).
- Match card: name, score, clock per player, the player on turn outlined; a dot only when someone is offline; the status line only speaks when there is something to say;
  info row = room code + pause + surrender. The opponent's tile count is in the card's accessible name only.
