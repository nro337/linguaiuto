import type { Cue } from './cues';

export interface MergeOptions {
  /** Longest merged line, in characters. */
  maxChars: number;
  /** Longest merged line, in milliseconds. */
  maxDurationMs: number;
  /** A pause longer than this starts a new line. */
  maxGapMs: number;
}

const DEFAULTS: MergeOptions = { maxChars: 90, maxDurationMs: 7000, maxGapMs: 1200 };
const SENTENCE_END = /[.!?…]["»”')\]]*$/;

/**
 * Joins short auto-generated caption fragments into sentence-sized lines, so
 * they're easier to read and translate. A line ends at sentence punctuation, a
 * pause, or the length limits.
 */
export function mergeCues(cues: readonly Cue[], options: Partial<MergeOptions> = {}): Cue[] {
  const { maxChars, maxDurationMs, maxGapMs } = { ...DEFAULTS, ...options };
  const out: Cue[] = [];
  let current: Cue | null = null;

  for (const cue of cues) {
    const fits =
      current &&
      !SENTENCE_END.test(current.text) &&
      cue.start - current.end <= maxGapMs &&
      current.text.length + 1 + cue.text.length <= maxChars &&
      cue.end - current.start <= maxDurationMs;

    if (current && fits) {
      current.text = `${current.text} ${cue.text}`;
      current.end = cue.end;
    } else {
      if (current) out.push(current);
      current = { ...cue };
    }
  }
  if (current) out.push(current);
  return out;
}
