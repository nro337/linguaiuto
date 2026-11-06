import { describe, expect, it } from 'vitest';
import {
  buildTimedTextUrl,
  chooseTrack,
  parseJson3,
  type CaptionTrack,
} from '@/adapters/youtube/captions';

const base = (lang: string, kind?: string) =>
  `https://www.youtube.com/api/timedtext?v=VID&ei=E&signature=S&lang=${lang}${kind ? `&kind=${kind}` : ''}`;

const it_manual: CaptionTrack = { baseUrl: base('it'), languageCode: 'it' };
const it_asr: CaptionTrack = { baseUrl: base('it', 'asr'), languageCode: 'it', kind: 'asr' };
const en_gb: CaptionTrack = { baseUrl: base('en-GB'), languageCode: 'en-GB' };

describe('chooseTrack', () => {
  it('prefers a human-made track in the language', () => {
    expect(chooseTrack([it_asr, it_manual], 'it')).toEqual({ track: it_manual });
  });

  it('falls back to auto-generated in the language', () => {
    expect(chooseTrack([en_gb, it_asr], 'it')).toEqual({ track: it_asr });
  });

  it('matches regional variants', () => {
    expect(chooseTrack([it_manual, en_gb], 'en')).toEqual({ track: en_gb });
  });

  it('uses YouTube auto-translate when the language is missing', () => {
    expect(chooseTrack([it_asr, en_gb], 'it')).toEqual({ track: it_asr });
    expect(chooseTrack([it_asr], 'en')).toEqual({ track: it_asr, tlang: 'en' });
    expect(chooseTrack([it_asr, it_manual], 'en')).toEqual({ track: it_manual, tlang: 'en' });
  });

  it('returns null without tracks', () => {
    expect(chooseTrack([], 'it')).toBeNull();
  });
});

describe('buildTimedTextUrl', () => {
  const captured =
    'https://www.youtube.com/api/timedtext?v=VID&ei=E&signature=S&lang=it&pot=TOKEN&potc=1&c=WEB&cver=2.1&fmt=srv3&tlang=de';

  it('copies the token and client params from the captured request', () => {
    const url = new URL(buildTimedTextUrl(captured, { track: en_gb }));
    expect(url.searchParams.get('pot')).toBe('TOKEN');
    expect(url.searchParams.get('c')).toBe('WEB');
    expect(url.searchParams.get('lang')).toBe('en-GB');
    expect(url.searchParams.get('fmt')).toBe('json3');
    expect(url.searchParams.has('tlang')).toBe(false);
  });

  it('keeps the track kind and sets tlang', () => {
    const url = new URL(buildTimedTextUrl(captured, { track: it_asr, tlang: 'en' }));
    expect(url.searchParams.get('kind')).toBe('asr');
    expect(url.searchParams.get('tlang')).toBe('en');
  });
});

describe('parseJson3', () => {
  it('builds cues from events with text', () => {
    const cues = parseJson3({
      events: [
        { tStartMs: 0, dDurationMs: 500 },
        { tStartMs: 1000, dDurationMs: 2000, segs: [{ utf8: 'Ciao' }, { utf8: ' a\ntutti' }] },
        { tStartMs: 3500, dDurationMs: 100, segs: [{ utf8: '\n' }] },
      ],
    });
    expect(cues).toEqual([{ start: 1000, end: 3000, text: 'Ciao a tutti' }]);
  });

  it('trims overlapping cues so only one shows at a time', () => {
    const cues = parseJson3({
      events: [
        { tStartMs: 0, dDurationMs: 3000, segs: [{ utf8: 'uno' }] },
        { tStartMs: 1000, dDurationMs: 3000, segs: [{ utf8: 'due' }] },
      ],
    });
    expect(cues.map((c) => [c.start, c.end])).toEqual([
      [0, 1000],
      [1000, 4000],
    ]);
  });

  it('handles bad input', () => {
    expect(parseJson3(null)).toEqual([]);
    expect(parseJson3({})).toEqual([]);
  });
});
