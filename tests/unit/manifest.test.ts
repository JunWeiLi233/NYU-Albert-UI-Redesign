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
        ],
        run_at: "document_idle",
      }),
    ]);
  });
});
