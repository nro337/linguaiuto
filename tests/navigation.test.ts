import { describe, expect, it } from 'vitest';
import { lastStartedIndex, lineTarget } from '@/core/navigation';
import type { Cue } from '@/core/cues';

// Lines at 0–2s, 3–5s, 6–8s (gaps in between).
const cues: Cue[] = [0, 3000, 6000].map((start, i) => ({ start, end: start + 2000, text: `${i}` }));

describe('lastStartedIndex', () => {
  it('finds the latest line that has started', () => {
    expect(lastStartedIndex(cues, -1)).toBe(-1);
    expect(lastStartedIndex(cues, 0)).toBe(0);
    expect(lastStartedIndex(cues, 2500)).toBe(0);
    expect(lastStartedIndex(cues, 9000)).toBe(2);
  });
});

describe('lineTarget', () => {
  it('next goes to the following line', () => {
    expect(lineTarget(cues, 500, 'next')).toBe(3000);
    expect(lineTarget(cues, 2500, 'next')).toBe(3000);
    expect(lineTarget(cues, 7000, 'next')).toBeNull();
  });

  it('previous restarts the line when well into it', () => {
    expect(lineTarget(cues, 4800, 'previous')).toBe(3000);
  });

  it('previous goes back a line near the start of one', () => {
    expect(lineTarget(cues, 3500, 'previous')).toBe(0);
    expect(lineTarget(cues, 200, 'previous')).toBe(0);
  });

  it('between lines, previous and replay mean the line just heard', () => {
    expect(lineTarget(cues, 5500, 'previous')).toBe(3000);
    expect(lineTarget(cues, 5500, 'replay')).toBe(3000);
  });

  it('replay restarts the current line', () => {
    expect(lineTarget(cues, 7500, 'replay')).toBe(6000);
  });

  it('handles no cues', () => {
    expect(lineTarget([], 0, 'next')).toBeNull();
  });
});
