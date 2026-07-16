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
  root: Element;
}

export class AlbertWorkspaceAdapter implements StructuralAdapter<WorkspacePlan> {
  readonly id = "albert-workspace" as const;
  readonly priority = 100;

  prepare(context: AdapterContext): WorkspacePlan | undefined {
    const candidates = context.document.querySelectorAll(
      ".isSSS_Main.selected, main, [role='main'].selected",
    );
    const root = candidates.item(0);
    return candidates.length === 1 && root ? { root } : undefined;
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
      markFocusTarget(journal, plan.root);
      return createSession(this.id, journal, [plan.root]);
    } catch (error) {
      journal.rollback();
      throw error;
    }
  }
}
