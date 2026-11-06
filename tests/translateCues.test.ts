import { describe, expect, it } from 'vitest';
import { translateCues } from '@/core/translateCues';
import type { Cue } from '@/core/cues';

const source: Cue[] = [0, 1, 2, 3, 4].map((i) => ({
  start: i * 1000,
  end: i * 1000 + 1000,
  text: `s${i}`,
}));

describe('translateCues', () => {
  it('starts at the current position, wraps around and keeps timing', async () => {
    const order: string[] = [];
    let last: Cue[] = [];
    await translateCues(source, {
      translate: async (t) => {
        order.push(t);
        return t.toUpperCase();
      },
      currentTimeMs: () => 2500,
      onProgress: (cues) => (last = cues),
      isStale: () => false,
    });
    expect(order).toEqual(['s2', 's3', 's4', 's0', 's1']);
    expect(last).toEqual(source.map((c) => ({ ...c, text: c.text.toUpperCase() })));
  });

  it('stops when stale', async () => {
    let calls = 0;
    await translateCues(source, {
      translate: async (t) => {
        calls++;
        return t;
      },
      currentTimeMs: () => 0,
      onProgress: () => {},
      isStale: () => calls >= 2,
    });
    expect(calls).toBe(2);
  });

  it('skips lines that fail to translate', async () => {
    let last: Cue[] = [];
    await translateCues(source, {
      translate: async (t) => {
        if (t === 's1') throw new Error('nope');
        return t;
      },
      currentTimeMs: () => 0,
      onProgress: (cues) => (last = cues),
      isStale: () => false,
    });
    expect(last.map((c) => c.text)).toEqual(['s0', 's2', 's3', 's4']);
  });
});
