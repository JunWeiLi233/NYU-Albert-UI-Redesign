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

  it("turns verified Class Search subject directories into readable responsive cards", () => {
    const directoryIdx = THEME_CSS.indexOf(
      '[data-better-albert-region="directory-grid"] > :where(tbody',
    );
    expect(directoryIdx).toBeGreaterThan(-1);
    const directoryBlock = THEME_CSS.slice(directoryIdx, directoryIdx + 1_800);
    expect(directoryBlock).toContain("grid-template-columns: repeat( auto-fit");
    expect(directoryBlock).toContain("minmax(min(100%, 220px), 1fr)");
    expect(directoryBlock).toContain("height: auto !important");
    expect(directoryBlock).toContain("max-height: none !important");
    expect(directoryBlock).toContain("min-height: 64px !important");
    expect(directoryBlock).toContain("overflow: visible !important");
  });

  it("compacts the legacy Add Classes scaffold so the search action stays above the fold", () => {
    const rootMarker =
      '[data-better-albert-layout="class-search-legacy"] {';
    const rootIdx = THEME_CSS.lastIndexOf(rootMarker);
    expect(rootIdx).toBeGreaterThan(-1);
    const rootBlock = THEME_CSS.slice(rootIdx, rootIdx + 520);
    expect(rootBlock).toContain("margin: 8px auto !important");
    expect(rootBlock).toContain("padding: 10px 16px 14px !important");
    expect(rootBlock).toContain("border-top-width: 4px !important");

    const groupMarker =
      '[data-better-albert-region="group"] {';
    const groupIdx = THEME_CSS.lastIndexOf(groupMarker);
    expect(groupIdx).toBeGreaterThan(-1);
    const groupBlock = THEME_CSS.slice(groupIdx, groupIdx + 520);
    expect(groupBlock).toContain("height: auto !important");
    expect(groupBlock).toContain("min-height: 0 !important");
    expect(groupBlock).toContain("margin-block: 3px !important");

    const spacerIdx = THEME_CSS.lastIndexOf(
      ".ps_box, .ps_box-group, .ps_box-row",
    );
    expect(spacerIdx).toBeGreaterThan(-1);
    expect(THEME_CSS.slice(spacerIdx, spacerIdx + 600)).toContain(
      "height: auto !important",
    );

    const borderIdx = THEME_CSS.lastIndexOf("border: 0 !important");
    expect(borderIdx).toBeGreaterThan(-1);
    const borderBlock = THEME_CSS.slice(borderIdx, borderIdx + 180);
    expect(borderBlock).toContain("background: transparent !important");
  });

  it("keeps Class Search child documents vertically scrollable inside Albert modals", () => {
    const scrollIdx = THEME_CSS.lastIndexOf(
      "overflow-y: auto !important; overscroll-behavior-y: contain",
    );
    expect(scrollIdx).toBeGreaterThan(-1);
    const scrollBlock = THEME_CSS.slice(scrollIdx - 260, scrollIdx + 180);
    expect(scrollBlock).toContain("block-size: auto !important");
    expect(scrollBlock).toContain("min-block-size: 100% !important");
    expect(scrollBlock).toContain("overflow-x: hidden !important");
    expect(scrollBlock).toContain("overflow-y: auto !important");

    const layoutIdx = THEME_CSS.lastIndexOf(
      "[data-better-albert-layout=\"class-search-legacy\"]",
    );
    expect(layoutIdx).toBeGreaterThan(-1);
    const layoutBlock = THEME_CSS.slice(layoutIdx, layoutIdx + 500);
    expect(layoutBlock).toContain("height: auto !important");
    expect(layoutBlock).toContain("max-height: none !important");
    expect(layoutBlock).toContain("overflow: visible !important");

    const nestedGridIdx = THEME_CSS.lastIndexOf(
      '[data-better-albert-region="directory-grid"] :where(div, section',
    );
    expect(nestedGridIdx).toBeGreaterThan(-1);
    expect(THEME_CSS.slice(nestedGridIdx, nestedGridIdx + 460)).toContain(
      "overflow: visible !important",
    );

    const modalIdx = THEME_CSS.lastIndexOf(
      "#pt_modals[data-better-albert-course-search-modal]",
    );
    expect(modalIdx).toBeGreaterThan(-1);
    const modalBlock = THEME_CSS.slice(modalIdx, modalIdx + 480);
    expect(modalBlock).toContain("height: auto !important");
    expect(modalBlock).toContain("min-height: 0 !important");
    expect(modalBlock).toContain("max-height: calc(100dvh - 24px) !important");
    expect(modalBlock).toContain("overflow-y: auto !important");
    expect(modalBlock).toContain("overflow-x: hidden !important");

    const wrapperIdx = THEME_CSS.lastIndexOf("body > form:has(");
    expect(wrapperIdx).toBeGreaterThan(-1);
    const wrapperBlock = THEME_CSS.slice(wrapperIdx, wrapperIdx + 560);
    expect(wrapperBlock).toContain("block-size: auto !important");
    expect(wrapperBlock).toContain("max-block-size: none !important");
    expect(wrapperBlock).toContain("overflow: visible !important");
  });

  it("collapses generic Albert error responses into a full-width status area", () => {
    const marker =
      '[data-better-albert-adapter="albert-workspace"] [data-better-albert-region="error-section"]';
    const idx = THEME_CSS.indexOf(marker);
    expect(idx).toBeGreaterThan(-1);
    const block = THEME_CSS.slice(idx, idx + 700);
    expect(block).toContain("display: block !important");
    expect(block).toContain("width: 100% !important");
    expect(block).toContain("min-height: 0 !important");
    expect(block).toContain("text-align: center");
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
    expect(attentionBlock).toContain("container-type: inline-size");
    expect(attentionBlock).toContain(
      "grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
    );
    expect(attentionBlock).toContain(
      "grid-auto-rows: minmax(180px, auto)",
    );

    const thirdIdx = THEME_CSS.indexOf(
      '[data-better-albert-region="attention-section"] .nyuSSS_ThirdW',
    );
    expect(thirdIdx).toBeGreaterThan(-1);
    const cardBlock = THEME_CSS.slice(thirdIdx, thirdIdx + 420);
    expect(cardBlock).toContain("width: 100% !important");
    expect(cardBlock).toContain("min-width: 0");
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

  it("gives the native To Do card a structured status-list layout", () => {
    const todoIdx = THEME_CSS.indexOf(
      '[data-better-albert-region="todo-status"] {',
    );
    expect(todoIdx).toBeGreaterThan(-1);
    const todoBlock = THEME_CSS.slice(todoIdx, todoIdx + 360);
    expect(todoBlock).toContain("min-height: 180px");
    expect(todoBlock).toContain("overflow: hidden");

    const rowsIdx = THEME_CSS.indexOf(
      '[data-better-albert-region="todo-status"] :where(ul, ol)',
    );
    expect(rowsIdx).toBeGreaterThan(-1);
    expect(THEME_CSS.slice(rowsIdx, rowsIdx + 260)).toContain(
      "list-style: none",
    );

    const linkIdx = THEME_CSS.indexOf(
      '[data-better-albert-region="todo-status"] :where(li > a, > a)',
    );
    expect(linkIdx).toBeGreaterThan(-1);
    expect(THEME_CSS.slice(linkIdx, linkIdx + 320)).toContain(
      "min-height: 44px",
    );

    const todoIndentIdx = THEME_CSS.indexOf(
      '[data-better-albert-region="todo-status"] > :not(:first-child)',
    );
    expect(todoIndentIdx).toBeGreaterThan(-1);
    expect(THEME_CSS.slice(todoIndentIdx, todoIndentIdx + 180)).toContain(
      "margin-inline: 22px 12px",
    );

    const todoAnchorIdx = THEME_CSS.indexOf(
      '[data-better-albert-region="todo-status"] :where(a) {',
    );
    expect(todoAnchorIdx).toBeGreaterThan(-1);
    const todoAnchorBlock = THEME_CSS.slice(todoAnchorIdx, todoAnchorIdx + 360);
    expect(todoAnchorBlock).toContain("display: flex");
    expect(todoAnchorBlock).toContain("flex-direction: row-reverse");
    expect(todoAnchorBlock).toContain("justify-content: flex-end");

    const todoIconIdx = THEME_CSS.indexOf(
      ':where(li img, li svg, > img, > svg, a > img, a > svg) {',
    );
    expect(todoIconIdx).toBeGreaterThan(-1);
    expect(THEME_CSS.slice(todoIconIdx, todoIconIdx + 300)).toContain(
      "order: -1",
    );

    const todoWideIdx = THEME_CSS.indexOf("@container (min-width: 900px)");
    expect(todoWideIdx).toBeGreaterThan(-1);
    expect(THEME_CSS.slice(todoWideIdx, todoWideIdx + 320)).toContain(
      "white-space: nowrap !important",
    );
  });

  it("applies the same card geometry to Holds and Enrollment Dates", () => {
    const sharedIdx = THEME_CSS.indexOf(
      ':where( [data-better-albert-region="holds-status"], [data-better-albert-region="registration-time"] )',
    );
    expect(sharedIdx).toBeGreaterThan(-1);
    const sharedBlock = THEME_CSS.slice(sharedIdx, sharedIdx + 760);
    expect(sharedBlock).toContain("min-height: 180px");
    expect(sharedBlock).toContain("padding: 0 !important");
    expect(sharedBlock).toContain("overflow: visible");
    expect(sharedBlock).toContain(
      "border-inline-start: 4px solid var(--ba-native-violet)",
    );
    const fallbackHeadingIdx = THEME_CSS.indexOf(
      ':where( [data-better-albert-region="holds-status"], [data-better-albert-region="registration-time"] ) > :first-child',
    );
    expect(fallbackHeadingIdx).toBeGreaterThan(-1);

    const enrollmentIdx = THEME_CSS.indexOf(
      '[data-better-albert-region="registration-time"] > :where(p, [role="status"])',
    );
    expect(enrollmentIdx).toBeGreaterThan(-1);
    expect(THEME_CSS.slice(enrollmentIdx, enrollmentIdx + 280)).toContain(
      "overflow-wrap: anywhere",
    );
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

  it("lets the native schedule legend hide after its X action", () => {
    const style = document.createElement("style");
    style.textContent = THEME_CSS;
    document.head.append(style);
    document.documentElement.setAttribute("data-better-albert-enabled", "");
    document.documentElement.setAttribute(
      "data-better-albert-adapter",
      "family-home",
    );
    document.body.innerHTML = `
      <div
        class="isSSS_ShCtLnkWrp"
        data-better-albert-region="schedule-section"
      >
        <div id="native-schedule-legend" style="display: block">
          <a href="javascript:void(0)">X</a>
          <span>Validated</span>
        </div>
      </div>
    `;

    const legend = document.querySelector<HTMLElement>(
      "#native-schedule-legend",
    );
    const close = legend?.querySelector<HTMLAnchorElement>("a");
    close?.addEventListener("click", () => {
      legend?.style.setProperty("display", "none");
    });

    close?.click();

    expect(legend).not.toBeNull();
    expect(window.getComputedStyle(legend as HTMLElement).display).toBe("none");

    style.remove();
    document.documentElement.removeAttribute("data-better-albert-enabled");
    document.documentElement.removeAttribute("data-better-albert-adapter");
    document.body.innerHTML = "";
  });

  it("aligns Home schedule actions into shared responsive columns", () => {
    const wrapperMarker =
      '[data-better-albert-region="schedule-section"] .isSSS_ShCtLnkWrp {';
    const wrapperIdx = THEME_CSS.indexOf(wrapperMarker);
    expect(wrapperIdx).toBeGreaterThan(-1);
    const wrapperBlock = THEME_CSS.slice(wrapperIdx, wrapperIdx + 420);
    expect(wrapperBlock).toContain("display: grid");
    expect(wrapperBlock).toContain(
      "grid-template-columns: repeat(3, minmax(0, 1fr))",
    );
    expect(wrapperBlock).toContain("align-items: stretch");

    const directWrapperMarker =
      '[data-better-albert-region="schedule-section"].isSSS_ShCtLnkWrp,';
    const directWrapperIdx = THEME_CSS.indexOf(directWrapperMarker);
    expect(directWrapperIdx).toBeGreaterThan(-1);
    expect(THEME_CSS.slice(directWrapperIdx, directWrapperIdx + 360)).toContain(
      "display: grid",
    );

    const childMarker =
      '[data-better-albert-region="schedule-section"] > :where(div, p):has(a) {';
    const childIdx = THEME_CSS.indexOf(childMarker);
    expect(childIdx).toBeGreaterThan(-1);
    expect(THEME_CSS.slice(childIdx, childIdx + 260)).toContain(
      "width: auto !important",
    );

    const childLayoutMarker =
      '[data-better-albert-region="schedule-section"] .isSSS_ShCtLnkWrp > :where(a, button, div, p, li) {';
    const childLayoutIdx = THEME_CSS.indexOf(childLayoutMarker);
    expect(childLayoutIdx).toBeGreaterThan(-1);
    expect(THEME_CSS.slice(childLayoutIdx, childLayoutIdx + 220)).toContain(
      "grid-column: auto !important",
    );

    const directChildLayoutMarker =
      '[data-better-albert-region="schedule-section"].isSSS_ShCtLnkWrp > :where(a, button, div, p, li),';
    const directChildLayoutIdx = THEME_CSS.indexOf(directChildLayoutMarker);
    expect(directChildLayoutIdx).toBeGreaterThan(-1);
    expect(
      THEME_CSS.slice(directChildLayoutIdx, directChildLayoutIdx + 520),
    ).toContain("width: auto !important");

    const directAnchorLayoutMarker =
      '[data-better-albert-region="schedule-section"].isSSS_ShCtLnkWrp > :where(a, button),';
    const directAnchorLayoutIdx = THEME_CSS.indexOf(directAnchorLayoutMarker);
    expect(directAnchorLayoutIdx).toBeGreaterThan(-1);
    expect(
      THEME_CSS.slice(directAnchorLayoutIdx, directAnchorLayoutIdx + 300),
    ).toContain("display: inline-flex !important");

    const legendLayoutMarker =
      '[data-better-albert-region="schedule-section"].isSSS_ShCtLnkWrp > .isSSS_ShCtLnkL,';
    const legendLayoutIdx = THEME_CSS.indexOf(legendLayoutMarker);
    expect(legendLayoutIdx).toBeGreaterThan(-1);
    expect(THEME_CSS.slice(legendLayoutIdx, legendLayoutIdx + 520)).toContain(
      "grid-column: 1 / -1 !important",
    );

    const scheduleCardIdx = THEME_CSS.indexOf(
      "/* Keep the six schedule actions as one deliberate card grid.",
    );
    expect(scheduleCardIdx).toBeGreaterThan(-1);
    const scheduleCardBlock = THEME_CSS.slice(scheduleCardIdx, scheduleCardIdx + 2_400);
    expect(scheduleCardBlock).toContain("gap: 12px");
    expect(scheduleCardBlock).toContain("min-height: 64px");
    expect(scheduleCardBlock).toContain("width: 100% !important");
    expect(scheduleCardBlock).toContain("justify-content: flex-start");

    const inactiveTermMarker =
      '[data-better-albert-region="schedule-section"].isSSS_ShCtLnkWrp > .isSSS_ShCtLnkDC:not(.selected),';
    const inactiveTermIdx = THEME_CSS.indexOf(inactiveTermMarker);
    expect(inactiveTermIdx).toBeGreaterThan(-1);
    expect(THEME_CSS.slice(inactiveTermIdx, inactiveTermIdx + 520)).toContain(
      "display: none !important",
    );

    const mobileIdx = THEME_CSS.lastIndexOf(
      '@media (max-width: 599px) { html[data-better-albert-enabled][data-better-albert-adapter="family-home"]',
    );
    expect(mobileIdx).toBeGreaterThan(-1);
    expect(THEME_CSS.slice(mobileIdx, mobileIdx + 1_600)).toContain(
      "grid-template-columns: 1fr",
    );
  });

  it("removes the page-height accent from the Home shopping-cart wrapper", () => {
    const cartIdx = THEME_CSS.indexOf(
      '[data-better-albert-region="enrollment-section"].isSSS_ShopCart {',
    );
    expect(cartIdx).toBeGreaterThan(-1);
    const cartBlock = THEME_CSS.slice(cartIdx, cartIdx + 460);
    expect(cartBlock).toContain("border-left: 1px solid var(--ba-native-rule)");
    expect(cartBlock).not.toContain(
      "border-left: 5px solid var(--ba-native-violet)",
    );

    const workspaceIdx = THEME_CSS.indexOf(
      "/* Keep the rail boundary neutral;",
    );
    expect(workspaceIdx).toBeGreaterThan(-1);
    const workspaceBlock = THEME_CSS.slice(workspaceIdx, workspaceIdx + 460);
    expect(workspaceBlock).toContain(
      "border-left: 1px solid var(--ba-native-rule) !important",
    );
  });

  it("centers the Home schedule heading", () => {
    const headingIdx = THEME_CSS.lastIndexOf(
      "[data-better-albert-schedule-heading]",
    );
    expect(headingIdx).toBeGreaterThan(-1);
    expect(THEME_CSS.slice(headingIdx, headingIdx + 420)).toContain(
      "grid-column: 1 / -1 !important",
    );
    expect(THEME_CSS.slice(headingIdx, headingIdx + 420)).toContain(
      "width: 100% !important",
    );
    expect(THEME_CSS.slice(headingIdx, headingIdx + 420)).toContain(
      "display: block !important",
    );
    expect(THEME_CSS.slice(headingIdx, headingIdx + 420)).toContain(
      "text-align: center !important",
    );
    expect(THEME_CSS).toContain(
      "[data-better-albert-schedule-heading-row]",
    );
  });

  it("gives native Albert error content a full-width status card", () => {
    const errorIdx = THEME_CSS.indexOf(
      '[data-better-albert-region="error-section"]',
    );
    expect(errorIdx).toBeGreaterThan(-1);
    expect(THEME_CSS.slice(errorIdx, errorIdx + 900)).toContain(
      "grid-column: 1 / -1 !important",
    );
    expect(THEME_CSS.slice(errorIdx, errorIdx + 900)).toContain(
      "border-top: 6px solid var(--ba-native-violet) !important",
    );
  });

  it("hides inactive term action trios without hiding the selected trio", () => {
    const style = document.createElement("style");
    style.textContent = THEME_CSS;
    document.head.append(style);
    document.documentElement.setAttribute("data-better-albert-enabled", "");
    document.documentElement.setAttribute(
      "data-better-albert-adapter",
      "family-home",
    );
    document.body.innerHTML = `
      <div
        class="isSSS_ShCtLnkWrp"
        data-better-albert-region="schedule-section"
      >
        <a class="isSSS_ShCtLnkDC selected" href="javascript:void(0)">
          Download Calendar
        </a>
        <a class="isSSS_ShCtLnkDC" href="javascript:void(0)">
          Download Calendar
        </a>
      </div>
    `;

    const actions = document.querySelectorAll<HTMLAnchorElement>(
      ".isSSS_ShCtLnkDC",
    );
    expect(actions).toHaveLength(2);
    expect(window.getComputedStyle(actions[0] as HTMLAnchorElement).display).not.toBe(
      "none",
    );
    expect(window.getComputedStyle(actions[1] as HTMLAnchorElement).display).toBe(
      "none",
    );

    style.remove();
    document.documentElement.removeAttribute("data-better-albert-enabled");
    document.documentElement.removeAttribute("data-better-albert-adapter");
    document.body.innerHTML = "";
  });

  it("keeps Home enrolled-course headers aligned with the native course grid", () => {
    const style = document.createElement("style");
    style.textContent = THEME_CSS;
    document.head.append(style);
    document.documentElement.setAttribute("data-better-albert-enabled", "");
    document.documentElement.setAttribute(
      "data-better-albert-adapter",
      "family-home",
    );
    document.body.innerHTML = `
      <section
        class="isSSS_ShopCart"
        data-better-albert-region="enrollment-section"
      >
        <table class="isSSS_ShCtSchTable">
          <tbody>
            <tr style="display: block">
              <th style="display: block">Course (Units/Grading Basis)</th>
              <th style="display: block">Instructor</th>
              <th style="display: block">Instruction Mode and Location</th>
              <th style="display: block">Time</th>
              <th style="display: block">Day</th>
              <th style="display: block">Dates</th>
              <th style="display: none">Eval There is</th>
              <th style="display: none">URL</th>
              <th style="display: block">Deadlines</th>
            </tr>
            <tr>
              <td>Operating Systems</td>
              <td>Walﬁsh</td>
              <td>In-Person</td>
              <td>11:00 AM</td>
              <td>MW</td>
              <td>9/2/2026</td>
              <td style="display: none"></td>
              <td style="display: none"></td>
              <td>Calendar</td>
            </tr>
          </tbody>
        </table>
      </section>
    `;

    const headerRow = document.querySelector<HTMLTableRowElement>(
      ".isSSS_ShCtSchTable tr:first-child",
    );
    const headers = headerRow?.querySelectorAll<HTMLTableCellElement>("th");
    const hiddenHeaders = headerRow?.querySelectorAll<HTMLTableCellElement>(
      "th:nth-child(7), th:nth-child(8)",
    );

    expect(headerRow).not.toBeNull();
    expect(window.getComputedStyle(headerRow as HTMLTableRowElement).display).toBe(
      "table-row",
    );
    expect(headers).toHaveLength(9);
    expect(
      window.getComputedStyle(headers?.[0] as HTMLTableCellElement).display,
    ).toBe("table-cell");
    expect(
      window.getComputedStyle(headers?.[5] as HTMLTableCellElement).display,
    ).toBe("table-cell");
    expect(
      window.getComputedStyle(headers?.[8] as HTMLTableCellElement).display,
    ).toBe("table-cell");
    expect(
      window.getComputedStyle(hiddenHeaders?.[0] as HTMLTableCellElement).display,
    ).toBe("none");
    expect(
      window.getComputedStyle(hiddenHeaders?.[1] as HTMLTableCellElement).display,
    ).toBe("none");

    style.remove();
    document.documentElement.removeAttribute("data-better-albert-enabled");
    document.documentElement.removeAttribute("data-better-albert-adapter");
    document.body.innerHTML = "";
  });
});
