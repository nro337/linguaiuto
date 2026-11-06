import ReactDOM from 'react-dom/client';
import { Overlay } from '@/overlay/Overlay';
import { Transcript } from '@/overlay/Transcript';
import { PLAYER_SELECTOR } from '@/adapters/youtube/player';
import { startSubtitles } from '@/adapters/youtube/subtitles';
import { startShortcuts } from '@/overlay/shortcuts';
import { startControlButton } from '@/adapters/youtube/controlButton';
import { startPlayback } from '@/adapters/youtube/playback';
import '@/overlay/styles.css';

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    const controller = new AbortController();
    ctx.onInvalidated(() => controller.abort());
    startSubtitles(controller.signal);
    startPlayback(controller.signal);
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

    // Transcript above the recommendations in the right-hand column.
    const transcript = await createShadowRootUi(ctx, {
      name: 'linguaiuto-transcript',
      position: 'inline',
      anchor: '#secondary-inner',
      append: 'first',
      onMount(container) {
        const root = ReactDOM.createRoot(container);
        root.render(<Transcript />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });
    transcript.autoMount();

    // The player element appears late and survives in-site navigation, so mount once it exists.
    ui.autoMount();
  },
});
