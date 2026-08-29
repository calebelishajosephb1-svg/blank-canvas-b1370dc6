// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// IALE ships as a purely static single-page app: every piece of state (BYOK key,
// saved machines, progress, mistake stats) lives in the browser, and the tutor
// calls the student's own provider directly. There is no per-request server data
// dependency anywhere, so SPA mode + prerender of the shell is the honest target
// and no server runtime (nor Netlify Function) is needed at runtime: the static
// assets in .output/public are the whole deployable.
export default defineConfig({
  tanstackStart: {
    spa: { enabled: true, prerender: { crawlLinks: false } },
    prerender: { enabled: true, crawlLinks: true },
  },
});
