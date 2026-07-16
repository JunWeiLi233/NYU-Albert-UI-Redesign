import { PAGE_FAMILY_DEFINITIONS } from "../content/page-families";
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

interface DeepPagePlan {
  actionAreas: readonly Element[];
  alerts: readonly Element[];
  breadcrumbs: readonly Element[];
  forms: readonly Element[];
  groups: readonly Element[];
  root: Element;
  tables: readonly Element[];
  title: Element | undefined;
}

export class PeopleSoftDeepAdapter implements StructuralAdapter<DeepPagePlan> {
  readonly id = "peoplesoft-deep" as const;
  readonly priority = 200;

  prepare(context: AdapterContext): DeepPagePlan | undefined {
    const root = uniqueElement(context.document, ".ps_box-page");
    if (!root) {
      return undefined;
    }

    const title = root.querySelector(
      ":scope > .ps_box-pagetitle, :scope > .PAPAGETITLE, :scope > h1",
    ) ?? undefined;
    const groups = Array.from(
      root.querySelectorAll(":scope > .PSGROUPBOX, :scope > .ps_box-group"),
    );
    const tables = Array.from(
      root.querySelectorAll("table, .ps_grid-flex, .ps_box-grid"),
    );
    if (!title && groups.length === 0 && tables.length === 0) {
      return undefined;
    }

    return {
      actionAreas: Array.from(
        root.querySelectorAll(
          ":scope > .ps_box-actions, :scope > .ps-buttonbar, :scope > .PSBUTTONTOOLBAR",
        ),
      ),
      alerts: Array.from(
        root.querySelectorAll("[role='alert'], .PSERROR, .PSMESSAGE"),
      ),
      breadcrumbs: Array.from(
        root.querySelectorAll(
          ":scope > .ps_box-breadcrumbs, :scope > .PABREADCRUMB, :scope > #PT_BREADCRUMBS, :scope > nav[aria-label='Breadcrumb']",
        ),
      ),
      forms: Array.from(root.querySelectorAll("form")),
      groups,
      root,
      tables,
      title,
    };
  }

  apply(context: AdapterContext, plan: DeepPagePlan) {
    const journal = new DomPatchJournal();
    try {
      journal.setAttribute(context.document.documentElement, ADAPTER_ATTRIBUTE, this.id);
      journal.setAttribute(plan.root, LAYOUT_ATTRIBUTE, "peoplesoft-page");
      journal.setAttribute(
        plan.root,
        LABEL_ATTRIBUTE,
        PAGE_FAMILY_DEFINITIONS[context.pageFamily].label,
      );
      markRegion(journal, plan.root, "workspace");
      markFocusTarget(journal, plan.root);
      if (plan.title) {
        markRegion(journal, plan.title, "page-title");
      }
      for (const group of plan.groups) markRegion(journal, group, "group");
      for (const table of plan.tables) markRegion(journal, table, "table");
      for (const form of plan.forms) markRegion(journal, form, "form");
      for (const alert of plan.alerts) markRegion(journal, alert, "alert");
      for (const breadcrumbs of plan.breadcrumbs) {
        markRegion(journal, breadcrumbs, "breadcrumbs");
      }
      for (const actionArea of plan.actionAreas) {
        markRegion(journal, actionArea, "action-area");
      }
      return createSession(this.id, journal, [
        plan.root,
        ...plan.groups,
        ...plan.tables,
        ...plan.forms,
        ...plan.alerts,
        ...plan.breadcrumbs,
        ...plan.actionAreas,
      ]);
    } catch (error) {
      journal.rollback();
      throw error;
    }
  }
}
