import {
  mountHeader as defaultMountHeader,
  removeMountedHeader,
  type MountedHeader,
  type MountHeaderOptions,
  type ShellViewModel,
} from "../app/mount-header";
import { AdapterManager } from "../adapters/adapter-manager";
import type { PreferenceStore } from "../storage/preferences";
import {
  getAvailablePageFamilies,
  navigateWithNativeAlbert,
} from "./native-navigation";
import {
  createCourseSearchFrameHandoff,
  type CourseSearchFrameHandoff,
} from "./course-search-handoff";
import { applyNativeTheme, removeNativeTheme } from "./native-theme";
import {
  getAvailablePageTools,
  getAvailableResourceTools,
  getAvailableTaskTools,
  openNativePageTool,
  openNativeResourceTool,
} from "./page-tools";
import {
  classifyAlbertDocument,
  isAuthenticationDocument,
  isPotentialAlbertLocation,
  type PageDetectionContext,
} from "./page-detector";

export type HeaderMount = (options: MountHeaderOptions) => MountedHeader;

export interface ContentScriptOptions extends PageDetectionContext {
  getRelatedAlbertContext?: () => boolean;
  preferenceStore: PreferenceStore;
  relatedContextDocument?: Document;
  mountHeader?: HeaderMount;
}

export interface ContentScriptLifecycle {
  stop(): void;
}

function viewModelSignature(viewModel: ShellViewModel): string {
  return [
    viewModel.currentPageFamily,
    viewModel.availablePageFamilies.join(","),
    viewModel.availablePageTools.map(({ id }) => id).join(","),
    viewModel.availableResourceTools.map(({ id }) => id).join(","),
    viewModel.availableTaskTools.map(({ id }) => id).join(","),
  ].join(":");
}

function createShellViewModel(
  document: Document,
  currentPageFamily: ShellViewModel["currentPageFamily"],
): ShellViewModel {
  return {
    availablePageFamilies: getAvailablePageFamilies(document),
    availablePageTools: getAvailablePageTools(
      document,
      currentPageFamily,
    ),
    availableResourceTools: getAvailableResourceTools(document),
    availableTaskTools: getAvailableTaskTools(document),
    currentPageFamily,
  };
}

function normalizeDestinationLabel(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim().toLocaleLowerCase() ?? "";
}

function omitCurrentDeepPageDestination(
  viewModel: ShellViewModel,
  currentDocument: Document,
): ShellViewModel {
  const pageTitles = Array.from(
    currentDocument.querySelectorAll<HTMLElement>(
      '[data-better-albert-region="page-title"]',
    ),
  ).filter(
    (title) =>
      title.isConnected &&
      title.ownerDocument === currentDocument &&
      normalizeDestinationLabel(title.textContent).length > 0,
  );
  if (pageTitles.length !== 1) {
    return viewModel;
  }

  const currentTitle = normalizeDestinationLabel(pageTitles[0]?.textContent);
  const toolsById = new Map(
    [...viewModel.availablePageTools, ...viewModel.availableTaskTools].map(
      (tool) => [tool.id, tool],
    ),
  );
  const matchingToolIds = Array.from(toolsById.values())
    .filter((tool) =>
      tool.nativeLabels.some(
        (nativeLabel) =>
          normalizeDestinationLabel(nativeLabel) === currentTitle,
      ),
    )
    .map(({ id }) => id);
  if (matchingToolIds.length !== 1) {
    return viewModel;
  }

  const [currentToolId] = matchingToolIds;
  return {
    ...viewModel,
    availablePageTools: viewModel.availablePageTools.filter(
      ({ id }) => id !== currentToolId,
    ),
    availableTaskTools: viewModel.availableTaskTools.filter(
      ({ id }) => id !== currentToolId,
    ),
  };
}

function isTrustedRelatedControlDocument(
  currentDocument: Document,
  relatedDocument: Document | undefined,
): relatedDocument is Document {
  if (
    !relatedDocument ||
    relatedDocument === currentDocument ||
    !relatedDocument.documentElement.isConnected
  ) {
    return false;
  }

  try {
    const relatedWindow = relatedDocument.defaultView;
    const currentOrigin = currentDocument.defaultView?.location.origin;
    return Boolean(
      relatedWindow &&
        !relatedWindow.closed &&
        currentOrigin &&
        relatedWindow.location.origin === currentOrigin &&
        relatedWindow.location.hostname === "sis.portal.nyu.edu" &&
        isPotentialAlbertLocation(relatedWindow.location) &&
        !isAuthenticationDocument(relatedDocument),
    );
  } catch {
    return false;
  }
}

function focusNativeControlDocument(
  currentDocument: Document,
  nativeControlDocument: Document,
): void {
  if (nativeControlDocument === currentDocument) {
    return;
  }

  try {
    nativeControlDocument.defaultView?.focus();
  } catch {
    // Activation still reached the original native control.
  }
}

export async function startContentScript({
  document,
  getRelatedAlbertContext,
  relatedAlbertContext = false,
  location,
  mountHeader = defaultMountHeader,
  preferenceStore,
  relatedContextDocument,
  topLevel,
}: ContentScriptOptions): Promise<ContentScriptLifecycle> {
  let enabled = false;
  let mountedHeader: MountedHeader | undefined;
  let mountedNativeControlDocument: Document | undefined;
  let activeNativeControlDocument: Document | undefined;
  let courseSearchFrameHandoff: CourseSearchFrameHandoff | undefined;
  let mutationObserver: MutationObserver | undefined;
  let relatedContextObserver: MutationObserver | undefined;
  let lastViewModelSignature = "";
  let preferenceRevision = 0;
  let reconcileTimer: number | undefined;
  let renderFailed = false;
  let stopped = false;
  let pendingCourseSearch = false;
  let unsubscribe = (): void => undefined;
  const window = document.defaultView;
  const adapterManager = new AdapterManager();

  const safeUnmount = (): void => {
    try {
      mountedHeader?.unmount();
    } catch {
      // Native Albert must remain usable even when extension cleanup fails.
    }
    mountedHeader = undefined;
    mountedNativeControlDocument = undefined;
    activeNativeControlDocument = undefined;
    courseSearchFrameHandoff?.stop();
    courseSearchFrameHandoff = undefined;
    lastViewModelSignature = "";
    removeMountedHeader(document);
  };

  const rollback = (): void => {
    pendingCourseSearch = false;
    try {
      adapterManager.rollback();
    } catch {
      // Adapter cleanup is journaled and best-effort; native DOM stays in place.
    }
    safeUnmount();
    try {
      removeNativeTheme(document);
    } catch {
      // Attribute cleanup is best-effort and never touches native content.
    }
  };

  const disconnectObserver = (): void => {
    mutationObserver?.disconnect();
    mutationObserver = undefined;
    relatedContextObserver?.disconnect();
    relatedContextObserver = undefined;
  };

  const ensureObserver = (): void => {
    if (mutationObserver || !window?.MutationObserver) {
      return;
    }

    mutationObserver = new window.MutationObserver(scheduleReconcile);
    mutationObserver.observe(document.documentElement, {
      attributeFilter: [
        "aria-current",
        "aria-hidden",
        "aria-selected",
        "class",
        "hidden",
        "style",
      ],
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });

    if (
      relatedContextDocument?.documentElement &&
      relatedContextDocument !== document
    ) {
      relatedContextObserver = new window.MutationObserver(scheduleReconcile);
      relatedContextObserver.observe(relatedContextDocument.documentElement, {
        attributeFilter: [
          "aria-current",
          "aria-hidden",
          "aria-selected",
          "class",
          "hidden",
          "style",
        ],
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
      });
    }
  };

  const reconcile = (): void => {
    if (reconcileTimer !== undefined) {
      window?.clearTimeout(reconcileTimer);
      reconcileTimer = undefined;
    }
    if (stopped || !enabled || renderFailed) {
      disconnectObserver();
      rollback();
      return;
    }

    ensureObserver();

    const classification = classifyAlbertDocument({
      document,
      relatedAlbertContext:
        getRelatedAlbertContext?.() ?? relatedAlbertContext,
      location,
      topLevel,
    });

    if (classification.kind === "authentication") {
      disconnectObserver();
      rollback();
      return;
    }

    if (classification.kind !== "albert" || !document.body) {
      rollback();
      return;
    }

    try {
      applyNativeTheme(
        document,
        classification.pageFamily,
        classification.topLevel && location.hostname === "sis.portal.nyu.edu",
      );
      const adapterId = adapterManager.reconcile({
        document,
        location,
        pageFamily: classification.pageFamily,
        topLevel: classification.topLevel,
      });
      if (!adapterId) {
        rollback();
        return;
      }

      if (
        !classification.topLevel ||
        location.hostname !== "sis.portal.nyu.edu"
      ) {
        safeUnmount();
        return;
      }

      if (mountedHeader && !mountedHeader.host.isConnected) {
        try {
          mountedHeader.unmount();
        } catch {
          // The host is already detached; discard the stale React root.
        }
        mountedHeader = undefined;
        lastViewModelSignature = "";
      }

      let nativeControlDocument = document;
      let viewModel = createShellViewModel(
        document,
        classification.pageFamily,
      );
      if (
        viewModel.availablePageFamilies.length === 0 &&
        isTrustedRelatedControlDocument(document, relatedContextDocument)
      ) {
        const relatedViewModel = createShellViewModel(
          relatedContextDocument,
          classification.pageFamily,
        );
        if (relatedViewModel.availablePageFamilies.length > 0) {
          nativeControlDocument = relatedContextDocument;
          viewModel = omitCurrentDeepPageDestination(
            relatedViewModel,
            document,
          );
        }
      }
      const nextSignature = viewModelSignature(viewModel);
      activeNativeControlDocument = nativeControlDocument;

      if (
        mountedHeader &&
        mountedNativeControlDocument !== nativeControlDocument
      ) {
        safeUnmount();
      }

      if (!mountedHeader) {
        courseSearchFrameHandoff =
          createCourseSearchFrameHandoff(nativeControlDocument);
        mountedHeader = mountHeader({
          ...viewModel,
          document,
          nativeControlDocument,
          onDisable: async () => {
            enabled = false;
            disconnectObserver();
            rollback();
            try {
              await preferenceStore.setEnabled(false);
            } catch {
              // A storage failure must still restore the native page immediately.
            }
          },
          onNavigate: (pageFamily) => {
            if (
              navigateWithNativeAlbert(nativeControlDocument, pageFamily)
            ) {
              focusNativeControlDocument(
                document,
                nativeControlDocument,
              );
            }
          },
          onNavigateToCourseSearch: () => {
            const targetDocument = activeNativeControlDocument;
            if (!targetDocument) {
              return;
            }
            pendingCourseSearch = true;
            if (!navigateWithNativeAlbert(targetDocument, "home")) {
              pendingCourseSearch = false;
              return;
            }
            focusNativeControlDocument(document, targetDocument);
          },
          onOpenResource: (toolId) => {
            if (openNativeResourceTool(nativeControlDocument, toolId)) {
              focusNativeControlDocument(
                document,
                nativeControlDocument,
              );
            }
          },
          onOpenTool: (toolId) => {
            const openTool = (): void => {
              if (openNativePageTool(nativeControlDocument, toolId)) {
                focusNativeControlDocument(
                  document,
                  nativeControlDocument,
                );
              }
            };

            if (toolId !== "course-search") {
              openTool();
              return;
            }

            courseSearchFrameHandoff?.request();
            openTool();
          },
          onSkipToContent: () => {
            const workspace = document.querySelector<HTMLElement>(
              '[data-better-albert-region="workspace"]',
            );
            if (!workspace) {
              return;
            }
            workspace.focus({ preventScroll: false });
          },
        });
        mountedNativeControlDocument = nativeControlDocument;
        lastViewModelSignature = nextSignature;
        if (pendingCourseSearch && classification.pageFamily === "home") {
          courseSearchFrameHandoff?.request();
          if (openNativePageTool(nativeControlDocument, "course-search")) {
            pendingCourseSearch = false;
            focusNativeControlDocument(document, nativeControlDocument);
          }
        }
        return;
      }

      if (lastViewModelSignature !== nextSignature) {
        mountedHeader.update(viewModel);
        lastViewModelSignature = nextSignature;
      }
      if (pendingCourseSearch && classification.pageFamily === "home") {
        courseSearchFrameHandoff?.request();
        if (openNativePageTool(nativeControlDocument, "course-search")) {
          pendingCourseSearch = false;
          focusNativeControlDocument(document, nativeControlDocument);
        }
      }
    } catch {
      renderFailed = true;
      disconnectObserver();
      rollback();
    }
  };

  const scheduleReconcile = (): void => {
    if (stopped || reconcileTimer !== undefined) {
      return;
    }

    if (!window) {
      queueMicrotask(reconcile);
      return;
    }

    reconcileTimer = window.setTimeout(reconcile, 50);
  };

  const handleNavigation = (): void => {
    renderFailed = false;
    scheduleReconcile();
  };

  const stop = (): void => {
    stopped = true;
    unsubscribe();
    if (reconcileTimer !== undefined) {
      window?.clearTimeout(reconcileTimer);
      reconcileTimer = undefined;
    }
    disconnectObserver();
    window?.removeEventListener("pageshow", handleNavigation);
    window?.removeEventListener("popstate", handleNavigation);
    window?.removeEventListener("hashchange", handleNavigation);
    rollback();
  };

  if (
    !isPotentialAlbertLocation(location) ||
    isAuthenticationDocument(document)
  ) {
    rollback();
    return { stop: rollback };
  }

  try {
    unsubscribe = preferenceStore.subscribe((nextEnabled) => {
      preferenceRevision += 1;
      enabled = nextEnabled;
      if (nextEnabled) {
        renderFailed = false;
      }
      scheduleReconcile();
    });
  } catch {
    rollback();
    return { stop: rollback };
  }

  window?.addEventListener("pageshow", handleNavigation);
  window?.addEventListener("popstate", handleNavigation);
  window?.addEventListener("hashchange", handleNavigation);

  try {
    const revisionBeforeRead = preferenceRevision;
    const initiallyEnabled = await preferenceStore.getEnabled();
    if (revisionBeforeRead === preferenceRevision) {
      enabled = initiallyEnabled;
    }
    reconcile();
  } catch {
    disconnectObserver();
    rollback();
  }

  return { stop };
}
