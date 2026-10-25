import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { localAgentProxy, platformRequestProxy } from "@dev-mainsequence/command-center-sdk/vite";

// The loopback Hunch API and the local Tau runtime the dev server forwards to. Both default to
// the ports `scripts/dev_stack.sh` in the hunchapi repository uses.
const apiOrigin = process.env.HUNCH_LOCAL_API_ORIGIN ?? "http://127.0.0.1:8601";
const tauOrigin = process.env.HUNCH_LOCAL_TAU_ORIGIN ?? "http://127.0.0.1:8602";

export default defineConfig({
  plugins: [
    react(),
    // `/tau/...` → the local Tau runtime; the plugin strips the mount path and forwards only the
    // chat's routes, from this machine, to this machine.
    localAgentProxy({ path: "/tau", target: tauOrigin }),
    // `/__mainsequence__/api/...` → the platform, as the developer signed in with
    // `npx command-center-sdk login` (or `MAINSEQUENCE_ACCESS_TOKEN`). Development only.
    platformRequestProxy(),
  ],
  server: {
    host: "127.0.0.1",
    port: 5601,
    strictPort: true,
    proxy: {
      "/v1": { target: apiOrigin, changeOrigin: false },
      "/health": { target: apiOrigin, changeOrigin: false },
      "/healthz": { target: apiOrigin, changeOrigin: false },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
