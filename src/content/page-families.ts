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
  label: string;
  nativeLabels: readonly string[];
}

export const PAGE_FAMILY_DEFINITIONS: Record<
  PageFamily,
  PageFamilyDefinition
> = {
  albert: {
    label: "Albert",
    description: "Your official NYU student services workspace",
    nativeLabels: [],
  },
  home: {
    label: "Home",
    description: "Your Albert overview and time-sensitive tasks",
    nativeLabels: ["Home"],
  },
  academics: {
    label: "Academics",
    description: "Classes, enrollment, schedules, and degree progress",
    nativeLabels: ["Academics"],
  },
  grades: {
    label: "Grades & Transcripts",
    description: "Official academic records and verification tools",
    nativeLabels: ["Grades & Transcripts"],
  },
  finances: {
    label: "Finances",
    description: "Official account and financial service pages",
    nativeLabels: ["Finances"],
  },
  personal: {
    label: "Personal Info",
    description: "Official profile and contact-information pages",
    nativeLabels: ["Personal Info"],
  },
  resources: {
    label: "Other Resources",
    description: "NYU services, calendars, offices, and support",
    nativeLabels: ["Other Resources", "OTHER RESOURCES"],
  },
};
