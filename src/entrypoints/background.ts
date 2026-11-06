import type { BackgroundRequest } from '@/messaging';
import { getTranslations, putTranslations } from '@/storage/translationCache';
import { ensureDictionary, lookupWord } from '@/dictionary/store';
import { LANGUAGES } from '@/storage/settings';

export default defineBackground(() => {
  // Import the bundled dictionaries up front, so the first word you hover is instant.
  browser.runtime.onInstalled.addListener(() => {
    for (const { code } of LANGUAGES) void ensureDictionary(code);
  });

  browser.runtime.onMessage.addListener((message: BackgroundRequest, _sender, sendResponse) => {
    if (message.type === 'translations:get') {
      getTranslations(message.pair, message.texts).then(sendResponse, () => sendResponse(null));
      return true; // Respond asynchronously.
    }
    if (message.type === 'translations:put') {
      putTranslations(message.pair, message.entries).then(
        () => sendResponse(true),
        () => sendResponse(false),
      );
      return true;
    }
    if (message.type === 'dictionary:lookup') {
      lookupWord(message.lang, message.keys).then(sendResponse, () => sendResponse(null));
      return true;
    }
    if (message.type === 'open-vocabulary') {
      void browser.tabs.create({ url: browser.runtime.getURL('/vocab.html') });
      return false;
    }
    return false;
  });
});
