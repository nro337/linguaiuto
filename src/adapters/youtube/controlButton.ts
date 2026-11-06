import { menuOpenStore, MENU_BUTTON_CLASS } from '@/overlay/Menu';
import { PLAYER_SELECTOR } from './player';

const SVG_NS = 'http://www.w3.org/2000/svg';

function createButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  // ytp-button gives it YouTube's own control-bar sizing and focus styles.
  button.className = `ytp-button ${MENU_BUTTON_CLASS}`;
  button.title = 'Linguaiuto';
  button.setAttribute('aria-label', 'Linguaiuto settings');

  const svg = document.createElementNS(SVG_NS, 'svg');
  // Same format as YouTube's own control-bar icons (24×24; YouTube's CSS adds the padding).
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');
  svg.setAttribute('aria-hidden', 'true');

  const panels = document.createElementNS(SVG_NS, 'path');
  panels.setAttribute(
    'd',
    'M3.4 4.1h5.1c2.1 0 3.5 1.4 3.5 3.4v10.2a5.9 5.9 0 0 0-4.1-1.6h-.8L3.9 19l.8-2.9H3.4c-1.6 0-2.6-1.1-2.6-2.7V6.8c0-1.6 1-2.7 2.6-2.7Zm17.2 0h-5.1c-2.1 0-3.5 1.4-3.5 3.4v10.2a5.9 5.9 0 0 1 4.1-1.6h.8l3.2 2.9-.8-2.9h1.3c1.6 0 2.6-1.1 2.6-2.7V6.8c0-1.6-1-2.7-2.6-2.7Z',
  );
  panels.setAttribute('fill', '#fff');

  const bridge = document.createElementNS(SVG_NS, 'path');
  bridge.setAttribute('d', 'M6.4 12.5c1.6 2 3.4 3 5.6 3s4-1 5.6-3');
  bridge.setAttribute('fill', 'none');
  bridge.setAttribute('stroke', '#fff');
  bridge.setAttribute('stroke-linecap', 'round');
  bridge.setAttribute('stroke-width', '1.6');
  svg.append(panels, bridge);
  button.append(svg);

  button.addEventListener('click', () => menuOpenStore.set(!menuOpenStore.get()));
  return button;
}

/**
 * Adds our button to the right side of YouTube's control bar, and re-adds it if
 * YouTube rebuilds the controls.
 */
export function startControlButton(signal: AbortSignal) {
  const button = createButton();
  const sync = () => button.setAttribute('aria-pressed', String(menuOpenStore.get()));
  const unsubscribe = menuOpenStore.subscribe(sync);
  sync();

  const ensure = () => {
    if (button.isConnected) return;
    document.querySelector(`${PLAYER_SELECTOR} .ytp-right-controls`)?.prepend(button);
  };
  ensure();
  const timer = setInterval(ensure, 1000);

  signal.addEventListener('abort', () => {
    clearInterval(timer);
    unsubscribe();
    button.remove();
  });
}
