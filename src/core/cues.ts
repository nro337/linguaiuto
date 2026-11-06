export interface Cue {
  /** Start time in milliseconds. */
  start: number;
  /** End time in milliseconds (exclusive). */
  end: number;
  text: string;
}

/**
 * Index of the cue showing at `timeMs`, or -1. `cues` must be sorted by start
 * and non-overlapping. Binary search, so this is cheap to call every frame.
 */
export function findCueIndex(cues: readonly Cue[], timeMs: number): number {
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cue = cues[mid]!;
    if (timeMs < cue.start) hi = mid - 1;
    else if (timeMs >= cue.end) lo = mid + 1;
    else return mid;
  }
  return -1;
}
