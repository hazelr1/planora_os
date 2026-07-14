import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    // Without this, Vite's dep scanner auto-crawls every *.html file under
    // the project root to discover dependencies — including dist/ and
    // dist-standalone/, which are build *output*, not source. Those bundles
    // inline framer-motion's optional `require("@emotion/is-prop-valid")`
    // call (deliberately obfuscated so real bundlers skip it — see
    // node_modules/framer-motion/dist/es/render/dom/utils/filter-props.mjs),
    // but the scanner treats it as a real import to resolve and fails since
    // that optional package isn't installed. Restricting the scan to the
    // actual entry avoids ever touching the build output.
    entries: ['index.html'],
  },
});
