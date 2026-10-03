/// <reference types="vite/client" />
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import appCss from "../styles/globals.css?url";
import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import { NotFound } from "~/components/NotFound";
import {
  createQueryPersister,
  QUERY_CACHE_MAX_AGE,
  shouldPersistQuery,
} from "~/utils/queryPersistence";
import { registerServiceWorker } from "~/utils/serviceWorker";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60, // 1 hour
      gcTime: QUERY_CACHE_MAX_AGE,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

const persistOptions = {
  persister: createQueryPersister(),
  maxAge: QUERY_CACHE_MAX_AGE,
  dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
};

// Umami loads only when both env vars are set, so forks send no analytics
// unless they point the app at their own Umami instance. Optional domains
// stop the script from recording on hosts other than the deployer's own.
function getAnalyticsScripts() {
  const src = import.meta.env.VITE_UMAMI_SCRIPT_URL;
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;
  const domains = import.meta.env.VITE_UMAMI_DOMAINS;
  if (!src || !websiteId) return [];
  return [
    {
      defer: true,
      src,
      "data-website-id": websiteId,
      ...(domains ? { "data-domains": domains } : {}),
    },
  ];
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        name: "description",
        content: "A Progressive Web App for currency conversion",
      },
      {
        name: "theme-color",
        content: "#0a1315",
      },
      { title: "Currency Converter PWA" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        href: "/currency-favicon.svg",
        type: "image/svg+xml",
      },
      {
        rel: "apple-touch-icon",
        href: "/currency-favicon-180.png",
      },
      {
        rel: "manifest",
        href: "/manifest.webmanifest",
      },
    ],
    scripts: getAnalyticsScripts(),
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  component: RootDocument,
});

function RootDocument() {
  useEffect(registerServiceWorker, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
    >
      <html>
        <head>
          <HeadContent />
        </head>
        <body>
          <div className="h-dvh bg-canvas bg-[radial-gradient(120%_50%_at_0%_0%,--alpha(var(--color-teal)/14%),transparent_70%)] text-white">
            <Outlet />
          </div>
          <Scripts />
        </body>
      </html>
    </PersistQueryClientProvider>
  );
}
