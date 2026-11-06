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
