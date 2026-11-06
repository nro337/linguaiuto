/** Selectors and helpers for YouTube's player. All YouTube-specific DOM knowledge lives in this folder. */
export const PLAYER_SELECTOR = '#movie_player';

export function findPlayer(): HTMLElement | null {
  return document.querySelector<HTMLElement>(PLAYER_SELECTOR);
}

export function getVideoId(url: string = location.href): string | null {
  const u = new URL(url);
  if (u.pathname === '/watch') return u.searchParams.get('v');
  const shorts = u.pathname.match(/^\/shorts\/([\w-]{11})/);
  return shorts?.[1] ?? null;
}
