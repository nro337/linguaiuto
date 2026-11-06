import type { CaptionTrack } from '@/adapters/youtube/captions';
import {
  isContentMessage,
  MAIN_SOURCE,
  type MainMessage,
  type PlayerState,
  type WithoutSource,
} from '@/adapters/youtube/messages';

/**
 * Runs in the page's own JS context at document_start so it can see the
 * player's subtitle requests. It records the URL (which carries the token the
 * player generated) and the response body, and answers content-script queries.
 * It never changes or blocks the player's requests.
 */

interface YtPlayer extends HTMLElement {
  getPlayerResponse?: () => {
    videoDetails?: { videoId?: string };
    captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } };
  };
  getVideoData?: () => { video_id?: string };
  toggleSubtitles?: () => void;
}

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  world: 'MAIN',
  runAt: 'document_start',

  main() {
    const captured = new Map<string, { url: string; body: string | null }>();

    const post = (msg: WithoutSource<MainMessage>) =>
      window.postMessage({ source: MAIN_SOURCE, ...msg }, location.origin);

    const record = (rawUrl: string, body: string | null) => {
      let url: URL;
      try {
        url = new URL(rawUrl, location.origin);
      } catch {
        return;
      }
      if (!url.pathname.endsWith('/api/timedtext')) return;
      const videoId = url.searchParams.get('v');
      if (!videoId) return;
      const prev = captured.get(videoId);
      captured.set(videoId, { url: url.toString(), body: body || prev?.body || null });
    };

    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      ...args: Parameters<XMLHttpRequest['open']>
    ) {
      const url = String(args[1]);
      if (url.includes('/api/timedtext')) {
        record(url, null);
        this.addEventListener('load', () => {
          if (this.responseType === '' || this.responseType === 'text') {
            record(url, this.responseText);
          }
        });
      }
      return origOpen.apply(this, args as Parameters<typeof origOpen>);
    } as typeof XMLHttpRequest.prototype.open;

    const origFetch = window.fetch;
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      const url = input instanceof Request ? input.url : String(input);
      const promise = origFetch.call(this, input, init);
      if (url.includes('/api/timedtext')) {
        record(url, null);
        void promise.then((res) =>
          res
            .clone()
            .text()
            .then((body) => record(url, body))
            .catch(() => {}),
        );
      }
      return promise;
    };

    const player = () => document.getElementById('movie_player') as YtPlayer | null;

    const currentState = (): PlayerState => {
      const p = player();
      const response = p?.getPlayerResponse?.();
      const videoId = response?.videoDetails?.videoId ?? p?.getVideoData?.()?.video_id ?? null;
      const tracks = response?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
      const cap = videoId ? captured.get(videoId) : undefined;
      return {
        videoId,
        adShowing: !!p?.classList.contains('ad-showing'),
        tracks: tracks.map(({ baseUrl, languageCode, kind, vssId, isTranslatable }) => ({
          baseUrl,
          languageCode,
          kind,
          vssId,
          isTranslatable,
        })),
        capturedUrl: cap?.url ?? null,
        capturedBody: cap?.body ?? null,
      };
    };

    const subtitlesOn = () =>
      document
        .querySelector('#movie_player .ytp-subtitles-button')
        ?.getAttribute('aria-pressed') === 'true';

    /**
     * Makes the player download subtitles so we can capture its request.
     * The player may show captions as "on" without having fetched them, so toggle
     * through it and then restore the user's on/off choice. YouTube's own captions
     * are hidden by our CSS while this happens.
     */
    const primeCaptions = () => {
      const p = player();
      // During an ad, requests would be for the ad's video. Try again after it ends.
      if (!p?.toggleSubtitles || p.classList.contains('ad-showing')) return;
      const wasOn = subtitlesOn();
      p.toggleSubtitles();
      if (wasOn) {
        p.toggleSubtitles();
      } else {
        setTimeout(() => {
          if (subtitlesOn()) p.toggleSubtitles?.();
        }, 1500);
      }
    };

    window.addEventListener('message', (event) => {
      if (event.source !== window || !isContentMessage(event.data)) return;
      const msg = event.data;
      if (msg.type === 'get-state') {
        post({ type: 'state', requestId: msg.requestId, state: currentState() });
      } else if (msg.type === 'prime-captions') {
        primeCaptions();
      }
    });
  },
});
