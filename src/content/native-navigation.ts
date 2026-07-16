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

export function findNativeNavigationControl(
  document: Document,
  pageFamily: PrimaryPageFamily,
): HTMLAnchorElement | HTMLButtonElement | undefined {
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

  activateNativeControl(control);
  return true;
}
