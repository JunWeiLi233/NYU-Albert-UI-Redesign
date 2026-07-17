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
      "https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR_FL.NYU_SSENRL_CART_FL.GBL*",
      "https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR.NYU_CLS_SRCH.GBL*",
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
    // Every sis.nyu.edu match/host must stay scoped to the two proven Class
    // Search component paths — never a broad sis.nyu.edu/* host grant.
    const sisScoped = (list: readonly string[]) =>
      list
        .filter((m) => m.startsWith("https://sis.nyu.edu/"))
        .every(
          (m) =>
            m.includes("NYU_SSENRL_CART_FL.GBL") || m.includes("NYU_CLS_SRCH.GBL"),
        );
    const matches = (staticManifest.content_scripts ?? [])[0]?.matches ?? [];
    const hosts = staticManifest.host_permissions ?? [];
    expect(sisScoped(matches as string[])).toBe(true);
    expect(sisScoped(hosts)).toBe(true);
    expect([...(matches as string[]), ...hosts]).not.toContain(
      "https://sis.nyu.edu/*",
    );
  });
});
