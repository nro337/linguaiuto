import { sendToBackground } from '@/messaging';
import { getTranslator } from './chrome';

const memory = new Map<string, Promise<string | null>>();

async function translate(from: string, to: string, word: string): Promise<string | null> {
  const pair = `${from}>${to}`;
  const cached = await sendToBackground<(string | null)[]>({
    type: 'translations:get',
    pair,
    texts: [word],
  });
  if (cached?.[0]) return cached[0];

  const translator = await getTranslator(from, to);
  if (!translator) return null;
  const result = (await translator.translate(word)).trim();
  void sendToBackground({ type: 'translations:put', pair, entries: [[word, result]] });
  return result;
}

/** Translates a single word on-device, cached in memory and in the extension's cache. */
export function translateWord(from: string, to: string, word: string): Promise<string | null> {
  const key = `${from}>${to}\u0000${word}`;
  let result = memory.get(key);
  if (!result) {
    result = translate(from, to, word).catch(() => null);
    memory.set(key, result);
  }
  return result;
}
