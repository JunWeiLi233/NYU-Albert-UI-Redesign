import type { PageFamily } from "./page-families";

export const THEME_ENABLED_ATTRIBUTE = "data-better-albert-enabled";
export const THEME_PAGE_ATTRIBUTE = "data-better-albert-page";
export const THEME_TOP_LEVEL_ATTRIBUTE = "data-better-albert-top-level";
export const NATIVE_MODAL_OPEN_ATTRIBUTE = "data-better-albert-native-modal-open";
const READ_ONLY_MODAL_ATTRIBUTE = "data-better-albert-readonly-modal";
const READ_ONLY_MODAL_TITLES = new Set([
  "degree progress report",
  "my degree progress report",
]);

function isPotentiallyVisible(element: HTMLElement, document: Document): boolean {
  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    const computedStyle = document.defaultView?.getComputedStyle(current);
    if (
      current.hidden ||
      current.getAttribute("aria-hidden") === "true" ||
      (computedStyle?.display ?? current.style.display) === "none" ||
      ["hidden", "collapse"].includes(
        computedStyle?.visibility ?? current.style.visibility,
      )
    ) {
      return false;
    }
  }

  return true;
}

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

  const hasOpenNativeDialog = Array.from(
    document.querySelectorAll("#pt_modals.PSMODAL, [role='dialog']"),
  ).some((dialog) => isPotentiallyVisible(dialog as HTMLElement, document));
  document.documentElement.toggleAttribute(
    NATIVE_MODAL_OPEN_ATTRIBUTE,
    hasOpenNativeDialog,
  );
}

export function applyNativeTheme(
  document: Document,
  pageFamily: PageFamily,
  topLevel: boolean,
): void {
  document.documentElement.setAttribute(THEME_ENABLED_ATTRIBUTE, "");
  document.documentElement.setAttribute(THEME_PAGE_ATTRIBUTE, pageFamily);
  document.documentElement.toggleAttribute(THEME_TOP_LEVEL_ATTRIBUTE, topLevel);
  updateReadOnlyModalMarkers(document);
}

export function removeNativeTheme(document: Document): void {
  document.documentElement.removeAttribute(THEME_ENABLED_ATTRIBUTE);
  document.documentElement.removeAttribute(THEME_PAGE_ATTRIBUTE);
  document.documentElement.removeAttribute(THEME_TOP_LEVEL_ATTRIBUTE);
  document.documentElement.removeAttribute(NATIVE_MODAL_OPEN_ATTRIBUTE);
  for (const modal of document.querySelectorAll(
    `[${READ_ONLY_MODAL_ATTRIBUTE}]`,
  )) {
    modal.removeAttribute(READ_ONLY_MODAL_ATTRIBUTE);
  }
}
