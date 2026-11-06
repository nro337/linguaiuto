import {
  CONTENT_SOURCE,
  isMainMessage,
  type ContentMessage,
  type PlayerState,
  type WithoutSource,
} from './messages';

let nextRequestId = 1;

function send(msg: WithoutSource<ContentMessage>) {
  window.postMessage({ source: CONTENT_SOURCE, ...msg }, location.origin);
}

/** Asks the main-world script for the player's caption tracks and captured request. */
export function getPlayerState(timeoutMs = 2000): Promise<PlayerState | null> {
  const requestId = nextRequestId++;
  return new Promise((resolve) => {
    const timer = setTimeout(() => done(null), timeoutMs);
    function done(value: PlayerState | null) {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(value);
    }
    function onMessage(event: MessageEvent) {
      if (event.source !== window || !isMainMessage(event.data)) return;
      if (event.data.type === 'state' && event.data.requestId === requestId) done(event.data.state);
    }
    window.addEventListener('message', onMessage);
    send({ type: 'get-state', requestId });
  });
}

export function primeCaptions() {
  send({ type: 'prime-captions' });
}
