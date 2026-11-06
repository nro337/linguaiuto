/** One part-of-speech entry for a word in the bundled dictionary. Short keys keep the files small. */
export interface DictEntry {
  /** Part of speech, e.g. "verb". */
  p: string;
  /** IPA pronunciation. */
  i?: string;
  /** Short definitions. */
  g?: string[];
  /** This word is a form of another, e.g. { l: "mangiare", d: "past participle of mangiare" }. */
  f?: { l: string; d: string }[];
}

export interface DictFile {
  version: number;
  lang: string;
  /** word (lowercase) → entries */
  entries: Record<string, DictEntry[]>;
}

export const DICT_VERSION = 1;
