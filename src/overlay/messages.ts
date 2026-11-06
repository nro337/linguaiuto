import type { LanguageCode } from '@/storage/settings';
import type { LinePending } from '@/adapters/youtube/subtitles';

/** Status text shown in a line while its translation loads, in that line's language. */
const MESSAGES: Record<LanguageCode, (p: LinePending) => string> = {
  en: (p) =>
    p.phase === 'waiting-for-click'
      ? 'Click the video to download the translation model'
      : p.phase === 'downloading'
        ? `Downloading translation model… ${Math.round(p.progress * 100)}%`
        : 'Translating…',
  it: (p) =>
    p.phase === 'waiting-for-click'
      ? 'Fai clic sul video per scaricare il modello di traduzione'
      : p.phase === 'downloading'
        ? `Download del modello di traduzione… ${Math.round(p.progress * 100)}%`
        : 'Traduzione in corso…',
};

export function pendingMessage(language: LanguageCode, pending: LinePending): string {
  return MESSAGES[language](pending);
}
