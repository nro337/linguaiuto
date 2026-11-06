import { memo, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { subtitleStore } from '@/adapters/youtube/subtitles';
import { activeCueStore, seekTo } from '@/adapters/youtube/playback';
import { findCueIndex, type Cue } from '@/core/cues';
import { lastStartedIndex } from '@/core/navigation';
import { DEFAULT_SETTINGS, settingsItem, type Settings } from '@/storage/settings';

const formatTime = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

/** After the viewer scrolls the list, leave it alone for a while. */
const MANUAL_SCROLL_PAUSE_MS = 4000;

interface RowProps {
  cue: Cue;
  translation?: string;
  active: boolean;
  settings: Settings;
}

const Row = memo(function Row({ cue, translation, active, settings }: RowProps) {
  return (
    <li
      className={active ? 'lg-tr-row lg-tr-active' : 'lg-tr-row'}
      aria-current={active || undefined}
    >
      <button type="button" className="lg-tr-button" onClick={() => seekTo(cue.start)}>
        <span className="lg-tr-time">{formatTime(cue.start)}</span>
        <span className="lg-tr-text">
          <span
            className={`lg-tr-learning${settings.learning.blurred ? ' lg-tr-blurred' : ''}`}
            lang={settings.learningLanguage}
            hidden={!settings.learning.visible}
          >
            {cue.text}
          </span>
          {translation && (
            <span
              className={`lg-tr-native${settings.native.blurred ? ' lg-tr-blurred' : ''}`}
              lang={settings.nativeLanguage}
              hidden={!settings.native.visible}
            >
              {translation}
            </span>
          )}
        </span>
      </button>
    </li>
  );
});

/** Full transcript beside the video: follows playback, click a line to jump to it. */
export function Transcript() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const subs = useSyncExternalStore(subtitleStore.subscribe, subtitleStore.get);
  const active = useSyncExternalStore(activeCueStore.subscribe, activeCueStore.get);
  const [collapsed, setCollapsed] = useState(false);
  const list = useRef<HTMLOListElement>(null);
  const lastManualScroll = useRef(0);
  const autoScrolling = useRef(false);

  useEffect(() => {
    void settingsItem.getValue().then(setSettings);
    return settingsItem.watch((next) => setSettings(next));
  }, []);

  // Rows follow the learning line; each shows the native line playing at its midpoint.
  const main = subs.learning.length ? subs.learning : subs.native;
  const usesLearning = main === subs.learning;
  const translations = useMemo(
    () =>
      usesLearning
        ? subs.learning.map((cue) => {
            const mid = (cue.start + cue.end) / 2;
            const i = findCueIndex(subs.native, mid);
            return subs.native[i >= 0 ? i : lastStartedIndex(subs.native, cue.start)]?.text;
          })
        : [],
    [usesLearning, subs.learning, subs.native],
  );
  const activeIndex = usesLearning ? active.learning : active.native;

  // Keep the current line in view, unless the viewer is scrolling the list themselves.
  useEffect(() => {
    const el = list.current;
    const row = el?.children[activeIndex] as HTMLElement | undefined;
    if (!el || !row || Date.now() - lastManualScroll.current < MANUAL_SCROLL_PAUSE_MS) return;
    autoScrolling.current = true;
    el.scrollTo({ top: row.offsetTop - el.clientHeight / 3, behavior: 'smooth' });
    const done = setTimeout(() => (autoScrolling.current = false), 600);
    return () => clearTimeout(done);
  }, [activeIndex]);

  if (!settings.enabled || !settings.showTranscript || subs.status !== 'ready' || !main.length) {
    return null;
  }

  return (
    <section className="lg-tr" aria-label="Linguaiuto transcript">
      <header className="lg-tr-header">
        <h2>Transcript</h2>
        <span className="lg-tr-count">{main.length} lines</span>
        <button
          type="button"
          className="lg-tr-icon"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? 'Show' : 'Hide'}
        </button>
        <button
          type="button"
          className="lg-tr-icon"
          title="Turn off the transcript (you can turn it back on in the Aa menu)"
          aria-label="Close transcript"
          onClick={() => void settingsItem.setValue({ ...settings, showTranscript: false })}
        >
          ✕
        </button>
      </header>
      {!collapsed && (
        <ol
          ref={list}
          className="lg-tr-list"
          onScroll={() => {
            if (!autoScrolling.current) lastManualScroll.current = Date.now();
          }}
        >
          {main.map((cue, i) => (
            <Row
              key={`${cue.start}-${i}`}
              cue={cue}
              translation={translations[i]}
              active={i === activeIndex}
              settings={settings}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
