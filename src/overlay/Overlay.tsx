import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { DEFAULT_SETTINGS, settingsItem, type Settings } from '@/storage/settings';
import { subtitleStore, type LineKind } from '@/adapters/youtube/subtitles';
import { findVideo } from '@/adapters/youtube/player';
import { useActiveCues } from './useActiveCues';
import { pendingMessage } from './messages';
import { Menu } from './Menu';
import { Line } from './Line';
import { WordTooltip } from './WordTooltip';
import { useWordHover } from './useWordHover';

export function Overlay() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const subs = useSyncExternalStore(subtitleStore.subscribe, subtitleStore.get);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const layer = useRef<HTMLDivElement>(null);
  const { hovered, enterWord, leave, keep, close } = useWordHover(layer);

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
  const text: Record<LineKind, string | undefined> = {
    learning: subs.learning[active.learning]?.text,
    native: subs.native[active.native]?.text,
  };

  // The tooltip belongs to a line; once that line is gone, so is the tooltip.
  const tooltip =
    showLines &&
    hovered &&
    settings[hovered.kind].visible &&
    text[hovered.kind] === hovered.lineText
      ? hovered
      : null;
  useEffect(() => {
    if (hovered && !tooltip) close();
  }, [hovered, tooltip, close]);

  // Optionally pause while a tooltip is open, and resume only if we paused.
  const tooltipOpen = tooltip !== null;
  useEffect(() => {
    if (!tooltipOpen || !settings.pauseOnHover || !video || video.paused) return;
    video.pause();
    return () => void video.play().catch(() => {});
  }, [tooltipOpen, settings.pauseOnHover, video]);

  // While a line's translation loads, show why in its place. "Translating…" only
  // shows when the other line has text right now, so it doesn't flash in gaps.
  const status = (kind: LineKind, otherText: string | undefined) => {
    const pending = subs.pending[kind];
    if (!pending || (pending.phase === 'translating' && !otherText)) return null;
    const language = kind === 'learning' ? settings.learningLanguage : settings.nativeLanguage;
    return (
      <div className="lg-line lg-status" style={{ fontSize: settings[kind].fontSizePx * 0.75 }}>
        {pendingMessage(language, pending)}
      </div>
    );
  };

  const line = (kind: LineKind) => {
    if (!settings[kind].visible) return null;
    const lineText = text[kind];
    if (!lineText) return status(kind, text[kind === 'learning' ? 'native' : 'learning']);
    return (
      <Line
        text={lineText}
        kind={kind}
        lang={kind === 'learning' ? settings.learningLanguage : settings.nativeLanguage}
        line={settings[kind]}
        activeIndex={tooltip?.kind === kind ? tooltip.index : -1}
        onWordEnter={enterWord}
        onLeave={leave}
      />
    );
  };

  return (
    <>
      <div className="lg-layer lg-layer-menu">
        <Menu settings={settings} />
        {tooltip && (
          <WordTooltip
            key={`${tooltip.kind}|${tooltip.word}`}
            hovered={tooltip}
            settings={settings}
            onEnter={keep}
            onLeave={leave}
          />
        )}
      </div>
      <div className="lg-layer" ref={layer}>
        {showLines && (
          <div className="lg-root">
            {line('learning')}
            {line('native')}
          </div>
        )}
      </div>
    </>
  );
}
