/**
 * Builds a compact dictionary from a Wiktionary JSONL export (kaikki.org),
 * keeping frequent words (from a FrequencyWords list) and their base forms.
 *
 * Usage (streams the export, nothing large is written to disk):
 *   curl -sL https://kaikki.org/dictionary/Italian/kaikki.org-dictionary-Italian.jsonl \
 *     | node scripts/build-dictionary.ts --lang it --freq it_50k.txt --out public/dict/it.json.gz
 *
 * Data: Wiktionary (CC BY-SA 4.0) via kaikki.org; frequency lists from
 * hermitdave/FrequencyWords (CC BY-SA 4.0, based on OpenSubtitles).
 */
import { createInterface } from 'node:readline';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { parseArgs } from 'node:util';
import { DictionaryBuilder, parseFrequencyList } from '../src/dictionary/build.ts';
import { DICT_VERSION, type DictFile } from '../src/dictionary/types.ts';

const { values } = parseArgs({
  options: {
    lang: { type: 'string' },
    freq: { type: 'string' },
    out: { type: 'string' },
    limit: { type: 'string', default: '50000' },
  },
});
if (!values.lang || !values.freq || !values.out) {
  console.error('Usage: --lang <code> --freq <list.txt> --out <file.json.gz> [--limit 50000]');
  process.exit(1);
}

const frequent = parseFrequencyList(readFileSync(values.freq, 'utf8'), Number(values.limit));
const builder = new DictionaryBuilder(frequent);

let lines = 0;
let bad = 0;
for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
  if (!line) continue;
  lines++;
  try {
    builder.add(JSON.parse(line));
  } catch {
    bad++;
  }
  if (lines % 100_000 === 0) process.stderr.write(`\r${lines.toLocaleString()} entries read`);
}

const entries = builder.finish();
const file: DictFile = { version: DICT_VERSION, lang: values.lang, entries };
const gz = gzipSync(JSON.stringify(file), { level: 9 });
mkdirSync(dirname(values.out), { recursive: true });
writeFileSync(values.out, gz);
const covered = [...frequent].filter((w) => w in entries).length;
console.error(
  `\n${lines.toLocaleString()} entries read (${bad} unreadable). ` +
    `${Object.keys(entries).length.toLocaleString()} words kept; ` +
    `${covered.toLocaleString()} of ${frequent.size.toLocaleString()} frequent words covered. ` +
    `${(gz.length / 1024 / 1024).toFixed(1)} MB gzipped → ${values.out}`,
);
