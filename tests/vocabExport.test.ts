import { describe, expect, it } from 'vitest';
import { highlightWord, sourceUrl, toAnki, toCsv } from '@/export/vocabExport';
import type { VocabEntry } from '@/storage/vocab';

const entry: VocabEntry = {
  word: 'mangiato',
  lang: 'it',
  translation: 'eaten',
  ipa: '/manˈd͡ʒa.to/',
  pos: 'verb',
  lemma: 'mangiare',
  definition: 'past participle of mangiare',
  context: 'Abbiamo mangiato la pizza, "buonissima"!',
  contextTranslation: 'We ate pizza,\t"delicious"!',
  videoId: 'abc123',
  timeMs: 61500,
  savedAt: Date.UTC(2026, 10, 6),
};

describe('highlightWord', () => {
  it('bolds the whole word only, case-insensitively, and escapes HTML', () => {
    expect(highlightWord('Mangiato? <sì> mangiatoia', 'mangiato')).toBe(
      '<b>Mangiato</b>? &lt;sì&gt; mangiatoia',
    );
    expect(highlightWord("l'acqua è buona", 'acqua')).toBe("l'<b>acqua</b> è buona");
  });
});

describe('sourceUrl', () => {
  it('links to the moment in the video', () => {
    expect(sourceUrl(entry)).toBe('https://www.youtube.com/watch?v=abc123&t=61s');
  });
});

describe('toAnki', () => {
  it('writes Anki headers and one tab-separated row per word', () => {
    const lines = toAnki([entry]).trimEnd().split('\n');
    expect(lines.slice(0, 4)).toEqual([
      '#separator:tab',
      '#html:true',
      '#columns:Word\tMeaning\tPronunciation\tDetails\tContext\tContext translation\tSource\tTags',
      '#tags column:8',
    ]);
    const cells = lines[4]!.split('\t');
    expect(cells).toHaveLength(8);
    expect(cells[0]).toBe('mangiato');
    expect(cells[3]).toBe('verb · from mangiare · past participle of mangiare');
    expect(cells[4]).toBe('Abbiamo <b>mangiato</b> la pizza, &quot;buonissima&quot;!');
    expect(cells[5]).toBe('We ate pizza, &quot;delicious&quot;!');
    expect(cells[7]).toBe('linguaiuto linguaiuto::it');
  });
});

describe('toCsv', () => {
  it('quotes cells that need it', () => {
    const [header, row] = toCsv([entry]).split('\r\n');
    expect(header!.split(',')[0]).toBe('word');
    expect(row).toContain('"Abbiamo mangiato la pizza, ""buonissima""!"');
    expect(row).toContain('2026-11-06T00:00:00.000Z');
  });
});
