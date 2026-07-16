import { isKnownAlbertComponentRoute } from "../content/page-detector";
import { DomPatchJournal } from "./dom-patch-journal";
import {
  ADAPTER_ATTRIBUTE,
  LABEL_ATTRIBUTE,
  LAYOUT_ATTRIBUTE,
  createSession,
  markFocusTarget,
  markRegion,
  uniqueElement,
} from "./adapter-helpers";
import type { AdapterContext, StructuralAdapter } from "./types";

interface ClassSearchPlan {
  filter: Element;
  results: Element;
  root: Element;
  title: Element | undefined;
}

export class ClassSearchAdapter implements StructuralAdapter<ClassSearchPlan> {
  readonly id = "class-search" as const;
  readonly priority = 400;

  prepare(context: AdapterContext): ClassSearchPlan | undefined {
    if (!isKnownAlbertComponentRoute(context.location)) {
      return undefined;
    }

    const root = uniqueElement(context.document, ".ps_box-page");
    const filter = uniqueElement(
      context.document,
      ".ps_box-search, .ps_box-filter, .psc_search-filter",
    );
    const results = uniqueElement(
      context.document,
      ".ps_grid-flex, .ps_box-grid",
    );
    if (!root || !filter || !results || !root.contains(filter) || !root.contains(results)) {
      return undefined;
    }

    return {
      filter,
      results,
      root,
      title: root.querySelector(":scope > .ps_box-pagetitle, :scope > .PAPAGETITLE") ?? undefined,
    };
  }

  apply(context: AdapterContext, plan: ClassSearchPlan) {
    const journal = new DomPatchJournal();
    try {
      journal.setAttribute(context.document.documentElement, ADAPTER_ATTRIBUTE, this.id);
      journal.setAttribute(plan.root, LAYOUT_ATTRIBUTE, "class-search");
      journal.setAttribute(plan.root, LABEL_ATTRIBUTE, "Class Search");
      markRegion(journal, plan.root, "workspace");
      markFocusTarget(journal, plan.root);
      markRegion(journal, plan.filter, "filter");
      markRegion(journal, plan.results, "results");
      if (plan.title) {
        markRegion(journal, plan.title, "page-title");
      }
      return createSession(this.id, journal, [plan.root, plan.filter, plan.results]);
    } catch (error) {
      journal.rollback();
      throw error;
    }
  }
}
