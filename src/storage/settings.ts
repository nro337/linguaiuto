export type LanguageCode = 'en' | 'it';

export const LANGUAGES: { code: LanguageCode; name: string }[] = [
  { code: 'it', name: 'Italian' },
  { code: 'en', name: 'English' },
];

export interface LineSettings {
  visible: boolean;
  blurred: boolean;
  fontSizePx: number;
}

export interface Settings {
  enabled: boolean;
  learningLanguage: LanguageCode;
  nativeLanguage: LanguageCode;
  learning: LineSettings;
  native: LineSettings;
  /** Pause the video while a word tooltip is open. */
  pauseOnHover: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  learningLanguage: 'it',
  nativeLanguage: 'en',
  learning: { visible: true, blurred: false, fontSizePx: 28 },
  native: { visible: true, blurred: false, fontSizePx: 20 },
  pauseOnHover: false,
};

export const settingsItem = storage.defineItem<Settings>('sync:settings', {
  fallback: DEFAULT_SETTINGS,
  version: 2,
  migrations: {
    // v2 added pauseOnHover.
    2: (old: Omit<Settings, 'pauseOnHover'> & { pauseOnHover?: boolean }): Settings => ({
      ...old,
      pauseOnHover: old.pauseOnHover ?? false,
    }),
  },
});
