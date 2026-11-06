import { findCueIndex, type Cue } from '@/core/cues';
import { lineTarget, type LineCommand } from '@/core/navigation';
import { createStore } from '@/core/store';
import { settingsItem } from '@/storage/settings';
import { findVideo } from './player';
import { subtitleStore } from './subtitles';

export interface ActiveCues {
  learning: number;
  native: number;
}

/**
 * Which cue is showing in each line. One loop drives this for the overlay,
 * the transcript and auto-pause; it only notifies when an index changes.
 */
export const activeCueStore = createStore<ActiveCues>({ learning: -1, native: -1 });

let video: HTMLVideoElement | null = null;

/** The line used for navigation and auto-pause: learning, or native if there's no learning line. */
function navigationCues(): Cue[] {
  const { learning, native } = subtitleStore.get();
  return learning.length ? learning : native;
}

export function seekTo(ms: number) {
  if (video) video.currentTime = ms / 1000;
}

export function goToLine(command: LineCommand) {
  if (!video) return;
  const target = lineTarget(navigationCues(), video.currentTime * 1000, command);
  if (target == null) return;
  seekTo(target);
  if (command === 'replay' && video.paused) void video.play().catch(() => {});
}

export function startPlayback(signal: AbortSignal) {
  let autoPause = false;
  /** Cue we already auto-paused at, so pressing play continues past it. */
  let pausedAt = -1;
  let frame = 0;
  let detach: (() => void) | null = null;

  const update = () => {
    if (!video) return;
    const t = video.currentTime * 1000;
    const { learning, native } = subtitleStore.get();
    const next = { learning: findCueIndex(learning, t), native: findCueIndex(native, t) };
    const current = activeCueStore.get();
    if (next.learning !== current.learning || next.native !== current.native) {
      activeCueStore.set(next);
    }

    if (autoPause && !video.paused) {
      const cues = navigationCues();
      const i = findCueIndex(cues, t);
      // Pause just before the line ends (frames arrive every ~16–40 ms).
      if (i >= 0 && i !== pausedAt && cues[i]!.end - t < 60) {
        pausedAt = i;
        video.pause();
      }
    }
  };

  const onSeeked = () => {
    pausedAt = -1;
    update();
  };

  const attach = (el: HTMLVideoElement) => {
    detach?.();
    video = el;
    const loop = () => {
      update();
      frame = el.requestVideoFrameCallback(loop);
    };
    frame = el.requestVideoFrameCallback(loop);
    // Frame callbacks stop while paused, so also follow seeks and time updates.
    el.addEventListener('seeked', onSeeked);
    el.addEventListener('timeupdate', update);
    detach = () => {
      el.cancelVideoFrameCallback(frame);
      el.removeEventListener('seeked', onSeeked);
      el.removeEventListener('timeupdate', update);
      video = null;
    };
    update();
  };

  const onSubtitles = () => {
    if (subtitleStore.get().status !== 'ready') return;
    const el = findVideo();
    if (el && el !== video) attach(el);
    pausedAt = -1;
    update();
  };
  const unsubscribe = subtitleStore.subscribe(onSubtitles);
  onSubtitles();

  void settingsItem.getValue().then((s) => (autoPause = s.autoPause));
  const unwatch = settingsItem.watch((s) => (autoPause = s.autoPause));

  signal.addEventListener('abort', () => {
    unsubscribe();
    unwatch();
    detach?.();
  });
}
