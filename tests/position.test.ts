import { describe, expect, it } from 'vitest';
import { clampPosition, roundPosition } from '@/core/position';

const area = { width: 1000, height: 500 };
const block = { width: 400, height: 100 };

describe('clampPosition', () => {
  it('leaves positions inside the area alone', () => {
    expect(clampPosition({ x: 0.5, y: 0.2 }, block, area)).toEqual({ x: 0.5, y: 0.2 });
  });

  it('keeps the block inside horizontally', () => {
    expect(clampPosition({ x: 0, y: 0.2 }, block, area).x).toBe(0.2);
    expect(clampPosition({ x: 1, y: 0.2 }, block, area).x).toBe(0.8);
  });

  it('keeps the block inside vertically', () => {
    expect(clampPosition({ x: 0.5, y: -1 }, block, area).y).toBe(0);
    expect(clampPosition({ x: 0.5, y: 1 }, block, area).y).toBe(0.8);
  });

  it('centers a block wider than the area', () => {
    expect(clampPosition({ x: 0.1, y: 0 }, { width: 2000, height: 10 }, area).x).toBe(0.5);
  });
});

describe('roundPosition', () => {
  it('rounds to three decimals', () => {
    expect(roundPosition({ x: 0.123456, y: 0.98765 })).toEqual({ x: 0.123, y: 0.988 });
  });
});
