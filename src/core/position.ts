export interface Box {
  width: number;
  height: number;
}

/** Subtitle position as fractions of the player (see Settings.position). */
export interface Position {
  x: number;
  y: number;
}

/**
 * Keeps a block of size `block` fully inside `area`. `x` is the block's
 * horizontal center, `y` its bottom edge measured up from the area's bottom.
 */
export function clampPosition(pos: Position, block: Box, area: Box): Position {
  if (!area.width || !area.height) return pos;
  const halfW = Math.min(block.width / 2 / area.width, 0.5);
  const h = Math.min(block.height / area.height, 1);
  return {
    x: Math.min(Math.max(pos.x, halfW), 1 - halfW),
    y: Math.min(Math.max(pos.y, 0), 1 - h),
  };
}

/** Rounds to 0.1% so stored values stay short. */
export const roundPosition = ({ x, y }: Position): Position => ({
  x: Math.round(x * 1000) / 1000,
  y: Math.round(y * 1000) / 1000,
});
