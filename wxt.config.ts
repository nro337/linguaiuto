import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Linguaiuto',
    description: 'Dual-language interactive subtitles for language learning on YouTube',
    permissions: ['storage'],
    host_permissions: ['*://*.youtube.com/*'],
  },
  webExt: {
    startUrls: ['https://www.youtube.com/'],
  },
});
