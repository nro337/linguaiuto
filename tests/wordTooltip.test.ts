import { describe, expect, it } from 'vitest';
import { rowsFor } from '@/overlay/WordTooltip';

describe('rowsFor', () => {
  it('merges forms of the same base word and picks its matching meaning', () => {
    const rows = rowsFor({
      word: 'went',
      entries: [
        {
          p: 'verb',
          f: [
            { l: 'go', d: 'simple past of go' },
            { l: 'go', d: 'past participle of go' },
          ],
        },
        { p: 'noun', g: ['A course; a way'] },
      ],
      lemmas: {
        go: [
          { p: 'noun', g: ['Initialism of graphene oxide.'] },
          { p: 'verb', g: ['To move through space'] },
        ],
      },
    });
    expect(rows).toEqual([
      {
        pos: 'verb',
        text: 'simple past of go · past participle of go',
        lemma: { word: 'go', gloss: 'To move through space' },
      },
      { pos: 'noun', text: 'A course; a way' },
    ]);
  });

  it('limits the number of rows', () => {
    const rows = rowsFor({
      word: 'x',
      entries: [1, 2, 3, 4].map((i) => ({ p: 'noun', g: [`meaning ${i}`] })),
      lemmas: {},
    });
    expect(rows).toHaveLength(3);
  });
});
