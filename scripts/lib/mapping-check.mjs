// Text helpers for the correspondence tables (mapping/*.yaml) and other
// bilingual texts on the pages. The checks of the mapping files themselves are
// the toolkit's (datamodels check, #226).

// Exactly ja and en: in YAML's { … } form a comma inside the text starts a new
// key, so an extra key means the text was cut there ("closed → completed, otherwise …").
export const bilingual = (v) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).every((k) => k === 'ja' || k === 'en')
  && typeof v.ja === 'string' && v.ja.trim() !== '' && typeof v.en === 'string' && v.en.trim() !== '';
/**
 * The licence of a standard in one language. A plain string (a name such as
 * "CC BY 4.0") reads the same on both pages; anything longer is { ja, en }.
 */
export const standardLicense = (std, lang) => typeof std?.license === 'string' ? std.license : std?.license?.[lang] ?? '';
