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

  it("stacks Home attention panels (To Do / Holds / Enrollment) full width", () => {
    // PeopleSoft lays these out as three ~80px float boxes in a flex row, which
    // overflowed the narrow attention column. The extension must neutralize both
    // the flex row and the fixed-width thirds.
    const shwIdx = THEME_CSS.indexOf(
      '[data-better-albert-region="attention-section"] .NYU_same_height_width',
    );
    expect(shwIdx).toBeGreaterThan(-1);
    expect(THEME_CSS.slice(shwIdx, shwIdx + 160)).toContain(
      "display: block !important",
    );

    const thirdIdx = THEME_CSS.indexOf(
      '[data-better-albert-region="attention-section"] .nyuSSS_ThirdW',
    );
    expect(thirdIdx).toBeGreaterThan(-1);
    expect(THEME_CSS.slice(thirdIdx, thirdIdx + 160)).toContain(
      "width: 100% !important",
    );
  });

  it("lets the Finances bursar button size to its label instead of 350px", () => {
    const idx = THEME_CSS.indexOf(
      '[data-better-albert-adapter="family-finances"] .nyuSSS_Bursarbtn',
    );
    expect(idx).toBeGreaterThan(-1);
    expect(THEME_CSS.slice(idx, idx + 160)).toContain("width: auto !important");
  });

  it("fills directory groups to their grid columns so link labels do not clip", () => {
    // PeopleSoft .is_bb_LinkColumn groups ship at a fixed narrow width that
    // under-fills the directory grid, so long labels (e.g. "Demographic
    // Information") overflowed. The extension must force the group to fill.
    const idx = THEME_CSS.indexOf(
      '[data-better-albert-region="directory-group"] {',
    );
    expect(idx).toBeGreaterThan(-1);
    const block = THEME_CSS.slice(idx, idx + 200);
    expect(block).toContain("width: 100%");
    expect(block).toContain("min-width: 0");

    // Items must wrap long labels rather than clip them.
    const itemIdx = THEME_CSS.indexOf(
      '[data-better-albert-region="directory-item"] {',
    );
    expect(itemIdx).toBeGreaterThan(-1);
    expect(THEME_CSS.slice(itemIdx, itemIdx + 300)).toContain(
      "overflow-wrap: anywhere",
    );
  });
});
