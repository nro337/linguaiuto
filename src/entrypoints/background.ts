import type { BackgroundRequest } from '@/messaging';
import { getTranslations, putTranslations } from '@/storage/translationCache';

export default defineBackground(() => {
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
    return false;
  });
});
