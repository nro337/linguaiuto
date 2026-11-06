import { describe, expect, it } from 'vitest';
import { lookupKeys, tokenize } from '@/core/tokenize';

const words = (text: string, lang: string) =>
  tokenize(text, lang)
    .filter((t) => t.word)
    .map((t) => t.text);

describe('tokenize', () => {
  it('splits Italian elisions into two words', () => {
    expect(words("L'acqua è fredda, c'è dell'altro", 'it')).toEqual([
      "L'",
      'acqua',
      'è',
      'fredda',
      "c'",
      'è',
      "dell'",
      'altro',
    ]);
  });

  it('keeps English contractions whole', () => {
    expect(words("I don't know, it's fine.", 'en')).toEqual(['I', "don't", 'know', "it's", 'fine']);
  });

  it('keeps all the original text', () => {
    const text = "Ciao, com'è andata? Bene!";
    expect(
      tokenize(text, 'it')
        .map((t) => t.text)
        .join(''),
    ).toBe(text);
  });
});

describe('lookupKeys', () => {
  it('normalizes case and apostrophes', () => {
    expect(lookupKeys('L’', 'it')).toEqual(["l'"]);
    expect(lookupKeys('Hello', 'en')).toEqual(['hello']);
  });

  it('tries Italian apocope', () => {
    expect(lookupKeys('po', 'it')).toEqual(['po', "po'"]);
  });
});
