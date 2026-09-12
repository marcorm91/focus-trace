import { defineContentScript } from '#imports';
import { installElementInternalsMainWorldBridge } from '../lib/extension/element-internals-main-world';

export default defineContentScript({
  registration: 'runtime',
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    installElementInternalsMainWorldBridge();
  },
});
