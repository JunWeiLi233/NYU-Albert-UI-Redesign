import { PAGE_FAMILY_DEFINITIONS, type PrimaryPageFamily } from "../content/page-families";
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

interface FamilyHubPlan {
  contentContainers: readonly Element[];
  contentRoot: Element;
  directoryColumns: readonly Element[];
  directoryHosts: readonly Element[];
  directoryItems: readonly Element[];
  directories: readonly Element[];
  menu: Element | undefined;
  sections: readonly Element[];
  tables: readonly Element[];
  workspace: Element;
  wrapper: Element;
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

function getFamilyRegion(
  family: PrimaryPageFamily,
  element: Element,
): string | undefined {
  switch (family) {
    case "home":
      if (element.matches("#IS_SSS_SUMMARY_NEWS, .isSSS_ShCtSchWrp")) {
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
    if (directories.length === 0) {
      return undefined;
    }
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

    return {
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
      menu: wrapper.querySelector(":scope > .isSSS_Menu") ?? undefined,
      sections: Array.from(contentRoot.children).filter(
        (child) =>
          !directories.some(
            (directory) => child === directory || child.contains(directory),
          ) &&
          !excludedTags.has(child.tagName) &&
          !child.matches(
            "[hidden], .hide, .clearfloat, [aria-hidden='true'], #NYUBlockerMessage, #NYUBlueMessage_medsmall",
          ),
      ),
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
      plan.sections.forEach((section, index) => {
        markRegion(
          journal,
          section,
          getFamilyRegion(this.family, section) ??
            (index === 0 ? "primary-section" : "supporting-section"),
        );
      });
      for (const directoryHost of plan.directoryHosts) {
        markRegion(
          journal,
          directoryHost,
          getFamilyRegion(this.family, directoryHost) ?? "directory-section",
        );
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

      return createSession(this.id, journal, anchors);
    } catch (error) {
      journal.rollback();
      throw error;
    }
  }
}
