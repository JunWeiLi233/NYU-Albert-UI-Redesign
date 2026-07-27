import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { AdapterManager } from "../../src/adapters/adapter-manager";

const THEME_CSS = readFileSync(
  resolve(__dirname, "../../src/design-system/native-theme.css"),
  "utf8",
).replace(/\s+/g, " ");

const CLASS_SEARCH_LOCATION = new URL(
  "https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR_FL.NYU_SSENRL_CART_FL.GBL",
);

function fixture(path: string): Document {
  return new DOMParser().parseFromString(
    readFileSync(resolve(process.cwd(), path), "utf8"),
    "text/html",
  );
}

/**
 * Regression guard for the Class Search card redesign.
 *
 * The adapter must mark each native result row with
 * `data-better-albert-region="result-row"` so the CSS layer can render it as a
 * card with a prominent native-semantic status badge. This must hold for both
 * the fluid (ARIA grid) and legacy (HTML table) variants, and must not alter
 * native cells, status text, or form ownership.
 */
describe("Class Search card result rows", () => {
  it("labels only the proven native result action group and restores it", () => {
    const document = fixture("tests/fixtures/albert-class-search.html");
    const manager = new AdapterManager();
    const nativeActions = document.querySelector("form.ps_box-actions");

    expect(
      manager.reconcile({
        document,
        location: CLASS_SEARCH_LOCATION,
        pageFamily: "academics",
        topLevel: false,
      }),
    ).toBe("class-search");

    expect(nativeActions?.getAttribute("data-better-albert-region")).toBe(
      "result-actions",
    );
    expect(nativeActions?.getAttribute("aria-label")).toBe(
      "Official Albert next step",
    );

    manager.rollback();
    expect(nativeActions?.hasAttribute("data-better-albert-region")).toBe(false);
    expect(nativeActions?.hasAttribute("aria-label")).toBe(false);
  });

  it("preserves a native accessible name on the result action group", () => {
    const document = fixture("tests/fixtures/albert-class-search.html");
    const manager = new AdapterManager();
    const nativeActions = document.querySelector("form.ps_box-actions");
    nativeActions?.setAttribute("aria-label", "Native enrollment actions");

    manager.reconcile({
      document,
      location: CLASS_SEARCH_LOCATION,
      pageFamily: "academics",
      topLevel: false,
    });

    expect(nativeActions?.getAttribute("aria-label")).toBe(
      "Native enrollment actions",
    );
    manager.rollback();
    expect(nativeActions?.getAttribute("aria-label")).toBe(
      "Native enrollment actions",
    );
  });

  it("marks fluid ARIA result rows as result-row without touching cell text", () => {
    const document = fixture("tests/fixtures/albert-class-search.html");
    const manager = new AdapterManager();
    const dataRow = document.querySelector(
      '.ps_grid-flex [role="row"]:not(:first-child)',
    );
    const statusText = dataRow?.querySelectorAll('[role="cell"]')[1]?.textContent;

    expect(
      manager.reconcile({
        document,
        location: CLASS_SEARCH_LOCATION,
        pageFamily: "academics",
        topLevel: false,
      }),
    ).toBe("class-search");

    const marked = document.querySelectorAll(
      '[data-better-albert-region="result-row"]',
    );
    expect(marked.length).toBe(3);
    // Every data row is marked, and native status text and semantic classes stay
    // unchanged.
    const markedStatus = marked[0]?.querySelectorAll('[role="cell"]')[1];
    expect(markedStatus?.textContent).toBe(statusText);
    expect(
      Array.from(marked).map(
        (row) => row.querySelectorAll('[role="cell"]')[1]?.className,
      ),
    ).toEqual([
      "native-status-open",
      "native-status-closed",
      "native-status-waitlist",
    ]);
    manager.rollback();
    expect(
      document.querySelector('[data-better-albert-region="result-row"]'),
    ).toBeNull();
  });

  it("marks legacy table result rows as result-row", () => {
    const document = fixture("tests/fixtures/albert-class-search-legacy.html");
    const manager = new AdapterManager();
    const dataRow = document.querySelector(
      "#sanitized-results tbody tr",
    );

    expect(
      manager.reconcile({
        document,
        location: CLASS_SEARCH_LOCATION,
        pageFamily: "academics",
        topLevel: false,
      }),
    ).toBe("class-search");

    const marked = document.querySelectorAll(
      '[data-better-albert-region="result-row"]',
    );
    expect(marked.length).toBe(1);
    expect(marked[0]).toBe(dataRow);
    manager.rollback();
  });

  it("marks classic Class Search ps_grid-row results as result-row cards", () => {
    const document = fixture("tests/fixtures/albert-class-search-classic.html");
    const manager = new AdapterManager();
    const classicLocation = new URL(
      "https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR.NYU_CLS_SRCH.GBL",
    );
    const before = document.documentElement.outerHTML;
    const form = document.querySelector<HTMLFormElement>("form#NYU_CLS_SRCH");
    const nativeSearch = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Search",
    );
    const gridRows = document.querySelectorAll("tr.ps_grid-row");
    // native status text of the first row is preserved
    const firstStatus = gridRows[0]?.querySelectorAll("td")[1]?.textContent;

    expect(
      manager.reconcile({
        document,
        location: classicLocation,
        pageFamily: "academics",
        topLevel: false,
      }),
    ).toBe("class-search");

    const marked = document.querySelectorAll(
      '[data-better-albert-region="result-row"]',
    );
    expect(marked.length).toBe(gridRows.length);
    // the classic variant reuses the class-search-legacy layout shell
    expect(
      document.querySelector('[data-better-albert-layout="class-search-legacy"]'),
    ).toBe(document.querySelector("#PT_WRAPPER"));
    expect(
      document.querySelector('[data-better-albert-layout="class-search-body"]'),
    ).toBe(document.querySelector("#classic-main"));
    expect(
      document.querySelector('[data-better-albert-search-mode="selectors"]'),
    ).toBe(document.querySelector("#PT_WRAPPER"));
    expect(
      document.querySelectorAll(
        '[data-better-albert-region="selector-search-control"]',
      ),
    ).toHaveLength(2);
    expect(
      document.querySelector('[data-better-albert-region="primary-search-action"]'),
    ).toBe(nativeSearch);
    expect(nativeSearch?.closest("form")).toBe(form);
    // status cell text is untouched
    const markedStatus = marked[0]?.querySelectorAll("td")[1];
    expect(markedStatus?.textContent).toBe(firstStatus);
    manager.rollback();
    expect(document.documentElement.outerHTML).toBe(before);
  });

  it("adds reversible neutral recovery guidance to one proven empty result status", () => {
    const document = fixture("tests/fixtures/albert-class-search-empty.html");
    const manager = new AdapterManager();
    const status = document.querySelector("[role='status']");
    const nativeText = status?.textContent;

    manager.reconcile({
      document,
      location: CLASS_SEARCH_LOCATION,
      pageFamily: "academics",
      topLevel: false,
    });

    expect(
      document.querySelector('[data-better-albert-region="result-row"]'),
    ).toBeNull();
    expect(status?.getAttribute("data-better-albert-region")).toBe(
      "empty-status",
    );
    expect(status?.getAttribute("aria-description")).toBe(
      "Adjust your search, then use Search again.",
    );
    expect(status?.textContent).toBe(nativeText);

    manager.rollback();
    expect(status?.hasAttribute("data-better-albert-region")).toBe(false);
    expect(status?.hasAttribute("aria-description")).toBe(false);
    expect(status?.textContent).toBe(nativeText);
  });

  it("does not label a non-empty native status as empty-result recovery", () => {
    const document = fixture("tests/fixtures/albert-class-search-error.html");
    const manager = new AdapterManager();
    const status = document.querySelector("[role='status']");

    manager.reconcile({
      document,
      location: CLASS_SEARCH_LOCATION,
      pageFamily: "academics",
      topLevel: false,
    });

    expect(status?.hasAttribute("data-better-albert-region")).toBe(false);
    expect(status?.hasAttribute("aria-description")).toBe(false);
  });
});

/**
 * CSS-source guard: the card + status-pill rules must exist so the marked rows
 * actually render as cards. Asserts the structural properties (grid layout,
 * status badge on the second cell) are present in native-theme.css.
 */
describe("Class Search card CSS contract", () => {
  it("shows a neutral next step after one proven empty result status", () => {
    expect(THEME_CSS).toContain(
      '[data-better-albert-region="empty-status"]::after { content: "Adjust your search, then use Search again.";',
    );
  });

  it("visibly identifies the verified native result action group", () => {
    expect(THEME_CSS).toContain(
      '[data-better-albert-region="result-actions"]::before { content: "Official Albert next step";',
    );
  });

  it("lays out result rows as two-track cards without masking native status colors", () => {
    expect(THEME_CSS).toContain(
      '[data-better-albert-region="result-row"] {',
    );
    // The card uses a grid with a flexible identity column + status column.
    const cardIdx = THEME_CSS.indexOf(
      '[data-better-albert-region="result-row"] {',
    );
    expect(THEME_CSS.slice(cardIdx, cardIdx + 260)).toContain(
      "grid-template-columns",
    );
    expect(THEME_CSS).toContain(
      ':where(td, [role="cell"], div, span, p, a) { box-sizing: border-box; min-width: 0; max-width: 100%; overflow-wrap: anywhere; white-space: normal;',
    );

    // The second cell is the status badge.
    expect(THEME_CSS).toContain(
      ':nth-child(2) {',
    );
    const pillIdx = THEME_CSS.indexOf(
      '[data-better-albert-region="result-row"]',
    );
    const statusRule = THEME_CSS.slice(pillIdx, pillIdx + 2000);
    expect(statusRule).toContain("justify-self: end");
    expect(statusRule).toContain("border: 1px solid currentcolor");
    expect(statusRule).not.toContain("background: var(--ba-native-pale-violet)");
    expect(statusRule).not.toContain("color: var(--ba-native-violet-dark)");
    expect(statusRule).not.toContain("text-transform: uppercase");
  });
});
