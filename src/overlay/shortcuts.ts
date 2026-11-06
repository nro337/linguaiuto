import { settingsItem, type Settings } from '@/storage/settings';

/**
 * Keyboard shortcuts on YouTube pages:
 *   Alt+1 / Alt+2         show or hide the learning / native line
 *   Alt+Shift+1 / Alt+Shift+2   blur or unblur the learning / native line
 * Uses physical key codes so it works with any keyboard layout (and Option on macOS).
 */
const LINES = { Digit1: 'learning', Digit2: 'native' } as const;

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

export function startShortcuts(signal: AbortSignal) {
  const onKeyDown = (event: KeyboardEvent) => {
    if (!event.altKey || event.ctrlKey || event.metaKey || isTyping(event.target)) return;
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
