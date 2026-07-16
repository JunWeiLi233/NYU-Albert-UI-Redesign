import type { PageFamily } from "../content/page-families";
import type { AlbertLocation } from "../content/page-detector";

export type AdapterId =
  | `family-${Exclude<PageFamily, "albert">}`
  | "class-search"
  | "peoplesoft-deep"
  | "albert-workspace";

export interface AdapterContext {
  document: Document;
  location: AlbertLocation;
  pageFamily: PageFamily;
  topLevel: boolean;
}

export interface AdapterSession {
  readonly id: AdapterId;
  isStale(): boolean;
  rollback(): void;
}

export interface StructuralAdapter<Plan = unknown> {
  readonly id: AdapterId;
  readonly priority: number;
  prepare(context: AdapterContext): Plan | undefined;
  apply(context: AdapterContext, plan: Plan): AdapterSession;
}

