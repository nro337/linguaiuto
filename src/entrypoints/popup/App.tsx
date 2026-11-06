import { useEffect, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  LANGUAGES,
  settingsItem,
  type LanguageCode,
  type LineSettings,
  type Settings,
} from '@/storage/settings';

type LineKey = 'learning' | 'native';

export function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    void settingsItem.getValue().then(setSettings);
  }, []);

  const update = (next: Settings) => {
    setSettings(next);
    void settingsItem.setValue(next);
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
        </fieldset>
      ))}
      <p className="hint">Shortcuts: Alt+1 / Alt+2 show or hide · Alt+Shift+1 / Alt+Shift+2 blur</p>
    </main>
  );
}
