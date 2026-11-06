import { memo, useEffect, useState, useSyncExternalStore } from 'react';
import {
  DEFAULT_SETTINGS,
  settingsItem,
  type LineSettings,
  type Settings,
} from '@/storage/settings';
import { subtitleStore } from '@/adapters/youtube/subtitles';
import { findVideo } from '@/adapters/youtube/player';
import { useActiveCues } from './useActiveCues';
import { pendingMessage } from './messages';
import { Menu } from './Menu';

const Line = memo(function Line({
  text,
  kind,
  line,
}: {
  text: string;
  kind: 'learning' | 'native';
  line: LineSettings;
}) {
  const words = text.split(' ');
  return (
    <div
      className={`lg-line lg-${kind}${line.blurred ? ' lg-blurred' : ''}`}
      style={{ fontSize: line.fontSizePx }}
    >
      {words.map((word, i) => (
        <span key={i}>
          {i > 0 && ' '}
          <span className="lg-word">{word}</span>
        </span>
      ))}
    </div>
  );
});

export function Overlay() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const subs = useSyncExternalStore(subtitleStore.subscribe, subtitleStore.get);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    void settingsItem.getValue().then(setSettings);
    return settingsItem.watch((next) => setSettings(next));
  }, []);

  // YouTube keeps the same <video> across navigation, but it may not exist on first mount.
  useEffect(() => {
    if (subs.status === 'ready') queueMicrotask(() => setVideo(findVideo()));
  }, [subs.status, subs.videoId]);

  const active = useActiveCues(video, subs.learning, subs.native);

  const showLines = settings.enabled && subs.status === 'ready';

  const learningText = subs.learning[active.learning]?.text;
  const nativeText = subs.native[active.native]?.text;

  // While a line's translation loads, show why in its place. "Translating…" only
  // shows when the other line has text right now, so it doesn't flash in gaps.
  const status = (kind: 'learning' | 'native', otherText: string | undefined) => {
    const pending = subs.pending[kind];
    if (!pending || (pending.phase === 'translating' && !otherText)) return null;
    const language = kind === 'learning' ? settings.learningLanguage : settings.nativeLanguage;
    return (
      <div className="lg-line lg-status" style={{ fontSize: settings[kind].fontSizePx * 0.75 }}>
        {pendingMessage(language, pending)}
      </div>
    );
  };

  return (
    <>
      <div className="lg-layer lg-layer-menu">
        <Menu settings={settings} />
      </div>
      <div className="lg-layer">
        {showLines && (
          <div className="lg-root">
            {settings.learning.visible &&
              (learningText ? (
                <Line text={learningText} kind="learning" line={settings.learning} />
              ) : (
                status('learning', nativeText)
              ))}
            {settings.native.visible &&
              (nativeText ? (
                <Line text={nativeText} kind="native" line={settings.native} />
              ) : (
                status('native', learningText)
              ))}
          </div>
        )}
      </div>
    </>
  );
}
