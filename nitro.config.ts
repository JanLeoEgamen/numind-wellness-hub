// Nitro config: add the project-root `server/` directory as a source of API
// routes (the Lovable preset points Nitro's srcDir at `.output/server`, so by
// default it never scans our `server/routes`).
//
// We keep the preset's srcDir/scanDirs intact and simply append the project
// root to `scanDirs` so Nitro finds `server/routes/api/paypal/webhook.ts` and
// exposes it at /api/paypal/webhook.
import { defineNitroConfig } from "nitro/config";

export default defineNitroConfig({
  scanDirs: [import.meta.dirname],
  routesDir: "server/routes",
  apiDir: "server/api",
});
