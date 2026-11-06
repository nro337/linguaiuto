const LOCALES: Record<string, string> = { it: 'it-IT', en: 'en-US' };

/** Speaks `text` with the browser's built-in speech, in a voice for `lang` if one is installed. */
export function speak(text: string, lang: string) {
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LOCALES[lang] ?? lang;
  utterance.rate = 0.9;
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang));
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}
