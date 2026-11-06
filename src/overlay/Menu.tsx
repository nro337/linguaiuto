import { useEffect, useRef, useSyncExternalStore } from 'react';
import { createStore } from '@/core/store';
import { LANGUAGES, settingsItem, type LineSettings, type Settings } from '@/storage/settings';

type LineKind = 'learning' | 'native';

/** Whether the settings panel is open. Toggled by our button in YouTube's control bar. */
export const menuOpenStore = createStore(false);

/** Marks our control-bar button, so clicks on it don't count as "outside the panel". */
export const MENU_BUTTON_CLASS = 'linguaiuto-menu-button';

const languageName = (code: string) => LANGUAGES.find((l) => l.code === code)?.name ?? code;

/** Settings panel shown above the player's control bar. */
export function Menu({ settings }: { settings: Settings }) {
  const open = useSyncExternalStore(menuOpenStore.subscribe, menuOpenStore.get);
  const panel = useRef<HTMLDivElement>(null);

  // Close on Escape or a click anywhere else.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const path = e.composedPath();
      const onButton = path.some(
        (el) => el instanceof HTMLElement && el.classList.contains(MENU_BUTTON_CLASS),
      );
      if (!onButton && panel.current && !path.includes(panel.current)) menuOpenStore.set(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') menuOpenStore.set(false);
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  if (!open) return null;

  const update = (patch: Partial<Settings>) =>
    void settingsItem.setValue({ ...settings, ...patch });
  const updateLine = (kind: LineKind, patch: Partial<LineSettings>) =>
    update({ [kind]: { ...settings[kind], ...patch } });

  const row = (kind: LineKind, shortcut: string) => (
    <div className="lg-menu-row" key={kind}>
      <span className="lg-menu-label">
        {languageName(kind === 'learning' ? settings.learningLanguage : settings.nativeLanguage)}
      </span>
      <label title={`Alt+${shortcut}`}>
        <input
          type="checkbox"
          checked={settings[kind].visible}
          disabled={!settings.enabled}
          onChange={(e) => updateLine(kind, { visible: e.target.checked })}
        />
        Show
      </label>
      <label title={`Alt+Shift+${shortcut}`}>
        <input
          type="checkbox"
          checked={settings[kind].blurred}
          disabled={!settings.enabled}
          onChange={(e) => updateLine(kind, { blurred: e.target.checked })}
        />
        Blur
      </label>
    </div>
  );

  return (
    <div
      ref={panel}
      className="lg-menu-panel"
      role="dialog"
      aria-label="Linguaiuto settings"
      // Keep clicks from reaching the player, which would pause or play the video.
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <label className="lg-menu-row lg-menu-title">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
        />
        Linguaiuto
      </label>
      {row('learning', '1')}
      {row('native', '2')}
      <p className="lg-menu-hint">Alt+1/2 show · Alt+Shift+1/2 blur</p>
    </div>
  );
}
