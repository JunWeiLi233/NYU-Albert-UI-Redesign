import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const THEME_CSS = readFileSync(
  resolve(__dirname, "../../src/design-system/native-theme.css"),
  "utf8",
).replace(/\s+/g, " ");

describe("native semantic state presentation", () => {
  it("adds family alert geometry without replacing native status surfaces", () => {
    const selector =
      '[data-better-albert-layout="family-content"] :where([role="alert"], [role="status"], .PSERROR, .PSMESSAGE) {';
    const ruleIndex = THEME_CSS.indexOf(selector);

    expect(ruleIndex).toBeGreaterThan(-1);
    const rule = THEME_CSS.slice(ruleIndex, ruleIndex + 260);
    expect(rule).toContain("padding: 12px 16px");
    expect(rule).toContain("border-left: 5px solid currentcolor");
    expect(rule).not.toContain("background:");
    expect(rule).not.toContain("color:");
  });
});
