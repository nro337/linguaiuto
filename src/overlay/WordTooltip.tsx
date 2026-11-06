import { useEffect, useState } from 'react';
import { lookup } from '@/dictionary/lookup';
import type { LookupResult } from '@/dictionary/store';
import type { DictEntry } from '@/dictionary/types';
import { translateWord } from '@/providers/translator/word';
import { speak } from '@/providers/pronunciation/speech';
import type { Settings } from '@/storage/settings';
import { removeWord, saveWord } from '@/storage/vocab';
import type { HoveredWord } from './useWordHover';

const POS_NAMES: Record<string, string> = {
  adj: 'adjective',
  adv: 'adverb',
  conj: 'conjunction',
  det: 'determiner',
  intj: 'interjection',
  num: 'number',
  prep: 'preposition',
  pron: 'pronoun',
  prep_phrase: 'phrase',
};

interface Row {
  pos: string;
  text: string;
  /** For word forms: the base form and its first meaning. */
  lemma?: { word: string; gloss?: string };
}

/**
 * Flattens dictionary entries into at most `max` distinct rows. Forms of the
 * same base word are merged ("simple past of go · past participle of go").
 */
export function rowsFor(result: LookupResult, max = 3): Row[] {
  const rows: Row[] = [];
  const formRows = new Map<string, Row>();
  const seen = new Set<string>();

  for (const entry of result.entries) {
    const pos = POS_NAMES[entry.p] ?? entry.p;
    for (const form of entry.f ?? []) {
      const key = `${pos}|${form.l}`;
      const existing = formRows.get(key);
      if (existing) {
        if (!existing.text.includes(form.d)) existing.text += ` · ${form.d}`;
        continue;
      }
      if (rows.length >= max) continue;
      // Prefer the base form's meaning with the same part of speech ("went" → verb "go").
      const lemmaEntries = result.lemmas[form.l] ?? [];
      const gloss = (
        lemmaEntries.find((e: DictEntry) => e.p === entry.p && e.g) ??
        lemmaEntries.find((e: DictEntry) => e.g)
      )?.g?.[0];
      const row: Row = { pos, text: form.d, lemma: { word: form.l, gloss } };
      formRows.set(key, row);
      rows.push(row);
    }
    if (entry.g && rows.length < max) {
      const text = entry.g.join('; ');
      if (!seen.has(`${pos}|${text}`)) {
        seen.add(`${pos}|${text}`);
        rows.push({ pos, text });
      }
    }
  }
  return rows;
}

const SpeakerIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      fill="currentColor"
      d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"
    />
  </svg>
);

/** Where the word was seen, saved with it. */
export interface WordContext {
  learningLine?: string;
  nativeLine?: string;
  videoId: string | null;
  timeMs: number;
}

const BookmarkIcon = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      d="M6 3h12v18l-6-4.5L6 21z"
    />
  </svg>
);

interface WordTooltipProps {
  hovered: HoveredWord;
  settings: Settings;
  context: WordContext;
  /** Whether a word is already in the vocabulary (by learning-language word). */
  isSaved: (word: string) => boolean;
  onEnter: () => void;
  onLeave: () => void;
}

/**
 * Details for a hovered word. A learning-language word shows its translation
 * and dictionary entry; a native-language word shows its learning-language
 * translation and that word's entry, so you always see the word you're learning.
 */
export function WordTooltip({
  hovered,
  settings,
  context,
  isSaved,
  onEnter,
  onLeave,
}: WordTooltipProps) {
  const { learningLanguage: learning, nativeLanguage: native } = settings;
  const fromLearning = hovered.kind === 'learning';
  const [translation, setTranslation] = useState<string | null | undefined>(undefined);
  const [result, setResult] = useState<LookupResult | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const from = fromLearning ? learning : native;
    const to = fromLearning ? native : learning;
    void translateWord(from, to, hovered.word).then((t) => !cancelled && setTranslation(t));
    if (fromLearning) void lookup(learning, hovered.word).then((r) => !cancelled && setResult(r));
    return () => {
      cancelled = true;
    };
  }, [hovered.word, fromLearning, learning, native]);

  // For a native word, look up its translation once it's known (single words only).
  useEffect(() => {
    if (fromLearning || !translation || /\s/.test(translation)) return;
    let cancelled = false;
    void lookup(learning, translation).then((r) => !cancelled && setResult(r));
    return () => {
      cancelled = true;
    };
  }, [fromLearning, translation, learning]);

  const focus = fromLearning ? hovered.word : translation;
  const ipa = result?.entries.find((e) => e.i)?.i;
  const rows = result ? rowsFor(result) : [];
  const loadingDetails = result === undefined && (fromLearning || translation !== null);
  const saved = !!focus && isSaved(focus);

  const toggleSaved = () => {
    if (!focus) return;
    if (saved) {
      void removeWord(learning, focus);
      return;
    }
    const first = rows[0];
    const lemmaRow = rows.find((r) => r.lemma);
    void saveWord({
      word: focus,
      lang: learning,
      translation: (fromLearning ? translation : hovered.word) ?? undefined,
      ipa,
      pos: first?.pos,
      lemma: lemmaRow?.lemma?.word,
      definition: first
        ? [first.text, first.lemma?.gloss && `${first.lemma.word}: ${first.lemma.gloss}`]
            .filter(Boolean)
            .join(' — ')
        : undefined,
      context: context.learningLine ?? '',
      contextTranslation: context.nativeLine,
      videoId: context.videoId ?? '',
      timeMs: context.timeMs,
      savedAt: Date.now(),
    });
  };

  // Above the word, centered on it, kept inside the player.
  const { width: layerWidth, height: layerHeight } = hovered.layer;
  const half = Math.min(160, layerWidth / 2);
  const center = Math.min(
    Math.max(hovered.rect.left + hovered.rect.width / 2, half + 8),
    layerWidth - half - 8,
  );

  return (
    <div
      className="lg-tip"
      role="tooltip"
      style={{ left: center, bottom: layerHeight - hovered.rect.top + 8 }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      // Keep clicks from reaching the player, which would pause or play the video.
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div className="lg-tip-head">
        <span className="lg-tip-word" lang={learning}>
          {focus ?? '…'}
        </span>
        {ipa && <span className="lg-tip-ipa">{ipa}</span>}
        {focus && (
          <button
            type="button"
            className="lg-tip-speak"
            aria-label={`Pronounce ${focus}`}
            title="Pronounce"
            onClick={() => speak(focus, learning)}
          >
            <SpeakerIcon />
          </button>
        )}
        {focus && (
          <button
            type="button"
            className={`lg-tip-save${saved ? ' lg-tip-saved' : ''}`}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${focus} from vocabulary` : `Save ${focus} to vocabulary`}
            title={saved ? 'Saved — click to remove' : 'Save to vocabulary'}
            onClick={toggleSaved}
          >
            <BookmarkIcon filled={saved} />
          </button>
        )}
      </div>
      {fromLearning && translation !== null && (
        <div className="lg-tip-translation" lang={native}>
          {translation ?? '…'}
        </div>
      )}
      {rows.map((row, i) => (
        <div className="lg-tip-row" key={i}>
          <span className="lg-tip-pos">{row.pos}</span> {row.text}
          {row.lemma?.gloss && (
            <div className="lg-tip-lemma">
              <span lang={learning}>{row.lemma.word}</span>: {row.lemma.gloss}
            </div>
          )}
        </div>
      ))}
      {loadingDetails && <div className="lg-tip-muted">…</div>}
    </div>
  );
}
