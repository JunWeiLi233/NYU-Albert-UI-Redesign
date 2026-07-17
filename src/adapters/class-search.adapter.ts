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
  body?: Element;
  filter?: Element;
  form?: HTMLFormElement;
  groups: readonly Element[];
  results?: Element;
  resultRows: readonly Element[];
  root: Element;
  title: Element | undefined;
  variant: "fluid" | "legacy" | "classic";
}

/**
 * Collect the native result rows from a results region so each can be marked
 * as a card. Variants: fluid (ARIA grid rows), legacy cart (table body rows),
 * and classic Class Search (`tr.ps_grid-row` rows inside a `ps_grid-flex`
 * table). Header rows / thead are excluded. Read-only: only gathers live
 * element references, never mutates.
 */
function collectResultRows(results: Element | undefined): readonly Element[] {
  if (!results) {
    return [];
  }

  const rows = Array.from(results.querySelectorAll("[role='row']"));
  if (rows.length > 0) {
    return rows.filter((row) =>
      row.querySelector(":scope > [role='cell'], :scope > td"),
    );
  }

  // Classic Class Search: PeopleSoft renders results as tr.ps_grid-row.
  const gridRows = results.querySelectorAll("tr.ps_grid-row");
  if (gridRows.length > 0) {
    return Array.from(gridRows);
  }

  return Array.from(results.querySelectorAll("table > tbody > tr, tbody > tr"));
}

export class ClassSearchAdapter implements StructuralAdapter<ClassSearchPlan> {
  readonly id = "class-search" as const;
  readonly priority = 400;

  prepare(context: AdapterContext): ClassSearchPlan | undefined {
    if (!isKnownAlbertComponentRoute(context.location)) {
      return undefined;
    }

    const fluidRoot = uniqueElement(context.document, ".ps_box-page");
    const fluidFilter = uniqueElement(
      context.document,
      ".ps_box-search, .ps_box-filter, .psc_search-filter",
    );
    const fluidResults = uniqueElement(
      context.document,
      ".ps_grid-flex, .ps_box-grid",
    );
    if (
      fluidRoot &&
      fluidFilter &&
      fluidResults &&
      fluidRoot.contains(fluidFilter) &&
      fluidRoot.contains(fluidResults)
    ) {
      return {
        filter: fluidFilter,
        groups: [],
        results: fluidResults,
        resultRows: collectResultRows(fluidResults),
        root: fluidRoot,
        title:
          fluidRoot.querySelector(
            ":scope > .ps_box-pagetitle, :scope > .PAPAGETITLE",
          ) ?? undefined,
        variant: "fluid",
      };
    }

    /*
     * Classic Class Search component (form #NYU_CLS_SRCH). Verified live: a
     * ps_box-group layout with filter selects (NYU_CLS_WRK_*) and a
     * ps_grid-flex results table whose rows are tr.ps_grid-row. Distinct from
     * the fluid and legacy-cart variants.
     */
    const classicForm = uniqueElement(
      context.document,
      "form#NYU_CLS_SRCH",
    );
    if (classicForm instanceof HTMLFormElement) {
      const classicRoot = uniqueElement(classicForm, "#PT_WRAPPER.ps_wrapper");
      const classicResults = uniqueElement(
        classicForm,
        "table.ps_grid-flex, .ps_box-grid",
      );
      if (classicRoot && classicResults) {
        const classicGroups = Array.from(
          classicRoot.querySelectorAll(".ps_box-group"),
        );
        const classicFilterGroup = classicGroups.find(
          (group) =>
            !group.contains(classicResults) &&
            Boolean(group.querySelector("select, input:not([type='hidden'])")),
        );
        const classicTitle =
          uniqueElement(
            classicRoot,
            ".ps_box-pagetitle, .PAPAGETITLE, .PATRANSACTIONTITLE, h1",
          ) ?? undefined;
        return {
          ...(classicFilterGroup ? { filter: classicFilterGroup } : {}),
          form: classicForm,
          groups: classicGroups,
          results: classicResults,
          resultRows: collectResultRows(classicResults),
          root: classicRoot,
          title: classicTitle,
          variant: "classic",
        };
      }
    }

    const legacyForm = uniqueElement(
      context.document,
      "form#NYU_SSENRL_CART_FL.PSForm",
    );
    if (!(legacyForm instanceof HTMLFormElement)) {
      return undefined;
    }

    const legacyRoot = uniqueElement(legacyForm, "#PT_WRAPPER.ps_wrapper");
    const groups = legacyRoot
      ? Array.from(legacyRoot.querySelectorAll(".ps_box-group"))
      : [];
    if (!legacyRoot || groups.length === 0) {
      return undefined;
    }

    const filterCandidates = groups.filter(
      (group) =>
        !group.querySelector("table, .ps_grid-flex, .ps_box-grid") &&
        Boolean(
          group.querySelector(
            "input:not([type='hidden']), select, textarea",
          ),
        ),
    );
    const resultCandidates = groups.filter((group) =>
      Boolean(group.querySelector("table, .ps_grid-flex, .ps_box-grid")),
    );
    const legacyFilter =
      filterCandidates.length === 1 ? filterCandidates[0] : undefined;
    const legacyResults =
      resultCandidates.length === 1 ? resultCandidates[0] : undefined;
    const body =
      legacyFilter &&
      legacyResults &&
      legacyFilter.parentElement === legacyResults.parentElement
        ? legacyFilter.parentElement ?? undefined
        : undefined;

    const legacyResultRows = collectResultRows(legacyResults);

    return {
      ...(body ? { body } : {}),
      ...(legacyFilter ? { filter: legacyFilter } : {}),
      form: legacyForm,
      groups,
      ...(legacyResults ? { results: legacyResults } : {}),
      resultRows: legacyResultRows,
      root: legacyRoot,
      title:
        uniqueElement(
          legacyRoot,
          ".ps_box-pagetitle, .PAPAGETITLE, .PATRANSACTIONTITLE, h1",
        ) ?? undefined,
      variant: "legacy",
    };
  }

  apply(context: AdapterContext, plan: ClassSearchPlan) {
    const journal = new DomPatchJournal();
    try {
      journal.setAttribute(context.document.documentElement, ADAPTER_ATTRIBUTE, this.id);
      journal.setAttribute(
        plan.root,
        LAYOUT_ATTRIBUTE,
        plan.variant === "fluid" ? "class-search" : "class-search-legacy",
      );
      journal.setAttribute(plan.root, LABEL_ATTRIBUTE, "Class Search");
      markRegion(journal, plan.root, "workspace");
      markFocusTarget(journal, plan.root);
      if (plan.form) {
        markRegion(journal, plan.form, "class-search-form");
      }
      if (plan.body) {
        journal.setAttribute(plan.body, LAYOUT_ATTRIBUTE, "class-search-body");
      }
      for (const group of plan.groups) {
        if (group !== plan.filter && group !== plan.results) {
          markRegion(journal, group, "group");
        }
      }
      if (plan.filter) {
        markRegion(journal, plan.filter, "filter");
      }
      if (plan.results) {
        markRegion(journal, plan.results, "results");
      }
      for (const row of plan.resultRows) {
        markRegion(journal, row, "result-row");
      }
      if (plan.title) {
        markRegion(journal, plan.title, "page-title");
      }
      return createSession(
        this.id,
        journal,
        [
          plan.root,
          ...(plan.form ? [plan.form] : []),
          ...(plan.body ? [plan.body] : []),
          ...(plan.filter ? [plan.filter] : []),
          ...(plan.results ? [plan.results] : []),
          ...plan.resultRows,
          ...plan.groups,
        ],
      );
    } catch (error) {
      journal.rollback();
      throw error;
    }
  }
}
