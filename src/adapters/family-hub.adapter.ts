import { PAGE_FAMILY_DEFINITIONS, type PrimaryPageFamily } from "../content/page-families";
import { isFullyMirroredPageToolDirectory } from "../content/page-tools";
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

const RECORDS_GUIDANCE_ATTRIBUTE =
  "data-better-albert-records-guidance";
const RECORDS_GUIDANCE =
  "Choose an academic career and term below to view grades. Quick access shows the transcript and enrollment-record options currently available in this Albert view.";
const PERSONAL_EDIT_GUIDANCE =
  "Albert saves these changes. Better Albert does not store this information.";
const PAYMENT_GUIDANCE =
  "Payment processing remains outside Better Albert.";
const ENROLLMENT_GUIDANCE =
  "Review your selections in Albert before submitting.";
const ACADEMIC_STEP_ATTRIBUTE = "data-better-albert-academic-step";
const PERSONAL_GROUP_ATTRIBUTE = "data-better-albert-personal-group";
const FALLBACK_SECTION_LABEL_ATTRIBUTE =
  "data-better-albert-section-label";
const ACADEMIC_JOURNEY = [
  { label: "Step 1 of 5 · Plan your path", region: "planning-section" },
  { label: "Step 2 of 5 · Check requirements", region: "degree-section" },
  { label: "Step 3 of 5 · Meet your advisor", region: "advising-section" },
  { label: "Step 4 of 5 · Review enrollment", region: "enrollment-section" },
  { label: "Step 5 of 5 · Track completion", region: "graduation-section" },
] as const;
const PERSONAL_SECTION_GROUPS = new Map<string, string>([
  ["profile-directory", "Official details"],
  ["address-section", "Contact information"],
  ["missing-person-section", "Safety contact"],
  ["citizenship-section", "Official records"],
]);
const FALLBACK_SECTION_LABELS = new Map<string, string>([
  ["home:news-section", "Updates and deadlines"],
  ["home:schedule-section", "Today and weekly schedule"],
  ["finances:account-section", "Account and billing"],
]);
const PERSONAL_FOCUS_REGIONS = new Set([
  "citizenship-section",
  "identifier-section",
  "missing-person-section",
]);

interface FamilyHubPlan {
  academicJourney: readonly {
    label: string;
    section: Element;
  }[];
  contentContainers: readonly Element[];
  contentRoot: Element;
  directoryColumns: readonly Element[];
  directoryHosts: readonly Element[];
  directoryItems: readonly Element[];
  directories: readonly Element[];
  enrollmentForm: HTMLFormElement | undefined;
  financialAidTarget: Element | undefined;
  gradeViewerTarget: Element | undefined;
  homeHoldsTarget: Element | undefined;
  homeRegistrationTarget: Element | undefined;
  homeTodoTarget: Element | undefined;
  homeTools: Element | undefined;
  inlineMirroredDirectories: readonly Element[];
  menu: Element | undefined;
  mirroredDirectories: readonly Element[];
  paymentForm: HTMLFormElement | undefined;
  personalEditForms: readonly HTMLFormElement[];
  sections: readonly Element[];
  scheduleSections: readonly Element[];
  tables: readonly Element[];
  workspace: Element;
  wrapper: Element;
}

function normalizedText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim().toLocaleLowerCase() ?? "";
}

function hasNativeSectionHeading(section: Element): boolean {
  return Boolean(
    section.querySelector("h1, h2, h3, h4, h5, h6, [role='heading']"),
  );
}

function hasNativeSectionAccessibleName(section: Element): boolean {
  if (section.getAttribute("aria-label")?.trim()) {
    return true;
  }

  const labelledBy = section.getAttribute("aria-labelledby")?.trim();
  if (labelledBy) {
    const ids = labelledBy.split(/\s+/).filter(Boolean);
    if (
      ids.length > 0 &&
      ids.every((id) => section.ownerDocument.getElementById(id))
    ) {
      return true;
    }
  }

  return hasNativeSectionHeading(section);
}

function hasScheduleCue(section: Element): boolean {
  const values = [section.getAttribute("aria-label") ?? ""];
  const labelledBy = section.getAttribute("aria-labelledby")?.trim();
  if (labelledBy) {
    for (const id of labelledBy.split(/\s+/).filter(Boolean)) {
      const label = section.ownerDocument.getElementById(id);
      if (label) {
        values.push(label.textContent ?? "");
      }
    }
  }
  values.push(
    ...Array.from(
      section.querySelectorAll(
        ":scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6, :scope > [role='heading']",
      ),
    ).map((heading) => heading.textContent ?? ""),
  );
  return values.some((value) =>
    /\b(?:schedule|weekly|class week)\b/i.test(normalizedText(value)),
  );
}

function findHomeScheduleSections(
  family: PrimaryPageFamily,
  contentRoot: Element,
): readonly Element[] {
  if (family !== "home") {
    return [];
  }

  const allSchedules = Array.from(
    contentRoot.querySelectorAll(".isSSS_ShCtSchWrp"),
  ).filter((schedule) => !schedule.matches("#IS_SSS_SUMMARY_NEWS"));
  const scheduleLinkWrappers = Array.from(
    contentRoot.querySelectorAll(".isSSS_ShCtLnkWrp"),
  ).filter((wrapper) => normalizedText(wrapper.textContent).length > 0);
  if (scheduleLinkWrappers.length === 1) {
    return scheduleLinkWrappers;
  }
  const selectedSchedules = allSchedules.filter((schedule) =>
    schedule.classList.contains("selected"),
  );
  const candidates =
    selectedSchedules.length > 0 ? selectedSchedules : allSchedules;
  const meaningfulCandidates = candidates.filter(
    (candidate) =>
      hasNativeSectionHeading(candidate) ||
      normalizedText(candidate.textContent).length > 0,
  );
  const renderedCandidates = meaningfulCandidates.filter(hasRenderedBox);
  const eligibleCandidates =
    renderedCandidates.length > 0 ? renderedCandidates : meaningfulCandidates;
  if (eligibleCandidates.length === 1) {
    return eligibleCandidates;
  }

  const cuedCandidates = eligibleCandidates.filter(hasScheduleCue);
  return cuedCandidates.length === 1 ? cuedCandidates : [];
}

function normalizedAttentionHeading(
  value: string | null | undefined,
): string {
  return normalizedText(value).replace(/\s*\(\s*\d+\s*\)\s*$/, "");
}

function controlText(
  control: HTMLButtonElement | HTMLInputElement,
): string {
  return normalizedText(
    control instanceof HTMLInputElement
      ? control.value
      : control.textContent,
  );
}

function findVerifiedPaymentForm(
  family: PrimaryPageFamily,
  sections: readonly Element[],
): HTMLFormElement | undefined {
  if (family !== "finances") {
    return undefined;
  }
  const accountSections = sections.filter(
    (section) => getFamilyRegion(family, section) === "account-section",
  );
  if (accountSections.length !== 1) {
    return undefined;
  }
  const forms = Array.from(
    accountSections[0]?.querySelectorAll<HTMLFormElement>("form") ?? [],
  ).filter((form) => {
    const paymentActions = Array.from(
      form.querySelectorAll<
        HTMLButtonElement | HTMLInputElement
      >("button, input[type='submit']")
    ).filter((control) => controlText(control) === "make a payment");
    return paymentActions.length === 1;
  });
  return forms.length === 1 ? forms[0] : undefined;
}

function findVerifiedEnrollmentForm(
  family: PrimaryPageFamily,
  sections: readonly Element[],
): HTMLFormElement | undefined {
  if (family !== "academics") {
    return undefined;
  }
  const enrollmentSections = sections.filter(
    (section) => getFamilyRegion(family, section) === "enrollment-section",
  );
  if (enrollmentSections.length !== 1) {
    return undefined;
  }
  const forms = Array.from(
    enrollmentSections[0]?.querySelectorAll<HTMLFormElement>("form") ?? [],
  ).filter((form) => {
    const enrollmentActions = Array.from(
      form.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
        "button[type='submit'], input[type='submit']",
      ),
    ).filter((control) => controlText(control) === "enroll");
    return enrollmentActions.length === 1;
  });
  return forms.length === 1 ? forms[0] : undefined;
}

function findVerifiedAcademicJourney(
  family: PrimaryPageFamily,
  sections: readonly Element[],
): FamilyHubPlan["academicJourney"] {
  if (family !== "academics") {
    return [];
  }

  const journey: Array<{ label: string; section: Element }> = [];
  for (const { label, region } of ACADEMIC_JOURNEY) {
    const matches = sections.filter(
      (section) => getFamilyRegion(family, section) === region,
    );
    const section = matches.length === 1 ? matches[0] : undefined;
    if (!section) {
      return [];
    }
    journey.push({ label, section });
  }
  return journey;
}

function findVerifiedPersonalEditForms(
  family: PrimaryPageFamily,
  sections: readonly Element[],
): readonly HTMLFormElement[] {
  if (family !== "personal") {
    return [];
  }

  return sections.flatMap((section) =>
    Array.from(section.querySelectorAll<HTMLFormElement>("form")).filter(
      (form) => {
        const controls = Array.from(
          form.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
            "button, input[type='button'], input[type='submit']",
          ),
        );
        const saveActions = controls.filter(
          (control) =>
            control.matches("button[type='submit'], input[type='submit']") &&
            controlText(control) === "save",
        );
        const cancelActions = controls.filter(
          (control) => controlText(control) === "cancel",
        );
        return saveActions.length === 1 && cancelActions.length === 1;
      },
    ),
  );
}

function findInlineMirroredDirectories(
  document: Document,
  family: PrimaryPageFamily,
  sections: readonly Element[],
): readonly Element[] {
  if (family !== "finances") {
    return [];
  }

  const accountSections = sections.filter(
    (section) => getFamilyRegion(family, section) === "account-section",
  );
  if (accountSections.length !== 1) {
    return [];
  }

  const candidates = Array.from(
    accountSections[0]?.querySelectorAll(":scope > #NYUBursarLinks") ?? [],
  );
  if (candidates.length !== 1) {
    return [];
  }

  const candidate = candidates[0];
  return candidate &&
    isFullyMirroredPageToolDirectory(document, candidate)
    ? [candidate]
    : [];
}

function hasRenderedBox(element: Element): boolean {
  const bounds = element.getBoundingClientRect();
  return bounds.width > 0 && bounds.height > 0;
}

function resolveLiveContentRoot(
  workspace: Element,
): Element | undefined {
  const candidates = Array.from(
    workspace.querySelectorAll(
      "#IS_AC_RESPONSE > .ptprtlcontainer > .isDS_Section",
    ),
  );
  if (candidates.length <= 1) {
    return candidates[0];
  }

  const renderedCandidates = candidates.filter(hasRenderedBox);
  return renderedCandidates.length === 1 ? renderedCandidates[0] : undefined;
}

function hasUniqueLinkLabel(element: Element, label: string): boolean {
  const normalizedLabel = label.toLocaleLowerCase();
  return (
    Array.from(element.querySelectorAll("a")).filter(
      (anchor) =>
        anchor.textContent
          ?.replace(/\s+/g, " ")
          .trim()
          .toLocaleLowerCase() === normalizedLabel,
    ).length === 1
  );
}

function getFamilyRegion(
  family: PrimaryPageFamily,
  element: Element,
): string | undefined {
  switch (family) {
    case "home":
      if (element.matches("#IS_SSS_SUMMARY_NEWS")) {
        return "news-section";
      }
      if (element.matches(".isSSS_ShCtSchWrp")) {
        return "schedule-section";
      }
      if (element.matches("#ToDoHoldsEnrlDates, .isSSS_Attention")) {
        return "attention-section";
      }
      if (element.matches(".isSSS_ShopCart, .isSSS_EnrollmentDates")) {
        return "enrollment-section";
      }
      if (element.matches("#nyuSSSHomeLinksStatic")) {
        return "home-tools";
      }
      break;
    case "academics":
      if (hasUniqueLinkLabel(element, "Schedule an Advisor Appointment")) {
        return "advising-section";
      }
      if (element.matches(".nyuGradTools, .isSSS_Degree")) {
        return "degree-section";
      }
      if (element.matches(".isSSS_Graduation")) {
        return "graduation-section";
      }
      if (element.matches(".isSSS_FullW, .isSSS_Enrollment")) {
        return "enrollment-section";
      }
      if (element.matches(".isSSS_HalfW, .isSSS_Planning")) {
        return "planning-section";
      }
      break;
    case "grades":
      if (element.matches("#nyuGradesLinks, .isSSS_Reports")) {
        return "reports-directory";
      }
      if (element.matches(".isSSS_CareerSelect")) {
        return "term-selector";
      }
      if (element.matches(".isSSS_GradesTop, .isSSS_Records")) {
        return "term-navigation";
      }
      if (element.matches(".isSSS_GradesTwrp")) {
        return "record-section";
      }
      break;
    case "finances":
      if (element.matches("#NYUBursarDisplay, .isSSS_Account, .isSSS_Statements")) {
        return "account-section";
      }
      if (element.matches("#NYUFinancialAidDisplay, .isSSS_FinancialAid")) {
        return "aid-section";
      }
      break;
    case "personal":
      if (element.matches(".isSSS_PersInfTop, .isSSS_Profile")) {
        return "profile-directory";
      }
      if (element.matches(".isSSS_CitizenWrap")) {
        return "citizenship-section";
      }
      if (element.matches(".isSSS_NationalIDWrap")) {
        return "identifier-section";
      }
      if (element.querySelector(".ADDR_TYPE_DESCR")) {
        return "address-section";
      }
      if (element.querySelector(".NYUPhone, .phonetype_descrLong")) {
        return "phone-section";
      }
      if (element.querySelector(".NYUEmail, .EMAIL_TYPE_DESCR_LONG")) {
        return "email-section";
      }
      if (element.querySelector("#tblEC_Phone, #tblEC_Address")) {
        return "emergency-section";
      }
      if (element.querySelector("#tblMS_Phone, #tblMS_Email")) {
        return "missing-person-section";
      }
      if (element.matches(".isSSS_Contact")) {
        return "contact-section";
      }
      break;
  }

  return undefined;
}

function findHomeAttentionTarget(
  family: PrimaryPageFamily,
  sections: readonly Element[],
  headingLabel: string,
): Element | undefined {
  if (family !== "home") {
    return undefined;
  }
  const attentionSections = sections.filter(
    (section) => getFamilyRegion(family, section) === "attention-section",
  );
  if (attentionSections.length !== 1) {
    return undefined;
  }

  const candidates = Array.from(
    attentionSections[0]?.querySelectorAll(".nyuSSS_ThirdW") ?? [],
  ).filter((candidate) => {
    const headings = Array.from(
      candidate.querySelectorAll(":scope > h1, :scope > h2, :scope > h3"),
    ).filter(
      (heading) =>
        normalizedAttentionHeading(heading.textContent) === headingLabel,
    );
    return headings.length === 1;
  });
  return candidates.length === 1 ? candidates[0] : undefined;
}

function findFinancialAidTarget(
  family: PrimaryPageFamily,
  sections: readonly Element[],
): Element | undefined {
  if (family !== "finances") {
    return undefined;
  }

  const matches = sections.filter(
    (section) => getFamilyRegion(family, section) === "aid-section",
  );
  return matches.length === 1 ? matches[0] : undefined;
}

function findGradeViewerTarget(
  family: PrimaryPageFamily,
  sections: readonly Element[],
): Element | undefined {
  if (family !== "grades") {
    return undefined;
  }

  const termSelectors = sections.filter(
    (section) => getFamilyRegion(family, section) === "term-selector",
  );
  if (termSelectors.length !== 1) {
    return undefined;
  }

  const selects = Array.from(
    termSelectors[0]?.querySelectorAll<HTMLSelectElement>("select") ?? [],
  ).filter(
    (select) =>
      select.isConnected &&
      !select.disabled &&
      select.getAttribute("aria-disabled") !== "true",
  );
  if (selects.length === 1) {
    return selects[0];
  }
  if (selects.length > 1) {
    return undefined;
  }

  const careerLinks = Array.from(
    termSelectors[0]?.querySelectorAll<HTMLAnchorElement>("a") ?? [],
  ).filter((anchor) => {
    const label = normalizedText(
      anchor.textContent ?? anchor.getAttribute("aria-label"),
    );
    return (
      anchor.isConnected &&
      !anchor.matches("[disabled], [aria-disabled='true']") &&
      /^[a-z][a-z -]{1,48}\s*:\s*\/?$/i.test(label)
    );
  });

  return careerLinks.length === 1 ? careerLinks[0] : undefined;
}

function hasVerifiedFamilyAnchor(
  family: PrimaryPageFamily,
  sections: readonly Element[],
): boolean {
  const selector = {
    home:
      "#IS_SSS_SUMMARY_NEWS, #ToDoHoldsEnrlDates, .isSSS_ShopCart, #nyuSSSHomeLinksStatic",
    academics: ".nyuGradTools, .isSSS_Planning, .isSSS_Degree",
    grades: "#nyuGradesLinks, .isSSS_GradesTop, .isSSS_GradesTwrp",
    finances: "#NYUBursarDisplay, #NYUFinancialAidDisplay",
    personal: ".isSSS_PersInfTop, .isSSS_CitizenWrap, .isSSS_NationalIDWrap",
    resources: "",
  }[family];

  return Boolean(selector) && sections.some((section) => section.matches(selector));
}

export class FamilyHubAdapter implements StructuralAdapter<FamilyHubPlan> {
  readonly id;
  readonly priority = 300;

  constructor(private readonly family: PrimaryPageFamily) {
    this.id = `family-${family}` as const;
  }

  prepare(context: AdapterContext): FamilyHubPlan | undefined {
    if (context.pageFamily !== this.family) {
      return undefined;
    }

    const wrapper = uniqueElement(context.document, ".isSSS_Wrp");
    const workspace = uniqueElement(
      context.document,
      ".isSSS_Wrp > .isSSS_Main.selected, .isSSS_Wrp > [role='main'].selected",
    );
    if (!wrapper || !workspace || !wrapper.contains(workspace)) {
      return undefined;
    }

    const liveContentRoot = resolveLiveContentRoot(workspace);
    const hasLiveContentRoots = workspace.querySelector(
      "#IS_AC_RESPONSE > .ptprtlcontainer > .isDS_Section",
    );
    if (hasLiveContentRoots && !liveContentRoot) {
      return undefined;
    }

    const contentRoot = liveContentRoot ?? workspace;
    const directories = Array.from(
      contentRoot.querySelectorAll(":scope .is_bb_LinkContainer"),
    );
    const contentContainers: Element[] = [];
    let container = contentRoot.parentElement;
    while (container && container !== workspace) {
      contentContainers.push(container);
      container = container.parentElement;
    }
    if (contentRoot !== workspace && container !== workspace) {
      return undefined;
    }

    const directoryHosts = Array.from(contentRoot.children).filter((child) =>
      directories.some(
        (directory) => child !== directory && child.contains(directory),
      ),
    );
    const excludedTags = new Set([
      "BUTTON",
      "FORM",
      "LINK",
      "META",
      "NOSCRIPT",
      "SCRIPT",
      "STYLE",
      "TABLE",
      "TEMPLATE",
      "TITLE",
    ]);

    const sections = Array.from(contentRoot.children).filter(
      (child) =>
        !directories.some(
          (directory) => child === directory || child.contains(directory),
        ) &&
        !excludedTags.has(child.tagName) &&
        !child.matches(
          "[hidden], .hide, .clearfloat, [aria-hidden='true'], #NYUBlockerMessage, #NYUBlueMessage_medsmall",
        ),
    );
    if (
      directories.length === 0 &&
      !hasVerifiedFamilyAnchor(this.family, sections)
    ) {
      return undefined;
    }

    return {
      academicJourney: findVerifiedAcademicJourney(
        this.family,
        Array.from(new Set([...sections, ...directoryHosts])),
      ),
      contentContainers,
      contentRoot,
      directoryColumns: directories.flatMap((directory) =>
        Array.from(directory.querySelectorAll(":scope > .is_bb_LinkColumn")),
      ),
      directoryHosts,
      directoryItems: directories.flatMap((directory) =>
        Array.from(directory.querySelectorAll(".is_bb_LinkItem")),
      ),
      directories,
      enrollmentForm: findVerifiedEnrollmentForm(
        this.family,
        sections,
      ),
      financialAidTarget: findFinancialAidTarget(this.family, sections),
      gradeViewerTarget: findGradeViewerTarget(this.family, sections),
      homeHoldsTarget: findHomeAttentionTarget(
        this.family,
        sections,
        "holds",
      ),
      homeRegistrationTarget: findHomeAttentionTarget(
        this.family,
        sections,
        "enrollment dates",
      ),
      homeTodoTarget: findHomeAttentionTarget(
        this.family,
        sections,
        "to do",
      ),
      homeTools:
        this.family === "home"
          ? directoryHosts.find((host) =>
              host.matches("#nyuSSSHomeLinksStatic"),
            )
          : undefined,
      inlineMirroredDirectories: findInlineMirroredDirectories(
        context.document,
        this.family,
        sections,
      ),
      menu: wrapper.querySelector(":scope > .isSSS_Menu") ?? undefined,
      mirroredDirectories: directories.filter((directory) =>
        isFullyMirroredPageToolDirectory(context.document, directory),
      ),
      paymentForm: findVerifiedPaymentForm(this.family, sections),
      personalEditForms: findVerifiedPersonalEditForms(
        this.family,
        sections,
      ),
      sections,
      scheduleSections: findHomeScheduleSections(this.family, contentRoot),
      tables: Array.from(contentRoot.querySelectorAll("table")),
      workspace,
      wrapper,
    };
  }

  apply(context: AdapterContext, plan: FamilyHubPlan) {
    const journal = new DomPatchJournal();
    const anchors: Element[] = [
      plan.wrapper,
      plan.workspace,
      plan.contentRoot,
      ...plan.directories,
      ...plan.inlineMirroredDirectories,
      ...(plan.enrollmentForm ? [plan.enrollmentForm] : []),
      ...(plan.financialAidTarget ? [plan.financialAidTarget] : []),
      ...(plan.gradeViewerTarget ? [plan.gradeViewerTarget] : []),
      ...(plan.homeHoldsTarget ? [plan.homeHoldsTarget] : []),
      ...(plan.homeRegistrationTarget ? [plan.homeRegistrationTarget] : []),
      ...(plan.homeTodoTarget ? [plan.homeTodoTarget] : []),
      ...(plan.paymentForm ? [plan.paymentForm] : []),
      ...plan.personalEditForms,
      ...plan.scheduleSections,
    ];

    try {
      journal.setAttribute(context.document.documentElement, ADAPTER_ATTRIBUTE, this.id);
      journal.setAttribute(plan.wrapper, LAYOUT_ATTRIBUTE, "portal-workspace");
      markRegion(journal, plan.workspace, "workspace");
      for (const container of plan.contentContainers) {
        journal.setAttribute(
          container,
          LAYOUT_ATTRIBUTE,
          "family-content-container",
        );
      }
      journal.setAttribute(plan.contentRoot, LAYOUT_ATTRIBUTE, "family-content");
      markFocusTarget(journal, plan.workspace);
      journal.setAttribute(
        plan.workspace,
        LABEL_ATTRIBUTE,
        PAGE_FAMILY_DEFINITIONS[this.family].label,
      );

      if (plan.menu) {
        markRegion(journal, plan.menu, "native-navigation");
      }
      if (context.topLevel && plan.homeTools) {
        journal.setAttribute(plan.homeTools, "inert", "");
      }
      if (context.topLevel) {
        for (const directory of plan.mirroredDirectories) {
          journal.setAttribute(directory, "inert", "");
        }
        for (const directory of plan.inlineMirroredDirectories) {
          markRegion(journal, directory, "directory");
          journal.setAttribute(directory, "inert", "");
        }
      }
      if (this.family === "grades") {
        const mirroredRecordsDirectory = plan.directoryHosts.find((host) =>
          plan.mirroredDirectories.some((directory) =>
            host.contains(directory),
          ),
        );
        if (mirroredRecordsDirectory) {
          journal.setAttribute(
            mirroredRecordsDirectory,
            RECORDS_GUIDANCE_ATTRIBUTE,
            RECORDS_GUIDANCE,
          );
          if (
            !mirroredRecordsDirectory.hasAttribute("aria-description") &&
            !mirroredRecordsDirectory.hasAttribute("aria-describedby")
          ) {
            journal.setAttribute(
              mirroredRecordsDirectory,
              "aria-description",
              RECORDS_GUIDANCE,
            );
          }
        }
      }
      plan.sections.forEach((section, index) => {
        const region =
          getFamilyRegion(this.family, section) ??
          (index === 0 ? "primary-section" : "supporting-section");
        markRegion(journal, section, region);
        const fallbackSectionLabel = FALLBACK_SECTION_LABELS.get(
          `${this.family}:${region}`,
        );
        if (
          fallbackSectionLabel &&
          !hasNativeSectionAccessibleName(section)
        ) {
          journal.setAttribute(
            section,
            FALLBACK_SECTION_LABEL_ATTRIBUTE,
            fallbackSectionLabel,
          );
          journal.setAttribute(section, "role", "region");
          journal.setAttribute(section, "aria-label", fallbackSectionLabel);
        }
        const personalGroup =
          this.family === "personal"
            ? PERSONAL_SECTION_GROUPS.get(region)
            : undefined;
        if (personalGroup) {
          journal.setAttribute(
            section,
            PERSONAL_GROUP_ATTRIBUTE,
            personalGroup,
          );
        }
        if (
          (this.family === "personal" &&
            PERSONAL_FOCUS_REGIONS.has(region)) ||
          (this.family === "academics" && region === "advising-section")
        ) {
          markFocusTarget(journal, section);
        }
      });
      for (const scheduleSection of plan.scheduleSections) {
        markRegion(journal, scheduleSection, "schedule-section");
        if (!hasScheduleCue(scheduleSection)) {
          journal.setAttribute(
            scheduleSection,
            FALLBACK_SECTION_LABEL_ATTRIBUTE,
            "Today and weekly schedule",
          );
        }
        if (
          !scheduleSection.hasAttribute("role") &&
          !scheduleSection.hasAttribute("aria-label") &&
          !scheduleSection.hasAttribute("aria-labelledby")
        ) {
          journal.setAttribute(scheduleSection, "role", "region");
          journal.setAttribute(
            scheduleSection,
            "aria-label",
            "Today and weekly schedule",
          );
        }
      }
      for (const step of plan.academicJourney) {
        journal.setAttribute(step.section, ACADEMIC_STEP_ATTRIBUTE, step.label);
        if (!step.section.hasAttribute("role")) {
          journal.setAttribute(step.section, "role", "region");
        }
        if (
          !step.section.hasAttribute("aria-label") &&
          !step.section.hasAttribute("aria-labelledby")
        ) {
          journal.setAttribute(step.section, "aria-label", step.label);
        }
      }
      for (const directoryHost of plan.directoryHosts) {
        const region =
          getFamilyRegion(this.family, directoryHost) ?? "directory-section";
        markRegion(
          journal,
          directoryHost,
          region,
        );
        const personalGroup =
          this.family === "personal"
            ? PERSONAL_SECTION_GROUPS.get(region)
            : undefined;
        if (personalGroup) {
          journal.setAttribute(
            directoryHost,
            PERSONAL_GROUP_ATTRIBUTE,
            personalGroup,
          );
        }
      }
      for (const directory of plan.directories) {
        markRegion(journal, directory, "directory");
      }
      for (const column of plan.directoryColumns) {
        markRegion(journal, column, "directory-group");
      }
      for (const item of plan.directoryItems) {
        markRegion(journal, item, "directory-item");
      }
      for (const table of plan.tables) {
        markRegion(journal, table, "table");
      }
      if (plan.paymentForm) {
        markRegion(journal, plan.paymentForm, "payment-action");
        if (!plan.paymentForm.hasAttribute("aria-label")) {
          journal.setAttribute(
            plan.paymentForm,
            "aria-label",
            "Official Albert payment step",
          );
        }
        if (
          !plan.paymentForm.hasAttribute("aria-description") &&
          !plan.paymentForm.hasAttribute("aria-describedby")
        ) {
          journal.setAttribute(
            plan.paymentForm,
            "aria-description",
            PAYMENT_GUIDANCE,
          );
        }
      }
      if (plan.enrollmentForm) {
        markRegion(journal, plan.enrollmentForm, "enrollment-action");
        if (!plan.enrollmentForm.hasAttribute("aria-label")) {
          journal.setAttribute(
            plan.enrollmentForm,
            "aria-label",
            "Official Albert enrollment step",
          );
        }
        if (
          !plan.enrollmentForm.hasAttribute("aria-description") &&
          !plan.enrollmentForm.hasAttribute("aria-describedby")
        ) {
          journal.setAttribute(
            plan.enrollmentForm,
            "aria-description",
            ENROLLMENT_GUIDANCE,
          );
        }
      }
      if (plan.financialAidTarget) {
        markFocusTarget(journal, plan.financialAidTarget);
      }
      if (plan.gradeViewerTarget) {
        markRegion(journal, plan.gradeViewerTarget, "grade-viewer");
        markFocusTarget(journal, plan.gradeViewerTarget);
      }
      if (plan.homeHoldsTarget) {
        markRegion(journal, plan.homeHoldsTarget, "holds-status");
        markFocusTarget(journal, plan.homeHoldsTarget);
      }
      if (plan.homeRegistrationTarget) {
        markRegion(
          journal,
          plan.homeRegistrationTarget,
          "registration-time",
        );
        markFocusTarget(journal, plan.homeRegistrationTarget);
      }
      if (plan.homeTodoTarget) {
        markRegion(journal, plan.homeTodoTarget, "todo-status");
        markFocusTarget(journal, plan.homeTodoTarget);
      }
      for (const form of plan.personalEditForms) {
        markRegion(journal, form, "personal-edit-form");
        if (!form.hasAttribute("aria-label")) {
          journal.setAttribute(
            form,
            "aria-label",
            "Official Albert personal information form",
          );
        }
        if (
          !form.hasAttribute("aria-description") &&
          !form.hasAttribute("aria-describedby")
        ) {
          journal.setAttribute(
            form,
            "aria-description",
            PERSONAL_EDIT_GUIDANCE,
          );
        }
      }

      return createSession(this.id, journal, anchors);
    } catch (error) {
      journal.rollback();
      throw error;
    }
  }
}
