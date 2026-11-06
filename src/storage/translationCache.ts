import { openDatabase, STORES } from './db';

/**
 * Translations cached by language pair and source text, so the same line is
 * only ever translated once. Lives in the extension's own IndexedDB (used from
 * the background service worker), not the YouTube page's.
 */

interface Entry {
  translated: string;
  savedAt: number;
}

const STORE = STORES.translations;

const key = (pair: string, text: string) => `${pair}\u0000${text}`;

export async function getTranslations(pair: string, texts: string[]): Promise<(string | null)[]> {
  const tx = (await openDatabase()).transaction(STORE, 'readonly');
  const results = await Promise.all(
    texts.map((text) => tx.store.get(key(pair, text)) as Promise<Entry | undefined>),
  );
  return results.map((entry) => entry?.translated ?? null);
}

export async function putTranslations(pair: string, entries: [string, string][]): Promise<void> {
  const tx = (await openDatabase()).transaction(STORE, 'readwrite');
  const savedAt = Date.now();
  await Promise.all([
    ...entries.map(([text, translated]) =>
      tx.store.put({ translated, savedAt } satisfies Entry, key(pair, text)),
    ),
    tx.done,
  ]);
}
