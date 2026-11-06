import { useRef, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { clampPosition, roundPosition, type Position } from '@/core/position';
import { flushPreview, previewSettings } from './settingsPreview';

/** Room for the handle itself, which sits beside the subtitles. */
export const HANDLE_ALLOWANCE_PX = 64;

interface DragHandleProps {
  layer: RefObject<HTMLElement | null>;
  block: RefObject<HTMLElement | null>;
}

/** Where the block is now, as fractions of the layer (works for the default spot too). */
function currentPosition(layer: HTMLElement, block: HTMLElement): Position {
  const area = layer.getBoundingClientRect();
  const box = block.getBoundingClientRect();
  return {
    x: (box.left + box.width / 2 - area.left) / area.width,
    y: (area.bottom - box.bottom) / area.height,
  };
}

/**
 * Grip beside the subtitles for moving them anywhere in the video. Drag with
 * the mouse or touch; with keyboard focus, arrow keys nudge (Shift for bigger
 * steps). Double-click puts them back in the default spot.
 */
export function DragHandle({ layer, block }: DragHandleProps) {
  const drag = useRef<{ px: number; py: number; start: Position } | null>(null);

  const move = (pos: Position) => {
    if (!layer.current || !block.current) return;
    const area = layer.current.getBoundingClientRect();
    const box = block.current.getBoundingClientRect();
    const clamped = clampPosition(
      pos,
      { width: box.width + HANDLE_ALLOWANCE_PX, height: box.height },
      area,
    );
    previewSettings({ position: roundPosition(clamped) });
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (!layer.current || !block.current) return;
    // Don't let the player treat this as a click or start its own drag.
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      px: e.clientX,
      py: e.clientY,
      start: currentPosition(layer.current, block.current),
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    const area = layer.current?.getBoundingClientRect();
    if (!d || !area) return;
    move({
      x: d.start.x + (e.clientX - d.px) / area.width,
      y: d.start.y - (e.clientY - d.py) / area.height,
    });
  };

  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    void flushPreview();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    const delta = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    }[e.key];
    if (!delta || !layer.current || !block.current) return;
    // Keep YouTube from seeking or changing volume with these keys.
    e.preventDefault();
    e.stopPropagation();
    const pos = currentPosition(layer.current, block.current);
    move({ x: pos.x + delta[0]!, y: pos.y + delta[1]! });
  };

  return (
    <button
      type="button"
      className="lg-drag"
      aria-label="Move subtitles (drag, or use arrow keys)"
      title="Drag to move · double-click to reset"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        previewSettings({ position: null });
        void flushPreview();
      }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="currentColor"
          d="M9 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm-1.5 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM18 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm-1.5 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM18 19a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"
        />
      </svg>
    </button>
  );
}
