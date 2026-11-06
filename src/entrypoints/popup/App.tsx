import { useEffect, useRef, useState } from 'react';
import { useVocab } from '@/overlay/useVocab';
import {
  DEFAULT_SETTINGS,
  FONT_SIZE_RANGE,
  LANGUAGES,
  settingsItem,
  type LanguageCode,
  type LineSettings,
  type Settings,
} from '@/storage/settings';

type LineKey = 'learning' | 'native';

export function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const wordCount = Object.keys(useVocab()).length;

  useEffect(() => {
    void settingsItem.getValue().then(setSettings);
  }, []);

  const update = (next: Settings) => {
    setSettings(next);
    void settingsItem.setValue(next);
  };

  // Sliders update the view right away and save after a pause, because
  // chrome.storage.sync limits how often it can be written.
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  /** Settings waiting to be saved, if any. */
  const pending = useRef<Settings | null>(null);
  const saveNow = () => {
    clearTimeout(saveTimer.current);
    if (pending.current) void settingsItem.setValue(pending.current);
    pending.current = null;
  };
  const updateSoon = (next: Settings) => {
    setSettings(next);
    pending.current = next;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveNow, 400);
  };

  const setLanguage = (key: 'learningLanguage' | 'nativeLanguage', code: LanguageCode) => {
    const other = key === 'learningLanguage' ? 'nativeLanguage' : 'learningLanguage';
    // Picking the other line's language swaps the two.
    const swap = settings[other] === code ? { [other]: settings[key] } : {};
    update({ ...settings, ...swap, [key]: code });
  };

  const updateLine = (key: LineKey, patch: Partial<LineSettings>) =>
    update({ ...settings, [key]: { ...settings[key], ...patch } });

  return (
    <main>
      <h1>Linguaiuto</h1>
      <label className="row">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => update({ ...settings, enabled: e.target.checked })}
        />
        Enabled
      </label>
      {(['learning', 'native'] as const).map((key) => (
        <fieldset key={key}>
          <legend>{key === 'learning' ? 'Learning language' : 'Native language'}</legend>
          <select
            value={settings[`${key}Language`]}
            onChange={(e) => setLanguage(`${key}Language`, e.target.value as LanguageCode)}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
          <label className="row">
            <input
              type="checkbox"
              checked={settings[key].visible}
              onChange={(e) => updateLine(key, { visible: e.target.checked })}
            />
            Show
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={settings[key].blurred}
              onChange={(e) => updateLine(key, { blurred: e.target.checked })}
            />
            Blur
          </label>
          <label className="slider">
            <span>Size</span>
            <input
              type="range"
              min={FONT_SIZE_RANGE[key].min}
              max={FONT_SIZE_RANGE[key].max}
              value={settings[key].fontSizePx}
              onChange={(e) =>
                updateSoon({
                  ...settings,
                  [key]: { ...settings[key], fontSizePx: Number(e.target.value) },
                })
              }
              onPointerUp={saveNow}
            />
            <output>{settings[key].fontSizePx}px</output>
          </label>
        </fieldset>
      ))}
      <label className="slider standalone">
        <span>Background</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(settings.backgroundOpacity * 100)}
          onChange={(e) =>
            updateSoon({ ...settings, backgroundOpacity: Number(e.target.value) / 100 })
          }
          onPointerUp={saveNow}
        />
        <output>{Math.round(settings.backgroundOpacity * 100)}%</output>
      </label>
      <div className="row position">
        <span>Position: {settings.position ? 'custom' : 'default'}</span>
        <button
          type="button"
          disabled={!settings.position}
          onClick={() => update({ ...settings, position: null })}
        >
          Reset
        </button>
      </div>
      <div className="options">
        {(
          [
            ['pauseOnHover', 'Pause while hovering a word'],
            ['autoPause', 'Pause at the end of each line'],
            ['showTranscript', 'Show transcript next to the video'],
          ] as const
        ).map(([key, label]) => (
          <label className="row" key={key}>
            <input
              type="checkbox"
              checked={settings[key]}
              onChange={(e) => update({ ...settings, [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </div>
      <button
        type="button"
        className="vocab-button"
        onClick={() => {
          void browser.tabs.create({ url: browser.runtime.getURL('/vocab.html') });
          window.close();
        }}
      >
        Vocabulary ({wordCount})
      </button>
      <p className="hint">Shortcuts: Alt+1 / Alt+2 show or hide · Alt+Shift+1 / Alt+Shift+2 blur</p>
    </main>
  );
}
