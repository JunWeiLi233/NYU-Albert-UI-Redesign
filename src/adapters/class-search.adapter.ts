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
  emptyState?: Element;
  filter?: Element;
  form?: HTMLFormElement;
  groups: readonly Element[];
  primarySearch?: {
    action?: Element;
    input: HTMLInputElement;
    label?: Element;
    mode: "combined" | "subject";
  };
  results?: Element;
  resultActions?: Element;
  resultRows: readonly Element[];
  root: Element;
  selectorSearch?: {
    action: Element;
    controls: readonly HTMLSelectElement[];
  };
  title: Element | undefined;
  validationState?: {
    alert: Element;
    control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  };
  variant: "fluid" | "legacy" | "classic";
}

const SEARCH_MODE_ATTRIBUTE = "data-better-albert-search-mode";
const RESULT_ACTION_LABEL = "Official Albert next step";
const RESULT_ACTION_NAMES = new Set(["add to cart", "continue", "enroll"]);
const PRIMARY_SEARCH_LABELS = new Set([
  "subject",
  "subject catalog number title instructor names",
]);
const PRIMARY_SEARCH_COPY = {
  combined: {
    accessibleName:
      "Find a class by subject, course number, title, or instructor",
    description:
      "Use one field for subject, course number, title, or instructor.",
    placeholder: "Subject, course, title, or instructor",
  },
  subject: {
    accessibleName: "Search classes by subject",
    description: "Enter a department or subject, then use Search.",
    placeholder: "Enter a subject",
  },
} as const;
const EMPTY_RESULT_DESCRIPTION =
  "Adjust your search, then use Search again.";
const initiallyFocusedDocuments = new WeakSet<Document>();

function focusInitialSearchControl(
  document: Document,
  control:
    | HTMLInputElement
    | HTMLSelectElement
    | HTMLTextAreaElement
    | undefined,
): void {
  if (
    !control ||
    initiallyFocusedDocuments.has(document) ||
    !control.isConnected ||
    control.disabled ||
    control.closest("[hidden], [inert], [aria-hidden='true']")
  ) {
    return;
  }

  const activeElement = document.activeElement;
  if (
    activeElement &&
    activeElement !== document.body &&
    activeElement !== document.documentElement
  ) {
    return;
  }

  try {
    // Let the browser reveal the focused native control. At high zoom the
    // first search field can begin below the fold; preserving focus without
    // its normal scroll behavior leaves a ready-to-type field clipped.
    control.focus();
    if (document.activeElement === control) {
      initiallyFocusedDocuments.add(document);
    }
  } catch {
    // Focus is an enhancement; an unavailable browsing context stays usable.
  }
}

function findValidationState(
  root: Element,
): ClassSearchPlan["validationState"] {
  const controls = Array.from(
    root.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >(
      "input[aria-invalid='true'][aria-describedby], select[aria-invalid='true'][aria-describedby], textarea[aria-invalid='true'][aria-describedby]",
    ),
  );
  const matches = controls.flatMap((control) => {
    const describedIds =
      control
        .getAttribute("aria-describedby")
        ?.split(/\s+/)
        .filter(Boolean) ?? [];
    if (describedIds.length !== 1) {
      return [];
    }

    const describedId = describedIds[0];
    const alerts = Array.from(root.querySelectorAll("[id][role='alert']")).filter(
      (element) => element.id === describedId,
    );
    const alert = alerts.length === 1 ? alerts[0] : undefined;
    return alert ? [{ alert, control }] : [];
  });
  return matches.length === 1 ? matches[0] : undefined;
}

function findEmptyState(
  results: Element | undefined,
  resultRows: readonly Element[],
): Element | undefined {
  if (!results || resultRows.length > 0) {
    return undefined;
  }

  const statuses = Array.from(results.querySelectorAll("[role='status']")).filter(
    (status) =>
      /^no\b.*\b(?:class(?:es)?|course(?:s)?|result(?:s)?)\b/i.test(
        status.textContent?.trim() ?? "",
      ),
  );
  return statuses.length === 1 ? statuses[0] : undefined;
}

function normalizedText(value: string | null | undefined): string {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ") ?? "";
}

function controlLabel(
  root: Element,
  control: HTMLInputElement | HTMLSelectElement,
): Element | undefined {
  const labels = Array.from(control.labels ?? []);
  if (labels.length === 1) {
    return labels[0];
  }
  if (control.id) {
    const explicitLabels = Array.from(root.querySelectorAll("label")).filter(
      (label) => label.htmlFor === control.id,
    );
    if (explicitLabels.length === 1) {
      return explicitLabels[0];
    }
  }

  const referencedIds = control
    .getAttribute("aria-labelledby")
    ?.split(/\s+/)
    .filter(Boolean);
  if (referencedIds?.length === 1) {
    const referencedElements = Array.from(root.querySelectorAll("[id]")).filter(
      (element) => element.id === referencedIds[0],
    );
    if (referencedElements.length === 1) {
      return referencedElements[0];
    }
  }

  /*
   * Classic PeopleSoft renders the visible label and select in adjacent
   * `.ps_box-label` / `.ps_box-value` siblings, but the native `for` value
   * does not always equal the generated select id. Accept only that exact,
   * single-label adjacency instead of inferring from general nearby text.
   */
  const valueContainer = control.closest(".ps_box-value");
  const labelContainer = valueContainer?.previousElementSibling;
  if (
    labelContainer?.matches(".ps_box-label") &&
    root.contains(labelContainer)
  ) {
    const adjacentLabels = Array.from(labelContainer.querySelectorAll("label"));
    if (adjacentLabels.length === 1) {
      return adjacentLabels[0];
    }
  }
  return undefined;
}

function exactSearchActions(root: Element): readonly Element[] {
  return Array.from(
    root.querySelectorAll(
      "button, input[type='button'], input[type='submit'], a[role='button']",
    ),
  ).filter((element) => {
    const label =
      element instanceof HTMLInputElement
        ? element.value
        : element.textContent;
    return normalizedText(label) === "search";
  });
}

function nearestSearchAction(
  input: HTMLInputElement,
  boundary: Element,
): Element | undefined {
  let candidate = input.parentElement;
  while (candidate && boundary.contains(candidate)) {
    const actions = exactSearchActions(candidate);
    if (actions.length === 1) {
      return actions[0];
    }
    if (candidate === boundary) {
      break;
    }
    candidate = candidate.parentElement;
  }
  return undefined;
}

function nearbyPrimaryLabel(
  root: Element,
  input: HTMLInputElement,
): Element | undefined {
  const labelCandidates = Array.from(root.querySelectorAll("*")).filter(
    (element) =>
      PRIMARY_SEARCH_LABELS.has(normalizedText(element.textContent)) &&
      !Array.from(element.children).some((child) =>
        PRIMARY_SEARCH_LABELS.has(normalizedText(child.textContent)),
      ),
  );
  const relatedLabels = labelCandidates.filter((label) => {
    let container = input.parentElement;
    while (container && root.contains(container)) {
      if (
        container.contains(label) &&
        container.querySelectorAll(
          "input:not([type]), input[type='text'], input[type='search']",
        ).length === 1
      ) {
        return true;
      }
      if (container === root) {
        break;
      }
      container = container.parentElement;
    }
    return false;
  });
  return relatedLabels.length === 1 ? relatedLabels[0] : undefined;
}

function findPrimarySearch(
  root: Element,
): ClassSearchPlan["primarySearch"] {
  const inputs = Array.from(
    root.querySelectorAll<HTMLInputElement>(
      "input:not([type]), input[type='text'], input[type='search']",
    ),
  );
  const matches: Array<{
    input: HTMLInputElement;
    label?: Element;
    mode: "combined" | "subject";
  }> = [];
  for (const input of inputs) {
    const label =
      controlLabel(root, input) ?? nearbyPrimaryLabel(root, input);
    const accessibleName =
      input.getAttribute("aria-label") ??
      label?.textContent ??
      input.getAttribute("title") ??
      input.getAttribute("placeholder");
    const normalizedName = normalizedText(accessibleName);
    if (normalizedName === "subject") {
      matches.push({
        input,
        ...(label ? { label } : {}),
        mode: "subject",
      });
      continue;
    }
    if (
      normalizedName ===
      "subject catalog number title instructor names"
    ) {
      matches.push({
        input,
        ...(label ? { label } : {}),
        mode: "combined",
      });
    }
  }
  if (matches.length !== 1) {
    return undefined;
  }

  const match = matches[0];
  if (!match) {
    return undefined;
  }
  const { input, label, mode } = match;
  const searchActions = exactSearchActions(root);
  const action =
    nearestSearchAction(input, root) ??
    (searchActions.length === 1
      ? searchActions[0]
      : undefined);
  return {
    ...(action ? { action } : {}),
    input,
    ...(label ? { label } : {}),
    mode,
  };
}

function findSelectorSearch(
  root: Element,
): ClassSearchPlan["selectorSearch"] {
  const labeledControls = Array.from(
    root.querySelectorAll<HTMLSelectElement>("select"),
  ).map((control) => ({
    control,
    label: normalizedText(controlLabel(root, control)?.textContent),
  }));
  const careerControls = labeledControls.filter(({ label }) =>
    ["academic career", "career"].includes(label),
  );
  const subjectControls = labeledControls.filter(
    ({ label }) => label === "subject",
  );
  const actions = exactSearchActions(root);
  if (
    careerControls.length !== 1 ||
    subjectControls.length !== 1 ||
    actions.length !== 1
  ) {
    return undefined;
  }
  const careerControl = careerControls[0]?.control;
  const subjectControl = subjectControls[0]?.control;
  const action = actions[0];
  if (!careerControl || !subjectControl || !action) {
    return undefined;
  }
  return {
    action,
    controls: [careerControl, subjectControl],
  };
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

function findResultActions(
  root: Element,
  results: Element | undefined,
): Element | undefined {
  if (!results) {
    return undefined;
  }

  const candidates = Array.from(
    root.querySelectorAll(".ps_box-actions, form.ps_box-actions, .ps_box-group"),
  ).filter((candidate) => {
    if (
      candidate === results ||
      candidate.contains(results) ||
      results.contains(candidate) ||
      !(results.compareDocumentPosition(candidate) & Node.DOCUMENT_POSITION_FOLLOWING)
    ) {
      return false;
    }

    const actions = Array.from(
      candidate.querySelectorAll(
        "button, input[type='button'], input[type='submit'], a[role='button']",
      ),
    );
    return (
      actions.length > 0 &&
      actions.every((action) => {
        const label =
          action instanceof HTMLInputElement
            ? action.value
            : action.textContent;
        return RESULT_ACTION_NAMES.has(normalizedText(label));
      })
    );
  });

  return candidates.length === 1 ? candidates[0] : undefined;
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
      const primarySearch = findPrimarySearch(fluidFilter);
      const validationState = findValidationState(fluidFilter);
      const resultActions = findResultActions(fluidRoot, fluidResults);
      const resultRows = collectResultRows(fluidResults);
      const emptyState = findEmptyState(fluidResults, resultRows);
      return {
        ...(emptyState ? { emptyState } : {}),
        filter: fluidFilter,
        groups: [],
        results: fluidResults,
        ...(resultActions ? { resultActions } : {}),
        resultRows,
        root: fluidRoot,
        ...(primarySearch ? { primarySearch } : {}),
        ...(validationState ? { validationState } : {}),
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
      if (classicRoot) {
        const classicGroups = Array.from(
          classicRoot.querySelectorAll(".ps_box-group"),
        );
        const classicFilterGroup = classicGroups.find(
          (group) =>
            (!classicResults || !group.contains(classicResults)) &&
            Boolean(group.querySelector("select, input:not([type='hidden'])")),
        );
        const classicTitle =
          uniqueElement(
            classicRoot,
            ".ps_box-pagetitle, .PAPAGETITLE, .PATRANSACTIONTITLE, h1",
          ) ?? undefined;
        const primarySearch = findPrimarySearch(classicRoot);
        const validationState = findValidationState(classicRoot);
        const selectorSearch = classicFilterGroup
          ? findSelectorSearch(classicFilterGroup)
          : undefined;
        const classicResultsGroup = classicResults?.closest(".ps_box-group");
        const resultActions = findResultActions(classicRoot, classicResults);
        const resultRows = collectResultRows(classicResults);
        const emptyState = findEmptyState(classicResults, resultRows);
        const classicBody =
          classicFilterGroup &&
          classicResultsGroup &&
          classicRoot.contains(classicResultsGroup) &&
          classicFilterGroup.parentElement === classicResultsGroup.parentElement
            ? classicFilterGroup.parentElement ?? undefined
            : undefined;
        return {
          ...(classicBody ? { body: classicBody } : {}),
          ...(emptyState ? { emptyState } : {}),
          ...(classicResults && classicFilterGroup
            ? { filter: classicFilterGroup }
            : {}),
          form: classicForm,
          groups: classicResults ? classicGroups : [],
          ...(classicResults ? { results: classicResults } : {}),
          ...(resultActions ? { resultActions } : {}),
          resultRows,
          root: classicRoot,
          ...(primarySearch ? { primarySearch } : {}),
          ...(selectorSearch ? { selectorSearch } : {}),
          title: classicTitle,
          ...(validationState ? { validationState } : {}),
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
    const emptyState = findEmptyState(legacyResults, legacyResultRows);
    const primarySearch = findPrimarySearch(legacyRoot);
    const validationState = findValidationState(legacyRoot);
    const resultActions = findResultActions(legacyRoot, legacyResults);

    return {
      ...(body ? { body } : {}),
      ...(emptyState ? { emptyState } : {}),
      ...(legacyFilter ? { filter: legacyFilter } : {}),
      form: legacyForm,
      groups,
      ...(legacyResults ? { results: legacyResults } : {}),
      ...(resultActions ? { resultActions } : {}),
      resultRows: legacyResultRows,
      root: legacyRoot,
      ...(primarySearch ? { primarySearch } : {}),
      ...(validationState ? { validationState } : {}),
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
        if (
          group !== plan.filter &&
          group !== plan.results &&
          group !== plan.resultActions &&
          (!plan.title || !group.contains(plan.title))
        ) {
          markRegion(journal, group, "group");
        }
      }
      if (plan.filter) {
        markRegion(journal, plan.filter, "filter");
      }
      if (plan.primarySearch) {
        journal.setAttribute(
          plan.root,
          SEARCH_MODE_ATTRIBUTE,
          plan.primarySearch.mode,
        );
        markRegion(journal, plan.primarySearch.input, "primary-search-input");
        if (
          !plan.primarySearch.input.hasAttribute("aria-label") &&
          !plan.primarySearch.input.hasAttribute("aria-labelledby") &&
          (plan.primarySearch.input.labels?.length ?? 0) === 0
        ) {
          journal.setAttribute(
            plan.primarySearch.input,
            "aria-label",
            PRIMARY_SEARCH_COPY[plan.primarySearch.mode].accessibleName,
          );
        }
        if (!plan.primarySearch.input.hasAttribute("placeholder")) {
          journal.setAttribute(
            plan.primarySearch.input,
            "placeholder",
            PRIMARY_SEARCH_COPY[plan.primarySearch.mode].placeholder,
          );
        }
        if (
          !plan.primarySearch.input.hasAttribute("aria-description") &&
          !plan.primarySearch.input.hasAttribute("aria-describedby")
        ) {
          journal.setAttribute(
            plan.primarySearch.input,
            "aria-description",
            PRIMARY_SEARCH_COPY[plan.primarySearch.mode].description,
          );
        }
        if (plan.primarySearch.label) {
          markRegion(journal, plan.primarySearch.label, "primary-search-label");
        }
        if (plan.primarySearch.action) {
          markRegion(journal, plan.primarySearch.action, "primary-search-action");
        }
      }
      if (plan.selectorSearch) {
        journal.setAttribute(plan.root, SEARCH_MODE_ATTRIBUTE, "selectors");
        markRegion(
          journal,
          plan.selectorSearch.action,
          "primary-search-action",
        );
        for (const control of plan.selectorSearch.controls) {
          markRegion(journal, control, "selector-search-control");
        }
      }
      if (plan.results) {
        markRegion(journal, plan.results, "results");
      }
      if (plan.resultActions) {
        markRegion(journal, plan.resultActions, "result-actions");
        if (
          !plan.resultActions.hasAttribute("aria-label") &&
          !plan.resultActions.hasAttribute("aria-labelledby")
        ) {
          journal.setAttribute(
            plan.resultActions,
            "aria-label",
            RESULT_ACTION_LABEL,
          );
        }
      }
      if (plan.validationState) {
        markRegion(journal, plan.validationState.alert, "validation-alert");
        markRegion(journal, plan.validationState.control, "validation-control");
      }
      if (plan.emptyState) {
        markRegion(journal, plan.emptyState, "empty-status");
        if (
          !plan.emptyState.hasAttribute("aria-description") &&
          !plan.emptyState.hasAttribute("aria-describedby")
        ) {
          journal.setAttribute(
            plan.emptyState,
            "aria-description",
            EMPTY_RESULT_DESCRIPTION,
          );
        }
      }
      for (const row of plan.resultRows) {
        markRegion(journal, row, "result-row");
      }
      if (plan.title) {
        markRegion(journal, plan.title, "page-title");
      }
      focusInitialSearchControl(
        context.document,
        plan.validationState?.control ??
          plan.primarySearch?.input ??
          plan.selectorSearch?.controls.at(-1),
      );
      return createSession(
        this.id,
        journal,
        [
          plan.root,
          ...(plan.form ? [plan.form] : []),
          ...(plan.body ? [plan.body] : []),
          ...(plan.filter ? [plan.filter] : []),
          ...(plan.primarySearch
            ? [
                plan.primarySearch.input,
                ...(plan.primarySearch.label ? [plan.primarySearch.label] : []),
                ...(plan.primarySearch.action
                  ? [plan.primarySearch.action]
                  : []),
              ]
            : []),
          ...(plan.selectorSearch
            ? [
                plan.selectorSearch.action,
                ...plan.selectorSearch.controls,
              ]
            : []),
          ...(plan.results ? [plan.results] : []),
          ...(plan.resultActions ? [plan.resultActions] : []),
          ...(plan.validationState
            ? [plan.validationState.alert, plan.validationState.control]
            : []),
          ...(plan.emptyState ? [plan.emptyState] : []),
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
