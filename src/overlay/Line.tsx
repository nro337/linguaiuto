import { memo, useMemo, type MouseEvent } from 'react';
import { tokenize } from '@/core/tokenize';
import type { LineKind } from '@/adapters/youtube/subtitles';
import type { LineSettings } from '@/storage/settings';

interface LineProps {
  text: string;
  kind: LineKind;
  lang: string;
  line: LineSettings;
  /** Token index of the word with an open tooltip, or -1. */
  activeIndex: number;
  onWordEnter: (
    kind: LineKind,
    index: number,
    word: string,
    lineText: string,
    el: HTMLElement,
  ) => void;
  onLeave: () => void;
}

/** One subtitle line, split into hoverable words. */
export const Line = memo(function Line({
  text,
  kind,
  lang,
  line,
  activeIndex,
  onWordEnter,
  onLeave,
}: LineProps) {
  const tokens = useMemo(() => tokenize(text, lang), [text, lang]);

  // One listener per line instead of one per word.
  const onMouseOver = (e: MouseEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.lg-word');
    if (!el) return;
    const index = Number(el.dataset.i);
    onWordEnter(kind, index, tokens[index]!.text, text, el);
  };

  return (
    <div
      className={`lg-line lg-${kind}${line.blurred ? ' lg-blurred' : ''}`}
      style={{ fontSize: line.fontSizePx }}
      lang={lang}
      onMouseOver={onMouseOver}
      onMouseLeave={onLeave}
    >
      {tokens.map((token, i) =>
        token.word ? (
          <span
            key={i}
            data-i={i}
            className={i === activeIndex ? 'lg-word lg-word-active' : 'lg-word'}
          >
            {token.text}
          </span>
        ) : (
          <span key={i} className="lg-gap">
            {token.text}
          </span>
        ),
      )}
    </div>
  );
});
