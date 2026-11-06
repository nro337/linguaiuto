/**
 * Turns Wiktionary entries (kaikki.org / wiktextract JSON) into the compact
 * dictionary format. Used by scripts/build-dictionary.ts at build time only.
 * No path aliases here: Node runs this file directly.
 */
import type { DictEntry } from './types.ts';

export interface WiktionaryEntry {
  word?: string;
  pos?: string;
  sounds?: { ipa?: string; tags?: string[] }[];
  senses?: {
    glosses?: string[];
    tags?: string[];
    form_of?: { word?: string }[];
  }[];
}

const SKIP_POS = new Set([
  'name',
  'symbol',
  'character',
  'prefix',
  'suffix',
  'infix',
  'romanization',
]);
const SKIP_TAGS = new Set(['obsolete', 'archaic', 'rare', 'dated', 'historical']);
const MAX_GLOSSES = 2;
const MAX_FORMS = 2;
const MAX_GLOSS_CHARS = 100;

const clip = (s: string) =>
  s.length > MAX_GLOSS_CHARS ? `${s.slice(0, MAX_GLOSS_CHARS - 1).trimEnd()}…` : s;

/** Prefer US pronunciation for English, otherwise the first one listed. */
function pickIpa(sounds: WiktionaryEntry['sounds'] = []): string | undefined {
  const withIpa = sounds.filter((s) => s.ipa);
  const us = withIpa.find((s) => s.tags?.some((t) => t === 'US' || t === 'General-American'));
  return (us ?? withIpa[0])?.ipa;
}

export function compactEntry(entry: WiktionaryEntry): DictEntry | null {
  if (!entry.word || !entry.pos || SKIP_POS.has(entry.pos)) return null;
  const senses = entry.senses ?? [];
  // Prefer current senses; fall back to all if everything is tagged archaic etc.
  const current = senses.filter((s) => !s.tags?.some((t) => SKIP_TAGS.has(t)));
  const usable = current.length ? current : senses;

  const glosses: string[] = [];
  const forms: { l: string; d: string }[] = [];
  for (const sense of usable) {
    const gloss = sense.glosses?.at(-1)?.trim();
    if (!gloss) continue;
    const lemma = sense.form_of?.[0]?.word;
    if (lemma) {
      if (forms.length < MAX_FORMS && !forms.some((f) => f.d === gloss)) {
        forms.push({ l: lemma, d: clip(gloss) });
      }
    } else if (glosses.length < MAX_GLOSSES && !glosses.includes(gloss)) {
      glosses.push(clip(gloss));
    }
  }
  if (!glosses.length && !forms.length) return null;

  const out: DictEntry = { p: entry.pos };
  const ipa = pickIpa(entry.sounds);
  if (ipa) out.i = ipa;
  if (glosses.length) out.g = glosses;
  if (forms.length) out.f = forms;
  return out;
}

/**
 * Collects entries for frequent words, plus the base forms they point to.
 * Feed it every Wiktionary entry, then call `finish()`.
 */
export class DictionaryBuilder {
  private kept = new Map<string, DictEntry[]>();
  /** Entries for words not in the frequency list, in case a kept word is a form of them. */
  private lemmaPool = new Map<string, DictEntry[]>();

  private frequent: Set<string>;

  constructor(frequent: Set<string>) {
    this.frequent = frequent;
  }

  add(entry: WiktionaryEntry) {
    const compact = compactEntry(entry);
    if (!compact) return;
    const key = entry.word!.toLowerCase();
    const target = this.frequent.has(key) ? this.kept : compact.g ? this.lemmaPool : null;
    if (!target) return;
    const list = target.get(key) ?? [];
    list.push(compact);
    target.set(key, list);
  }

  finish(): Record<string, DictEntry[]> {
    for (const entries of [...this.kept.values()]) {
      for (const lemma of entries.flatMap((e) => e.f?.map((f) => f.l.toLowerCase()) ?? [])) {
        if (!this.kept.has(lemma)) {
          const pooled = this.lemmaPool.get(lemma);
          if (pooled) this.kept.set(lemma, pooled);
        }
      }
    }
    return Object.fromEntries([...this.kept].sort(([a], [b]) => (a < b ? -1 : 1)));
  }
}

/** Reads a FrequencyWords list ("word count" per line). */
export function parseFrequencyList(text: string, limit = Infinity): Set<string> {
  const words = new Set<string>();
  for (const line of text.split('\n')) {
    if (words.size >= limit) break;
    const word = line.split(' ')[0]?.trim().toLowerCase();
    if (word) words.add(word);
  }
  return words;
}
