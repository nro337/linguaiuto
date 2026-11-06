import { findCueIndex, type Cue } from './cues';

export interface TranslateCuesOptions {
  translate: (text: string) => Promise<string>;
  /** Current playback time, so the lines you're about to see are translated first. */
  currentTimeMs: () => number;
  /** Called with all translations so far, at most every `flushMs`. */
  onProgress: (cues: Cue[]) => void;
  isStale: () => boolean;
  flushMs?: number;
}

/**
 * Translates cues one by one, starting at the current playback position and
 * wrapping around to the start. Results keep the source timing.
 */
export async function translateCues(source: readonly Cue[], options: TranslateCuesOptions) {
  const { translate, currentTimeMs, onProgress, isStale, flushMs = 300 } = options;
  const out: Cue[] = source.map((c) => ({ ...c, text: '' }));
  const done = new Array<boolean>(source.length).fill(false);
  let remaining = source.length;
  let lastFlush = 0;

  const flush = () => {
    lastFlush = performance.now();
    onProgress(out.filter((c) => c.text));
  };

  while (remaining > 0 && !isStale()) {
    // Re-check the position each time, in case the viewer seeks.
    const t = currentTimeMs();
    let start = findCueIndex(source, t);
    if (start < 0) start = source.findIndex((c) => c.start > t);
    if (start < 0) start = 0;
    let i = start;
    while (done[i]) i = (i + 1) % source.length;

    try {
      out[i]!.text = (await translate(source[i]!.text)).trim();
    } catch {
      /* leave this line untranslated */
    }
    done[i] = true;
    remaining--;
    if (performance.now() - lastFlush > flushMs || i === start) flush();
  }
  if (!isStale()) flush();
}
