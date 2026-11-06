import { createStore } from '@/core/store';
import { settingsItem, type Settings } from '@/storage/settings';

/**
 * Unsaved settings changes from sliders and dragging, shown immediately while
 * the real save waits for a pause. chrome.storage.sync limits how often it can
 * be written, so a slider can't save on every step.
 */
export const settingsPreview = createStore<Partial<Settings>>({});

const SAVE_DELAY_MS = 400;
let timer: ReturnType<typeof setTimeout> | undefined;

export function previewSettings(patch: Partial<Settings>) {
  settingsPreview.set({ ...settingsPreview.get(), ...patch });
  clearTimeout(timer);
  timer = setTimeout(() => void flushPreview(), SAVE_DELAY_MS);
}

export async function flushPreview() {
  clearTimeout(timer);
  const pending = settingsPreview.get();
  if (!Object.keys(pending).length) return;
  const stored = await settingsItem.getValue();
  await settingsItem.setValue({ ...stored, ...pending });
  // Only clear what was saved; newer changes may have arrived meanwhile.
  const now = settingsPreview.get();
  const rest = Object.fromEntries(
    Object.entries(now).filter(([k, v]) => pending[k as keyof Settings] !== v),
  );
  settingsPreview.set(rest);
}
