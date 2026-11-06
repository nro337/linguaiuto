import { describe, expect, it } from 'vitest';
import { findCueIndex, type Cue } from '@/core/cues';

const cues: Cue[] = [
  { start: 0, end: 1000, text: 'a' },
  { start: 1000, end: 2000, text: 'b' },
  { start: 3000, end: 4000, text: 'c' },
];

describe('findCueIndex', () => {
  it('finds the cue containing the time', () => {
    expect(findCueIndex(cues, 0)).toBe(0);
    expect(findCueIndex(cues, 1500)).toBe(1);
    expect(findCueIndex(cues, 3999)).toBe(2);
  });

  it('treats the end as exclusive', () => {
    expect(findCueIndex(cues, 1000)).toBe(1);
  });

  it('returns -1 in gaps and outside the range', () => {
    expect(findCueIndex(cues, 2500)).toBe(-1);
    expect(findCueIndex(cues, 5000)).toBe(-1);
    expect(findCueIndex([], 0)).toBe(-1);
  });
});
