import type {
  PageFamily,
  PrimaryPageFamily,
} from "./page-families";
import { activateNativeControl } from "./native-control";
import { findNativeOtherResourcesSubmenu } from "./native-navigation";

export type PageToolId =
  | "course-search"
  | "holds-status"
  | "registration-time"
  | "todo-status"
  | "weekly-schedule"
  | "academic-planner"
  | "advisor-network"
  | "advisor-appointment"
  | "degree-progress"
  | "what-if-report"
  | "graduation-status"
  | "view-grades"
  | "enrollment-verification"
  | "myhub-enrollment-verification"
  | "test-scores"
  | "unofficial-transcript"
  | "transfer-credit"
  | "bursar-balance"
  | "bursar-account"
  | "account-statement"
  | "financial-aid-status"
  | "demographic-information"
  | "addresses"
  | "phone-numbers"
  | "email-addresses"
  | "emergency-contacts"
  | "missing-person-contact"
  | "citizenship-information"
  | "identification-information"
  | "academic-calendar"
  | "course-feedback-results"
  | "ferpa"
  | "financial-aid-resources"
  | "law-housing"
  | "nyu-card-center"
  | "nyu-brightspace"
  | "nyu-connect"
  | "nyu-summer"
  | "ogs"
  | "office-global-programs"
  | "campus-safety"
  | "replacement-diploma"
  | "university-registrar"
  | "wasserman"
  | "wellness-center"
  | "housing"
  | "student-services"
  | "campus-resources"
  | "academic-support"
  | "student-life";

export interface PageToolDefinition {
  compactDescription?: boolean;
  description: string;
  fallbackFocusRegion?: string;
  focusRegion?: string;
  id: PageToolId;
  keywords?: readonly string[];
  label: string;
  nativeLabels: readonly string[];
  taskOnly?: boolean;
}

export interface TaskToolDefinition extends PageToolDefinition {
  pageFamily: PrimaryPageFamily;
}

export type ResourceCategory =
  | "academic-records"
  | "learning-career"
  | "money-services"
  | "global"
  | "wellbeing-campus";

export interface ResourceToolDefinition extends PageToolDefinition {
  category: ResourceCategory;
  featured: boolean;
  keywords: readonly string[];
}

export const RESOURCE_CATEGORY_DEFINITIONS: Readonly<
  Record<ResourceCategory, { description: string; label: string }>
> = {
  "academic-records": {
    description: "Dates, privacy, feedback, diplomas, and records",
    label: "Academic & records",
  },
  "learning-career": {
    description: "Learning platforms, organizations, summer, and careers",
    label: "Learning & career",
  },
  "money-services": {
    description: "Financial aid and campus identity services",
    label: "Money & campus services",
  },
  global: {
    description: "International student support and study away",
    label: "Global opportunities",
  },
  "wellbeing-campus": {
    description: "Housing, safety, health, and campus support",
    label: "Wellbeing & campus life",
  },
};

export const RESOURCE_CATEGORIES = [
  "academic-records",
  "learning-career",
  "money-services",
  "global",
  "wellbeing-campus",
] as const satisfies readonly ResourceCategory[];

const PAGE_TOOL_FAMILIES = [
  "home",
  "academics",
  "grades",
  "finances",
  "personal",
] as const satisfies readonly PrimaryPageFamily[];

const RESOURCE_TOOLS: readonly ResourceToolDefinition[] = [
  {
    category: "academic-records",
    description: "Check NYU academic dates and deadlines",
    featured: true,
    id: "academic-calendar",
    keywords: [
      "academic holidays",
      "add drop deadline",
      "bursar deadline",
      "calendar",
      "classes start",
      "commencement date",
      "dates",
      "deadlines",
      "drop add deadline",
      "final exams",
      "finals",
      "first day classes",
      "last day classes",
      "pass fail deadline",
      "registration deadline",
      "school holidays",
      "semester",
      "semester start",
      "spring break",
      "when add drop deadline",
      "when classes start",
      "when final exams",
      "when finals",
      "when is spring break",
      "when withdrawal deadline",
      "withdrawal deadline",
    ],
    label: "Academic Calendar",
    nativeLabels: ["Academic Calendar"],
  },
  {
    category: "academic-records",
    description: "Review published course feedback",
    featured: false,
    id: "course-feedback-results",
    keywords: [
      "course evaluations",
      "course reviews",
      "class reviews",
      "teaching feedback",
    ],
    label: "Course Feedback Results",
    nativeLabels: ["Course Feedback Results"],
  },
  {
    category: "academic-records",
    description: "Learn about student-record privacy rights",
    featured: false,
    id: "ferpa",
    keywords: [
      "privacy",
      "student record privacy",
      "student records",
      "release information",
    ],
    label: "FERPA",
    nativeLabels: ["FERPA"],
  },
  {
    category: "academic-records",
    description: "Find replacement diploma information",
    featured: false,
    id: "replacement-diploma",
    keywords: ["diploma", "graduation document", "replace diploma"],
    label: "Replacement Diploma",
    nativeLabels: ["Replacement Diploma"],
  },
  {
    category: "academic-records",
    description: "Open registration and official records resources",
    featured: true,
    id: "university-registrar",
    keywords: [
      "enrollment",
      "get transcript",
      "official transcript",
      "order official transcript",
      "records",
      "register",
      "registration",
      "transcript",
    ],
    label: "University Registrar",
    nativeLabels: ["University Registrar"],
  },
  {
    category: "learning-career",
    description: "Open NYU's learning platform",
    featured: false,
    id: "nyu-brightspace",
    keywords: [
      "assignments",
      "class materials",
      "classes",
      "course materials",
      "courses",
      "learning management system",
      "lms",
      "syllabus",
    ],
    label: "NYU Brightspace",
    nativeLabels: ["NYU Brightspace"],
  },
  {
    category: "learning-career",
    description: "Schedule support appointments and view your Success Network",
    featured: false,
    id: "nyu-connect",
    keywords: [
      "academic coaching",
      "individualized support",
      "nyu connect",
      "request assistance",
      "schedule support appointment",
      "student success",
      "student success appointment",
      "student success specialist",
      "success network",
      "success specialist",
    ],
    label: "NYU Connect",
    nativeLabels: ["NYU Connect"],
  },
  {
    category: "learning-career",
    description: "Explore summer courses and programs",
    featured: false,
    id: "nyu-summer",
    keywords: ["summer classes", "summer term", "programs"],
    label: "NYU Summer",
    nativeLabels: ["NYU Summer"],
  },
  {
    category: "learning-career",
    description: "Find career coaching, jobs, and internships",
    featured: false,
    id: "wasserman",
    keywords: [
      "career",
      "career center",
      "career help",
      "jobs",
      "internships",
      "resume",
    ],
    label: "Wasserman",
    nativeLabels: ["Wasserman"],
  },
  {
    category: "money-services",
    description: "Open NYU financial aid resources",
    featured: false,
    id: "financial-aid-resources",
    keywords: ["financial aid", "fafsa", "scholarships", "loans"],
    label: "Financial Aid",
    nativeLabels: ["Financial Aid"],
  },
  {
    category: "money-services",
    description: "Find NYUCard, replacement, access, and Campus Cash guidance",
    featured: false,
    id: "nyu-card-center",
    keywords: [
      "id card",
      "lost id card",
      "lost nyu card",
      "lost nyu id card",
      "nyu card",
      "campus card",
      "campus cash",
      "campus cash refund",
      "replace card",
      "replace id card",
    ],
    label: "NYU Card Center",
    nativeLabels: ["NYU Card Center"],
  },
  {
    category: "global",
    description:
      "Find visa, immigration, arrival, and work-authorization guidance",
    featured: false,
    id: "ogs",
    keywords: [
      "arrival",
      "arrival check in",
      "check in",
      "cpt",
      "curricular practical training",
      "ds 2019",
      "employment authorization",
      "f 1",
      "f 1 status",
      "i 20",
      "i 94",
      "international student visa",
      "international students",
      "international student check in",
      "visa",
      "visa documents",
      "immigration",
      "immigration status",
      "j 1",
      "j 1 status",
      "maintain status",
      "maintain f 1 status",
      "maintain j 1 status",
      "new international student",
      "newly admitted international student",
      "ogs",
      "opt",
      "optional practical training",
      "pre arrival",
      "sevis",
      "scholars",
      "social security number",
      "ssn",
      "travel documents",
      "travel signature",
      "work authorization",
    ],
    label: "OGS",
    nativeLabels: ["OGS"],
  },
  {
    category: "global",
    description: "Explore study away and global opportunities",
    featured: false,
    id: "office-global-programs",
    keywords: ["study abroad", "study away", "global", "international"],
    label: "Office of Global Programs",
    nativeLabels: ["Office of Global Programs"],
  },
  {
    category: "wellbeing-campus",
    description: "Find housing information for Law students",
    featured: false,
    id: "law-housing",
    keywords: ["law school housing", "residence", "dorm"],
    label: "Law Housing",
    nativeLabels: ["Law Housing"],
  },
  {
    category: "wellbeing-campus",
    description: "Find safety services and emergency guidance",
    featured: false,
    id: "campus-safety",
    keywords: [
      "campus police",
      "emergency",
      "feel unsafe",
      "security",
      "public safety",
      "safe ride",
      "unsafe",
    ],
    label: "Campus Safety",
    nativeLabels: ["Campus Safety"],
  },
  {
    category: "wellbeing-campus",
    description: "Find NYU health and wellness support",
    featured: true,
    id: "wellness-center",
    keywords: [
      "feel sick",
      "doctor",
      "health",
      "health care",
      "health center",
      "health and counseling",
      "health insurance",
      "health records",
      "health requirements",
      "immunization",
      "immunization records",
      "make health appointment",
      "mental health",
      "mental health counseling",
      "mental health counselor",
      "mental health help",
      "mental health services",
      "medical appointment",
      "medical records",
      "need counseling",
      "need care now",
      "counseling",
      "counseling center",
      "counselor",
      "medical",
      "pharmacy",
      "prescription",
      "psychologist",
      "same day care",
      "student health",
      "student health insurance",
      "submit immunization records",
      "therapy",
      "therapist",
      "urgent care",
      "vaccination",
      "vaccine requirements",
    ],
    label: "Wellness Center",
    nativeLabels: ["Wellness Center"],
  },
  {
    category: "wellbeing-campus",
    description: "Find housing, residence halls, dining, and meal plans",
    featured: true,
    id: "housing",
    keywords: [
      "apply for housing",
      "accessible housing",
      "campus dining",
      "dining",
      "dining hall",
      "dining locations",
      "find housing",
      "food on campus",
      "housing",
      "housing application",
      "housing accommodation",
      "housing accommodations",
      "housing assignment",
      "housing portal",
      "housing maintenance",
      "meal plan",
      "meal plans",
      "move in",
      "move-in",
      "need housing",
      "on campus housing",
      "residence",
      "residence hall",
      "residence halls",
      "dorm",
      "room",
      "room assignment",
      "room change",
    ],
    label: "Housing",
    nativeLabels: ["Housing"],
  },
  {
    category: "wellbeing-campus",
    description: "Find general student services and support",
    featured: false,
    id: "student-services",
    keywords: [
      "general help",
      "help with nyu",
      "need help",
      "student help",
      "student services",
      "student success",
      "student support",
      "support",
    ],
    label: "Student Services",
    nativeLabels: ["Student Services"],
  },
  {
    category: "wellbeing-campus",
    description:
      "Find technology, accessibility, libraries, bookstores, mail, and facilities",
    featured: false,
    id: "campus-resources",
    keywords: [
      "accessibility",
      "accessibility center",
      "accessibility services",
      "accommodation letter",
      "accommodations",
      "academic accommodation",
      "academic accommodations",
      "assistive technology",
      "campus help",
      "campus map",
      "campus services",
      "bookstore",
      "buy textbooks",
      "campus bookstore",
      "campus mail",
      "computer lab",
      "computer store",
      "connect wifi",
      "copy services",
      "disability",
      "disability accommodations",
      "disability services",
      "disabled student support",
      "duo",
      "get on wi-fi",
      "get on wifi",
      "information technology",
      "it help",
      "it service desk",
      "libraries",
      "library",
      "locker",
      "lockers",
      "mail and packages",
      "mail services",
      "maintenance",
      "mfa",
      "moses center",
      "netid",
      "nyu email",
      "nyu bookstore",
      "nyu it",
      "nyu wifi",
      "print",
      "printer",
      "printing",
      "resources",
      "repair",
      "shuttle",
      "software",
      "study space",
      "textbooks",
      "testing accommodation",
      "testing accommodations",
      "tech help",
      "tech support",
      "technology",
      "transportation",
      "vpn",
      "wifi",
      "wi-fi",
      "404 fitness",
      "athletic facility",
      "facilities",
      "facilities and operations",
      "fitness center",
      "fix it",
      "gym",
      "package pickup",
      "palladium gym",
      "pick up package",
    ],
    label: "Campus Resources",
    nativeLabels: ["Campus Resources"],
  },
  {
    category: "wellbeing-campus",
    description: "Find tutoring and academic support",
    featured: false,
    id: "academic-support",
    keywords: ["academic help", "study help", "tutoring"],
    label: "Academic Support",
    nativeLabels: ["Academic Support"],
  },
  {
    category: "wellbeing-campus",
    description: "Find clubs, activities, and community support",
    featured: false,
    id: "student-life",
    keywords: [
      "activities",
      "campus clubs",
      "campus events",
      "campus life",
      "campus organizations",
      "clubs",
      "commuter",
      "commuter student",
      "commuter student support",
      "events",
      "faith community",
      "get involved",
      "getting involved",
      "graduate student",
      "graduate student support",
      "lgbtq",
      "lgbtq center",
      "military student",
      "multicultural center",
      "off campus student",
      "off campus student support",
      "religious life",
      "spiritual life",
      "student activities",
      "student clubs",
      "student organizations",
      "student parent",
      "student parent support",
      "students of color",
      "students with children",
      "transfer student",
      "transfer student support",
      "veteran",
      "veteran student",
    ],
    label: "Student Life",
    nativeLabels: ["Student Life"],
  },
];

const PAGE_TOOLS: Record<PageFamily, readonly PageToolDefinition[]> = {
  albert: [],
  home: [
    {
      description: "Search by subject, course number, title, or instructor",
      id: "course-search",
      keywords: [
        "add classes",
        "class registration",
        "class located",
        "class location",
        "classroom",
        "classroom location",
        "course search",
        "enroll",
        "find a class",
        "find a course",
        "look up course",
        "register",
        "register classes",
        "search classes",
        "sign up classes",
      ],
      label: "Find Classes",
      nativeLabels: ["Course Search"],
    },
    {
      description: "Review current registration holds",
      focusRegion: "holds-status",
      id: "holds-status",
      keywords: ["check holds", "hold status", "registration hold"],
      label: "Check Holds",
      nativeLabels: [],
    },
    {
      description: "Check when you can register",
      focusRegion: "registration-time",
      id: "registration-time",
      keywords: [
        "enrollment appointment",
        "enrollment dates",
        "registration date",
        "registration time",
        "when can i register",
      ],
      label: "When Can I Register?",
      nativeLabels: [],
    },
    {
      description: "Review current required actions",
      focusRegion: "todo-status",
      id: "todo-status",
      keywords: ["required actions", "tasks", "to do list"],
      label: "Review To-Do List",
      nativeLabels: [],
      taskOnly: true,
    },
    {
      description: "Review your class week",
      id: "weekly-schedule",
      keywords: [
        "class schedule",
        "classes taking",
        "classes today",
        "current classes",
        "show classes",
        "timetable",
        "when are my classes",
      ],
      label: "Weekly Schedule",
      nativeLabels: ["Weekly Schedule"],
    },
  ],
  academics: [
    {
      description: "Open Albert's Academic Planner",
      id: "academic-planner",
      label: "Plan Future Courses",
      nativeLabels: ["Academic Planner"],
    },
    {
      description: "Review your native advising network",
      focusRegion: "advising-section",
      id: "advisor-network",
      keywords: [
        "academic advisor",
        "advisor contact",
        "advisor email",
        "advising network",
        "find my advisor",
        "who is my advisor",
      ],
      label: "Find My Advisor",
      nativeLabels: [],
    },
    {
      description: "Schedule time with your academic advisor",
      id: "advisor-appointment",
      keywords: [
        "advising help",
        "meet advisor",
        "schedule advisor",
        "talk to advisor",
      ],
      label: "Schedule Advisor Meeting",
      nativeLabels: ["Schedule an Advisor Appointment"],
    },
    {
      description: "Review remaining degree requirements",
      id: "degree-progress",
      keywords: ["classes need", "degree requirements", "remaining requirements"],
      label: "Check Degree Progress",
      nativeLabels: ["Degree Progress Report"],
    },
    {
      compactDescription: true,
      description: "Use Albert's What If Report",
      id: "what-if-report",
      label: "Explore Another Program",
      nativeLabels: ["What If Report"],
    },
    {
      description: "Review your graduation progress",
      id: "graduation-status",
      label: "Check Graduation Status",
      nativeLabels: ["View My Graduation Status"],
    },
  ],
  grades: [
    {
      description: "Choose an academic career and term",
      focusRegion: "grade-viewer",
      id: "view-grades",
      keywords: ["grades", "see grades", "view grades"],
      label: "View Grades",
      nativeLabels: [],
    },
    {
      compactDescription: true,
      description: "Request proof through National Student Clearinghouse",
      id: "enrollment-verification",
      keywords: [
        "enrollment verification letter",
        "get proof of enrollment",
        "proof of student status",
        "prove enrolled",
        "student status",
        "verification letter",
      ],
      label: "Proof of Enrollment",
      nativeLabels: ["Enrollment Verification"],
    },
    {
      compactDescription: true,
      description: "View or share enrollment records in MyHub",
      id: "myhub-enrollment-verification",
      label: "Share Enrollment in MyHub",
      nativeLabels: ["MyHub-Enrollment Verification"],
    },
    {
      description: "Review test scores recorded by NYU",
      id: "test-scores",
      label: "View Test Scores",
      nativeLabels: ["Test Scores"],
    },
    {
      description: "View an unofficial academic record",
      id: "unofficial-transcript",
      keywords: ["get transcript", "view transcript"],
      label: "Get Unofficial Transcript",
      nativeLabels: ["Transcripts Unofficial", "Unofficial Transcript"],
    },
    {
      description: "Review coursework transferred to NYU",
      id: "transfer-credit",
      label: "Review Transfer Credit",
      nativeLabels: ["Transfer Credit Report", "Transfer Credit"],
    },
  ],
  finances: [
    {
      compactDescription: true,
      description: "See what you currently owe NYU",
      id: "bursar-balance",
      keywords: [
        "amount due",
        "how much owe",
        "tuition balance",
        "what owe",
      ],
      label: "Check Account Balance",
      nativeLabels: ["View Bursar Balance"],
    },
    {
      compactDescription: true,
      description: "Pay tuition or review charges in NYU eSuite",
      id: "bursar-account",
      keywords: [
        "account charges",
        "bill payment",
        "make a payment",
        "pay charges",
        "pay tuition",
        "review charges",
        "see tuition bill",
        "tuition bill",
        "tuition charges",
        "view tuition bill",
      ],
      label: "Pay Tuition & View Bills",
      nativeLabels: ["View Bursar Account (log into eSuite)"],
    },
    {
      compactDescription: true,
      description: "Open your official account statement",
      id: "account-statement",
      label: "Get Account Statement",
      nativeLabels: ["Print Official Statement Of Account"],
    },
    {
      compactDescription: true,
      description: "Review aid status and requirements",
      fallbackFocusRegion: "aid-section",
      id: "financial-aid-status",
      label: "Check Financial Aid Status",
      nativeLabels: ["View Financial Aid Status"],
    },
  ],
  personal: [
    {
      description: "Review official demographic information",
      id: "demographic-information",
      keywords: ["personal details", "preferred name"],
      label: "Review Personal Details",
      nativeLabels: ["Demographic Information"],
    },
    {
      description: "Change or review a saved address in Albert",
      id: "addresses",
      keywords: [
        "change address",
        "mailing address",
        "move",
        "new address",
        "update address",
      ],
      label: "Update Addresses",
      nativeLabels: ["Edit Addresses"],
    },
    {
      description: "Change or review a saved phone number in Albert",
      id: "phone-numbers",
      keywords: [
        "change phone number",
        "mobile number",
        "need change phone number",
        "new phone number",
        "update phone number",
      ],
      label: "Update Phone Numbers",
      nativeLabels: ["Edit Phone Numbers"],
    },
    {
      description: "Change or review a saved email in Albert",
      id: "email-addresses",
      keywords: [
        "change email",
        "email address",
        "new email address",
        "update email address",
      ],
      label: "Update Email Addresses",
      nativeLabels: ["Edit Email Addresses"],
    },
    {
      description: "Change or review a saved emergency contact in Albert",
      id: "emergency-contacts",
      keywords: [
        "change emergency contact",
        "family contact",
        "new emergency contact",
        "update emergency contact",
        "who is emergency contact",
      ],
      label: "Update Emergency Contacts",
      nativeLabels: ["Edit Emergency Contacts"],
    },
    {
      description: "Review your saved missing person contact",
      focusRegion: "missing-person-section",
      id: "missing-person-contact",
      keywords: ["missing person", "missing person contact"],
      label: "Review Missing Person Contact",
      nativeLabels: [],
      taskOnly: true,
    },
    {
      description: "Review citizenship information in Albert",
      focusRegion: "citizenship-section",
      id: "citizenship-information",
      keywords: ["citizenship", "citizenship status"],
      label: "Review Citizenship Information",
      nativeLabels: [],
      taskOnly: true,
    },
    {
      description: "Review identification information in Albert",
      focusRegion: "identifier-section",
      id: "identification-information",
      keywords: ["identification", "national id"],
      label: "Review Identification Information",
      nativeLabels: [],
      taskOnly: true,
    },
  ],
  resources: [],
};

const ALL_PAGE_TOOL_DEFINITIONS = PAGE_TOOL_FAMILIES.flatMap(
  (pageFamily) => PAGE_TOOLS[pageFamily],
);

const VERIFIED_TOOL_CONTAINERS = [
  ".is_bb_LinkContainer",
  ".is_bb_LinkColumn",
  ".is_bb_LinkItem",
  ".isSSS_Main.selected #IS_AC_RESPONSE .isSSS_FullW.isSSS_ShopCart.selected",
  ".isSSS_Main.selected #IS_AC_RESPONSE #NYUBursarDisplay",
  ".isSSS_Main.selected #IS_AC_RESPONSE #NYUFinancialAidDisplay",
  ".isSSS_Main.selected #IS_AC_RESPONSE [data-better-albert-region='advising-section']",
  ".isSSS_Main.selected #IS_AC_RESPONSE [data-better-albert-region='address-section']",
  ".isSSS_Main.selected #IS_AC_RESPONSE [data-better-albert-region='phone-section']",
  ".isSSS_Main.selected #IS_AC_RESPONSE [data-better-albert-region='email-section']",
  ".isSSS_Main.selected #IS_AC_RESPONSE [data-better-albert-region='emergency-section']",
  "[data-better-albert-tools]",
].join(",");

function normalizeLabel(value: string | null): string {
  return value?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
}

function isPageToolControl(
  element: Element,
): element is HTMLAnchorElement | HTMLButtonElement {
  return element.tagName === "A" || element.tagName === "BUTTON";
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
        isPageToolControl(element) &&
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

function findToolTarget(
  document: Document,
  definition: PageToolDefinition,
): Element | undefined {
  const control = findToolControl(document, definition);
  if (control) {
    return control;
  }

  const focusRegion =
    definition.focusRegion ?? definition.fallbackFocusRegion;
  if (!focusRegion) {
    return undefined;
  }
  const matches = Array.from(
    document.querySelectorAll(
      `[data-better-albert-region="${focusRegion}"]`,
    ),
  ).filter(
    (element) =>
      element.isConnected &&
      element.ownerDocument === document &&
      !isHiddenByNativePage(element, document) &&
      !element.matches(":disabled, [disabled], [aria-disabled='true']"),
  );
  return matches.length === 1 ? matches[0] : undefined;
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

export function isFullyMirroredPageToolDirectory(
  document: Document,
  directory: Element,
): boolean {
  if (!directory.isConnected || directory.ownerDocument !== document) {
    return false;
  }

  const actionableControls = Array.from(
    directory.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>(
      "a, button",
    ),
  ).filter(
    (control) =>
      !isHiddenByNativePage(control, document) &&
      !control.matches(":disabled, [disabled], [aria-disabled='true']"),
  );
  if (actionableControls.length === 0) {
    return false;
  }

  return actionableControls.every((control) => {
    const label = normalizeLabel(
      control.textContent ?? control.getAttribute("aria-label"),
    );
    const matchingDefinitions = ALL_PAGE_TOOL_DEFINITIONS.filter(
      (definition) =>
        definition.nativeLabels.some(
          (nativeLabel) => normalizeLabel(nativeLabel) === label,
        ),
    );

    return (
      matchingDefinitions.length === 1 &&
      findToolControl(document, matchingDefinitions[0]!) === control
    );
  });
}

export function getAvailablePageTools(
  document: Document,
  pageFamily: PageFamily,
): PageToolDefinition[] {
  return PAGE_TOOLS[pageFamily].filter(
    (definition) =>
      !definition.taskOnly && Boolean(findToolTarget(document, definition)),
  );
}

export function getAvailableTaskTools(
  document: Document,
): TaskToolDefinition[] {
  return PAGE_TOOL_FAMILIES.flatMap((pageFamily) =>
    PAGE_TOOLS[pageFamily]
      .filter((definition) => Boolean(findToolTarget(document, definition)))
      .map((definition) => ({ ...definition, pageFamily })),
  );
}

export function openNativePageTool(
  document: Document,
  toolId: PageToolId,
): boolean {
  const definition = ALL_PAGE_TOOL_DEFINITIONS.find(
    ({ id }) => id === toolId,
  );
  if (!definition) {
    return false;
  }

  const target = findToolTarget(document, definition);
  if (!target) {
    return false;
  }

  if (!isPageToolControl(target)) {
    if (!definition.focusRegion && !definition.fallbackFocusRegion) {
      return false;
    }
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    target.focus({ preventScroll: true });
    target.scrollIntoView?.({ block: "center", inline: "nearest" });
    return true;
  }

  activateNativeControl(target);
  return true;
}

export function getAvailableResourceTools(
  document: Document,
): ResourceToolDefinition[] {
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
