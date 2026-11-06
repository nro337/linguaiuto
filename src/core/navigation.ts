import { findCueIndex, type Cue } from './cues';

export type LineCommand = 'previous' | 'next' | 'replay';

/** How far into a line "previous" restarts it instead of going back one. */
export const RESTART_THRESHOLD_MS = 1500;

/** Index of the last cue that has started by `timeMs`, or -1. */
export function lastStartedIndex(cues: readonly Cue[], timeMs: number): number {
  let lo = 0;
  let hi = cues.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid]!.start <= timeMs) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/**
 * Where to seek (ms) for a line command, like a music player's previous/next:
 * "previous" restarts the current line if you're more than a moment into it,
 * otherwise goes to the one before. Between lines, "replay" and "previous"
 * both mean the line you just heard.
 */
export function lineTarget(
  cues: readonly Cue[],
  timeMs: number,
  command: LineCommand,
): number | null {
  if (!cues.length) return null;
  const inside = findCueIndex(cues, timeMs);
  const last = lastStartedIndex(cues, timeMs);

  if (command === 'next') {
    const next = last + 1;
    return next < cues.length ? cues[next]!.start : null;
  }
  if (command === 'replay') return last >= 0 ? cues[last]!.start : cues[0]!.start;

  if (last < 0) return cues[0]!.start;
  if (inside < 0) return cues[last]!.start;
  const target =
    timeMs - cues[inside]!.start > RESTART_THRESHOLD_MS ? inside : Math.max(0, inside - 1);
  return cues[target]!.start;
}
