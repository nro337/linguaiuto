import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { LineKind } from '@/adapters/youtube/subtitles';

export interface HoveredWord {
  kind: LineKind;
  /** Token index within the line. */
  index: number;
  word: string;
  /** The line it belongs to; the tooltip closes when the line changes. */
  lineText: string;
  /** Word position relative to the overlay layer. */
  rect: { left: number; top: number; width: number; height: number };
  /** Size of the overlay layer when the word was hovered. */
  layer: { width: number; height: number };
}

const OPEN_DELAY_MS = 120;
/** Switching between words while a tooltip is open feels better a little faster. */
const SWITCH_DELAY_MS = 60;
/** Time to move the mouse from the word into the tooltip. */
const CLOSE_DELAY_MS = 250;

/**
 * Hover intent for subtitle words: opens after a short delay so sweeping the
 * mouse across a line doesn't flash tooltips, and stays open while the mouse
 * moves into the tooltip.
 */
export function useWordHover(layer: RefObject<HTMLElement | null>) {
  const [hovered, setHovered] = useState<HoveredWord | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isOpen = useRef(false);
  useEffect(() => {
    isOpen.current = hovered !== null;
  }, [hovered]);

  const enterWord = useCallback(
    (kind: LineKind, index: number, word: string, lineText: string, el: HTMLElement) => {
      clearTimeout(closeTimer.current);
      clearTimeout(openTimer.current);
      openTimer.current = setTimeout(
        () => {
          const box = layer.current?.getBoundingClientRect();
          const r = el.getBoundingClientRect();
          if (!box) return;
          setHovered({
            kind,
            index,
            word,
            lineText,
            rect: {
              left: r.left - box.left,
              top: r.top - box.top,
              width: r.width,
              height: r.height,
            },
            layer: { width: box.width, height: box.height },
          });
        },
        isOpen.current ? SWITCH_DELAY_MS : OPEN_DELAY_MS,
      );
    },
    [layer],
  );

  const leave = useCallback(() => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setHovered(null), CLOSE_DELAY_MS);
  }, []);

  /** Cancels a pending close, e.g. when the mouse enters the tooltip. */
  const keep = useCallback(() => clearTimeout(closeTimer.current), []);

  const close = useCallback(() => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    setHovered(null);
  }, []);

  useEffect(
    () => () => {
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
    },
    [],
  );

  return { hovered, enterWord, leave, keep, close };
}
