/** Saved words. Kept in chrome.storage.local so every tab and page sees changes right away. */
export interface VocabEntry {
  /** The word in the learning language, as it appeared. */
  word: string;
  lang: string;
  /** Meaning in the native language. */
  translation?: string;
  ipa?: string;
  pos?: string;
  /** Base form, e.g. "mangiare" for "mangiato". */
  lemma?: string;
  definition?: string;
  /** The subtitle line it came from, in the learning language. */
  context: string;
  contextTranslation?: string;
  videoId: string;
  /** Where the line starts in the video. */
  timeMs: number;
  savedAt: number;
}

export type Vocab = Record<string, VocabEntry>;

export const vocabItem = storage.defineItem<Vocab>('local:vocab', { fallback: {} });

export const vocabKey = (lang: string, word: string) =>
  `${lang}:${word.toLowerCase().replace(/’/g, "'")}`;

export async function saveWord(entry: VocabEntry) {
  const vocab = await vocabItem.getValue();
  await vocabItem.setValue({ ...vocab, [vocabKey(entry.lang, entry.word)]: entry });
}

export async function removeWord(lang: string, word: string) {
  const vocab = { ...(await vocabItem.getValue()) };
  delete vocab[vocabKey(lang, word)];
  await vocabItem.setValue(vocab);
}
