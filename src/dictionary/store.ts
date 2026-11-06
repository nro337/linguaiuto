import { openDatabase, STORES } from '@/storage/db';
import { DICT_VERSION, type DictEntry, type DictFile } from './types';

/**
 * Bundled dictionaries (public/dict/<lang>.json.gz), imported into IndexedDB
 * the first time a language is looked up. Background service worker only.
 */

export interface LookupResult {
  /** The dictionary key that matched. */
  word: string;
  entries: DictEntry[];
  /** Entries for base forms this word points to, e.g. "mangiare" for "mangiato". */
  lemmas: Record<string, DictEntry[]>;
}

const key = (lang: string, word: string) => `${lang}\u0000${word}`;
const imports = new Map<string, Promise<boolean>>();

async function importDictionary(lang: string): Promise<boolean> {
  const db = await openDatabase();
  if ((await db.get(STORES.meta, lang)) === DICT_VERSION) return true;

  const res = await fetch(browser.runtime.getURL(`/dict/${lang}.json.gz` as '/'));
  if (!res.ok || !res.body) return false;
  const file = (await new Response(
    res.body.pipeThrough(new DecompressionStream('gzip')),
  ).json()) as DictFile;

  const startedAt = performance.now();
  const tx = db.transaction([STORES.dictionary, STORES.meta], 'readwrite');
  const dict = tx.objectStore(STORES.dictionary);
  for (const [word, entries] of Object.entries(file.entries))
    void dict.put(entries, key(lang, word));
  void tx.objectStore(STORES.meta).put(file.version, lang);
  await tx.done;
  console.info(
    `[Linguaiuto] Imported ${Object.keys(file.entries).length} ${lang} words in ${Math.round(performance.now() - startedAt)} ms`,
  );
  return true;
}

export function ensureDictionary(lang: string): Promise<boolean> {
  let ready = imports.get(lang);
  if (!ready) {
    ready = importDictionary(lang).catch((err) => {
      console.warn('[Linguaiuto] Dictionary import failed', err);
      imports.delete(lang);
      return false;
    });
    imports.set(lang, ready);
  }
  return ready;
}

/** Looks up the first matching key, plus the base forms it points to. */
export async function lookupWord(lang: string, keys: string[]): Promise<LookupResult | null> {
  if (!(await ensureDictionary(lang))) return null;
  const db = await openDatabase();
  for (const word of keys) {
    const entries = (await db.get(STORES.dictionary, key(lang, word))) as DictEntry[] | undefined;
    if (!entries) continue;
    const lemmas: Record<string, DictEntry[]> = {};
    for (const lemma of new Set(entries.flatMap((e) => e.f?.map((f) => f.l) ?? []))) {
      const found = (await db.get(STORES.dictionary, key(lang, lemma.toLowerCase()))) as
        DictEntry[] | undefined;
      if (found) lemmas[lemma] = found;
    }
    return { word, entries, lemmas };
  }
  return null;
}
