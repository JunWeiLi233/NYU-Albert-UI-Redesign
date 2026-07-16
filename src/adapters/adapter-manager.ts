import { PRIMARY_PAGE_FAMILIES } from "../content/page-families";
import { AlbertWorkspaceAdapter } from "./albert-workspace.adapter";
import { ClassSearchAdapter } from "./class-search.adapter";
import { FamilyHubAdapter } from "./family-hub.adapter";
import { PeopleSoftDeepAdapter } from "./peoplesoft-deep.adapter";
import {
  ADAPTER_ATTRIBUTE,
  FOCUS_TARGET_ATTRIBUTE,
  LABEL_ATTRIBUTE,
  LAYOUT_ATTRIBUTE,
  REGION_ATTRIBUTE,
} from "./adapter-helpers";
import type { AdapterContext, AdapterSession, StructuralAdapter } from "./types";

const DEFAULT_ADAPTERS: readonly StructuralAdapter[] = [
  new ClassSearchAdapter(),
  ...PRIMARY_PAGE_FAMILIES.filter((family) => family !== "resources").map(
    (family) => new FamilyHubAdapter(family),
  ),
  new PeopleSoftDeepAdapter(),
  new AlbertWorkspaceAdapter(),
].sort((left, right) => right.priority - left.priority);

export class AdapterManager {
  private activeDocument: Document | undefined;
  private activeSession: AdapterSession | undefined;

  constructor(
    private readonly adapters: readonly StructuralAdapter[] = DEFAULT_ADAPTERS,
  ) {}

  reconcile(context: AdapterContext): string | undefined {
    this.rollback();
    this.activeDocument = context.document;

    for (const adapter of this.adapters) {
      try {
        const plan = adapter.prepare(context);
        if (plan === undefined) {
          continue;
        }
        this.activeSession = adapter.apply(context, plan);
        return this.activeSession.id;
      } catch {
        this.rollback();
        return undefined;
      }
    }

    return undefined;
  }

  rollback(): void {
    try {
      this.activeSession?.rollback();
    } finally {
      this.activeSession = undefined;
      if (this.activeDocument) {
        this.activeDocument.documentElement.removeAttribute(ADAPTER_ATTRIBUTE);
        for (const element of this.activeDocument.querySelectorAll(
          `[${FOCUS_TARGET_ATTRIBUTE}]`,
        )) {
          if (element.getAttribute("tabindex") === "-1") {
            element.removeAttribute("tabindex");
          }
          element.removeAttribute(FOCUS_TARGET_ATTRIBUTE);
        }
        for (const attribute of [
          REGION_ATTRIBUTE,
          LAYOUT_ATTRIBUTE,
          LABEL_ATTRIBUTE,
        ]) {
          for (const element of this.activeDocument.querySelectorAll(
            `[${attribute}]`,
          )) {
            element.removeAttribute(attribute);
          }
        }
      }
      this.activeDocument = undefined;
    }
  }

  isStale(): boolean {
    return this.activeSession?.isStale() ?? false;
  }
}
