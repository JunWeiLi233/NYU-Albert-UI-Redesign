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
  | "pronouns"
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
  /**
   * Permit the original page-owned javascript: URL to run for an exact,
   * non-transactional destination. Most javascript: controls stay guarded so
   * a shortcut cannot accidentally submit a form or trigger an unknown action.
   */
  allowJavascriptUrl?: boolean;
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
      "browse important dates and deadlines",
      "view important dates and schedules",
      "additional important dates and deadlines",
      "drop add deadline",
      "final exams",
      "finals",
      "first day classes",
      "last day classes",
      "pass fail deadline",
      "pass fail grade option",
      "pass fail grade option deadline",
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
      "order transcript",
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
      "access course materials and collaborate with your class",
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
      "personalized support",
      "nyu connect",
      "book an appointment with nyu connect",
      "request assistance",
      "resources for student success",
      "connect with a student success specialist for personalized support",
      "navigating college and nyu",
      "organization support",
      "time management tips",
      "coaching and mentoring",
      "success toolbox",
      "your success toolbox essential guides and resources for navigating nyu",
      "time management guide",
      "make a one on one appointment and find tips for remote learning",
      "find tips for remote learning",
      "centralized online platform",
      "centralized online platform that provides a holistic approach to ensuring student success across the university",
      "individualized guidance",
      "academic coaching individualized guidance technological resources",
      "schedule support appointment",
      "student success",
      "student success appointment",
      "student success specialist",
      "success network",
      "success specialist",
      "get support from a student success specialist",
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
      "career development and jobs",
      "career development",
      "career portal",
      "wasserman career portal",
      "career help",
      "career coach",
      "career coaching",
      "career appointments",
      "schedule an appointment with a career coach",
      "career online modules",
      "career seminars",
      "career development process",
      "career development mentorship entrepreneurship",
      "career development mentorship entrepreneurship opportunities",
      "stay connected with career development mentorship entrepreneurship",
      "employers",
      "employer services",
      "alumni services",
      "alumni career services",
      "campus partners",
      "career preparation",
      "explore career resources",
      "prepare career resources",
      "connect with alumni",
      "connect with employers",
      "entrepreneurship resources",
      "find a job or internship",
      "student employment",
      "student jobs",
      "campus employment",
      "campus job",
      "prepare for the job search",
      "job search",
      "on-campus employment",
      "on-campus employment and work-study positions",
      "work-study",
      "jobs",
      "internships",
      "experiential learning",
      "career hubs",
      "global career hub",
      "internship coordinator directory",
      "handshake",
      "vault",
      "focus 2 career",
      "violet network",
      "resume guide and samples",
      "cover letter guide and samples",
      "networking guide",
      "interviewing skills",
      "salary negotiation guide",
      "avoid job market traps",
      "how to avoid job scams",
      "fraudulent job postings",
      "important considerations before accepting a job or internship",
      "headshot photo booth and career closet",
      "career outcomes surveys",
      "grants scholarships and fellowships",
      "undergraduate students",
      "graduate students",
      "resume",
      "social impact career hub",
    ],
    label: "Wasserman",
    nativeLabels: ["Wasserman"],
  },
  {
    category: "money-services",
    description: "Open NYU financial aid resources",
    featured: false,
    id: "financial-aid-resources",
    keywords: [
      "financial aid",
      "financial aid appointment",
      "fafsa",
      "scholarships",
      "loans",
    ],
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
      "campus cash and nyu card",
      "campus cash and nyucard",
      "campus cash nyu card",
      "school id",
      "student id",
      "student id card",
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
      "international student services",
      "international student employment",
      "international office",
      "office of global services",
      "global services",
      "global services opportunities",
      "stay connected with global services",
      "visa information and programs",
      "student visa and immigration",
      "student visa immigration",
      "get a us visa",
      "transfer to nyu",
      "incoming international students obtain f 1 or j 1 status",
      "plan your trip",
      "international student fees",
      "fees that apply to international students",
      "packing tips",
      "pre orientation",
      "pre orientation events",
      "us immigration requirements training",
      "ogs pre arrival eforms",
      "journey to nyu email series",
      "short term international student faq",
      "international students",
      "international student check in",
      "visa",
      "visa documents",
      "immigration",
      "immigration status",
      "critical new rule affecting f 1 international students and j 1 exchange visitors",
      "duration of status",
      "j 1",
      "j 1 status",
      "maintain status",
      "maintain f 1 status",
      "maintain j 1 status",
      "new international student",
      "newly admitted international student",
      "newly admitted students",
      "current students",
      "life after graduation",
      "ogs",
      "opt",
      "optional practical training",
      "pre arrival",
      "sevis",
      "scholars",
      "employment and tax",
      "visa academic and status changes",
      "visa and academic changes",
      "visas for nyu study abroad",
      "travel and visitors",
      "immigration updates and events",
      "know your rights",
      "understand your legal requirements",
      "avoid immigration and tax scams and fraud",
      "tips to avoid scams and fraud",
      "troubleshooting submitting an online form",
      "emergency information",
      "supporting our global community",
      "resources for international spouses partners and families",
      "advice for international travelers entering the united states",
      "international student hub",
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
    keywords: [
      "study abroad",
      "study away",
      "studying away",
      "planning for study abroad",
      "global",
      "international",
    ],
    label: "Office of Global Programs",
    nativeLabels: ["Office of Global Programs"],
  },
  {
    category: "wellbeing-campus",
    description: "Find housing information for Law students",
    featured: false,
    id: "law-housing",
    keywords: [
      "law school housing",
      "residence",
      "dorm",
      "residence services at the school of law",
      "residence services school of law",
    ],
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
      "report an incident",
      "report a concern",
      "incident response team",
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
      "access clinical care",
      "schedule appointments with doctors counselors nurses and other experts",
      "clinical care",
      "clinical services",
      "feel sick",
      "doctor",
      "counseling services",
      "counseling appointment",
      "health",
      "health care",
      "health center",
      "health and counseling",
      "health wellness accessibility",
      "health wellness accessibility services",
      "health education",
      "health insurance",
      "health insurance waiver",
      "health records",
      "health requirements",
      "get 24/7 support",
      "connect with us for urgent mental health needs or medical questions or support after sexual assault",
      "immunization",
      "immunization records",
      "make health appointment",
      "mental health",
      "mental health counseling",
      "mental health appointment",
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
      "student health center",
      "student health",
      "student health insurance",
      "submit immunization records",
      "therapy",
      "therapist",
      "urgent care",
      "vaccination",
      "vaccine requirements",
      "wellness exchange",
      "wellness workshops",
      "wellbeing initiatives",
      "explore tips and strategies for everyday healthy living",
      "get expert guidance on bringing wellbeing into your clubs classrooms lounges and more",
      "student wellbeing team",
      "free flu shots",
      "patient resources",
      "urgent mental health",
      "medical questions",
      "flu shot",
      "flu shots",
      "find a pop up flu clinic or make an appointment",
      "get the shot not the flu",
      "listening labs",
      "tune in to your wellbeing",
      "infuse wellbeing",
      "land in the nest",
      "safety and respect",
      "holistic care",
      "pop up flu clinic",
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
      "hours of operation",
      "dining hours",
      "dining locations",
      "nyu meal plan",
      "kosher dining",
      "nyu halal dining program",
      "dietary options",
      "food allergen guide and policy",
      "dining frequently asked questions",
      "summer meal plans",
      "nutritional support initiatives",
      "grubhub mobile ordering",
      "nyueats",
      "dining guide",
      "dining program",
      "dining",
      "dining hall",
      "dining locations",
      "dining on campus",
      "dining on campus and meal plans",
      "find housing",
      "find a place to stay",
      "place to stay",
      "living in new york city",
      "residential life",
      "residential life and housing services",
      "residential life opportunities",
      "explore the halls",
      "intersession housing",
      "residential life policies",
      "on campus",
      "on campus experience",
      "on campus experience and support",
      "housing rates and payments",
      "accessibility and support",
      "disability-related accessible housing",
      "gender inclusive housing",
      "residence hall staff",
      "living on campus",
      "off-campus living resources",
      "off-campus housing",
      "apartment search",
      "food on campus",
      "housing",
      "housing application",
      "housing accommodation",
      "housing accommodations",
      "housing assignment",
      "housing portal",
      "housing maintenance",
      "resident assistant application",
      "resident assistant",
      "meal plan",
      "meal plans",
      "move in",
      "move-in",
      "need housing",
      "on campus housing",
      "on campus living",
      "off campus living",
      "summer housing",
      "residence",
      "residence hall",
      "residence halls",
      "dorm",
      "room",
      "room assignment",
      "roommate",
      "roommate matching",
      "room change",
      "basic needs assistance",
      "food accessibility assistance",
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
      "office of the dean of students",
      "help with nyu",
      "need help with nyu",
      "need help",
      "student help",
      "student services",
      "meet with an expert to guide you through nyu student services",
      "student support",
      "solving personal problems that impede academic work",
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
      "accessibility specialist",
      "accessibility accommodations",
      "accessibility and accommodations",
      "accommodation letter",
      "accommodations",
      "academic accommodation",
      "academic accommodations",
      "assistive technology",
      "campus help",
      "campus map",
      "campus services",
      "campus wifi",
      "campus wi fi",
      "students with disabilities",
      "student centers and spaces",
      "tech wifi",
      "technology help",
      "bookstore",
      "bobst library",
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
      "eduroam",
      "internet access",
      "wifi streaming and technology",
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
      "nyu bookstores",
      "nyu it",
      "nyu wifi",
      "print",
      "printer",
      "printing",
      "printing on campus",
      "resources",
      "repair",
      "shuttle",
      "software",
      "study space",
      "student tech guide",
      "student tech centers",
      "sustainability",
      "green workplace",
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
      "athletics and fitness",
      "facilities",
      "facilities and operations",
      "fitness center",
      "fix it",
      "gyms and campus recreation",
      "group fitness",
      "green grant",
      "public transportation discounts",
      "public transit discounts",
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
    keywords: [
      "academic help",
      "academic tutoring",
      "academic tutoring at nyu",
      "academic resource center",
      "securing tutorial and other academic support",
      "the writing center hosted by cas",
      "help with classes",
      "study help",
      "tutoring",
      "tutoring and help with classes",
      "university learning centers",
      "writing center",
    ],
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
      "clubs and organizations",
      "connect with other students",
      "find clubs and other student organizations on campus",
      "explore hundreds of ways to get involved",
      "find an all-university club",
      "find school-based clubs",
      "find my club",
      "club fest",
      "clubs",
      "commuter",
      "commuter student",
      "commuter students",
      "commuter and off campus students",
      "commuter off campus students",
      "commuter student support",
      "events",
      "find clubs organizations and events",
      "involvement in co-curricular educational opportunities and activities",
      "intramural and club sports",
      "on demand media activities",
      "faith community",
      "interfaith supper club",
      "get involved",
      "getting involved",
      "leadership for students",
      "leadership opportunities",
      "leadership and awards",
      "leadership and awards opportunities",
      "fraternities and sororities",
      "program board",
      "student media",
      "graduate student",
      "graduate student support",
      "graduate students",
      "global spiritual life",
      "center for global spiritual life",
      "center for student life",
      "leadership development hubs at nyu",
      "changemaker center",
      "exposure to leadership through involvement",
      "leadership development opportunities",
      "events and workshops",
      "leadership launch",
      "leadership evolved",
      "student leadership week",
      "student senators council",
      "fellowship for emerging leaders in public service",
      "felps",
      "civic learning",
      "civic engagement program series",
      "changemaker collective",
      "camp changemaker",
      "second-year experience series",
      "local and global service",
      "project outreach",
      "nyu service fair",
      "day of service",
      "give where you live",
      "davis projects for peace",
      "other service resources",
      "federal service programs",
      "america reads and counts",
      "music ensembles",
      "fraternity and sorority life",
      "mindfulnyu",
      "multifaith advisory council",
      "centers for connection and community",
      "lgbtq",
      "lgbtq center",
      "lgbtq students",
      "military student",
      "military students and vets",
      "military students and veterans",
      "students in the military and veterans",
      "multicultural education",
      "multicultural education and programs",
      "multicultural center",
      "nyu engage",
      "nyu engage find clubs organizations and events",
      "off campus student",
      "off campus student support",
      "religious life",
      "religious spiritual life",
      "spiritual life",
      "student activities",
      "social justice diversity",
      "social justice and diversity opportunities",
      "student communities organizations",
      "student communities organizations opportunities",
      "student activities board",
      "get involved",
      "student clubs",
      "student organizations",
      "student parent",
      "student parent support",
      "students with children",
      "student government",
      "students of color",
      "students with children",
      "service opportunities",
      "service opportunities and civic engagement",
      "volunteer service",
      "volunteering",
      "volunteering and relief",
      "volunteering and relief opportunities",
      "civic engagement",
      "class activities boards",
      "spiritual life advisor",
      "transfer student",
      "transfer student support",
      "veteran",
      "veteran services",
      "veteran student",
      "violet voices",
    ],
    label: "Student Life",
    nativeLabels: ["Student Life"],
  },
];

export const COURSE_SEARCH_KEYWORDS = [
  "add and validate your classes to your shopping cart",
  "add classes",
  "class finder",
  "class course lookup",
  "class lookup",
  "class registration",
  "registering for classes",
  "registering classes",
  "class list",
  "class located",
  "class location",
  "class catalog",
  "class offerings",
  "class listings",
  "classroom",
  "classroom location",
  "classes available",
  "browse course catalog",
  "browse course offerings",
  "browse available courses for the upcoming term",
  "course catalog",
  "course catalogue",
  "course list",
  "course offerings",
  "course listings",
  "course finder",
  "course lookup",
  "course registration",
  "registration process",
  "navigate the registration process",
  "course search",
  "class search",
  "browse classes",
  "browse available classes",
  "browse courses",
  "available classes",
  "available courses",
  "enroll",
  "enroll in classes for the next term at your designated registration day and time",
  "find classes",
  "find a class",
  "find a course",
  "find courses",
  "find course offerings",
  "find available classes",
  "find available classes courses",
  "find available courses",
  "find me a course",
  "how do i register",
  "look up course",
  "look for a course",
  "look for classes",
  "look up classes",
  "where can i find a course",
  "where can i register",
  "what classes are available",
  "what classes can i take",
  "what classes courses can i take",
  "what courses can i take",
  "what courses are offered",
  "when are classes offered",
  "which courses are offered",
  "show available classes",
  "show available classes courses",
  "show available courses",
  "take a class classes courses",
  "take a class",
  "take classes",
  "take courses",
  "register",
  "register classes",
  "search classes",
  "search for a course",
  "search for a class",
  "search for classes",
  "search courses",
  "search course catalog",
  "sign up classes",
] as const;

const PAGE_TOOLS: Record<PageFamily, readonly PageToolDefinition[]> = {
  albert: [],
  home: [
    {
      description: "Search by subject, course number, title, or instructor",
      id: "course-search",
      keywords: COURSE_SEARCH_KEYWORDS,
      label: "Find Classes",
      nativeLabels: ["Course Search"],
    },
    {
      description: "Review current registration holds",
      focusRegion: "holds-status",
      id: "holds-status",
      keywords: [
        "check holds",
        "hold status",
        "registration hold",
        "make sure you don't have any registration holds that will block you from registering",
      ],
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
        "check your registration date and time",
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
        "where are my classes",
      ],
      label: "Weekly Schedule",
      nativeLabels: ["Weekly Schedule"],
    },
  ],
  academics: [
    {
      allowJavascriptUrl: true,
      description: "Open Albert's Academic Planner",
      id: "academic-planner",
      keywords: [
        "course planning",
        "plan courses",
        "plan my courses",
      ],
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
        "academic advisor appointment",
        "advisor appointment",
        "advising help",
        "meet advisor",
        "schedule advisor",
        "schedule advisor appointment",
        "schedule meeting with advisor",
        "talk to advisor",
        "meet with your advisor to discuss your class schedule and review your degree requirements",
      ],
      label: "Schedule Advisor Meeting",
      nativeLabels: ["Schedule an Advisor Appointment"],
    },
    {
      allowJavascriptUrl: true,
      description: "Review remaining degree requirements",
      id: "degree-progress",
      keywords: [
        "audit my degree",
        "classes need",
        "degree audit",
        "degree check",
        "degree requirements",
        "remaining requirements",
        "stay on track for graduation",
        "track your degree progress",
        "tracking degree progress",
      ],
      label: "Check Degree Progress",
      nativeLabels: ["Degree Progress Report"],
    },
    {
      compactDescription: true,
      description: "Use Albert's What If Report",
      allowJavascriptUrl: true,
      id: "what-if-report",
      label: "Explore Another Program",
      nativeLabels: ["What If Report"],
    },
    {
      allowJavascriptUrl: true,
      description: "Review your graduation progress",
      id: "graduation-status",
      keywords: [
        "expected graduation",
        "graduation date",
        "when do i graduate",
      ],
      label: "Check Graduation Status",
      nativeLabels: ["View My Graduation Status"],
    },
  ],
  grades: [
    {
      description: "Choose an academic career and term",
      focusRegion: "grade-viewer",
      id: "view-grades",
      keywords: [
        "grades",
        "my report card",
        "report card",
        "see grades",
        "view grades",
        "check your grades",
      ],
      label: "View Grades",
      nativeLabels: [],
    },
    {
      compactDescription: true,
      description: "Request proof through National Student Clearinghouse",
      id: "enrollment-verification",
      keywords: [
        "enrollment letter",
        "enrollment verification letter",
        "enrollment verification",
        "get proof of enrollment",
        "proof of student status",
        "prove enrolled",
        "student status",
        "verify enrollment",
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
      keywords: ["credit transfer"],
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
        "check balance",
        "current balance",
        "how much owe",
        "my balance",
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
        "payment plan",
        "how to pay tuition",
        "pay a bill",
        "pay bill",
        "pay my bill",
        "pay charges",
        "pay tuition",
        "pay tuition bill",
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
      keywords: ["print statement"],
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
      description:
        "Review official demographic information, including legal name, gender, and date of birth",
      id: "demographic-information",
      keywords: [
        "date of birth",
        "gender",
        "legal name",
        "personal details",
        "preferred name",
      ],
      label: "Review Personal Details",
      nativeLabels: ["Demographic Information"],
    },
    {
      description: "Review or update pronouns and name pronunciation in Albert",
      id: "pronouns",
      keywords: ["name pronunciation"],
      label: "Update Pronouns",
      nativeLabels: ["Indicate My Pronouns"],
      taskOnly: true,
    },
    {
      description: "Change or review a saved address in Albert",
      id: "addresses",
      keywords: [
        "address",
        "change address",
        "home address",
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
        "mobile phone",
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
      keywords: ["citizenship", "citizenship status", "nationality"],
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
  ".isSSS_Main.selected #IS_AC_RESPONSE .isSSS_PersInfTop",
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

  const focusRegion =
    definition.focusRegion ?? definition.fallbackFocusRegion;
  if (
    focusRegion &&
    target.getAttribute("data-better-albert-region") === focusRegion
  ) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    target.focus({ preventScroll: true });
    target.scrollIntoView?.({ block: "center", inline: "nearest" });
    return true;
  }

  if (!isPageToolControl(target)) {
    if (!focusRegion) {
      return false;
    }
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    target.focus({ preventScroll: true });
    target.scrollIntoView?.({ block: "center", inline: "nearest" });
    return true;
  }

  activateNativeControl(target, {
    ...(definition.allowJavascriptUrl ? { allowJavascriptUrl: true } : {}),
  });
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
