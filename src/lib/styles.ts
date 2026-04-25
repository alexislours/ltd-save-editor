export const LABEL_CLASS = 'block text-sm font-bold text-slate-900';

export const INPUT_CLASS =
  'rounded-lg border border-amber-400/60 bg-white px-2.5 py-1.5 text-sm text-slate-900 shadow-sm transition-colors focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30';

export const FORM_INPUT_CLASS = `mt-1.5 w-full ${INPUT_CLASS} px-3 py-2`;

export const MONO_INPUT_CLASS = `${INPUT_CLASS} font-mono`;

export const PILL_BUTTON_CLASS =
  'rounded-full border border-amber-400/60 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-amber-50';

export const PRIMARY_BUTTON_CLASS =
  'inline-flex shrink-0 items-center gap-2 rounded-full bg-orange-500 px-5 py-2 text-sm font-bold text-white shadow ring-2 ring-orange-600 transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 active:scale-95';

export const TAB_PILL_CLASS =
  'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600';

/** Card chrome without padding - combine with `p-*` utility for the inner spacing. */
export const CARD_BASE_CLASS = 'rounded-2xl bg-white shadow-sm ring-1 ring-amber-400/40';

/** Default card: chrome + `p-6`. Use {@link CARD_BASE_CLASS} for custom padding. */
export const CARD_CLASS = `${CARD_BASE_CLASS} p-6`;

/** Horizontal toolbar that visually matches a card; use for inline tool rows. */
export const TOOLBAR_CLASS = `flex flex-wrap items-center gap-3 ${CARD_BASE_CLASS} px-5 py-3 text-sm`;
