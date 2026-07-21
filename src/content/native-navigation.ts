import {
  PAGE_FAMILY_DEFINITIONS,
  PRIMARY_PAGE_FAMILIES,
  type PrimaryPageFamily,
} from "./page-families";
import { activateNativeControl } from "./native-control";

const PREFERRED_NAVIGATION_CONTAINERS = [
  "nav",
  '[role="navigation"]',
  "#albert-native-navigation",
  "#pthnavcontainer",
  "#pthnavbc",
].join(",");

const OTHER_RESOURCES_MENU_ID = "MENU_ID_NYU_OTHER_RESOURCES_FLDR";
const OTHER_RESOURCES_SUBMENU_ID = "SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR";

type NativeNavigationControl =
  | HTMLAnchorElement
  | HTMLButtonElement
  | HTMLLIElement;

function resetPrimaryNavigationScroll(document: Document): void {
  const scrollRoot = document.scrollingElement ?? document.documentElement;
  scrollRoot.scrollLeft = 0;
  scrollRoot.scrollTop = 0;
}

function normalizeLabel(value: string | null): string {
  return value?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
}

function isNativeControl(
  element: Element,
): element is HTMLAnchorElement | HTMLButtonElement {
  return (
    element instanceof HTMLAnchorElement ||
    element instanceof HTMLButtonElement
  );
}

function findMatchingControl(
  root: ParentNode,
  labels: readonly string[],
): HTMLAnchorElement | HTMLButtonElement | undefined {
  const expectedLabels = new Set(labels.map(normalizeLabel));
  return Array.from(root.querySelectorAll("a, button")).find(
    (element): element is HTMLAnchorElement | HTMLButtonElement =>
      isNativeControl(element) &&
      !element.closest("#better-albert-header-host") &&
      expectedLabels.has(
        normalizeLabel(
          element.textContent ?? element.getAttribute("aria-label"),
        ),
      ),
  );
}

function findOtherResourcesTrigger(
  document: Document,
): HTMLLIElement | undefined {
  const candidates = Array.from(
    document.querySelectorAll<HTMLLIElement>(
      `li#${OTHER_RESOURCES_MENU_ID}`,
    ),
  ).filter((candidate) => {
    const nativeMenu = candidate.closest("#IS_BB_HEADER_MENU");
    const handler = candidate.getAttribute("onclick") ?? "";
    const matchingDirectControls = Array.from(
      candidate.querySelectorAll(":scope > a, :scope > button"),
    ).filter(
      (control) =>
        normalizeLabel(
          control.textContent ?? control.getAttribute("aria-label"),
        ) === "other resources",
    );
    const matchingSubmenus =
      nativeMenu?.querySelectorAll(
        `:scope > #${OTHER_RESOURCES_SUBMENU_ID}`,
      ) ?? [];

    return (
      !candidate.closest("#better-albert-header-host") &&
      matchingDirectControls.length === 1 &&
      matchingSubmenus.length === 1 &&
      handler.includes("toggleMegaMenu") &&
      handler.includes(OTHER_RESOURCES_MENU_ID) &&
      handler.includes(OTHER_RESOURCES_SUBMENU_ID)
    );
  });

  return candidates.length === 1 ? candidates[0] : undefined;
}

export function findNativeNavigationControl(
  document: Document,
  pageFamily: PrimaryPageFamily,
): NativeNavigationControl | undefined {
  if (pageFamily === "resources") {
    return findOtherResourcesTrigger(document);
  }

  const labels = PAGE_FAMILY_DEFINITIONS[pageFamily].nativeLabels;
  for (const container of document.querySelectorAll(
    PREFERRED_NAVIGATION_CONTAINERS,
  )) {
    const control = findMatchingControl(container, labels);
    if (control) {
      return control;
    }
  }

  return undefined;
}

export function getAvailablePageFamilies(
  document: Document,
): PrimaryPageFamily[] {
  return PRIMARY_PAGE_FAMILIES.filter((pageFamily) =>
    Boolean(findNativeNavigationControl(document, pageFamily)),
  );
}

export function navigateWithNativeAlbert(
  document: Document,
  pageFamily: PrimaryPageFamily,
): boolean {
  const control = findNativeNavigationControl(document, pageFamily);
  if (!control || control.matches(":disabled, [aria-disabled='true']")) {
    return false;
  }

  if (pageFamily !== "resources") {
    resetPrimaryNavigationScroll(document);
  }
  activateNativeControl(control);
  return true;
}
