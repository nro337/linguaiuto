# Linguaiuto — Project Plan

A Chrome extension (Manifest V3) that adds dual-language, interactive subtitles on top of YouTube videos for language learners. Other video sites come later through site adapters.

## Decisions (confirmed)

- **First language pair:** English ↔ Italian (both directions supported).
- **No AI features yet.** Gemini Nano / Prompt API is deferred.
- **On-device only.** No third-party online translation services. Translation uses Chrome's built-in Translator API. YouTube's own subtitle auto-translate (`tlang`) is the fallback because it comes from the same YouTube request, not an outside service.
- **UI framework:** React for the popup, options and overlay (rendered inside Shadow DOM).
- **Vocab saving / Anki export:** Phase 4.
- **No user-supplied tokens.** Subtitles must "just work". The token YouTube requires (`pot`) is created by YouTube's own player, and the extension reuses the player's request (details below).

## Goals

1. Two subtitle lines over the video:
   - **Top, larger:** the language being learned.
   - **Bottom, smaller:** the user's native language.
2. Each line can be toggled on/off and **blurred** independently.
3. Hovering a word unblurs only that word and shows a tooltip with translation, pronunciation (audio + IPA), part of speech, base form and key details.
4. Performance comes first: never cause video jank, and do translation work ahead of time instead of on display.

## Tech stack

| Area                | Choice                                                    |
| ------------------- | --------------------------------------------------------- |
| Extension framework | WXT (Vite, MV3)                                           |
| Language            | TypeScript (strict)                                       |
| UI                  | React 19 (popup, options, overlay inside Shadow DOM)      |
| Settings            | `chrome.storage.sync`                                     |
| Cache               | IndexedDB via `idb` (subtitles, translations, dictionary) |
| Tests               | Vitest (unit), Playwright (E2E with the extension loaded) |
| Lint/format         | ESLint (flat config) + Prettier                           |
| CI                  | GitHub Actions: lint, typecheck, test, build              |

## Data sources (on-device / free)

| Need                           | Source                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Line translation               | Chrome **Translator API** (`Translator.create`). Fallback: YouTube `tlang` auto-translated track                   |
| Language check                 | Chrome **Language Detector API**                                                                                   |
| Word segmentation              | `Intl.Segmenter` (word granularity)                                                                                |
| Word translation               | Translator API (cached)                                                                                            |
| Pronunciation audio            | Web Speech API `speechSynthesis`                                                                                   |
| IPA, part of speech, base form | A bundled offline dictionary for IT/EN built from Wiktionary data (kaikki.org), loaded into IndexedDB on first run |

All providers sit behind small interfaces (`TranslationProvider`, `DictionaryProvider`, `PronunciationProvider`) so more can be added later.

## Architecture

```
YouTube page
 ├─ main-world script   reads caption track list from the player,
 │                      catches the player's own timedtext request (with pot)
 ├─ content script      overlay (React in Shadow DOM inside #movie_player),
 │                      cue timing, hover/tooltip
 └─ service worker      cache coordination, settings, messaging
Offscreen document      only if Translator API isn't available to the content script
Popup / Options         languages, toggles, blur, font sizes
IndexedDB               cues, translations, dictionary
```

### Getting subtitles without user tokens

YouTube's subtitle (`timedtext`) requests now need a proof-of-origin token (`pot`) that the player generates. The extension never asks for or makes up this token:

1. A main-world script wraps `fetch`/`XMLHttpRequest` and records any `timedtext` URL the player requests (it already contains `pot`).
2. With that URL, the extension swaps `lang`/`tlang`/`fmt=json3` to fetch the tracks it needs.
3. If the player hasn't requested subtitles yet, the extension briefly turns captions on through the player API, captures the URL, then restores the user's caption state. The user only ever sees the extension's own overlay.
4. Spike this first in Phase 1. Everything depends on it.

Findings from the Phase 1 spike:

- The player requests subtitles via XHR, already with `fmt=json3`. Without `pot` the response is empty.
- The player can report a caption track as selected without having downloaded it, so "is it on?" checks are unreliable. Calling the player's `toggleSubtitles()` does trigger the request. The extension toggles and then restores the user's on/off choice.
- Pre-roll ads play in the same player and make subtitle requests for the ad's video. The extension ignores requests for other video IDs, doesn't toggle during ads (`.ad-showing`), and doesn't count ad time towards its timeout.
- Not every request carries `pot`. Requests without one are still reused as-is.

### Flow on video load

1. Detect in-site navigation (`yt-navigate-finish`) and read the video ID.
2. Read caption tracks from the player response. Prefer human-made subtitles over auto-generated ones in the learning language.
3. Fetch json3 and parse into `Cue { start, end, text, tokens[] }`.
4. Translate the first ~30 s right away, then the rest in batches when idle (`requestIdleCallback`). Cache by `videoId + langPair + cueIndex`.
5. Hide YouTube's own caption rendering while the overlay is on.

### Rendering performance

- Cue timing via `requestVideoFrameCallback` (fallback `timeupdate`) plus a binary search over the cues. Only update React state when the active cue changes.
- Each word is a `<span>`, built once per cue change and memoized.
- Blur is **pure CSS**: `filter: blur()` on the line and `:hover` to unblur a word, with no JS running.
- Tooltip opens after hovering ~120 ms. One tooltip element is reused, lookups are cached, and it renders the quick part first.
- `contain: layout paint` on the overlay root. No forced layout reads during playback.
- `ResizeObserver` on the player for fullscreen, theater mode and mini-player.

## Phases

### Phase 0 — Setup ✅

- WXT + React + TypeScript project
- ESLint, Prettier, Vitest, GitHub Actions CI
- Empty overlay drawn inside the YouTube player (Shadow DOM) to show the wiring works
- Placeholder popup

### Phase 1 — Subtitles on screen (built; needs checking in a normal Chrome profile)

- Spike: catch the player's timedtext request (pot), fetch json3
- Cue parser + binary-search scheduler (unit tested)
- Overlay synced to the video. Handles in-site navigation, fullscreen and resizing
- Learning/native language selection (EN/IT)

### Phase 2 — Dual lines + controls

- Native line via Translator API; fallback to YouTube `tlang`
- Translate-ahead pipeline + IndexedDB cache
- Per-line show/hide + blur; hover-to-unblur words
- Keyboard shortcuts (`Alt+1`, `Alt+2`, `Alt+B`)
- Small settings menu on the player + popup

### Phase 3 — Word tooltip

- Tokenize lines with `Intl.Segmenter`
- Tooltip: word translation, IPA, part of speech, base form, speak button
- Offline IT/EN dictionary pack (Wiktionary/kaikki) in IndexedDB
- Optional pause-on-hover

### Phase 4 — Learning tools (later)

- Save words to a vocab list, Anki CSV export
- Previous/next/repeat line, auto-pause at the end of each line
- Transcript side panel with click-to-jump
- Site adapters for other video platforms
- AI features (Gemini Nano) for explanations in context

## Settings

Learning language, native language, show/hide each line, blur each line, font size for each line, overlay position, tooltip delay, pause on hover.

## Risks

| Risk                                         | How to handle it                                                             |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| `pot` token required for timedtext           | Reuse the player's own request (see above). Spike first                      |
| Translator model download needs a user click | Prompt from the popup or player menu click. Use `tlang` fallback meanwhile   |
| Translating one line at a time loses context | Translate a few lines together and split them back apart                     |
| YouTube page changes                         | Keep everything YouTube-specific in `adapters/youtube`, plus E2E smoke tests |

## Folder layout

```
src/
  entrypoints/        background.ts, youtube.content/, main-world.ts, popup/, options/
  adapters/youtube/   captions.ts, player.ts, navigation.ts
  core/               cues.ts, scheduler.ts, tokenizer.ts
  providers/          translator/, dictionary/, pronunciation/
  overlay/            Overlay.tsx, Tooltip.tsx, styles.css
  storage/            settings.ts, cache.ts
tests/
```
