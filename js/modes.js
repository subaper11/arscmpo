// Tile modes: the ONLY thing that differs between the two ways of playing.
// Each profile defines the tile bag [letter, value, count] and the letters a blank may represent.
// Everything else (board, scoring, timer, tahkim, undo, ...) is shared engine code.
// An empty letter is a blank tile. Tiles use the canonical letter ه (never هـ; see FACE in config.js).
// The letter '*' (ADAPTIVE) is the adaptive alif of the adaptive mode: a flexible tile worth its own points (not 0) that the player turns into one of ALIF_FORMS when placing it.
// The expanded mode alone distinguishes two hamza-on-ya tiles: 'ئـ' (the joining form, ئ + tatweel, as in مسائل) and plain 'ئ' (the final form, as in شاطئ). The tatweel is only a face: wordStr() removes it.
// No automatic normalisation (أ→ا, ة→ه, ...): word validity is decided by the human tahkim.
export const ADAPTIVE = '*';
// What an adaptive alif may become: alif and every variation built on it (hamza above / below, madda, hamza on waw, alif maqsura, hamza on ya in its joining form ئـ and its final form ئ).
export const ALIF_FORMS = ['ا', 'أ', 'إ', 'آ', 'ؤ', 'ى', 'ئـ', 'ئ'];   // an array: ئـ is two code points (ئ + tatweel). ئـ and ئ are both offered here, though only the expanded bag has them as separate fixed tiles.
export const TATWEEL = '\u0640';

export const EXPANDED_TILES = [
  ['ا',1,8], ['ل',1,8], ['ي',1,6], ['ت',1,4], ['ن',1,4], ['ر',1,4],

  ['و',2,6], ['م',2,4], ['ب',2,4], ['د',2,4], ['ه',2,4],

  ['س',3,4], ['ج',3,2], ['ح',3,2], ['ك',3,2],

  ['خ',4,2], ['ق',4,2], ['ف',4,2],

  ['ث',5,1], ['ذ',5,1], ['ش',5,1], ['ض',5,1],

  ['ط',8,1], ['ظ',8,1], ['ع',8,1],

  ['ص',10,1], ['ز',10,1], ['غ',10,1],

  // Expanded-only letters: the rarer the letter in real Arabic text, the more it is worth (ة stays 3: it ends most feminine nouns).
  // ئـ (joining form: مسائل، رئيس) is the common hamza-on-ya; plain ئ (final form: شاطئ، قارئ) is rarer, so it is worth more and there is only one.
  ['أ',4,4], ['ة',3,3], ['ى',4,2], ['إ',6,2], ['ء',6,2], ['ئـ',6,2], ['ئ',8,1], ['ؤ',8,1], ['آ',10,1],

  ['',0,2]
];

export const BASIC_TILES = [
  ['ا',1,8], ['ل',1,8], ['ي',1,6], ['ت',1,4], ['ن',1,4], ['ر',1,4],

  ['و',2,6], ['م',2,4], ['ب',2,4], ['د',2,4], ['ه',2,4],

  ['س',3,4], ['ج',3,2], ['ح',3,2], ['ك',3,2],

  ['خ',4,2], ['ق',4,2], ['ف',4,2],

  ['ث',5,1], ['ذ',5,1], ['ش',5,1], ['ض',5,1],

  ['ط',8,1], ['ظ',8,1], ['ع',8,1],

  ['ص',10,1], ['ز',10,1], ['غ',10,1],

  ['',0,2]
];

// Adaptive mode: the basic letters plus ء and ة (ة stays a plain tile with no variations), and the adaptive alif, which replaces أ إ آ ؤ ى ئ entirely.
// Plain ا is kept for the player who simply wants ا; the adaptive alif is worth 1 (like ا) and never 0, so it is NOT a blank.
export const ADAPTIVE_TILES = [
  ['ا',1,4], ['*',1,6], ['ل',1,8], ['ي',1,6], ['ت',1,4], ['ن',1,4], ['ر',1,4],

  ['و',2,6], ['م',2,4], ['ب',2,4], ['د',2,4], ['ه',2,4],

  ['س',3,4], ['ج',3,2], ['ح',3,2], ['ك',3,2], ['ة',3,3],

  ['خ',4,2], ['ق',4,2], ['ف',4,2],

  ['ث',5,1], ['ذ',5,1], ['ش',5,1], ['ض',5,1],

  ['ء',6,2],

  ['ط',8,1], ['ظ',8,1], ['ع',8,1],

  ['ص',10,1], ['ز',10,1], ['غ',10,1],

  ['',0,2]
];

// Blank-tile picker contents (display order).
export const EXPANDED_ALPHA = 'ءآأؤإئابتثجحخدذرزسشصضطظعغفقكلمنهويةى';
export const BASIC_ALPHA = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';
// A blank in the adaptive mode may be any letter of its bag (ء ة and ا with its variations included).
export const ADAPTIVE_ALPHA = EXPANDED_ALPHA;

export const TILE_MODES = {
  expanded: {
    id: 'expanded',
    labelAr: 'الحروف الموسعة',
    labelEn: 'Expanded',
    descAr: 'أ إ آ ء ؤ ئ ة ى\n+ الحروف الأساسية\nقيم أعلى للحروف النادرة',
    tiles: EXPANDED_TILES,
    alpha: EXPANDED_ALPHA
  },
  adaptive: {
    id: 'adaptive',
    labelAr: 'الألف المرنة',
    labelEn: 'Adaptive alif',
    descAr: 'قطعة «ألف مرنة» تصير ا أ إ آ ؤ ى ئ\nقيمتها نقطة واحدة\nأسهل من الحروف الموسعة',
    tiles: ADAPTIVE_TILES,
    alpha: ADAPTIVE_ALPHA
  },
  basic: {
    id: 'basic',
    labelAr: 'الحروف الأساسية',
    labelEn: 'Basic',
    descAr: 'الحروف الهجائية الأساسية',
    tiles: BASIC_TILES,
    alpha: BASIC_ALPHA
  }
};

// ---------- Tile helpers (shared by the browser and the Edge Function) ----------
// A flexible tile (blank or adaptive alif) is `blank: true` until it is placed; `flex` marks the adaptive alif, which keeps its value.
export const isFlex = t => !!(t && t.flex);
export const tileValue = t => (t.blank && !t.flex ? 0 : t.v);
// The letters a tile may become when it is placed: an adaptive alif only its alif forms, a blank any letter of the mode.
export const tileAlpha = (modeId, t) => (t && t.flex ? ALIF_FORMS : TILE_MODES[modeId].alpha);
// The letter a tile stands for, for words, logs and the live preview ('' = a flexible tile with no letter yet).
export const tileLetter = t => (t.blank ? t.as || '' : t.l);
