import {
  PAGE_FAMILY_DEFINITIONS,
  PRIMARY_PAGE_FAMILIES,
  type PageFamily,
  type PrimaryPageFamily,
} from "./page-families";

const ALBERT_PORTAL_HOST = "sis.portal.nyu.edu";
const ALBERT_COMPONENT_HOST = "sis.nyu.edu";
const SUPPORTED_PATH = /^\/(?:psp|psc)\//i;
const CLASS_SEARCH_COMPONENTS = [
  // Fluid enrollment cart (original matched route).
  /^\/psc\/csprod\/EMPLOYEE\/SA\/c\/NYU_SR_FL\.NYU_SSENRL_CART_FL\.GBL\/?$/i,
  // Classic Class Search component (verified live: form #NYU_CLS_SRCH).
  /^\/psc\/csprod\/EMPLOYEE\/SA\/c\/NYU_SR\.NYU_CLS_SRCH\.GBL\/?$/i,
];
const AUTHENTICATION_TITLE =
  /(?:sign[ -]?in|log[ -]?in|authentication|multi-factor|mfa|duo|shibboleth|password)/i;

const FAMILY_HEADING_PATTERNS: ReadonlyArray<{
  family: PrimaryPageFamily;
  pattern: RegExp;
}> = [
  {
    family: "grades",
    pattern:
      /^(?:grades?(?:\s*&\s*transcripts?)?|transcripts?|enrollment verification|transfer credit|test scores?)$/i,
  },
  {
    family: "finances",
    pattern:
      /^(?:finances?|student accounts?|account activity|financial aid|billing|payments?)$/i,
  },
  {
    family: "personal",
    pattern:
      /^(?:personal info(?:rmation)?|profile|contact information|addresses|emergency contacts?)$/i,
  },
  {
    family: "resources",
    pattern: /^(?:other resources|resources|academic calendar|registrar)$/i,
  },
  {
    family: "academics",
    pattern:
      /^(?:academics|classes|enrollment|schedule|degree progress(?: report)?|my degree progress report|graduation(?: status)?|minor|(?:academic )?planner|what if report)$/i,
  },
  {
    family: "home",
    pattern: /^(?:home|student center|dashboard|overview)$/i,
  },
];

const SELECTED_CONTROL_SELECTOR = [
  '[aria-current="page"]',
  '[aria-selected="true"]',
  ".active",
  ".selected",
  '[class*="selected"]',
  '[class*="active"]',
].join(",");

export interface AlbertLocation {
  hostname: string;
  pathname: string;
  protocol: string;
  search?: string;
}

export interface PageDetectionContext {
  document: Document;
  relatedAlbertContext?: boolean;
  location: AlbertLocation;
  topLevel: boolean;
}

export type AlbertDocumentClassification =
  | { kind: "albert"; pageFamily: PageFamily; topLevel: boolean }
  | { kind: "authentication" }
  | { kind: "unsupported" };

function normalizedText(element: Element): string {
  return (element.textContent ?? "").replace(/\s+/g, " ").trim();
}

function familyFromLabel(label: string): PrimaryPageFamily | undefined {
  const normalizedLabel = label.toLowerCase();
  return PRIMARY_PAGE_FAMILIES.find((pageFamily) =>
    PAGE_FAMILY_DEFINITIONS[pageFamily].nativeLabels.some(
      (candidate) => candidate.toLowerCase() === normalizedLabel,
    ),
  );
}

export function hasPositiveAlbertEvidence(document: Document): boolean {
  if (document.title.trim().toLowerCase() === "albert") {
    return true;
  }

  const observedFamilies = new Set<PrimaryPageFamily>();
  for (const control of document.querySelectorAll("a, button")) {
    const family = familyFromLabel(normalizedText(control));
    if (family) {
      observedFamilies.add(family);
    }
    if (observedFamilies.size >= 2) {
      return true;
    }
  }

  return false;
}

function familyFromHeadings(document: Document): PrimaryPageFamily | undefined {
  const headings = document.querySelectorAll(
    "h1, h2, h3, [role='heading'], .PAPAGETITLE, .ps_box-pagetitle",
  );

  for (const heading of headings) {
    const headingText = normalizedText(heading);
    const match = FAMILY_HEADING_PATTERNS.find(({ pattern }) =>
      pattern.test(headingText),
    );
    if (match) {
      return match.family;
    }
  }

  return FAMILY_HEADING_PATTERNS.find(({ pattern }) =>
    pattern.test(document.title.trim()),
  )?.family;
}

export function detectPageFamily(document: Document): PageFamily {
  const fixtureFamily = document.body?.dataset.betterAlbertPage;
  if (
    fixtureFamily &&
    ([...PRIMARY_PAGE_FAMILIES, "albert"] as string[]).includes(fixtureFamily)
  ) {
    return fixtureFamily as PageFamily;
  }

  for (const control of document.querySelectorAll(SELECTED_CONTROL_SELECTOR)) {
    const family = familyFromLabel(normalizedText(control));
    if (family) {
      return family;
    }
  }

  return familyFromHeadings(document) ?? "albert";
}

export function isPotentialAlbertLocation(location: AlbertLocation): boolean {
  const isPortalPath =
    location.protocol === "https:" &&
    location.hostname === ALBERT_PORTAL_HOST &&
    SUPPORTED_PATH.test(location.pathname);

  return isPortalPath || isKnownAlbertComponentRoute(location);
}

export function isKnownAlbertComponentRoute(
  location: AlbertLocation,
): boolean {
  return (
    location.protocol === "https:" &&
    location.hostname === ALBERT_COMPONENT_HOST &&
    CLASS_SEARCH_COMPONENTS.some((pattern) => pattern.test(location.pathname))
  );
}

export function isAlbertSelfServiceRoute(location: AlbertLocation): boolean {
  if (
    location.protocol !== "https:" ||
    location.hostname !== ALBERT_PORTAL_HOST ||
    !SUPPORTED_PATH.test(location.pathname) ||
    !location.search
  ) {
    return false;
  }

  const parameters = new URLSearchParams(location.search);
  if (parameters.get("cmd")?.toLowerCase() !== "uninav") {
    return false;
  }

  const navigationPath = parameters.get("uninavpath")?.toLowerCase() ?? "";
  return (
    navigationPath.includes("nyu_sss_hidden") ||
    navigationPath.includes("student self service")
  );
}

export function isAuthenticationDocument(document: Document): boolean {
  if (AUTHENTICATION_TITLE.test(document.title)) {
    return true;
  }

  return Boolean(
    document.querySelector(
      'input[type="password"], form[action*="login" i], form[action*="signin" i], [data-better-albert-authentication]',
    ),
  );
}

export function classifyAlbertDocument({
  document,
  relatedAlbertContext = false,
  location,
  topLevel,
}: PageDetectionContext): AlbertDocumentClassification {
  if (!isPotentialAlbertLocation(location)) {
    return { kind: "unsupported" };
  }

  if (isAuthenticationDocument(document)) {
    return { kind: "authentication" };
  }

  if (
    !hasPositiveAlbertEvidence(document) &&
    !relatedAlbertContext &&
    !isKnownAlbertComponentRoute(location)
  ) {
    return { kind: "unsupported" };
  }

  return {
    kind: "albert",
    pageFamily: isKnownAlbertComponentRoute(location)
      ? "academics"
      : detectPageFamily(document),
    topLevel,
  };
}

export function isSupportedAlbertPage(context: PageDetectionContext): boolean {
  return classifyAlbertDocument(context).kind === "albert";
}
