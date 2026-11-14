# v5.9.0 — interface language: Arabic, Indonesian (default) or English

(Also contains v5.7 adaptive board and v5.8 graphics levels: see V5_7_CHANGES.md and V5_8_CHANGES.md.)

## What the player sees
- Settings > "اللغة · Bahasa · Language": **العربية / Indonesia / English**. The whole interface is shown in the chosen language, one language at a time (no stacked second line). It switches at once and is saved (`scrabble.layout`, key `lang`; `data-lang` on <html>).
- **Indonesian is the default** (first visit, no saved choice). `?lang=ar`, `?lang=id` or `?lang=en` in the address sets the default for that visit (a saved choice still wins).
- **Arabic = the original game**, texts unchanged (the rules pages keep their Arabic rule + Indonesian line as before).
- Everywhere: cover, main screen, tooltips and accessible names, Settings, dialogs, results, history, pause and undo requests, first draw, move errors and server messages, lobby and rooms, chat, Tahkim window, install help, rules pages, and the install & connection check page (pwa-check.html).
- **Stays Arabic in every language:** the tile letters and the board, the tile-mode names (their descriptions are translated), player names you typed, and the Arabic examples in the rules (and technical items that must be shown in Arabic script, e.g. the endings ـي ـك ـه). The default names "اللاعب الأول/الثاني" become "Pemain pertama/kedua" / "First/Second player".
- The page layout stays right-to-left in all three languages, but in Indonesian and English **text reads left to right** (paragraphs, rules, notes, headings, messages) and short standalone texts are **centred** (dialog and screen titles, the pause card, the result card, toasts, empty-state messages, the board info line). The board, racks and tiles, and Arabic mode, are untouched. The styles are at the end of css/i18n.css.
- The cover tagline is now **MULTIPLAYER ONLINE** (also in the page title, the install name and README).

## How it works / how to correct a translation
- `js/i18n-ui.js`, `i18n-msgs.js`, `i18n-online.js`, `i18n-check.js`: rows of `[Arabic, Indonesian, English]`; the Arabic text is the key. `{a} {b}` mark the parts that change (names, numbers). Edit a row and it changes everywhere. A text with no row stays Arabic.
- `js/rules-en.js`: English for the rules pages (found from their Indonesian line).
- `js/i18n.js` swaps the Arabic texts for the translation after a screen is built (never per frame; no observer except on pwa-check.html) and swaps them back for Arabic.
- Server messages (supabase/functions/_shared) are still sent in Arabic and translated in the browser by the same table: a new server message needs a new row.

## Review needed
The Indonesian and English wording was written without a native reviewer. Please have someone read at least: Tahkim / idhafah / dhamir terms, the lobby and Supabase setup messages, and the rules lines.

## Tests
`tests/layout/i18n.mjs` (35 checks, in run-all). The older suites open the game with `?lang=ar` (tests/layout/lib.mjs; `EAS_LANG=id|en` runs one in another language), because they read Arabic texts.
Layout check in all three languages at 6 phone/tablet/desktop sizes: no new overflow compared with Arabic.
