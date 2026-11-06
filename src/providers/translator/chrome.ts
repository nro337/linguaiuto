/**
 * On-device translation with Chrome's built-in Translator API.
 * Translators are reused per language pair.
 */

const log = (...args: unknown[]) => console.info('[Linguaiuto]', ...args);

export type TranslatorStatus =
  { phase: 'waiting-for-click' } | { phase: 'downloading'; progress: number } | { phase: 'ready' };

type StatusListener = (status: TranslatorStatus) => void;

const translators = new Map<string, Promise<TranslatorInstance | null>>();
/** Status listeners per language pair, so every caller sees download progress. */
const listeners = new Map<string, Set<StatusListener>>();

/** Resolves on the next click or key press on the page (needed before Chrome downloads a model). */
function nextUserActivation(): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      window.removeEventListener('pointerdown', done, true);
      window.removeEventListener('keydown', done, true);
      resolve();
    };
    window.addEventListener('pointerdown', done, true);
    window.addEventListener('keydown', done, true);
  });
}

async function createTranslator(
  sourceLanguage: string,
  targetLanguage: string,
  emit: StatusListener,
): Promise<TranslatorInstance | null> {
  if (typeof Translator === 'undefined') {
    log("Chrome's built-in translator isn't available in this browser (needs Chrome 138+)");
    return null;
  }
  const options = { sourceLanguage, targetLanguage };
  const availability = await Translator.availability(options);
  if (availability === 'unavailable') {
    log(`Chrome can't translate ${sourceLanguage} → ${targetLanguage} on this device`);
    return null;
  }
  if (availability === 'downloadable') {
    // Chrome only starts the one-time model download after a user click or key press.
    log(
      `Chrome needs to download the ${sourceLanguage} → ${targetLanguage} model; it will start on your next click or key press`,
    );
    emit({ phase: 'waiting-for-click' });
    await nextUserActivation();
  }
  log(`Starting the ${sourceLanguage} → ${targetLanguage} translator`);
  if (availability !== 'available') emit({ phase: 'downloading', progress: 0 });
  const translator = await Translator.create({
    ...options,
    monitor(m) {
      m.addEventListener('downloadprogress', (e) => {
        const progress = (e as ProgressEvent).loaded;
        log(`Downloading translation model: ${Math.round(progress * 100)}%`);
        emit({ phase: 'downloading', progress });
      });
    },
  });
  emit({ phase: 'ready' });
  return translator;
}

/**
 * Returns a shared translator for the pair. `onStatus` hears about the model
 * download while the translator is being created.
 */
export async function getTranslator(
  source: string,
  target: string,
  onStatus?: StatusListener,
): Promise<TranslatorInstance | null> {
  const key = `${source}>${target}`;
  let pairListeners = listeners.get(key);
  if (!pairListeners) listeners.set(key, (pairListeners = new Set()));
  if (onStatus) pairListeners.add(onStatus);

  let translator = translators.get(key);
  if (!translator) {
    const emit: StatusListener = (status) => listeners.get(key)?.forEach((l) => l(status));
    translator = createTranslator(source, target, emit).catch((err) => {
      log('Could not create translator', err);
      translators.delete(key);
      return null;
    });
    translators.set(key, translator);
  }
  try {
    return await translator;
  } finally {
    if (onStatus) pairListeners.delete(onStatus);
  }
}
