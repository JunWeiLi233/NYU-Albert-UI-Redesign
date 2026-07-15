import type { PageFamily } from "./page-families";

export const THEME_ENABLED_ATTRIBUTE = "data-better-albert-enabled";
export const THEME_PAGE_ATTRIBUTE = "data-better-albert-page";
const READ_ONLY_MODAL_ATTRIBUTE = "data-better-albert-readonly-modal";
const READ_ONLY_MODAL_TITLES = new Set([
  "degree progress report",
  "my degree progress report",
]);

function updateReadOnlyModalMarkers(document: Document): void {
  for (const modal of document.querySelectorAll("#pt_modals.PSMODAL")) {
    const title = modal.querySelector(
      ".PTPOPUP_TITLE, .HelppopupTitleBarMiddle",
    );
    const normalizedTitle = (title?.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    modal.toggleAttribute(
      READ_ONLY_MODAL_ATTRIBUTE,
      READ_ONLY_MODAL_TITLES.has(normalizedTitle),
    );
  }
}

export function applyNativeTheme(
  document: Document,
  pageFamily: PageFamily,
): void {
  document.documentElement.setAttribute(THEME_ENABLED_ATTRIBUTE, "");
  document.documentElement.setAttribute(THEME_PAGE_ATTRIBUTE, pageFamily);
  updateReadOnlyModalMarkers(document);
}

export function removeNativeTheme(document: Document): void {
  document.documentElement.removeAttribute(THEME_ENABLED_ATTRIBUTE);
  document.documentElement.removeAttribute(THEME_PAGE_ATTRIBUTE);
  for (const modal of document.querySelectorAll(
    `[${READ_ONLY_MODAL_ATTRIBUTE}]`,
  )) {
    modal.removeAttribute(READ_ONLY_MODAL_ATTRIBUTE);
  }
}
