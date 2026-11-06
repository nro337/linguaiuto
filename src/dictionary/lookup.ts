import { sendToBackground } from '@/messaging';
import { lookupKeys } from '@/core/tokenize';
import type { LookupResult } from './store';

const memory = new Map<string, Promise<LookupResult | null>>();

/** Looks a word up in the bundled dictionary (via the background worker). */
export function lookup(lang: string, word: string): Promise<LookupResult | null> {
  const keys = lookupKeys(word, lang);
  const cacheKey = `${lang}\u0000${keys[0]}`;
  let result = memory.get(cacheKey);
  if (!result) {
    result = sendToBackground<LookupResult | null>({ type: 'dictionary:lookup', lang, keys });
    memory.set(cacheKey, result);
  }
  return result;
}
