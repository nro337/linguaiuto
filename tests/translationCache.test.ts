import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { getTranslations, putTranslations } from '@/storage/translationCache';

describe('translationCache', () => {
  it('stores translations per language pair', async () => {
    await putTranslations('it>en', [
      ['ciao', 'hello'],
      ['grazie', 'thank you'],
    ]);
    expect(await getTranslations('it>en', ['ciao', 'nuovo', 'grazie'])).toEqual([
      'hello',
      null,
      'thank you',
    ]);
    expect(await getTranslations('en>it', ['ciao'])).toEqual([null]);
  });
});
