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
 * card with a prominent status pill. This must hold for both the fluid (ARIA
 * grid) and legacy (HTML table) variants, and must not alter native cells,
 * status text, or form ownership.
 */
describe("Class Search card result rows", () => {
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
    expect(marked.length).toBe(1);
    // The data row is the one marked, and its status cell text is unchanged.
    const markedStatus = marked[0]?.querySelectorAll('[role="cell"]')[1];
    expect(markedStatus?.textContent).toBe(statusText);
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
    // status cell text is untouched
    const markedStatus = marked[0]?.querySelectorAll("td")[1];
    expect(markedStatus?.textContent).toBe(firstStatus);
    manager.rollback();
    expect(
      document.querySelector('[data-better-albert-region="result-row"]'),
    ).toBeNull();
  });

  it("does not mark rows when there are no results (fail open)", () => {
    const document = fixture("tests/fixtures/albert-class-search-empty.html");
    const manager = new AdapterManager();

    manager.reconcile({
      document,
      location: CLASS_SEARCH_LOCATION,
      pageFamily: "academics",
      topLevel: false,
    });

    expect(
      document.querySelector('[data-better-albert-region="result-row"]'),
    ).toBeNull();
  });
});

/**
 * CSS-source guard: the card + status-pill rules must exist so the marked rows
 * actually render as cards. Asserts the structural properties (grid layout,
 * status pill on the second cell) are present in native-theme.css.
 */
describe("Class Search card CSS contract", () => {
  it("lays out result rows as two-track cards with a status pill", () => {
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

    // The second cell is the status pill.
    expect(THEME_CSS).toContain(
      ':nth-child(2) {',
    );
    const pillIdx = THEME_CSS.indexOf(
      '[data-better-albert-region="result-row"]',
    );
    expect(THEME_CSS.slice(pillIdx, pillIdx + 2000)).toContain("justify-self: end");
    expect(THEME_CSS.slice(pillIdx, pillIdx + 2000)).toContain(
      "text-transform: uppercase",
    );
  });
});
