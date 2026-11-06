import { settingsItem, type Settings } from '@/storage/settings';
import { goToLine } from '@/adapters/youtube/playback';
import type { LineCommand } from '@/core/navigation';

/**
 * Keyboard shortcuts on YouTube pages:
 *   Alt+1 / Alt+2         show or hide the learning / native line
 *   Alt+Shift+1 / Alt+Shift+2   blur or unblur the learning / native line
 *   Shift+← / Shift+→ / Shift+↓   previous / next / replay line
 * Uses physical key codes so it works with any keyboard layout (and Option on macOS).
 */
const LINES = { Digit1: 'learning', Digit2: 'native' } as const;
const NAVIGATION: Record<string, LineCommand> = {
  ArrowLeft: 'previous',
  ArrowRight: 'next',
  ArrowDown: 'replay',
};

/**
 * True when keys should go to the focused element instead: text fields, and
 * our own controls (e.g. arrow keys on the subtitle drag handle or a slider).
 * Uses the real target inside shadow DOM, not the retargeted host.
 */
function isTyping(event: KeyboardEvent): boolean {
  const el = event.composedPath()[0] as HTMLElement | undefined;
  if (!el?.tagName) return false;
  return (
    el.isContentEditable ||
    /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) ||
    el.classList.contains('lg-drag')
  );
}

export function startShortcuts(signal: AbortSignal) {
  const onKeyDown = (event: KeyboardEvent) => {
    const command = NAVIGATION[event.key];
    if (
      command &&
      event.shiftKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !isTyping(event)
    ) {
      // Only on watch pages, where the overlay has lines to move between.
      if (!document.querySelector('#movie_player')) return;
      event.preventDefault();
      event.stopPropagation();
      goToLine(command);
      return;
    }
    if (!event.altKey || event.ctrlKey || event.metaKey || isTyping(event)) return;
    const line = LINES[event.code as keyof typeof LINES];
    if (!line) return;
    event.preventDefault();
    event.stopPropagation();
    const field = event.shiftKey ? 'blurred' : 'visible';
    void settingsItem.getValue().then((settings: Settings) =>
      settingsItem.setValue({
        ...settings,
        [line]: { ...settings[line], [field]: !settings[line][field] },
      }),
    );
  };
  window.addEventListener('keydown', onKeyDown, { capture: true, signal });
}
