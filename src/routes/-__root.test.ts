import { afterEach, describe, expect, it, vi } from "vitest";
import { Route } from "./__root";

async function getHeadScripts() {
  const head = await Route.options.head?.({} as never);
  return head?.scripts ?? [];
}

describe("root route head", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("omits analytics when Umami is not configured", async () => {
    vi.stubEnv("VITE_UMAMI_SCRIPT_URL", "");
    vi.stubEnv("VITE_UMAMI_WEBSITE_ID", "");

    expect(await getHeadScripts()).toEqual([]);
  });

  it("includes Umami analytics from env configuration", async () => {
    vi.stubEnv("VITE_UMAMI_SCRIPT_URL", "https://umami.example.test/script.js");
    vi.stubEnv("VITE_UMAMI_WEBSITE_ID", "test-website-id");
    vi.stubEnv("VITE_UMAMI_DOMAINS", "");

    expect(await getHeadScripts()).toContainEqual({
      defer: true,
      src: "https://umami.example.test/script.js",
      "data-website-id": "test-website-id",
    });
  });

  it("limits Umami tracking to configured domains", async () => {
    vi.stubEnv("VITE_UMAMI_SCRIPT_URL", "https://umami.example.test/script.js");
    vi.stubEnv("VITE_UMAMI_WEBSITE_ID", "test-website-id");
    vi.stubEnv("VITE_UMAMI_DOMAINS", "app.example.test");

    expect(await getHeadScripts()).toContainEqual({
      defer: true,
      src: "https://umami.example.test/script.js",
      "data-website-id": "test-website-id",
      "data-domains": "app.example.test",
    });
  });
});
