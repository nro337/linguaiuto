export interface Token {
  text: string;
  /** A word you can hover (not spaces or punctuation). */
  word: boolean;
}

const segmenters = new Map<string, Intl.Segmenter>();
const segmenter = (lang: string) => {
  let s = segmenters.get(lang);
  if (!s) segmenters.set(lang, (s = new Intl.Segmenter(lang, { granularity: 'word' })));
  return s;
};

/** Italian elision: "l'acqua" → "l'" + "acqua", "c'è" → "c'" + "è". */
const ELISION = /^(\p{L}{1,4}['’])(\p{L}.*)$/u;

/** Splits a subtitle line into words and the text between them. */
export function tokenize(text: string, lang: string): Token[] {
  const tokens: Token[] = [];
  for (const { segment, isWordLike } of segmenter(lang).segment(text)) {
    const elided = lang === 'it' && isWordLike ? segment.match(ELISION) : null;
    if (elided) {
      tokens.push({ text: elided[1]!, word: true }, { text: elided[2]!, word: true });
    } else {
      tokens.push({ text: segment, word: !!isWordLike });
    }
  }
  return tokens;
}

/**
 * Dictionary keys to try for a word, best first: lowercase, with a straight
 * apostrophe, and Italian apocope ("po" → "po'").
 */
export function lookupKeys(word: string, lang: string): string[] {
  const lower = word.toLowerCase().replace(/’/g, "'");
  const keys = [lower];
  if (lang === 'it' && !lower.endsWith("'")) keys.push(`${lower}'`);
  return keys;
}
