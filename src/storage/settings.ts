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
  /** Pause at the end of every line. */
  autoPause: boolean;
  /** Show the transcript panel next to the video. */
  showTranscript: boolean;
  /** Opacity of the subtitle background, 0 (none) to 1 (solid). */
  backgroundOpacity: number;
  /**
   * Where the subtitles sit in the video, as fractions of the player: `x` is
   * the horizontal center, `y` the distance of the bottom edge from the
   * player's bottom. `null` means the default spot above the controls.
   */
  position: { x: number; y: number } | null;
}

export const FONT_SIZE_RANGE = {
  learning: { min: 14, max: 64 },
  native: { min: 12, max: 48 },
} as const;

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  learningLanguage: 'it',
  nativeLanguage: 'en',
  learning: { visible: true, blurred: false, fontSizePx: 28 },
  native: { visible: true, blurred: false, fontSizePx: 20 },
  pauseOnHover: false,
  autoPause: false,
  showTranscript: true,
  backgroundOpacity: 0.75,
  position: null,
};

export const settingsItem = storage.defineItem<Settings>('sync:settings', {
  fallback: DEFAULT_SETTINGS,
  version: 4,
  migrations: {
    // v2 added pauseOnHover.
    2: (old: Partial<Settings>): Partial<Settings> => ({
      ...old,
      pauseOnHover: old.pauseOnHover ?? false,
    }),
    // v3 added autoPause and showTranscript.
    3: (old: Partial<Settings>): Settings => ({ ...DEFAULT_SETTINGS, ...old }),
    // v4 added backgroundOpacity and position.
    4: (old: Partial<Settings>): Settings => ({ ...DEFAULT_SETTINGS, ...old }),
  },
});
