import type { DomPatchJournal } from "./dom-patch-journal";
import type { AdapterId, AdapterSession } from "./types";

export const ADAPTER_ATTRIBUTE = "data-better-albert-adapter";
export const REGION_ATTRIBUTE = "data-better-albert-region";
export const LAYOUT_ATTRIBUTE = "data-better-albert-layout";
export const LABEL_ATTRIBUTE = "data-better-albert-label";
export const FOCUS_TARGET_ATTRIBUTE = "data-better-albert-focus-target";

export function uniqueElement(
  root: ParentNode,
  selector: string,
): Element | undefined {
  const matches = root.querySelectorAll(selector);
  return matches.length === 1 ? matches[0] : undefined;
}

export function markRegion(
  journal: DomPatchJournal,
  element: Element,
  region: string,
): void {
  journal.setAttribute(element, REGION_ATTRIBUTE, region);
}

export function markFocusTarget(
  journal: DomPatchJournal,
  element: Element,
): void {
  if (element.hasAttribute("tabindex")) {
    return;
  }
  journal.setAttribute(element, FOCUS_TARGET_ATTRIBUTE);
  journal.setAttribute(element, "tabindex", "-1");
}

export function createSession(
  id: AdapterId,
  journal: DomPatchJournal,
  anchors: readonly Element[],
): AdapterSession {
  return {
    id,
    isStale: () => anchors.some((anchor) => !anchor.isConnected),
    rollback: () => journal.rollback(),
  };
}
