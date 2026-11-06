import { useEffect, useMemo, useState } from 'react';
import { useVocab } from '@/overlay/useVocab';
import { LANGUAGES, settingsItem } from '@/storage/settings';
import { removeWord, type VocabEntry } from '@/storage/vocab';
import { highlightWord, sourceUrl, toAnki, toCsv } from '@/export/vocabExport';

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const today = () => new Date().toISOString().slice(0, 10);

export function App() {
  const vocab = useVocab();
  const [lang, setLang] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // Start on the language being learned.
  useEffect(() => {
    void settingsItem.getValue().then((s) => setLang((current) => current ?? s.learningLanguage));
  }, []);

  const all = useMemo(() => Object.values(vocab).sort((a, b) => b.savedAt - a.savedAt), [vocab]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of all) c[e.lang] = (c[e.lang] ?? 0) + 1;
    return c;
  }, [all]);

  const q = query.trim().toLowerCase();
  const shown = all.filter(
    (e: VocabEntry) =>
      e.lang === lang &&
      (!q ||
        e.word.toLowerCase().includes(q) ||
        e.translation?.toLowerCase().includes(q) ||
        e.context.toLowerCase().includes(q)),
  );
  const langName = LANGUAGES.find((l) => l.code === lang)?.name ?? lang ?? '';

  return (
    <main>
      <header>
        <h1>Vocabulary</h1>
        <nav aria-label="Language">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              className={l.code === lang ? 'tab active' : 'tab'}
              aria-pressed={l.code === lang}
              onClick={() => setLang(l.code)}
            >
              {l.name} <span className="count">{counts[l.code] ?? 0}</span>
            </button>
          ))}
        </nav>
      </header>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search words, meanings or sentences"
          aria-label="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          disabled={!shown.length}
          title="Import in Anki with File → Import"
          onClick={() =>
            download(`linguaiuto-${lang}-${today()}.txt`, toAnki(shown), 'text/plain;charset=utf-8')
          }
        >
          Export for Anki
        </button>
        <button
          type="button"
          disabled={!shown.length}
          onClick={() =>
            download(`linguaiuto-${lang}-${today()}.csv`, toCsv(shown), 'text/csv;charset=utf-8')
          }
        >
          Export CSV
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="empty">
          {q
            ? 'No saved words match your search.'
            : `No ${langName} words saved yet. Hover a word in the subtitles and click the bookmark to save it.`}
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Word</th>
              <th>Meaning</th>
              <th>Seen in</th>
              <th>
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((e) => (
              <tr key={`${e.lang}:${e.word}`}>
                <td>
                  <div className="word" lang={e.lang}>
                    {e.word}
                  </div>
                  {e.ipa && <div className="muted">{e.ipa}</div>}
                </td>
                <td>
                  {e.translation && <div className="translation">{e.translation}</div>}
                  {(e.pos || e.definition) && (
                    <div className="muted">
                      {e.pos && <em>{e.pos}</em>} {e.definition}
                    </div>
                  )}
                </td>
                <td>
                  <div
                    lang={e.lang}
                    // highlightWord escapes the sentence; it only adds <b> around the word.
                    dangerouslySetInnerHTML={{ __html: highlightWord(e.context, e.word) }}
                  />
                  {e.contextTranslation && <div className="muted">{e.contextTranslation}</div>}
                  {e.videoId && (
                    <a href={sourceUrl(e)} target="_blank" rel="noreferrer">
                      Watch at {Math.floor(e.timeMs / 60000)}:
                      {String(Math.floor(e.timeMs / 1000) % 60).padStart(2, '0')}
                    </a>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className="remove"
                    aria-label={`Remove ${e.word}`}
                    onClick={() => void removeWord(e.lang, e.word)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
