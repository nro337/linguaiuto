# linguaiuto

Multimedia Language Learning Tooling: dual-language, interactive subtitles on YouTube. See [PLAN.md](PLAN.md).

## Development

```sh
npm install
npm run dev      # launches Chrome with the extension loaded and hot reload
npm run build    # production build in .output/chrome-mv3
```

To load a build manually: `chrome://extensions` → enable Developer mode → **Load unpacked** → choose `.output/chrome-mv3`.

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run format:check`.

## Dictionaries

The word tooltip uses compact offline dictionaries in `public/dict/` (about 40,000 common words per language plus their base forms). They're built from Wiktionary and only need rebuilding to update the data:

```sh
curl -sLO https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/it/it_50k.txt
curl -sL https://kaikki.org/dictionary/Italian/kaikki.org-dictionary-Italian.jsonl \
  | node scripts/build-dictionary.ts --lang it --freq it_50k.txt --out public/dict/it.json.gz
```

Use `English` / `en` for the English dictionary. The export is streamed, so nothing large is saved to disk.

## Data sources

- Dictionary data from [Wiktionary](https://www.wiktionary.org/), extracted by [kaikki.org / wiktextract](https://kaikki.org/), licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- Word frequency lists from [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) (based on OpenSubtitles), licensed CC BY-SA 4.0.
