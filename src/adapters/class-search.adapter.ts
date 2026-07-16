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
  root: Element;
  title: Element | undefined;
  variant: "fluid" | "legacy";
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
        root: fluidRoot,
        title:
          fluidRoot.querySelector(
            ":scope > .ps_box-pagetitle, :scope > .PAPAGETITLE",
          ) ?? undefined,
        variant: "fluid",
      };
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

    return {
      ...(body ? { body } : {}),
      ...(legacyFilter ? { filter: legacyFilter } : {}),
      form: legacyForm,
      groups,
      ...(legacyResults ? { results: legacyResults } : {}),
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
          ...plan.groups,
        ],
      );
    } catch (error) {
      journal.rollback();
      throw error;
    }
  }
}
