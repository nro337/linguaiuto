/** Messages from content scripts to the background service worker. */
export type BackgroundRequest =
  | { type: 'translations:get'; pair: string; texts: string[] }
  | { type: 'translations:put'; pair: string; entries: [string, string][] };

export async function sendToBackground<T>(request: BackgroundRequest): Promise<T | null> {
  try {
    return (await browser.runtime.sendMessage(request)) as T;
  } catch {
    // The extension was reloaded or the worker is unavailable; carry on without it.
    return null;
  }
}
