import type { CaptionTrack } from './captions';

/** Messages between the main-world script (page context) and the content script, via window.postMessage. */
export const MAIN_SOURCE = 'linguaiuto-main';
export const CONTENT_SOURCE = 'linguaiuto-content';

export interface PlayerState {
  videoId: string | null;
  /** An ad is playing in the player (its requests are for the ad, not the video). */
  adShowing: boolean;
  tracks: CaptionTrack[];
  /** Latest timedtext URL the player requested for this video (contains the token). */
  capturedUrl: string | null;
  /** Response body of that request, if the player read it as text. */
  capturedBody: string | null;
}

export type MainMessage = {
  source: typeof MAIN_SOURCE;
  type: 'state';
  requestId: number;
  state: PlayerState;
};

export type ContentMessage =
  | { source: typeof CONTENT_SOURCE; type: 'get-state'; requestId: number }
  /** Ask the player to load captions so it makes a timedtext request we can capture. */
  | { source: typeof CONTENT_SOURCE; type: 'prime-captions' };

/** Omit that distributes over each member of a union. */
export type WithoutSource<T> = T extends unknown ? Omit<T, 'source'> : never;

export function isMainMessage(data: unknown): data is MainMessage {
  return (data as MainMessage | null)?.source === MAIN_SOURCE;
}

export function isContentMessage(data: unknown): data is ContentMessage {
  return (data as ContentMessage | null)?.source === CONTENT_SOURCE;
}
