import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const THEME_CSS = readFileSync(
  resolve(__dirname, "../../src/design-system/native-theme.css"),
  "utf8",
);

/**
 * Regression guard for the Personal Info layout gap.
 *
 * At 1200px+ the Personal Info family uses a three-column grid. The Emergency
 * contacts and Missing person sections contain wide native tables that must
 * span the full workspace row. When they were constrained to `span 2` they left
 * an empty third-column hole beside each section. Asserting the full-width rule
 * here prevents that gap from returning.
 */
describe("Personal Info layout contract", () => {
  it("spans emergency and missing-person sections full width at 1200px and above", () => {
    // Locate the 1200px+ media block, then the personal emergency/missing rule.
    const wideBlock = THEME_CSS.indexOf("@media (min-width: 1200px)");
    expect(wideBlock).toBeGreaterThan(-1);
    const afterWide = THEME_CSS.slice(wideBlock);

    const ruleIndex = afterWide.indexOf(
      '[data-better-albert-region="missing-person-section"]',
    );
    expect(ruleIndex).toBeGreaterThan(-1);

    // Grab the declaration block immediately following the selector list.
    const declaration = afterWide.slice(ruleIndex, ruleIndex + 160);
    expect(declaration).toContain("grid-column: 1 / -1");
    expect(declaration).not.toContain("grid-column: span 2");
  });
});
