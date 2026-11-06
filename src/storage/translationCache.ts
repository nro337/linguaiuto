import { openDB, type IDBPDatabase } from 'idb';

/**
 * Translations cached by language pair and source text, so the same line is
 * only ever translated once. Lives in the extension's own IndexedDB (used from
 * the background service worker), not the YouTube page's.
 */

interface Entry {
  translated: string;
  savedAt: number;
}

const STORE = 'translations';
let db: Promise<IDBPDatabase> | null = null;

function open() {
  db ??= openDB('linguaiuto', 1, {
    upgrade(database) {
      database.createObjectStore(STORE);
    },
  });
  return db;
}

const key = (pair: string, text: string) => `${pair}\u0000${text}`;

export async function getTranslations(pair: string, texts: string[]): Promise<(string | null)[]> {
  const tx = (await open()).transaction(STORE, 'readonly');
  const results = await Promise.all(
    texts.map((text) => tx.store.get(key(pair, text)) as Promise<Entry | undefined>),
  );
  return results.map((entry) => entry?.translated ?? null);
}

export async function putTranslations(pair: string, entries: [string, string][]): Promise<void> {
  const tx = (await open()).transaction(STORE, 'readwrite');
  const savedAt = Date.now();
  await Promise.all([
    ...entries.map(([text, translated]) =>
      tx.store.put({ translated, savedAt } satisfies Entry, key(pair, text)),
    ),
    tx.done,
  ]);
}
