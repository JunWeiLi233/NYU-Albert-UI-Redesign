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
  it("keeps the compact native resource directory behind the modal finder", () => {
    const marker =
      "html[data-better-albert-task-finder-open][data-better-albert-enabled][data-better-albert-compact-header] #SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR[data-better-albert-resource-directory-open]";
    const idx = THEME_CSS.indexOf(marker);
    expect(idx).toBeGreaterThan(-1);
    expect(THEME_CSS.slice(idx, idx + 520)).toContain(
      "z-index: 1 !important",
    );
    expect(THEME_CSS.slice(idx, idx + 520)).toContain(
      "pointer-events: none !important",
    );
  });

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

  it("lays out Home attention panels in an overflow-safe responsive grid", () => {
    // PeopleSoft lays these out as three ~80px float boxes in a flex row, which
    // overflowed the native attention column. The extension must replace that
    // row with an auto-fitting card grid and neutralize the fixed-width thirds.
    const shwIdx = THEME_CSS.indexOf(
      '[data-better-albert-region="attention-section"] .NYU_same_height_width',
    );
    expect(shwIdx).toBeGreaterThan(-1);
    const attentionBlock = THEME_CSS.slice(shwIdx, shwIdx + 280);
    expect(attentionBlock).toContain("display: grid !important");
    expect(attentionBlock).toContain(
      "grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
    );

    const thirdIdx = THEME_CSS.indexOf(
      '[data-better-albert-region="attention-section"] .nyuSSS_ThirdW',
    );
    expect(thirdIdx).toBeGreaterThan(-1);
    const cardBlock = THEME_CSS.slice(thirdIdx, thirdIdx + 420);
    expect(cardBlock).toContain("width: 100% !important");
    expect(cardBlock).toContain("min-height: 112px");
    expect(cardBlock).toContain("border: 1px solid var(--ba-native-rule)");
    expect(cardBlock).not.toContain("background:");

    const compactGridIdx = THEME_CSS.indexOf(
      "@media (min-width: 401px) and (max-width: 599px)",
    );
    expect(compactGridIdx).toBeGreaterThan(-1);
    const compactGridBlock = THEME_CSS.slice(
      compactGridIdx,
      compactGridIdx + 620,
    );
    expect(compactGridBlock).toContain(
      "grid-template-columns: repeat(2, minmax(0, 1fr))",
    );
    expect(compactGridBlock).toContain("grid-column: 1 / -1");
  });

  it("lets the Finances bursar button size to its label instead of 350px", () => {
    const idx = THEME_CSS.indexOf(
      '[data-better-albert-adapter="family-finances"] .nyuSSS_Bursarbtn',
    );
    expect(idx).toBeGreaterThan(-1);
    expect(THEME_CSS.slice(idx, idx + 160)).toContain("width: auto !important");
  });

  it("shrinks compact Academics advisor cards and wraps long names", () => {
    const cardIdx = THEME_CSS.indexOf(
      '[data-better-albert-region="advising-section"] .isSSS_Advs',
    );
    expect(cardIdx).toBeGreaterThan(-1);
    const cardBlock = THEME_CSS.slice(cardIdx, cardIdx + 260);
    expect(cardBlock).toContain("max-width: calc(100% - 8px)");

    const nameIdx = THEME_CSS.indexOf(
      '[data-better-albert-region="advising-section"] .isSSS_AdvsName',
    );
    expect(nameIdx).toBeGreaterThan(-1);
    const nameBlock = THEME_CSS.slice(nameIdx, nameIdx + 220);
    expect(nameBlock).toContain("overflow-wrap: anywhere");
    expect(nameBlock).toContain("white-space: normal");
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

  it("renders the adapter's fallback section cue without inventing native values", () => {
    expect(THEME_CSS).toContain(
      "[data-better-albert-section-label]::before",
    );
    const idx = THEME_CSS.indexOf(
      "[data-better-albert-section-label]::before",
    );
    expect(THEME_CSS.slice(idx, idx + 360)).toContain(
      "content: attr(data-better-albert-section-label)",
    );
  });
});
