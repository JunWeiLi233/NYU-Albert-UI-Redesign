export const PRIMARY_PAGE_FAMILIES = [
  "home",
  "academics",
  "grades",
  "finances",
  "personal",
  "resources",
] as const;

export type PrimaryPageFamily = (typeof PRIMARY_PAGE_FAMILIES)[number];
export type PageFamily = PrimaryPageFamily | "albert";

export interface PageFamilyDefinition {
  description: string;
  keywords: readonly string[];
  label: string;
  navigationHint: string;
  nativeLabels: readonly string[];
}

export const PAGE_FAMILY_DEFINITIONS: Record<
  PageFamily,
  PageFamilyDefinition
> = {
  albert: {
    label: "Albert",
    description: "Your official NYU student services workspace",
    keywords: [],
    navigationHint: "Official student services workspace",
    nativeLabels: [],
  },
  home: {
    label: "Home",
    description: "Your Albert overview and time-sensitive tasks",
    keywords: [
      "check holds",
      "course search",
      "enrollment date",
      "find a class",
      "find a course",
      "search classes",
      "see deadlines",
      "to do list",
    ],
    navigationHint: "Find classes, check holds, and review your schedule",
    nativeLabels: ["Home"],
  },
  academics: {
    label: "Academics",
    description: "Course planning, advising, enrollment, and degree progress",
    keywords: [
      "add classes",
      "advisor help",
      "contact advisor",
      "drop a class",
      "drop class",
      "find advisor",
      "meet advisor",
      "plan degree",
      "swap a class",
      "swap class",
      "who is advisor",
      "withdraw from a class",
      "what classes need",
    ],
    navigationHint:
      "Plan courses, manage enrollment, meet your advisor, and track degree progress",
    nativeLabels: ["Academics"],
  },
  grades: {
    label: "Grades & Transcripts",
    description: "Grades, transcripts, and enrollment verification",
    keywords: [
      "check grades",
      "get transcript",
      "prove enrolled",
      "see grades",
      "view grades",
      "transfer credit",
    ],
    navigationHint: "View grades, get transcripts, and prove enrollment",
    nativeLabels: ["Grades & Transcripts"],
  },
  finances: {
    label: "Finances",
    description: "Tuition balances, bills, statements, and financial aid",
    keywords: [
      "amount due",
      "check balance",
      "how much owe",
      "need help financial aid",
      "pay bill",
      "pay tuition",
      "review charges",
      "see tuition bill",
      "student account",
      "tuition due",
      "view tuition bill",
      "what owe",
    ],
    navigationHint:
      "Check balances, pay tuition, view bills, and manage financial aid",
    nativeLabels: ["Finances"],
  },
  personal: {
    label: "Personal Info",
    description: "Review official details and update contact information",
    keywords: [
      "change address",
      "change email",
      "change legal name",
      "change name",
      "change phone",
      "emergency contact",
      "preferred name",
      "new address",
      "new email address",
      "new emergency contact",
      "new phone number",
      "update contact info",
      "update address",
      "update email",
      "update emergency contact",
      "update name",
      "update phone",
    ],
    navigationHint:
      "Review official personal details or update contact information",
    nativeLabels: ["Personal Info"],
  },
  resources: {
    label: "Other Resources",
    description: "NYU services, calendars, offices, and support",
    keywords: [
      "campus events",
      "campus police",
      "campus resources",
      "counseling",
      "feeling unsafe",
      "get help",
      "getting involved",
      "libraries",
      "maps",
      "printing",
      "school id",
      "student id",
      "student id card",
      "student support",
      "student services",
      "support appointment",
      "technology help",
      "transportation",
      "wi fi",
      "wifi",
    ],
    navigationHint: "NYU services, offices, and support",
    nativeLabels: ["Other Resources", "OTHER RESOURCES"],
  },
};
