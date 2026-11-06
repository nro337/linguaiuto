import type { Cue } from '@/core/cues';
import { createStore } from '@/core/store';
import { settingsItem, type Settings } from '@/storage/settings';
import { buildTimedTextUrl, chooseTrack, parseJson3, type TrackChoice } from './captions';
import { getPlayerState, primeCaptions } from './bridge';
import { findVideo, getVideoId } from './player';
import { getTranslator } from '@/providers/translator/chrome';
import { translateCues } from '@/core/translateCues';
import type { PlayerState } from './messages';

export type SubtitleStatus = 'idle' | 'loading' | 'ready' | 'no-captions' | 'error';

export type LineKind = 'learning' | 'native';

/** Why a line is still waiting for its on-device translation. */
export type LinePending =
  | { phase: 'waiting-for-click' }
  | { phase: 'downloading'; progress: number }
  | { phase: 'translating' };

export interface SubtitleState {
  videoId: string | null;
  status: SubtitleStatus;
  learning: Cue[];
  native: Cue[];
  /** True when the line comes from YouTube's auto-translation. */
  learningTranslated: boolean;
  nativeTranslated: boolean;
  /** Set while a line is being translated on-device. */
  pending: Partial<Record<LineKind, LinePending>>;
}

const EMPTY: SubtitleState = {
  videoId: null,
  status: 'idle',
  learning: [],
  native: [],
  learningTranslated: false,
  nativeTranslated: false,
  pending: {},
};

export const subtitleStore = createStore<SubtitleState>(EMPTY);

const log = (...args: unknown[]) => console.info('[Linguaiuto]', ...args);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Waits until the player reports the video in the URL (it lags behind in-site navigation). */
async function playerStateFor(
  videoId: string,
  isStale: () => boolean,
): Promise<PlayerState | null> {
  for (let i = 0; i < 40 && !isStale(); i++) {
    const state = await getPlayerState();
    if (state?.videoId === videoId) return state;
    await sleep(250);
  }
  return null;
}

/** The captured request already holds this exact track, so its body can be reused. */
function matchesCapture(capturedUrl: string, choice: TrackChoice): boolean {
  const params = new URL(capturedUrl).searchParams;
  return (
    params.get('lang') === choice.track.languageCode &&
    (params.get('kind') ?? '') === (choice.track.kind ?? '') &&
    (params.get('tlang') ?? undefined) === choice.tlang
  );
}

function describeChoice(choice: TrackChoice) {
  const { languageCode, kind, isTranslatable } = choice.track;
  return { languageCode, kind: kind ?? 'manual', tlang: choice.tlang ?? null, isTranslatable };
}

async function loadCues(state: PlayerState, choice: TrackChoice): Promise<Cue[]> {
  const url = buildTimedTextUrl(state.capturedUrl!, choice);
  try {
    const res = await fetch(url, { credentials: 'include' });
    const text = res.ok ? await res.text() : '';
    if (text) {
      const cues = parseJson3(JSON.parse(text));
      if (cues.length) return cues;
    }
    log('No subtitles in response', {
      track: describeChoice(choice),
      status: res.status,
      bytes: text.length,
      preview: text.slice(0, 200),
    });
  } catch (err) {
    log('Subtitle fetch failed', err);
  }
  // Fallback: reuse what the player itself downloaded, if it's the same track.
  if (state.capturedBody && matchesCapture(state.capturedUrl!, choice)) {
    try {
      return parseJson3(JSON.parse(state.capturedBody));
    } catch {
      /* not json3 */
    }
  }
  return [];
}

async function load(videoId: string, settings: Settings, isStale: () => boolean) {
  subtitleStore.set({ ...EMPTY, videoId, status: 'loading' });

  let state = await playerStateFor(videoId, isStale);
  if (isStale()) return;
  if (!state || state.tracks.length === 0) {
    log('No subtitles available for this video');
    subtitleStore.set({ ...EMPTY, videoId, status: 'no-captions' });
    return;
  }

  const learningChoice = chooseTrack(state.tracks, settings.learningLanguage)!;
  const nativeChoice = chooseTrack(state.tracks, settings.nativeLanguage)!;

  // Wait for the player's own subtitle request so we can reuse its token. If it
  // hasn't made one, keep asking it to load captions. Time spent in ads doesn't
  // count towards the timeout (requests during an ad are for the ad's video).
  for (let tick = 0; !state.capturedUrl && tick < 60;) {
    if (!state.adShowing) {
      if (tick % 8 === 4) primeCaptions();
      tick++;
    }
    await sleep(250);
    if (isStale()) return;
    state = (await getPlayerState()) ?? state;
  }
  if (!state.capturedUrl) {
    log('Could not capture a subtitle request from the player');
    subtitleStore.set({ ...EMPTY, videoId, status: 'error' });
    return;
  }

  const [learning, native] = await Promise.all([
    loadCues(state, learningChoice),
    loadCues(state, nativeChoice),
  ]);
  if (isStale()) return;

  log(`Loaded ${learning.length} learning cues and ${native.length} native cues`, {
    learning: describeChoice(learningChoice),
    native: describeChoice(nativeChoice),
    available: state.tracks.map(
      (t) =>
        `${t.languageCode}${t.kind === 'asr' ? ' (auto)' : ''}${t.isTranslatable === false ? ' (not translatable)' : ''}`,
    ),
  });
  subtitleStore.set({
    videoId,
    status: learning.length || native.length ? 'ready' : 'error',
    learning,
    native,
    learningTranslated: !!learningChoice.tlang,
    nativeTranslated: !!nativeChoice.tlang,
    pending: {},
  });

  // YouTube's auto-translate is unreliable (often empty for auto-generated tracks).
  // Fill a missing line by translating the other one on-device.
  if (learning.length && !native.length) {
    void fillLine('native', learning, settings.learningLanguage, settings.nativeLanguage, isStale);
  } else if (native.length && !learning.length) {
    void fillLine('learning', native, settings.nativeLanguage, settings.learningLanguage, isStale);
  }
}

/** Updates one line's pending status (undefined clears it), unless the load is stale. */
function setPending(line: LineKind, pending: LinePending | undefined, isStale: () => boolean) {
  if (isStale()) return;
  const current = subtitleStore.get();
  subtitleStore.set({ ...current, pending: { ...current.pending, [line]: pending } });
}

async function fillLine(
  line: LineKind,
  source: Cue[],
  from: string,
  to: string,
  isStale: () => boolean,
) {
  setPending(line, { phase: 'translating' }, isStale);
  const translator = await getTranslator(from, to, (status) =>
    setPending(line, status.phase === 'ready' ? { phase: 'translating' } : status, isStale),
  );
  if (!translator) {
    setPending(line, undefined, isStale);
    return;
  }
  if (isStale()) return;
  log(`Translating ${source.length} lines ${from} → ${to} on-device`);
  const startedAt = performance.now();
  await translateCues(source, {
    translate: (text) => translator.translate(text),
    currentTimeMs: () => (findVideo()?.currentTime ?? 0) * 1000,
    isStale,
    onProgress: (cues) => {
      const current = subtitleStore.get();
      subtitleStore.set({ ...current, [line]: cues, [`${line}Translated`]: true });
    },
  });
  setPending(line, undefined, isStale);
  if (!isStale()) log(`Translated in ${Math.round(performance.now() - startedAt)} ms`);
}

const HIDE_NATIVE_CAPTIONS_ID = 'linguaiuto-hide-yt-captions';

/** Hides YouTube's own captions while our overlay is showing subtitles. */
function setYouTubeCaptionsHidden(hidden: boolean) {
  const existing = document.getElementById(HIDE_NATIVE_CAPTIONS_ID);
  if (hidden && !existing) {
    const style = document.createElement('style');
    style.id = HIDE_NATIVE_CAPTIONS_ID;
    style.textContent = '#movie_player .ytp-caption-window-container { display: none !important; }';
    document.head.append(style);
  } else if (!hidden) {
    existing?.remove();
  }
}

/** Loads subtitles for the current video and reloads on navigation or language change. */
export function startSubtitles(signal: AbortSignal) {
  let generation = 0;
  let settings: Settings | null = null;
  let loadedKey = '';

  const reload = () => {
    const videoId = getVideoId();
    const key = `${videoId}|${settings?.enabled}|${settings?.learningLanguage}|${settings?.nativeLanguage}`;
    // The first page load fires both our initial load and yt-navigate-finish.
    if (key === loadedKey && subtitleStore.get().status !== 'error') return;
    loadedKey = key;

    const gen = ++generation;
    const isStale = () => gen !== generation || signal.aborted;
    if (!videoId || !settings?.enabled) {
      subtitleStore.set(EMPTY);
      return;
    }
    void load(videoId, settings, isStale);
  };

  const unsubscribeStore = subtitleStore.subscribe(() => {
    const { status } = subtitleStore.get();
    setYouTubeCaptionsHidden(!!settings?.enabled && (status === 'loading' || status === 'ready'));
  });

  void settingsItem.getValue().then((s) => {
    settings = s;
    reload();
  });

  const unwatch = settingsItem.watch((next, prev) => {
    settings = next;
    if (
      next.enabled !== prev?.enabled ||
      next.learningLanguage !== prev?.learningLanguage ||
      next.nativeLanguage !== prev?.nativeLanguage
    ) {
      reload();
    }
  });

  document.addEventListener('yt-navigate-finish', reload);
  signal.addEventListener('abort', () => {
    document.removeEventListener('yt-navigate-finish', reload);
    unwatch();
    unsubscribeStore();
    setYouTubeCaptionsHidden(false);
  });
}
