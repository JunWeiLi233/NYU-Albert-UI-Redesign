import { describe, expect, it } from "vitest";

import manifest from "../../manifest.config";

const staticManifest = manifest as unknown as {
  content_scripts?: Array<Record<string, unknown>>;
  host_permissions?: string[];
  manifest_version: number;
  permissions?: string[];
};

describe("extension manifest", () => {
  it("keeps narrow permissions while covering PeopleSoft child frames", () => {
    expect(staticManifest.manifest_version).toBe(3);
    expect(staticManifest.permissions).toEqual(["storage"]);
    expect(staticManifest.host_permissions).toEqual([
      "https://sis.portal.nyu.edu/*",
    ]);
    expect(staticManifest.content_scripts).toEqual([
      expect.objectContaining({
        all_frames: true,
        css: ["src/design-system/native-theme.css"],
        matches: [
          "https://sis.portal.nyu.edu/*",
          "https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR_FL.NYU_SSENRL_CART_FL.GBL*",
          "https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR.NYU_CLS_SRCH.GBL*",
        ],
        run_at: "document_idle",
      }),
    ]);
    // Every sis.nyu.edu match must stay scoped to the two proven Class Search
    // component paths — never a broad sis.nyu.edu/* host grant.
    const matches = (staticManifest.content_scripts ?? [])[0]?.matches ?? [];
    const sisMatches = (matches as string[]).filter((m) =>
      m.startsWith("https://sis.nyu.edu/"),
    );
    expect(sisMatches.every((m) => m.includes("NYU_SSENRL_CART_FL.GBL") || m.includes("NYU_CLS_SRCH.GBL"))).toBe(true);
    expect(sisMatches).not.toContain("https://sis.nyu.edu/*");
  });
});
