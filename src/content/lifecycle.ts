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
import { applyNativeTheme, removeNativeTheme } from "./native-theme";
import type { PageFamily } from "./page-families";
import { getAvailablePageTools, openNativePageTool } from "./page-tools";
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
  ].join(":");
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
  let mutationObserver: MutationObserver | undefined;
  let relatedContextObserver: MutationObserver | undefined;
  let activePageFamily: PageFamily = "albert";
  let lastViewModelSignature = "";
  let preferenceRevision = 0;
  let reconcileTimer: number | undefined;
  let renderFailed = false;
  let stopped = false;
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
    lastViewModelSignature = "";
    removeMountedHeader(document);
  };

  const rollback = (): void => {
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

      const viewModel: ShellViewModel = {
        availablePageFamilies: getAvailablePageFamilies(document),
        availablePageTools: getAvailablePageTools(
          document,
          classification.pageFamily,
        ),
        currentPageFamily: classification.pageFamily,
      };
      activePageFamily = classification.pageFamily;
      const nextSignature = viewModelSignature(viewModel);

      if (!mountedHeader) {
        mountedHeader = mountHeader({
          ...viewModel,
          document,
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
            navigateWithNativeAlbert(document, pageFamily);
          },
          onOpenTool: (toolId) => {
            openNativePageTool(
              document,
              activePageFamily,
              toolId,
            );
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
        lastViewModelSignature = nextSignature;
        return;
      }

      if (lastViewModelSignature !== nextSignature) {
        mountedHeader.update(viewModel);
        lastViewModelSignature = nextSignature;
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
