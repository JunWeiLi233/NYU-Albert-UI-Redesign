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
  directoryColumns: readonly Element[];
  directoryItems: readonly Element[];
  directories: readonly Element[];
  menu: Element | undefined;
  sections: readonly Element[];
  tables: readonly Element[];
  workspace: Element;
  wrapper: Element;
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

    const directories = Array.from(
      workspace.querySelectorAll(":scope .is_bb_LinkContainer"),
    );
    if (directories.length === 0) {
      return undefined;
    }

    return {
      directoryColumns: directories.flatMap((directory) =>
        Array.from(directory.querySelectorAll(":scope > .is_bb_LinkColumn")),
      ),
      directoryItems: directories.flatMap((directory) =>
        Array.from(directory.querySelectorAll(".is_bb_LinkItem")),
      ),
      directories,
      menu: wrapper.querySelector(":scope > .isSSS_Menu") ?? undefined,
      sections: Array.from(workspace.children).filter(
        (child) =>
          !directories.some(
            (directory) => child === directory || child.contains(directory),
          ) &&
          !["BUTTON", "FORM", "SCRIPT", "STYLE", "TABLE"].includes(
            child.tagName,
          ),
      ),
      tables: Array.from(workspace.querySelectorAll("table")),
      workspace,
      wrapper,
    };
  }

  apply(context: AdapterContext, plan: FamilyHubPlan) {
    const journal = new DomPatchJournal();
    const anchors: Element[] = [plan.wrapper, plan.workspace, ...plan.directories];

    try {
      journal.setAttribute(context.document.documentElement, ADAPTER_ATTRIBUTE, this.id);
      journal.setAttribute(plan.wrapper, LAYOUT_ATTRIBUTE, "portal-workspace");
      markRegion(journal, plan.workspace, "workspace");
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
          index === 0 ? "primary-section" : "supporting-section",
        );
      });
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
