import { useEffect, useState } from 'react';
import { findCueIndex, type Cue } from '@/core/cues';

interface Active {
  learning: number;
  native: number;
}

const NONE: Active = { learning: -1, native: -1 };

/**
 * Tracks which cue is showing in each line. Runs every video frame but only
 * triggers a React render when a line's cue actually changes.
 */
export function useActiveCues(
  video: HTMLVideoElement | null,
  learning: readonly Cue[],
  native: readonly Cue[],
): Active {
  const [active, setActive] = useState<Active>(NONE);

  useEffect(() => {
    if (!video) return;
    let current = NONE;
    let frame = 0;

    const update = () => {
      const t = video.currentTime * 1000;
      const next = { learning: findCueIndex(learning, t), native: findCueIndex(native, t) };
      if (next.learning !== current.learning || next.native !== current.native) {
        current = next;
        setActive(next);
      }
    };
    const loop = () => {
      update();
      frame = video.requestVideoFrameCallback(loop);
    };

    frame = video.requestVideoFrameCallback(loop);
    // Frame callbacks stop while paused, so also follow seeks and time updates.
    video.addEventListener('seeked', update);
    video.addEventListener('timeupdate', update);
    queueMicrotask(update);

    return () => {
      video.cancelVideoFrameCallback(frame);
      video.removeEventListener('seeked', update);
      video.removeEventListener('timeupdate', update);
    };
  }, [video, learning, native]);

  return active;
}
