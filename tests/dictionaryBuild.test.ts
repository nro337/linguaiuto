import { describe, expect, it } from 'vitest';
import { compactEntry, DictionaryBuilder, parseFrequencyList } from '@/dictionary/build';

describe('compactEntry', () => {
  it('keeps pos, IPA and short glosses', () => {
    expect(
      compactEntry({
        word: 'casa',
        pos: 'noun',
        sounds: [{ ipa: '/ˈka.sa/' }, { ipa: '/ˈka.za/', tags: ['Northern'] }],
        senses: [
          { glosses: ['house'] },
          { glosses: ['home'] },
          { glosses: ['old meaning'], tags: ['obsolete'] },
          { glosses: ['third'] },
        ],
      }),
    ).toEqual({ p: 'noun', i: '/ˈka.sa/', g: ['house', 'home'] });
  });

  it('records base forms', () => {
    expect(
      compactEntry({
        word: 'mangiato',
        pos: 'verb',
        senses: [{ glosses: ['past participle of mangiare'], form_of: [{ word: 'mangiare' }] }],
      }),
    ).toEqual({ p: 'verb', f: [{ l: 'mangiare', d: 'past participle of mangiare' }] });
  });

  it('prefers US IPA', () => {
    const e = compactEntry({
      word: 'tomato',
      pos: 'noun',
      sounds: [
        { ipa: '/təˈmɑːtəʊ/', tags: ['UK'] },
        { ipa: '/təˈmeɪtoʊ/', tags: ['US'] },
      ],
      senses: [{ glosses: ['a fruit'] }],
    });
    expect(e?.i).toBe('/təˈmeɪtoʊ/');
  });

  it('skips proper names and empty entries', () => {
    expect(compactEntry({ word: 'Roma', pos: 'name', senses: [{ glosses: ['Rome'] }] })).toBeNull();
    expect(compactEntry({ word: 'x', pos: 'noun', senses: [] })).toBeNull();
  });
});

describe('DictionaryBuilder', () => {
  it('keeps frequent words and the base forms they point to', () => {
    const builder = new DictionaryBuilder(new Set(['mangiato']));
    builder.add({
      word: 'mangiato',
      pos: 'verb',
      senses: [{ glosses: ['past participle of mangiare'], form_of: [{ word: 'mangiare' }] }],
    });
    builder.add({ word: 'mangiare', pos: 'verb', senses: [{ glosses: ['to eat'] }] });
    builder.add({ word: 'raro', pos: 'adj', senses: [{ glosses: ['rare'] }] });
    expect(Object.keys(builder.finish())).toEqual(['mangiare', 'mangiato']);
  });
});

describe('parseFrequencyList', () => {
  it('reads words in order up to the limit', () => {
    expect([...parseFrequencyList('E 10\nnon 5\nche 3\n', 2)]).toEqual(['e', 'non']);
  });
});
