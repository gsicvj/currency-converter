import { createHash } from "node:crypto";
import type { Plugin } from "vite";
import { generateSW } from "workbox-build";

async function generateServiceWorker(outputDirectory: string, buildId: string) {
  const { count, size, warnings } = await generateSW({
    globDirectory: outputDirectory,
    globPatterns: [
      "assets/*.{js,css}",
      // Other Open Sans subsets are cached at runtime when a page needs them.
      "assets/open-sans-latin*-wght-normal-*.woff2",
    ],
    // The server-rendered page is the app shell. Precaching it at install
    // lets the app open offline and instantly, even on the first relaunch.
    additionalManifestEntries: [{ url: "/", revision: buildId }],
    navigateFallback: "/",
    navigateFallbackDenylist: [/^\/api\//],
    swDest: `${outputDirectory}/sw.js`,
    dontCacheBustURLsMatching: /^assets\//,
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        // Rates stay with the React Query cache so "Updated" stays honest.
        urlPattern: ({ url }) => url.pathname === "/api/currencies",
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "currencies-cache",
          expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 7 },
          cacheableResponse: { statuses: [200] },
        },
      },
      {
        urlPattern: ({ request }) =>
          request.destination === "font" || request.destination === "image",
        handler: "CacheFirst",
        options: {
          cacheName: "static-assets-cache",
          expiration: { maxEntries: 30 },
          cacheableResponse: { statuses: [200] },
        },
      },
    ],
  });

  warnings.forEach((warning) => console.warn(warning));
  console.log(
    `Service worker precaches ${count} files (${(size / 1024).toFixed(1)} KiB)`,
  );
}

// Generates the production service worker after the client build, before
// Nitro bundles the client output as its public assets. Files from public/
// are not in the client output yet, so icons are cached at runtime.
export function serviceWorkerPlugin(): Plugin {
  return {
    name: "currency-app:service-worker",
    apply: "build",
    applyToEnvironment: (environment) => environment.name === "client",
    async writeBundle(options, bundle) {
      if (!options.dir) return;

      // Hashed asset names change with each build, and so does the shell.
      const buildId = createHash("sha256")
        .update(Object.keys(bundle).sort().join("\n"))
        .digest("hex")
        .slice(0, 16);
      await generateServiceWorker(options.dir, buildId);
    },
  };
}
