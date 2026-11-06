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
  const text = document.createElementNS(SVG_NS, 'text');
  Object.entries({
    // Center on the middle of the glyphs, not the baseline.
    x: '12',
    y: '12',
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-size': '13',
    'font-weight': '700',
    'font-family': 'Roboto, Arial, sans-serif',
    fill: '#fff',
  }).forEach(([k, v]) => text.setAttribute(k, v));
  text.textContent = 'Aa';
  svg.append(text);
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
