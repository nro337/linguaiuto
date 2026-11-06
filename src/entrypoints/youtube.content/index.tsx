import ReactDOM from 'react-dom/client';
import { Overlay } from '@/overlay/Overlay';
import { PLAYER_SELECTOR } from '@/adapters/youtube/player';
import { startSubtitles } from '@/adapters/youtube/subtitles';
import { startShortcuts } from '@/overlay/shortcuts';
import { startControlButton } from '@/adapters/youtube/controlButton';
import '@/overlay/styles.css';

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    const controller = new AbortController();
    ctx.onInvalidated(() => controller.abort());
    startSubtitles(controller.signal);
    startShortcuts(controller.signal);
    startControlButton(controller.signal);

    const ui = await createShadowRootUi(ctx, {
      name: 'linguaiuto-overlay',
      position: 'inline',
      anchor: PLAYER_SELECTOR,
      append: 'last',
      onMount(container) {
        const root = ReactDOM.createRoot(container);
        root.render(<Overlay />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });

    // The player element appears late and survives in-site navigation, so mount once it exists.
    ui.autoMount();
  },
});
