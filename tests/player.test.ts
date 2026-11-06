import { describe, expect, it } from 'vitest';
import { getVideoId } from '@/adapters/youtube/player';

describe('getVideoId', () => {
  it('reads the id from a watch URL', () => {
    expect(getVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10')).toBe('dQw4w9WgXcQ');
  });

  it('reads the id from a shorts URL', () => {
    expect(getVideoId('https://www.youtube.com/shorts/abcdefghijk')).toBe('abcdefghijk');
  });

  it('returns null on non-video pages', () => {
    expect(getVideoId('https://www.youtube.com/feed/subscriptions')).toBeNull();
  });
});
