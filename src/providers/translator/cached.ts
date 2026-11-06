import { sendToBackground } from '@/messaging';

/**
 * Wraps a translate function with the persistent translation cache. Looks up
 * all `texts` up front in one round trip; new results are saved in batches.
 */
export async function createCachedTranslate(
  from: string,
  to: string,
  texts: string[],
  translate: (text: string) => Promise<string>,
) {
  const pair = `${from}>${to}`;
  const unique = [...new Set(texts)];
  const found =
    (await sendToBackground<(string | null)[]>({
      type: 'translations:get',
      pair,
      texts: unique,
    })) ?? [];

  const cache = new Map<string, string>();
  unique.forEach((text, i) => {
    const hit = found[i];
    if (hit) cache.set(text, hit);
  });

  let unsaved: [string, string][] = [];
  const save = () => {
    if (!unsaved.length) return;
    void sendToBackground({ type: 'translations:put', pair, entries: unsaved });
    unsaved = [];
  };

  return {
    hits: cache.size,
    async translate(text: string): Promise<string> {
      const cached = cache.get(text);
      if (cached !== undefined) return cached;
      const result = await translate(text);
      cache.set(text, result);
      unsaved.push([text, result]);
      if (unsaved.length >= 20) save();
      return result;
    },
    /** Saves any results not yet written. */
    save,
  };
}
