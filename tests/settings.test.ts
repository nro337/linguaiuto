import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { DEFAULT_SETTINGS, settingsItem } from '@/storage/settings';

describe('settingsItem', () => {
  beforeEach(() => fakeBrowser.reset());

  it('falls back to defaults (Italian learning, English native)', async () => {
    expect(await settingsItem.getValue()).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.learningLanguage).toBe('it');
  });

  it('persists changes', async () => {
    const next = { ...DEFAULT_SETTINGS, native: { ...DEFAULT_SETTINGS.native, blurred: true } };
    await settingsItem.setValue(next);
    expect((await settingsItem.getValue()).native.blurred).toBe(true);
  });
});
