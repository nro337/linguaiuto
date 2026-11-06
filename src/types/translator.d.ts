/** Chrome's built-in Translator API (Chrome 138+). Not yet in TypeScript's DOM types. */
type TranslatorAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

interface TranslatorOptions {
  sourceLanguage: string;
  targetLanguage: string;
}

interface TranslatorCreateOptions extends TranslatorOptions {
  signal?: AbortSignal;
  monitor?: (monitor: EventTarget) => void;
}

interface TranslatorInstance {
  translate(input: string, options?: { signal?: AbortSignal }): Promise<string>;
  destroy(): void;
}

declare const Translator:
  | {
      availability(options: TranslatorOptions): Promise<TranslatorAvailability>;
      create(options: TranslatorCreateOptions): Promise<TranslatorInstance>;
    }
  | undefined;
