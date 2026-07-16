import type { PageFamily } from "./page-families";
import { activateNativeControl } from "./native-control";

export type PageToolId =
  | "course-search"
  | "weekly-schedule"
  | "academic-planner"
  | "degree-progress"
  | "what-if-report"
  | "graduation-status"
  | "enrollment-verification"
  | "test-scores"
  | "unofficial-transcript"
  | "transfer-credit"
  | "bursar-balance"
  | "account-statement"
  | "financial-aid-status"
  | "demographic-information"
  | "addresses"
  | "phone-numbers"
  | "email-addresses"
  | "emergency-contacts"
  | "academic-calendar"
  | "university-registrar"
  | "wellness-center"
  | "housing";

export interface PageToolDefinition {
  id: PageToolId;
  label: string;
  nativeLabels: readonly string[];
}

const PAGE_TOOLS: Record<PageFamily, readonly PageToolDefinition[]> = {
  albert: [],
  home: [
    {
      id: "course-search",
      label: "Course Search",
      nativeLabels: ["Course Search"],
    },
    {
      id: "weekly-schedule",
      label: "Weekly Schedule",
      nativeLabels: ["Weekly Schedule"],
    },
  ],
  academics: [
    {
      id: "academic-planner",
      label: "Academic Planner",
      nativeLabels: ["Academic Planner"],
    },
    {
      id: "degree-progress",
      label: "Degree Progress",
      nativeLabels: ["Degree Progress Report"],
    },
    {
      id: "what-if-report",
      label: "What If Report",
      nativeLabels: ["What If Report"],
    },
    {
      id: "graduation-status",
      label: "Graduation Status",
      nativeLabels: ["View My Graduation Status"],
    },
  ],
  grades: [
    {
      id: "enrollment-verification",
      label: "Enrollment Verification",
      nativeLabels: ["Enrollment Verification", "MyHub-Enrollment Verification"],
    },
    {
      id: "test-scores",
      label: "Test Scores",
      nativeLabels: ["Test Scores"],
    },
    {
      id: "unofficial-transcript",
      label: "Unofficial Transcript",
      nativeLabels: ["Transcripts Unofficial", "Unofficial Transcript"],
    },
    {
      id: "transfer-credit",
      label: "Transfer Credit",
      nativeLabels: ["Transfer Credit Report", "Transfer Credit"],
    },
  ],
  finances: [
    {
      id: "bursar-balance",
      label: "Bursar Balance",
      nativeLabels: ["View Bursar Balance"],
    },
    {
      id: "account-statement",
      label: "Account Statement",
      nativeLabels: ["Print Official Statement Of Account"],
    },
    {
      id: "financial-aid-status",
      label: "Financial Aid Status",
      nativeLabels: ["View Financial Aid Status"],
    },
  ],
  personal: [
    {
      id: "demographic-information",
      label: "Demographic Information",
      nativeLabels: ["Demographic Information"],
    },
    {
      id: "addresses",
      label: "Addresses",
      nativeLabels: ["Addresses"],
    },
    {
      id: "phone-numbers",
      label: "Phone Numbers",
      nativeLabels: ["Phone Numbers"],
    },
    {
      id: "email-addresses",
      label: "Email Addresses",
      nativeLabels: ["Email Addresses"],
    },
    {
      id: "emergency-contacts",
      label: "Emergency Contacts",
      nativeLabels: ["Emergency Contacts"],
    },
  ],
  resources: [
    {
      id: "academic-calendar",
      label: "Academic Calendar",
      nativeLabels: ["Academic Calendar"],
    },
    {
      id: "university-registrar",
      label: "University Registrar",
      nativeLabels: ["University Registrar"],
    },
    {
      id: "wellness-center",
      label: "Wellness Center",
      nativeLabels: ["Wellness Center"],
    },
    {
      id: "housing",
      label: "Housing",
      nativeLabels: ["Housing"],
    },
  ],
};

const VERIFIED_TOOL_CONTAINERS = [
  ".is_bb_LinkContainer",
  ".is_bb_LinkColumn",
  ".is_bb_LinkItem",
  "[data-better-albert-tools]",
].join(",");

function normalizeLabel(value: string | null): string {
  return value?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
}

function isHiddenByNativePage(element: Element, document: Document): boolean {
  for (let current: Element | null = element; current; current = current.parentElement) {
    if (
      current.hasAttribute("hidden") ||
      current.getAttribute("aria-hidden") === "true"
    ) {
      return true;
    }

    const style = document.defaultView?.getComputedStyle(current);
    if (style?.display === "none" || style?.visibility === "hidden") {
      return true;
    }
  }

  return false;
}

function findToolControl(
  document: Document,
  definition: PageToolDefinition,
): HTMLAnchorElement | HTMLButtonElement | undefined {
  const expectedLabels = new Set(definition.nativeLabels.map(normalizeLabel));

  for (const container of document.querySelectorAll(VERIFIED_TOOL_CONTAINERS)) {
    for (const element of container.querySelectorAll("a, button")) {
      if (
        (element instanceof HTMLAnchorElement ||
          element instanceof HTMLButtonElement) &&
        !isHiddenByNativePage(element, document) &&
        expectedLabels.has(
          normalizeLabel(
            element.textContent ?? element.getAttribute("aria-label"),
          ),
        )
      ) {
        return element;
      }
    }
  }

  return undefined;
}

export function getAvailablePageTools(
  document: Document,
  pageFamily: PageFamily,
): PageToolDefinition[] {
  return PAGE_TOOLS[pageFamily].filter((definition) =>
    Boolean(findToolControl(document, definition)),
  );
}

export function openNativePageTool(
  document: Document,
  pageFamily: PageFamily,
  toolId: PageToolId,
): boolean {
  const definition = PAGE_TOOLS[pageFamily].find(({ id }) => id === toolId);
  if (!definition) {
    return false;
  }

  const control = findToolControl(document, definition);
  if (!control || control.matches(":disabled, [aria-disabled='true']")) {
    return false;
  }

  activateNativeControl(control);
  return true;
}
