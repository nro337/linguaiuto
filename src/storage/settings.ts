export type LanguageCode = 'en' | 'it';

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
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  learningLanguage: 'it',
  nativeLanguage: 'en',
  learning: { visible: true, blurred: false, fontSizePx: 28 },
  native: { visible: true, blurred: false, fontSizePx: 20 },
};

export const settingsItem = storage.defineItem<Settings>('sync:settings', {
  fallback: DEFAULT_SETTINGS,
});
