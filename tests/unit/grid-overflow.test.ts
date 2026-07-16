import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const THEME_CSS = readFileSync(
  resolve(__dirname, "../../src/design-system/native-theme.css"),
  "utf8",
).replace(/\s+/g, " ");

/**
 * Regression guards for grid overflow.
 *
 * design.md requires that wide native tables scroll inside their marked region
 * and that the document itself never overflows horizontally. Two native layout
 * patterns caused overflow before these rules:
 *
 * 1. PeopleSoft contact fields on Personal Info (.NYUEmail, .NYUPhone,
 *    .ADDR_TYPE_DESCR) ship as float:left boxes pinned to ~90px, so values
 *    overflowed the box. The extension must neutralize that width/float so the
 *    field fills its section.
 * 2. Native financial tables (aid/bursar) carry intrinsic widths wider than
 *    their grid column; their containing section must scroll internally.
 *
 * The Personal rule must NOT wrap the selectors in :where() — that zeroes
 * specificity and loses to the native !important width, which is the original
 * bug.
 */
describe("Grid overflow containment contract", () => {
  it("neutralizes native Personal Info contact-field width/float at full specificity (no :where)", () => {
    // .NYUEmail must be targeted by a concrete high-specificity selector, not
    // wrapped in :where() (which would lose to the native !important width).
    expect(THEME_CSS).not.toMatch(/:where\([^)]*\.NYUEmail/);
    expect(THEME_CSS).toContain(
      '[data-better-albert-adapter="family-personal"] [data-better-albert-region] .NYUEmail',
    );

    // Find that rule's declaration block and assert it overrides width/float.
    const idx = THEME_CSS.indexOf(
      '[data-better-albert-adapter="family-personal"] [data-better-albert-region] .NYUEmail',
    );
    const block = THEME_CSS.slice(idx, idx + 900);
    expect(block).toContain("width: 100% !important");
    expect(block).toContain("float: none !important");
  });

  it("contains wide Finances tables inside their grid columns", () => {
    // The account/aid sections must scroll internally so wide native tables do
    // not overflow the document.
    expect(THEME_CSS).toContain(
      '[data-better-albert-region="aid-section"]',
    );
    // Locate the Finances section-containment rule and assert internal scroll.
    const aidIdx = THEME_CSS.indexOf(
      '[data-better-albert-region="aid-section"] )',
    );
    expect(aidIdx).toBeGreaterThan(-1);
    const block = THEME_CSS.slice(aidIdx, aidIdx + 120);
    expect(block).toContain("overflow-x: auto");
  });
});
