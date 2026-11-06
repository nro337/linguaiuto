# Linguaiuto

[![CI](https://github.com/nro337/linguaiuto/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/nro337/linguaiuto/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/package-json/v/nro337/linguaiuto?color=blue)](package.json)
[![License: MIT with attribution](https://img.shields.io/badge/license-MIT%20%2B%20attribution-green)](LICENSE)
[![Chrome extension](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![WXT](https://img.shields.io/badge/built%20with-WXT-67D55E)](https://wxt.dev/)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](#contributing)

Linguaiuto is an open source language learning tool that helps you learn a language from the videos and media you already watch. It's a Chrome extension that puts two subtitle lines over YouTube videos: the language you're learning on top, your own language below. Hover any word to see its translation, pronunciation and grammar, save it to your vocabulary, and export it to Anki.

Everything runs on your device. Translation uses Chrome's built-in Translator API and the dictionaries ship with the extension, so nothing you watch or look up is sent to a third-party service.

## Supported languages

| Language | Learn it | Use as your native language | Offline dictionary |
| -------- | :------: | :-------------------------: | :----------------: |
| Italian  |    ✅    |             ✅              |         ✅         |
| English  |    ✅    |             ✅              |         ✅         |

Both directions work: English speakers learning Italian, and Italian speakers learning English. More languages are planned. See [Adding a language](#adding-a-language) if you'd like to help.

**Supported sites:** YouTube. Other video sites are planned.

## Using Linguaiuto

### Requirements

- Desktop Google Chrome 138 or later (needed for the built-in Translator API)
- A YouTube video with subtitles (human-made or auto-generated) in at least one of your two languages

### Install

Linguaiuto isn't in the Chrome Web Store yet, so for now you install it from source:

1. Install [Node.js](https://nodejs.org/) 22 or later.
2. Download the code and build it:
   ```sh
   git clone https://github.com/nro337/linguaiuto.git
   cd linguaiuto
   npm install
   npm run build
   ```
3. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and choose the `.output/chrome-mv3` folder.

### Getting started

1. Click the Linguaiuto icon in Chrome's toolbar and pick your **learning language** and **native language**.
2. Open any YouTube video. The two subtitle lines appear over the player.
3. The first time you use a language pair, Chrome downloads its translation model. The download starts on your next click or key press on the page. Until it finishes, Linguaiuto uses YouTube's own auto-translated subtitles.

### Features

- **Dual subtitles.** The video's own subtitles are used for each language when they exist; otherwise the missing line is translated on your device. Auto-generated fragments are merged into full sentences first.
- **Blur a line** to test yourself. Hovering a word unblurs just that word.
- **Word tooltip.** Hover a word to see its translation, IPA pronunciation, a speak button, part of speech, and its base form (for example _andavo_ → _andare_). Hovering a word in the native line shows its translation in the language you're learning.
- **Vocabulary.** Click the bookmark in the tooltip to save a word with the sentence it came from. Saved words are underlined in later subtitles.
- **Vocabulary page.** Open it from the popup to search and remove saved words, jump back to the moment in the video, and export to **Anki** (File → Import) or **CSV**.
- **Line controls.** Go to the previous or next line or replay the current one, and optionally pause at the end of each line or while a tooltip is open.
- **Transcript panel** beside the video. It follows playback, and you can click any line to jump to it.
- **Appearance.** Set the text size for each line and the background opacity, and drag the subtitles anywhere in the video.

You can change settings from the toolbar popup or from the **Aa** button in YouTube's player controls.

### Keyboard shortcuts

On macOS, use Option in place of Alt.

| Shortcut                      | Action                                    |
| ----------------------------- | ----------------------------------------- |
| `Alt+1` / `Alt+2`             | Show or hide the learning / native line   |
| `Alt+Shift+1` / `Alt+Shift+2` | Blur or unblur the learning / native line |
| `Shift+←` / `Shift+→`         | Previous / next line                      |
| `Shift+↓`                     | Replay the current line                   |

## Contributing

Contributions are welcome: bug reports, new languages, new video sites and code. Please open an issue to discuss larger changes before starting on them.

### Tech stack

- [WXT](https://wxt.dev/) (Vite-based, Manifest V3) with TypeScript in strict mode
- React 19 for the popup, the vocabulary page and the overlay (rendered inside Shadow DOM)
- `chrome.storage.sync` for settings and IndexedDB (via `idb`) for caches, dictionaries and vocabulary
- Vitest for tests, ESLint and Prettier for linting and formatting

[PLAN.md](PLAN.md) has the full design, including how subtitles are fetched from YouTube without user tokens.

### Development setup

```sh
npm install
npm run dev      # launches Chrome with the extension loaded and hot reload
npm run build    # production build in .output/chrome-mv3
npm run zip      # packaged zip for distribution
```

### Project layout

```
src/
  adapters/youtube/   everything YouTube-specific: caption tracks, player, playback
  core/               cue parsing, merging, timing, tokenizing (site-independent)
  dictionary/         offline dictionary build, storage and lookup
  entrypoints/        background worker, content scripts, popup, vocabulary page
  export/             Anki and CSV export
  overlay/            subtitle overlay, tooltip, transcript, menu, shortcuts
  providers/          translator and pronunciation providers
  storage/            settings, translation cache, vocabulary
scripts/              dictionary build script
public/dict/          bundled offline dictionaries
tests/                unit tests
```

### Checks

CI runs all of these on every pull request, so please run them before you push:

```sh
npm run lint
npm run format:check   # or `npm run format` to fix
npm run typecheck
npm test
npm run build
```

### Pull requests

1. Fork the repository and create a branch from `main`.
2. Keep changes focused and add tests for new logic in `tests/`.
3. Make sure the checks above pass.
4. Open a pull request describing what changed and how you tested it, ideally on a real YouTube video.

Two project rules to keep in mind:

- **On-device only.** Don't add calls to online translation or dictionary services.
- **Performance first.** The overlay must never cause video stutter. Do work ahead of time and avoid layout reads during playback.

### Adding a language

1. Add the language code and name to `LanguageCode` and `LANGUAGES` in [src/storage/settings.ts](src/storage/settings.ts).
2. Build an offline dictionary for it (see below) into `public/dict/<code>.json.gz`.
3. Check whether word splitting needs special handling in [src/core/tokenize.ts](src/core/tokenize.ts). Italian, for example, splits elisions like `l'acqua` into two words.
4. Confirm Chrome's Translator API supports the language pairs you need.

### Rebuilding dictionaries

The word tooltip uses compact offline dictionaries in `public/dict/` (about 40,000 common words per language plus their base forms). They're built from Wiktionary and only need rebuilding to update the data or add a language:

```sh
curl -sLO https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/it/it_50k.txt
curl -sL https://kaikki.org/dictionary/Italian/kaikki.org-dictionary-Italian.jsonl \
  | node scripts/build-dictionary.ts --lang it --freq it_50k.txt --out public/dict/it.json.gz
```

Use `English` / `en` for the English dictionary. The export is streamed, so nothing large is saved to disk.

## License

Linguaiuto's source code is released under the [MIT License with an attribution requirement](LICENSE). You can use, modify and sell it freely, just as with the standard MIT License, with one extra condition: if you use Linguaiuto or a substantial part of it in another app, product, website or service, free or paid, you must show a visible credit in its interface (for example on an About, credits or settings page, or in a footer) with the name "Linguaiuto" and a link to this repository:

```
Built with Linguaiuto (https://github.com/nro337/linguaiuto)
```

The bundled dictionary data in `public/dict/` comes from third-party sources and keeps its original license (see below).

### Data sources

- Dictionary data from [Wiktionary](https://www.wiktionary.org/), extracted by [kaikki.org / wiktextract](https://kaikki.org/), licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- Word frequency lists from [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) (based on OpenSubtitles), licensed CC BY-SA 4.0.
