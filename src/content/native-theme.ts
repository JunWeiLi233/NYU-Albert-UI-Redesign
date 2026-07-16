import type { PageFamily } from "./page-families";
import { getAvailablePageFamilies } from "./native-navigation";

export const THEME_ENABLED_ATTRIBUTE = "data-better-albert-enabled";
export const THEME_PAGE_ATTRIBUTE = "data-better-albert-page";
export const THEME_TOP_LEVEL_ATTRIBUTE = "data-better-albert-top-level";
export const COMPACT_HEADER_ATTRIBUTE = "data-better-albert-compact-header";
export const NATIVE_MODAL_OPEN_ATTRIBUTE = "data-better-albert-native-modal-open";
export const READ_ONLY_MODAL_OPEN_ATTRIBUTE =
  "data-better-albert-readonly-modal-open";
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
  const hasOpenReadOnlyDialog = Array.from(
    document.querySelectorAll(`#pt_modals.PSMODAL[${READ_ONLY_MODAL_ATTRIBUTE}]`),
  ).some((dialog) => isPotentiallyVisible(dialog as HTMLElement, document));
  document.documentElement.toggleAttribute(
    READ_ONLY_MODAL_OPEN_ATTRIBUTE,
    hasOpenReadOnlyDialog,
  );
}

function hasVerifiedCompactHeader(document: Document): boolean {
  const selectors = [
    "#ptbr_header_container",
    "#NYU_DEFAULT_HEADER",
    "#Header_Container",
    "#IS_BB_HEADER_WRAPPER",
    "#NYU_ALBERT_LOGO",
    "#IS_BB_HEADER_MENU",
  ] as const;
  const anchors = selectors.map((selector) =>
    Array.from(document.querySelectorAll(selector)),
  );
  if (anchors.some((matches) => matches.length !== 1)) {
    return false;
  }

  const [portalHeader, defaultHeader, headerContainer, utility, logo, menu] =
    anchors.map((matches) => matches[0]);
  return Boolean(
    portalHeader &&
      defaultHeader &&
      headerContainer &&
      utility &&
      logo &&
      menu &&
      portalHeader.contains(defaultHeader) &&
      defaultHeader.contains(headerContainer) &&
      headerContainer.contains(utility) &&
      headerContainer.contains(logo) &&
      headerContainer.contains(menu) &&
      getAvailablePageFamilies(document).length === 6,
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
  document.documentElement.toggleAttribute(
    COMPACT_HEADER_ATTRIBUTE,
    topLevel && hasVerifiedCompactHeader(document),
  );
  updateReadOnlyModalMarkers(document);
}

export function removeNativeTheme(document: Document): void {
  document.documentElement.removeAttribute(THEME_ENABLED_ATTRIBUTE);
  document.documentElement.removeAttribute(THEME_PAGE_ATTRIBUTE);
  document.documentElement.removeAttribute(THEME_TOP_LEVEL_ATTRIBUTE);
  document.documentElement.removeAttribute(COMPACT_HEADER_ATTRIBUTE);
  document.documentElement.removeAttribute(NATIVE_MODAL_OPEN_ATTRIBUTE);
  document.documentElement.removeAttribute(READ_ONLY_MODAL_OPEN_ATTRIBUTE);
  for (const modal of document.querySelectorAll(
    `[${READ_ONLY_MODAL_ATTRIBUTE}]`,
  )) {
    modal.removeAttribute(READ_ONLY_MODAL_ATTRIBUTE);
  }
}
