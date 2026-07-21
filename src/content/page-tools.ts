import type {
  PageFamily,
  PrimaryPageFamily,
} from "./page-families";
import { activateNativeControl } from "./native-control";
import { findNativeOtherResourcesSubmenu } from "./native-navigation";

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
  description: string;
  id: PageToolId;
  label: string;
  nativeLabels: readonly string[];
}

export interface TaskToolDefinition extends PageToolDefinition {
  pageFamily: PrimaryPageFamily;
}

const PAGE_TOOL_FAMILIES = [
  "home",
  "academics",
  "grades",
  "finances",
  "personal",
] as const satisfies readonly PrimaryPageFamily[];

const RESOURCE_TOOLS: readonly PageToolDefinition[] = [
  {
    description: "Check NYU academic dates and deadlines",
    id: "academic-calendar",
    label: "Academic Calendar",
    nativeLabels: ["Academic Calendar"],
  },
  {
    description: "Open registration and records resources",
    id: "university-registrar",
    label: "University Registrar",
    nativeLabels: ["University Registrar"],
  },
  {
    description: "Find NYU health and wellness support",
    id: "wellness-center",
    label: "Wellness Center",
    nativeLabels: ["Wellness Center"],
  },
  {
    description: "Open NYU housing resources",
    id: "housing",
    label: "Housing",
    nativeLabels: ["Housing"],
  },
];

const PAGE_TOOLS: Record<PageFamily, readonly PageToolDefinition[]> = {
  albert: [],
  home: [
    {
      description: "Find classes for an upcoming term",
      id: "course-search",
      label: "Course Search",
      nativeLabels: ["Course Search"],
    },
    {
      description: "Review your class week",
      id: "weekly-schedule",
      label: "Weekly Schedule",
      nativeLabels: ["Weekly Schedule"],
    },
  ],
  academics: [
    {
      description: "Plan courses across future terms",
      id: "academic-planner",
      label: "Academic Planner",
      nativeLabels: ["Academic Planner"],
    },
    {
      description: "Track progress toward degree requirements",
      id: "degree-progress",
      label: "Degree Progress",
      nativeLabels: ["Degree Progress Report"],
    },
    {
      description: "Explore requirements for another program",
      id: "what-if-report",
      label: "What If Report",
      nativeLabels: ["What If Report"],
    },
    {
      description: "Review your graduation progress",
      id: "graduation-status",
      label: "Graduation Status",
      nativeLabels: ["View My Graduation Status"],
    },
  ],
  grades: [
    {
      description: "Request official proof of enrollment",
      id: "enrollment-verification",
      label: "Enrollment Verification",
      nativeLabels: ["Enrollment Verification", "MyHub-Enrollment Verification"],
    },
    {
      description: "Review test scores recorded by NYU",
      id: "test-scores",
      label: "Test Scores",
      nativeLabels: ["Test Scores"],
    },
    {
      description: "View an unofficial academic record",
      id: "unofficial-transcript",
      label: "Unofficial Transcript",
      nativeLabels: ["Transcripts Unofficial", "Unofficial Transcript"],
    },
    {
      description: "Review coursework transferred to NYU",
      id: "transfer-credit",
      label: "Transfer Credit",
      nativeLabels: ["Transfer Credit Report", "Transfer Credit"],
    },
  ],
  finances: [
    {
      description: "Review your current bursar balance",
      id: "bursar-balance",
      label: "Bursar Balance",
      nativeLabels: ["View Bursar Balance"],
    },
    {
      description: "Open your official account statement",
      id: "account-statement",
      label: "Account Statement",
      nativeLabels: ["Print Official Statement Of Account"],
    },
    {
      description: "Review aid status and requirements",
      id: "financial-aid-status",
      label: "Financial Aid Status",
      nativeLabels: ["View Financial Aid Status"],
    },
  ],
  personal: [
    {
      description: "Review official demographic details",
      id: "demographic-information",
      label: "Demographic Information",
      nativeLabels: ["Demographic Information"],
    },
    {
      description: "Review or update saved addresses",
      id: "addresses",
      label: "Addresses",
      nativeLabels: ["Addresses"],
    },
    {
      description: "Review or update phone numbers",
      id: "phone-numbers",
      label: "Phone Numbers",
      nativeLabels: ["Phone Numbers"],
    },
    {
      description: "Review or update email addresses",
      id: "email-addresses",
      label: "Email Addresses",
      nativeLabels: ["Email Addresses"],
    },
    {
      description: "Review or update emergency contacts",
      id: "emergency-contacts",
      label: "Emergency Contacts",
      nativeLabels: ["Emergency Contacts"],
    },
  ],
  resources: [],
};

const VERIFIED_TOOL_CONTAINERS = [
  ".is_bb_LinkContainer",
  ".is_bb_LinkColumn",
  ".is_bb_LinkItem",
  ".isSSS_Main.selected #IS_AC_RESPONSE .isSSS_FullW.isSSS_ShopCart.selected",
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
  const matches = new Set<HTMLAnchorElement | HTMLButtonElement>();

  for (const container of document.querySelectorAll(VERIFIED_TOOL_CONTAINERS)) {
    for (const element of container.querySelectorAll("a, button")) {
      if (
        (element instanceof HTMLAnchorElement ||
          element instanceof HTMLButtonElement) &&
        element.isConnected &&
        element.ownerDocument === document &&
        !isHiddenByNativePage(element, document) &&
        !element.matches(":disabled, [disabled], [aria-disabled='true']") &&
        expectedLabels.has(
          normalizeLabel(
            element.textContent ?? element.getAttribute("aria-label"),
          ),
        )
      ) {
        matches.add(element);
      }
    }
  }

  return matches.size === 1 ? matches.values().next().value : undefined;
}

function findResourceToolControl(
  document: Document,
  definition: PageToolDefinition,
): HTMLAnchorElement | undefined {
  const submenu = findNativeOtherResourcesSubmenu(document);
  if (!submenu) {
    return undefined;
  }

  const expectedLabels = new Set(definition.nativeLabels.map(normalizeLabel));
  const matches = Array.from(
    submenu.querySelectorAll<HTMLAnchorElement>(":scope > ul > li > a"),
  ).filter((anchor) =>
    expectedLabels.has(
      normalizeLabel(anchor.textContent ?? anchor.getAttribute("aria-label")),
    ),
  );
  if (matches.length !== 1) {
    return undefined;
  }

  const control = matches[0];
  if (
    !control ||
    !control.isConnected ||
    control.ownerDocument !== document ||
    control.matches("[disabled], [aria-disabled='true']")
  ) {
    return undefined;
  }

  return control;
}

export function getAvailablePageTools(
  document: Document,
  pageFamily: PageFamily,
): PageToolDefinition[] {
  return PAGE_TOOLS[pageFamily].filter((definition) =>
    Boolean(findToolControl(document, definition)),
  );
}

export function getAvailableTaskTools(
  document: Document,
): TaskToolDefinition[] {
  return PAGE_TOOL_FAMILIES.flatMap((pageFamily) =>
    PAGE_TOOLS[pageFamily]
      .filter((definition) => Boolean(findToolControl(document, definition)))
      .map((definition) => ({ ...definition, pageFamily })),
  );
}

export function openNativePageTool(
  document: Document,
  toolId: PageToolId,
): boolean {
  const definition = PAGE_TOOL_FAMILIES.flatMap(
    (pageFamily) => PAGE_TOOLS[pageFamily],
  ).find(({ id }) => id === toolId);
  if (!definition) {
    return false;
  }

  const control = findToolControl(document, definition);
  if (!control) {
    return false;
  }

  activateNativeControl(control);
  return true;
}

export function getAvailableResourceTools(
  document: Document,
): PageToolDefinition[] {
  return RESOURCE_TOOLS.filter((definition) =>
    Boolean(findResourceToolControl(document, definition)),
  );
}

export function openNativeResourceTool(
  document: Document,
  toolId: PageToolId,
): boolean {
  const definition = RESOURCE_TOOLS.find(({ id }) => id === toolId);
  if (!definition) {
    return false;
  }

  const control = findResourceToolControl(document, definition);
  if (!control) {
    return false;
  }

  activateNativeControl(control);
  return true;
}
