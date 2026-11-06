import type { VocabEntry } from '@/storage/vocab';

export const sourceUrl = (e: VocabEntry) =>
  `https://www.youtube.com/watch?v=${encodeURIComponent(e.videoId)}&t=${Math.floor(e.timeMs / 1000)}s`;

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The context sentence as HTML with the saved word in bold. */
export function highlightWord(context: string, word: string): string {
  const html = escapeHtml(context);
  const pattern = new RegExp(
    `(^|[^\\p{L}])(${escapeRegExp(escapeHtml(word))})(?=[^\\p{L}]|$)`,
    'iu',
  );
  return html.replace(pattern, '$1<b>$2</b>');
}

/** Tabs and newlines would break Anki's tab-separated rows. */
const field = (s: string | undefined) => (s ?? '').replace(/[\t\r\n]+/g, ' ').trim();

export const ANKI_COLUMNS = [
  'Word',
  'Meaning',
  'Pronunciation',
  'Details',
  'Context',
  'Context translation',
  'Source',
] as const;

/**
 * Anki import file (File → Import): tab-separated with Anki's header lines,
 * HTML fields, and a tag per language.
 */
export function toAnki(entries: VocabEntry[]): string {
  const header = [
    '#separator:tab',
    '#html:true',
    `#columns:${ANKI_COLUMNS.join('\t')}\tTags`,
    `#tags column:${ANKI_COLUMNS.length + 1}`,
  ];
  const rows = entries.map((e) => {
    const details = [e.pos, e.lemma && e.lemma !== e.word ? `from ${e.lemma}` : '', e.definition]
      .filter(Boolean)
      .join(' · ');
    return [
      escapeHtml(field(e.word)),
      escapeHtml(field(e.translation)),
      escapeHtml(field(e.ipa)),
      escapeHtml(field(details)),
      highlightWord(field(e.context), field(e.word)),
      escapeHtml(field(e.contextTranslation)),
      `<a href="${escapeHtml(sourceUrl(e))}">YouTube</a>`,
      `linguaiuto linguaiuto::${e.lang}`,
    ].join('\t');
  });
  return [...header, ...rows].join('\n') + '\n';
}

const csvCell = (s: string | number | undefined) => {
  const value = String(s ?? '');
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
};

export function toCsv(entries: VocabEntry[]): string {
  const header = [
    'word',
    'language',
    'translation',
    'ipa',
    'part_of_speech',
    'base_form',
    'definition',
    'context',
    'context_translation',
    'source',
    'saved_at',
  ];
  const rows = entries.map((e) =>
    [
      e.word,
      e.lang,
      e.translation,
      e.ipa,
      e.pos,
      e.lemma,
      e.definition,
      e.context,
      e.contextTranslation,
      sourceUrl(e),
      new Date(e.savedAt).toISOString(),
    ]
      .map(csvCell)
      .join(','),
  );
  return [header.join(','), ...rows].join('\r\n') + '\r\n';
}
