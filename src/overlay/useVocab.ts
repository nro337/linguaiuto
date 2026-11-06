import { useEffect, useState } from 'react';
import { vocabItem, type Vocab } from '@/storage/vocab';

/** Saved words, kept in sync across tabs and the vocabulary page. */
export function useVocab(): Vocab {
  const [vocab, setVocab] = useState<Vocab>({});
  useEffect(() => {
    void vocabItem.getValue().then(setVocab);
    return vocabItem.watch((next) => setVocab(next ?? {}));
  }, []);
  return vocab;
}
