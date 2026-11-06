import { useEffect, useRef, useSyncExternalStore } from 'react';
import { createStore } from '@/core/store';
import {
  FONT_SIZE_RANGE,
  LANGUAGES,
  settingsItem,
  type LineSettings,
  type Settings,
} from '@/storage/settings';
import { flushPreview, previewSettings } from './settingsPreview';
import { goToLine } from '@/adapters/youtube/playback';
import { sendToBackground } from '@/messaging';

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
      <div className="lg-menu-options">
        {(
          [
            ['pauseOnHover', 'Pause while hovering a word'],
            ['autoPause', 'Pause at the end of each line'],
            ['showTranscript', 'Show transcript next to the video'],
          ] as const
        ).map(([key, label]) => (
          <label className="lg-menu-row" key={key}>
            <input
              type="checkbox"
              checked={settings[key]}
              disabled={!settings.enabled}
              onChange={(e) => update({ [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </div>
      <fieldset className="lg-menu-appearance" disabled={!settings.enabled}>
        <legend>Appearance</legend>
        {(['learning', 'native'] as const).map((kind) => (
          <label className="lg-menu-slider" key={kind}>
            <span>{kind === 'learning' ? 'Top line size' : 'Bottom line size'}</span>
            <input
              type="range"
              min={FONT_SIZE_RANGE[kind].min}
              max={FONT_SIZE_RANGE[kind].max}
              step={1}
              value={settings[kind].fontSizePx}
              onChange={(e) =>
                previewSettings({
                  [kind]: { ...settings[kind], fontSizePx: Number(e.target.value) },
                })
              }
              onPointerUp={() => void flushPreview()}
            />
            <output>{settings[kind].fontSizePx}px</output>
          </label>
        ))}
        <label className="lg-menu-slider">
          <span>Background</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(settings.backgroundOpacity * 100)}
            onChange={(e) => previewSettings({ backgroundOpacity: Number(e.target.value) / 100 })}
            onPointerUp={() => void flushPreview()}
          />
          <output>{Math.round(settings.backgroundOpacity * 100)}%</output>
        </label>
        <div className="lg-menu-position">
          <span>Drag ⠿ beside the subtitles to move them</span>
          <button
            type="button"
            disabled={!settings.position}
            onClick={() => update({ position: null })}
          >
            Reset position
          </button>
        </div>
      </fieldset>
      <div className="lg-menu-nav" role="group" aria-label="Line controls">
        <button type="button" title="Previous line (Shift+←)" onClick={() => goToLine('previous')}>
          ⏮ Previous
        </button>
        <button type="button" title="Replay line (Shift+↓)" onClick={() => goToLine('replay')}>
          ↻ Replay
        </button>
        <button type="button" title="Next line (Shift+→)" onClick={() => goToLine('next')}>
          Next ⏭
        </button>
      </div>
      <button
        type="button"
        className="lg-menu-link"
        onClick={() => void sendToBackground({ type: 'open-vocabulary' })}
      >
        Open vocabulary →
      </button>
      <p className="lg-menu-hint">Alt+1/2 show · Alt+Shift+1/2 blur · Shift+←/↓/→ lines</p>
    </div>
  );
}
