import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const HEADER_CSS = readFileSync(
  resolve(__dirname, "../../src/design-system/header.css"),
  "utf8",
).replace(/\s+/g, " ");
const TOKENS_CSS = readFileSync(
  resolve(__dirname, "../../src/design-system/tokens.css"),
  "utf8",
).replace(/\s+/g, " ");
const NATIVE_THEME_CSS = readFileSync(
  resolve(__dirname, "../../src/design-system/native-theme.css"),
  "utf8",
).replace(/\s+/g, " ");

describe("NYU-style desktop rail contract", () => {
  it("uses the documented 92px rail for both shell and native content", () => {
    expect(TOKENS_CSS).toContain("--ba-rail-width: 5.75rem");
    expect(NATIVE_THEME_CSS).toContain("--ba-native-rail: 92px");
  });

  it("keeps desktop wayfinding compact while preserving accessible detail", () => {
    const desktopStart = HEADER_CSS.lastIndexOf("@media (min-width: 900px)");
    expect(desktopStart).toBeGreaterThan(-1);
    const desktopRail = HEADER_CSS.slice(desktopStart);

    expect(desktopRail).toContain(".ba-page-context { position: absolute");
    expect(desktopRail).toContain(
      ".ba-workspace-row { display: flex; min-height: 0;",
    );
    expect(desktopRail).toContain(
      ".ba-tool-list { width: 100%; height: fit-content; min-height: 0; flex: 0 0 auto;",
    );
    expect(desktopRail).toContain(
      ".ba-tool-nav, .ba-resource-nav { flex: 0 0 auto; min-height: 0;",
    );
    expect(desktopRail).toContain(
      ".ba-home-starter-nav { height: fit-content; max-height: none;",
    );
    expect(HEADER_CSS).toContain(
      ".ba-course-search-shortcut { background: var(--ba-color-nyu-violet);",
    );
    expect(HEADER_CSS).toContain(
      '.ba-course-search-shortcut[data-course-search-active="true"] { background: var(--ba-color-white);',
    );
    expect(desktopRail).toContain(".ba-course-search-shortcut-copy > span");
    expect(desktopRail).toContain(".ba-tool-description");
    expect(desktopRail).toContain(
      ".ba-tool-nav .ba-tool-item:not(.ba-home-resource-item) { display: none;",
    );
    expect(desktopRail).toContain(".ba-resource-nav { display: none;");
    expect(desktopRail).toContain(".ba-nav-icon { display: grid;");
    expect(desktopRail).toContain(
      ".ba-primary-nav .ba-nav-item { padding-inline: var(--ba-space-2);",
    );
    expect(desktopRail).toContain(".ba-nav-label-full { display: none;");
    expect(desktopRail).toContain(".ba-nav-label-compact { display: inline;");
    expect(desktopRail).toContain(".ba-nav-item-resources { margin-top: auto");
    expect(HEADER_CSS).toContain(".ba-nav-icon { display: none; }");
  });

  it("lets the desktop task finder fill the workspace beside the rail", () => {
    const desktopFinder = HEADER_CSS.slice(
      HEADER_CSS.indexOf("@media (min-width: 900px)"),
    );

    expect(desktopFinder).toContain(
      ".ba-task-finder-heading, .ba-task-finder-search, .ba-task-finder-search-row",
    );
    expect(desktopFinder).toContain("width: 100%; max-width: none;");
    expect(desktopFinder).toContain(
      '.ba-task-finder[data-single-result="true"] .ba-task-finder-sections',
    );
  });
});
