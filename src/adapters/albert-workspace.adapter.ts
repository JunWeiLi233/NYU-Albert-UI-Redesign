import { PAGE_FAMILY_DEFINITIONS } from "../content/page-families";
import { DomPatchJournal } from "./dom-patch-journal";
import {
  ADAPTER_ATTRIBUTE,
  LABEL_ATTRIBUTE,
  LAYOUT_ATTRIBUTE,
  createSession,
  markFocusTarget,
  markRegion,
} from "./adapter-helpers";
import type { AdapterContext, StructuralAdapter } from "./types";

interface WorkspacePlan {
  errorSection: Element | undefined;
  root: Element;
}

const NATIVE_ERROR_CUES = [
  /error getting content/i,
  /unable to create\s*\/\s*run application package/i,
  /error occurred when attempting to create application package/i,
  /albert was unable to retrieve the page/i,
] as const;

function normalizedText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function hasNativeErrorCue(element: Element): boolean {
  const text = normalizedText(element.textContent);
  return (
    text.length > 0 &&
    text.length <= 700 &&
    NATIVE_ERROR_CUES.some((cue) => cue.test(text))
  );
}

/**
 * Find the smallest native response section that owns Albert's error copy.
 * The helper only searches inside the selected workspace, so an unrelated
 * banner elsewhere in the PeopleSoft shell can never be restyled by this
 * conservative fallback adapter.
 */
function findNativeErrorSection(root: Element): Element | undefined {
  const candidates = Array.from(
    root.querySelectorAll<HTMLElement>(
      "h1, h2, h3, h4, h5, h6, [role='heading'], p, div, section",
    ),
  )
    .filter(hasNativeErrorCue)
    .sort((left, right) => {
      const leftTextLength = normalizedText(left.textContent).length;
      const rightTextLength = normalizedText(right.textContent).length;
      return leftTextLength - rightTextLength;
    });
  const cue = candidates[0];
  if (!cue) {
    return hasNativeErrorCue(root) ? root : undefined;
  }

  let section: Element = cue;
  while (section.parentElement && section.parentElement !== root) {
    section = section.parentElement;
  }
  return section === root ? undefined : section;
}

export class AlbertWorkspaceAdapter implements StructuralAdapter<WorkspacePlan> {
  readonly id = "albert-workspace" as const;
  readonly priority = 100;

  prepare(context: AdapterContext): WorkspacePlan | undefined {
    const candidates = context.document.querySelectorAll(
      ".isSSS_Main.selected, main, [role='main'].selected",
    );
    const root = candidates.item(0);
    return candidates.length === 1 && root
      ? { errorSection: findNativeErrorSection(root), root }
      : undefined;
  }

  apply(context: AdapterContext, plan: WorkspacePlan) {
    const journal = new DomPatchJournal();
    try {
      journal.setAttribute(context.document.documentElement, ADAPTER_ATTRIBUTE, this.id);
      journal.setAttribute(plan.root, LAYOUT_ATTRIBUTE, "generic-workspace");
      journal.setAttribute(
        plan.root,
        LABEL_ATTRIBUTE,
        PAGE_FAMILY_DEFINITIONS[context.pageFamily].label,
      );
      markRegion(journal, plan.root, "workspace");
      if (plan.errorSection) {
        markRegion(journal, plan.errorSection, "error-section");
      }
      markFocusTarget(journal, plan.root);
      return createSession(this.id, journal, [
        plan.root,
        ...(plan.errorSection ? [plan.errorSection] : []),
      ]);
    } catch (error) {
      journal.rollback();
      throw error;
    }
  }
}
