import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';
import { DEFAULT_SETTINGS, settingsItem, type Settings } from '@/storage/settings';
import { subtitleStore, type LineKind } from '@/adapters/youtube/subtitles';
import { findVideo } from '@/adapters/youtube/player';
import { activeCueStore } from '@/adapters/youtube/playback';
import { pendingMessage } from './messages';
import { Menu } from './Menu';
import { Line } from './Line';
import { WordTooltip } from './WordTooltip';
import { useWordHover } from './useWordHover';
import { useVocab } from './useVocab';
import { vocabKey } from '@/storage/vocab';
import { settingsPreview } from './settingsPreview';
import { DragHandle, HANDLE_ALLOWANCE_PX } from './DragHandle';
import { clampPosition } from '@/core/position';

export function Overlay() {
  const [stored, setStored] = useState<Settings>(DEFAULT_SETTINGS);
  const preview = useSyncExternalStore(settingsPreview.subscribe, settingsPreview.get);
  // Unsaved slider/drag changes show immediately.
  const settings = useMemo(() => ({ ...stored, ...preview }), [stored, preview]);
  const block = useRef<HTMLDivElement>(null);
  const subs = useSyncExternalStore(subtitleStore.subscribe, subtitleStore.get);
  const active = useSyncExternalStore(activeCueStore.subscribe, activeCueStore.get);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const layer = useRef<HTMLDivElement>(null);
  const { hovered, enterWord, leave, keep, close } = useWordHover(layer);
  const vocab = useVocab();
  const isSaved = useCallback(
    (word: string) => vocabKey(settings.learningLanguage, word) in vocab,
    [vocab, settings.learningLanguage],
  );

  useEffect(() => {
    void settingsItem.getValue().then(setStored);
    return settingsItem.watch((next) => setStored(next));
  }, []);

  // YouTube keeps the same <video> across navigation, but it may not exist on first mount.
  useEffect(() => {
    if (subs.status === 'ready') queueMicrotask(() => setVideo(findVideo()));
  }, [subs.status, subs.videoId]);

  const showLines = settings.enabled && subs.status === 'ready';
  const text: Record<LineKind, string | undefined> = {
    learning: subs.learning[active.learning]?.text,
    native: subs.native[active.native]?.text,
  };

  // A custom position is kept inside the video even when a longer line comes
  // along: nudge the block in place (no re-render) whenever its content changes.
  const { position } = settings;
  useLayoutEffect(() => {
    const el = block.current;
    const area = layer.current?.getBoundingClientRect();
    if (!el || !area || !position) return;
    const box = el.getBoundingClientRect();
    const fit = clampPosition(
      position,
      { width: box.width + HANDLE_ALLOWANCE_PX, height: box.height },
      area,
    );
    el.style.left = `${fit.x * 100}%`;
    el.style.bottom = `${fit.y * 100}%`;
  }, [
    position,
    text.learning,
    text.native,
    settings.learning.fontSizePx,
    settings.native.fontSizePx,
  ]);

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
        isSaved={kind === 'learning' ? isSaved : undefined}
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
            context={{
              learningLine: text.learning,
              nativeLine: text.native,
              videoId: subs.videoId,
              timeMs:
                subs.learning[active.learning]?.start ??
                subs.native[active.native]?.start ??
                Math.round((video?.currentTime ?? 0) * 1000),
            }}
            isSaved={isSaved}
            onEnter={keep}
            onLeave={leave}
          />
        )}
      </div>
      <div
        className="lg-layer"
        ref={layer}
        style={{ '--lg-bg-alpha': settings.backgroundOpacity } as CSSProperties}
      >
        {showLines && (
          <div
            ref={block}
            className={`lg-root${settings.backgroundOpacity < 0.5 ? ' lg-outlined' : ''}`}
            style={
              settings.position
                ? { left: `${settings.position.x * 100}%`, bottom: `${settings.position.y * 100}%` }
                : undefined
            }
          >
            <DragHandle layer={layer} block={block} />
            {line('learning')}
            {line('native')}
          </div>
        )}
      </div>
    </>
  );
}
