import type { PageFamily } from "./page-families";
import { hasOpenCourseSearchFrame } from "./course-search-handoff";
import {
  findNativeOtherResourcesSubmenu,
  getAvailablePageFamilies,
} from "./native-navigation";
import {
  RESOURCE_CATEGORY_DEFINITIONS,
  getAvailableResourceTools,
} from "./page-tools";

export const THEME_ENABLED_ATTRIBUTE = "data-better-albert-enabled";
export const THEME_PAGE_ATTRIBUTE = "data-better-albert-page";
export const THEME_TOP_LEVEL_ATTRIBUTE = "data-better-albert-top-level";
export const COMPACT_HEADER_ATTRIBUTE = "data-better-albert-compact-header";
export const NATIVE_MODAL_OPEN_ATTRIBUTE = "data-better-albert-native-modal-open";
export const READ_ONLY_MODAL_OPEN_ATTRIBUTE =
  "data-better-albert-readonly-modal-open";
const READ_ONLY_MODAL_ATTRIBUTE = "data-better-albert-readonly-modal";
const RESOURCE_DIRECTORY_ATTRIBUTE =
  "data-better-albert-resource-directory";
const RESOURCE_CATEGORY_ATTRIBUTE =
  "data-better-albert-resource-category";
const RESOURCE_CATEGORY_START_ATTRIBUTE =
  "data-better-albert-resource-category-start";
const RESOURCE_CATEGORY_LABEL_ATTRIBUTE =
  "data-better-albert-resource-category-label";
const RESOURCE_ARIA_LABEL_ADDED_ATTRIBUTE =
  "data-better-albert-resource-aria-label-added";
const RESOURCE_ROLE_ADDED_ATTRIBUTE =
  "data-better-albert-resource-role-added";
const UTILITY_ARIA_LABEL_ADDED_ATTRIBUTE =
  "data-better-albert-utility-aria-label-added";
const UTILITY_ROLE_ADDED_ATTRIBUTE =
  "data-better-albert-utility-role-added";
const READ_ONLY_MODAL_TITLES = new Set([
  "degree progress report",
  "my degree progress report",
]);
const NATIVE_DIALOG_SELECTOR = "#pt_modals, [role='dialog']";

function normalizedText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
}

function updateNativeResourceMarkers(document: Document): void {
  for (const element of document.querySelectorAll(
    `[${RESOURCE_DIRECTORY_ATTRIBUTE}], [${RESOURCE_CATEGORY_ATTRIBUTE}], [${RESOURCE_CATEGORY_START_ATTRIBUTE}], [${RESOURCE_CATEGORY_LABEL_ATTRIBUTE}]`,
  )) {
    element.removeAttribute(RESOURCE_DIRECTORY_ATTRIBUTE);
    element.removeAttribute(RESOURCE_CATEGORY_ATTRIBUTE);
    element.removeAttribute(RESOURCE_CATEGORY_START_ATTRIBUTE);
    element.removeAttribute(RESOURCE_CATEGORY_LABEL_ATTRIBUTE);
  }

  const submenu = findNativeOtherResourcesSubmenu(document);
  if (!submenu) {
    return;
  }

  submenu.setAttribute(RESOURCE_DIRECTORY_ATTRIBUTE, "");
  if (!submenu.hasAttribute("role")) {
    submenu.setAttribute("role", "navigation");
    submenu.setAttribute(RESOURCE_ROLE_ADDED_ATTRIBUTE, "");
  }
  if (!submenu.hasAttribute("aria-label")) {
    submenu.setAttribute("aria-label", "NYU Resources");
    submenu.setAttribute(RESOURCE_ARIA_LABEL_ADDED_ATTRIBUTE, "");
  }

  const definitions = getAvailableResourceTools(document);
  const seenCategories = new Set<string>();
  for (const item of submenu.querySelectorAll<HTMLElement>(
    ":scope > ul > li",
  )) {
    const anchor = item.querySelector<HTMLAnchorElement>(":scope > a");
    const label = normalizedText(
      anchor?.textContent ?? anchor?.getAttribute("aria-label"),
    );
    const matchingDefinitions = definitions.filter((definition) =>
      definition.nativeLabels.some(
        (nativeLabel) => normalizedText(nativeLabel) === label,
      ),
    );
    const definition =
      matchingDefinitions.length === 1 ? matchingDefinitions[0] : undefined;
    if (!anchor || !definition) {
      continue;
    }

    item.setAttribute(RESOURCE_CATEGORY_ATTRIBUTE, definition.category);
    if (!seenCategories.has(definition.category)) {
      seenCategories.add(definition.category);
      item.setAttribute(RESOURCE_CATEGORY_START_ATTRIBUTE, "");
      anchor.setAttribute(
        RESOURCE_CATEGORY_LABEL_ATTRIBUTE,
        RESOURCE_CATEGORY_DEFINITIONS[definition.category].label,
      );
    }
  }
}

function updateNativeUtilityMarkers(
  document: Document,
  hasCompactHeader: boolean,
): void {
  for (const utility of document.querySelectorAll(
    `[${UTILITY_ARIA_LABEL_ADDED_ATTRIBUTE}], [${UTILITY_ROLE_ADDED_ATTRIBUTE}]`,
  )) {
    if (utility.hasAttribute(UTILITY_ARIA_LABEL_ADDED_ATTRIBUTE)) {
      utility.removeAttribute("aria-label");
      utility.removeAttribute(UTILITY_ARIA_LABEL_ADDED_ATTRIBUTE);
    }
    if (utility.hasAttribute(UTILITY_ROLE_ADDED_ATTRIBUTE)) {
      utility.removeAttribute("role");
      utility.removeAttribute(UTILITY_ROLE_ADDED_ATTRIBUTE);
    }
  }

  if (!hasCompactHeader) {
    return;
  }
  const utility = document.querySelector("#IS_BB_HEADER_WRAPPER");
  if (!utility) {
    return;
  }
  if (!utility.hasAttribute("role")) {
    utility.setAttribute("role", "navigation");
    utility.setAttribute(UTILITY_ROLE_ADDED_ATTRIBUTE, "");
  }
  if (!utility.hasAttribute("aria-label")) {
    utility.setAttribute("aria-label", "Official Albert tools");
    utility.setAttribute(UTILITY_ARIA_LABEL_ADDED_ATTRIBUTE, "");
  }
}

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
    document.querySelectorAll(NATIVE_DIALOG_SELECTOR),
  ).some((dialog) => isPotentiallyVisible(dialog as HTMLElement, document));
  document.documentElement.toggleAttribute(
    NATIVE_MODAL_OPEN_ATTRIBUTE,
    hasOpenNativeDialog || hasOpenCourseSearchFrame(document),
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
  const hasCompactHeader =
    topLevel && hasVerifiedCompactHeader(document);
  document.documentElement.setAttribute(THEME_ENABLED_ATTRIBUTE, "");
  document.documentElement.setAttribute(THEME_PAGE_ATTRIBUTE, pageFamily);
  document.documentElement.toggleAttribute(THEME_TOP_LEVEL_ATTRIBUTE, topLevel);
  document.documentElement.toggleAttribute(
    COMPACT_HEADER_ATTRIBUTE,
    hasCompactHeader,
  );
  updateNativeUtilityMarkers(document, hasCompactHeader);
  updateNativeResourceMarkers(document);
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
  for (const element of document.querySelectorAll(
    `[${RESOURCE_DIRECTORY_ATTRIBUTE}], [${RESOURCE_CATEGORY_ATTRIBUTE}], [${RESOURCE_CATEGORY_START_ATTRIBUTE}], [${RESOURCE_CATEGORY_LABEL_ATTRIBUTE}]`,
  )) {
    element.removeAttribute(RESOURCE_DIRECTORY_ATTRIBUTE);
    element.removeAttribute(RESOURCE_CATEGORY_ATTRIBUTE);
    element.removeAttribute(RESOURCE_CATEGORY_START_ATTRIBUTE);
    element.removeAttribute(RESOURCE_CATEGORY_LABEL_ATTRIBUTE);
  }
  for (const submenu of document.querySelectorAll(
    `[${RESOURCE_ARIA_LABEL_ADDED_ATTRIBUTE}], [${RESOURCE_ROLE_ADDED_ATTRIBUTE}]`,
  )) {
    if (submenu.hasAttribute(RESOURCE_ARIA_LABEL_ADDED_ATTRIBUTE)) {
      submenu.removeAttribute("aria-label");
      submenu.removeAttribute(RESOURCE_ARIA_LABEL_ADDED_ATTRIBUTE);
    }
    if (submenu.hasAttribute(RESOURCE_ROLE_ADDED_ATTRIBUTE)) {
      submenu.removeAttribute("role");
      submenu.removeAttribute(RESOURCE_ROLE_ADDED_ATTRIBUTE);
    }
  }
  for (const utility of document.querySelectorAll(
    `[${UTILITY_ARIA_LABEL_ADDED_ATTRIBUTE}], [${UTILITY_ROLE_ADDED_ATTRIBUTE}]`,
  )) {
    if (utility.hasAttribute(UTILITY_ARIA_LABEL_ADDED_ATTRIBUTE)) {
      utility.removeAttribute("aria-label");
      utility.removeAttribute(UTILITY_ARIA_LABEL_ADDED_ATTRIBUTE);
    }
    if (utility.hasAttribute(UTILITY_ROLE_ADDED_ATTRIBUTE)) {
      utility.removeAttribute("role");
      utility.removeAttribute(UTILITY_ROLE_ADDED_ATTRIBUTE);
    }
  }
}
