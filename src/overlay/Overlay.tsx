import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, settingsItem, type Settings } from '@/storage/settings';

export function Overlay() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    void settingsItem.getValue().then(setSettings);
    return settingsItem.watch((next) => setSettings(next));
  }, []);

  if (!settings.enabled) return null;

  // Phase 0 placeholder: real cues arrive in Phase 1.
  return (
    <div className="lg-root">
      {settings.learning.visible && (
        <div
          className={`lg-line lg-learning${settings.learning.blurred ? ' lg-blurred' : ''}`}
          style={{ fontSize: settings.learning.fontSizePx }}
        >
          <span className="lg-word">Linguaiuto</span> <span className="lg-word">è</span>{' '}
          <span className="lg-word">pronto</span>
        </div>
      )}
      {settings.native.visible && (
        <div
          className={`lg-line lg-native${settings.native.blurred ? ' lg-blurred' : ''}`}
          style={{ fontSize: settings.native.fontSizePx }}
        >
          <span className="lg-word">Linguaiuto</span> <span className="lg-word">is</span>{' '}
          <span className="lg-word">ready</span>
        </div>
      )}
    </div>
  );
}
