import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface ManifestIcon {
  src: string;
  sizes: string;
  purpose?: string;
}

const manifest = JSON.parse(
  readFileSync(new URL("../../public/manifest.webmanifest", import.meta.url), "utf8"),
) as { id?: string; start_url: string; icons: ManifestIcon[] };

function getIconPurposes(icon: ManifestIcon) {
  return (icon.purpose ?? "any").split(" ");
}

describe("web app manifest", () => {
  it("has a stable app id", () => {
    expect(manifest.id).toBe("/");
  });

  it("only uses icon purposes that browsers understand", () => {
    for (const icon of manifest.icons) {
      for (const purpose of getIconPurposes(icon)) {
        expect(["any", "maskable", "monochrome"]).toContain(purpose);
      }
    }
  });

  it("provides 192px and 512px icons for both regular and maskable use", () => {
    for (const purpose of ["any", "maskable"]) {
      const sizes = manifest.icons
        .filter((icon) => getIconPurposes(icon).includes(purpose))
        .map((icon) => icon.sizes);

      expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    }
  });
});
