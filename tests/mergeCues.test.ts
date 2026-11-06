import { describe, expect, it } from 'vitest';
import { mergeCues } from '@/core/mergeCues';
import type { Cue } from '@/core/cues';

const cue = (start: number, end: number, text: string): Cue => ({ start, end, text });

describe('mergeCues', () => {
  it('joins fragments until sentence punctuation', () => {
    const merged = mergeCues([
      cue(0, 1000, 'ciao a'),
      cue(1000, 2000, 'tutti.'),
      cue(2000, 3000, 'come'),
      cue(3000, 4000, 'state?'),
    ]);
    expect(merged).toEqual([cue(0, 2000, 'ciao a tutti.'), cue(2000, 4000, 'come state?')]);
  });

  it('splits on pauses', () => {
    const merged = mergeCues([cue(0, 1000, 'uno'), cue(3000, 4000, 'due')]);
    expect(merged.map((c) => c.text)).toEqual(['uno', 'due']);
  });

  it('respects the length and duration limits', () => {
    const fragments = [0, 1, 2, 3].map((i) => cue(i * 1000, i * 1000 + 1000, 'abcdefghij'));
    expect(mergeCues(fragments, { maxChars: 21 }).map((c) => c.text)).toEqual([
      'abcdefghij abcdefghij',
      'abcdefghij abcdefghij',
    ]);
    expect(mergeCues(fragments, { maxDurationMs: 3000 })).toHaveLength(2);
  });

  it('does not modify its input', () => {
    const input = [cue(0, 1000, 'a'), cue(1000, 2000, 'b')];
    mergeCues(input);
    expect(input).toEqual([cue(0, 1000, 'a'), cue(1000, 2000, 'b')]);
  });
});
