import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";

import type {
  PageFamily,
  PrimaryPageFamily,
} from "../content/page-families";
import {
  findNativeNavigationControl,
  isNativeOtherResourcesOpen,
} from "../content/native-navigation";
import type {
  PageToolDefinition,
  PageToolId,
  ResourceToolDefinition,
  TaskToolDefinition,
} from "../content/page-tools";
import headerCss from "../design-system/header.css?inline";
import tokensCss from "../design-system/tokens.css?inline";
import { AppShell } from "./AppShell";

export const HEADER_HOST_ID = "better-albert-header-host";
export const TASK_FINDER_OPEN_ATTRIBUTE =
  "data-better-albert-task-finder-open";
const SHELL_Z_INDEX = "90";
const TASK_FINDER_Z_INDEX = "2147483647";
const SHELL_HEIGHT_PROPERTY = "--ba-native-shell-height";
const NATIVE_RESOURCES_MENU_ID = "SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR";
const NATIVE_RESOURCES_OPEN_ATTRIBUTE =
  "data-better-albert-resource-directory-open";

export interface ShellViewModel {
  availablePageFamilies: readonly PrimaryPageFamily[];
  availablePageTools: readonly PageToolDefinition[];
  availableResourceTools: readonly ResourceToolDefinition[];
  availableTaskTools: readonly TaskToolDefinition[];
  currentPageFamily: PageFamily;
}

export interface MountHeaderOptions extends ShellViewModel {
  document: Document;
  nativeControlDocument?: Document;
  onDisable: () => Promise<void>;
  onNavigate: (pageFamily: PrimaryPageFamily) => void;
  onNavigateToCourseSearch: () => void;
  onOpenResource: (toolId: PageToolId) => void;
  onOpenTool: (toolId: PageToolId) => void;
  onSkipToContent: () => void;
}

export interface MountedHeader {
  host: HTMLElement;
  unmount(): void;
  update(viewModel: ShellViewModel): void;
}

function createStyle(document: Document, css: string): HTMLStyleElement {
  const style = document.createElement("style");
  style.textContent = css;
  return style;
}

export function removeMountedHeader(document: Document): void {
  document.getElementById(HEADER_HOST_ID)?.remove();
  document.documentElement.removeAttribute(TASK_FINDER_OPEN_ATTRIBUTE);
}

export function mountHeader({
  availablePageFamilies,
  availablePageTools,
  availableResourceTools,
  availableTaskTools,
  currentPageFamily,
  document,
  nativeControlDocument = document,
  onDisable,
  onNavigate,
  onNavigateToCourseSearch,
  onOpenResource,
  onOpenTool,
  onSkipToContent,
}: MountHeaderOptions): MountedHeader {
  removeMountedHeader(document);

  if (!document.body) {
    throw new Error("Albert document body is not available.");
  }

  const host = document.createElement("div");
  host.id = HEADER_HOST_ID;
  host.style.display = "block";
  host.style.isolation = "isolate";
  // Make the outer stacking context explicit so the modal finder can stay
  // above Albert's fixed native resource directory at every breakpoint.
  host.style.position = "fixed";
  host.style.zIndex = SHELL_Z_INDEX;

  let root: Root | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let resourcesObserver: MutationObserver | undefined;
  let latestViewModel: ShellViewModel = {
    availablePageFamilies,
    availablePageTools,
    availableResourceTools,
    availableTaskTools,
    currentPageFamily,
  };
  const rootElement = document.documentElement;
  const taskFinderStateRoots = new Set([
    rootElement,
    nativeControlDocument.documentElement,
  ]);
  const previousShellHeight = rootElement.style.getPropertyValue(
    SHELL_HEIGHT_PROPERTY,
  );
  const previousShellHeightPriority = rootElement.style.getPropertyPriority(
    SHELL_HEIGHT_PROPERTY,
  );

  const syncShellHeight = (): void => {
    const height = Math.ceil(host.getBoundingClientRect().height);
    if (height > 0) {
      rootElement.style.setProperty(SHELL_HEIGHT_PROPERTY, `${height}px`);
    }
  };

  const restoreShellHeight = (): void => {
    if (previousShellHeight) {
      rootElement.style.setProperty(
        SHELL_HEIGHT_PROPERTY,
        previousShellHeight,
        previousShellHeightPriority,
      );
      return;
    }

    rootElement.style.removeProperty(SHELL_HEIGHT_PROPERTY);
  };

  const setTaskFinderOpen = (isOpen: boolean): void => {
    host.style.zIndex = isOpen ? TASK_FINDER_Z_INDEX : SHELL_Z_INDEX;
    if (isOpen) {
      // Compact mode elevates the shell above native promotional layers with a
      // stylesheet rule. The modal finder must still win over the native
      // resource directory, so promote this inline value with equal priority.
      host.style.setProperty("z-index", TASK_FINDER_Z_INDEX, "important");
    } else {
      host.style.setProperty("z-index", SHELL_Z_INDEX);
    }
    for (const taskFinderStateRoot of taskFinderStateRoots) {
      taskFinderStateRoot.toggleAttribute(
        TASK_FINDER_OPEN_ATTRIBUTE,
        isOpen,
      );
    }
  };

  const clearTaskFinderOpen = (): void => {
    for (const taskFinderStateRoot of taskFinderStateRoots) {
      taskFinderStateRoot.removeAttribute(TASK_FINDER_OPEN_ATTRIBUTE);
    }
  };

  try {
    const shadowRoot = host.attachShadow({ mode: "open" });
    const mountRoot = document.createElement("div");
    mountRoot.id = "better-albert-header-root";

    shadowRoot.append(
      createStyle(document, tokensCss),
      createStyle(document, headerCss),
      mountRoot,
    );
    document.body.prepend(host);
    const ResizeObserverConstructor = document.defaultView?.ResizeObserver;
    if (ResizeObserverConstructor) {
      resizeObserver = new ResizeObserverConstructor(syncShellHeight);
      resizeObserver.observe(host);
    }
    document.defaultView?.addEventListener("resize", syncShellHeight);

    root = createRoot(mountRoot);

    const render = (viewModel: ShellViewModel): void => {
      latestViewModel = viewModel;
      const resourcesMenu = nativeControlDocument.getElementById(
        NATIVE_RESOURCES_MENU_ID,
      );
      const isNativeResourcesOpen = isNativeOtherResourcesOpen(
        nativeControlDocument,
      );
      resourcesMenu?.toggleAttribute(
        NATIVE_RESOURCES_OPEN_ATTRIBUTE,
        isNativeResourcesOpen,
      );

      flushSync(() => {
        root?.render(
          <AppShell
            availablePageFamilies={viewModel.availablePageFamilies}
            availablePageTools={viewModel.availablePageTools}
            availableResourceTools={viewModel.availableResourceTools}
            availableTaskTools={viewModel.availableTaskTools}
            currentPageFamily={viewModel.currentPageFamily}
            delegatesCurrentAreaNavigation={
              nativeControlDocument !== document
            }
            isNativeResourcesOpen={isNativeResourcesOpen}
            onDisable={onDisable}
            onNavigate={onNavigate}
            onNavigateToCourseSearch={onNavigateToCourseSearch}
            onOpenResource={onOpenResource}
            onOpenTool={onOpenTool}
            onSkipToContent={onSkipToContent}
            onTaskFinderOpenChange={setTaskFinderOpen}
          />,
        );
      });
      syncShellHeight();
    };

    render(latestViewModel);
    const nativeResourcesMenu = nativeControlDocument.getElementById(
      NATIVE_RESOURCES_MENU_ID,
    );
    const nativeResourcesTrigger = findNativeNavigationControl(
      nativeControlDocument,
      "resources",
    );
    const MutationObserverConstructor =
      nativeControlDocument.defaultView?.MutationObserver;
    if (nativeResourcesMenu && MutationObserverConstructor) {
      resourcesObserver = new MutationObserverConstructor(() => {
        render(latestViewModel);
      });
      resourcesObserver.observe(nativeResourcesMenu, {
        attributeFilter: ["aria-hidden", "class", "hidden"],
        attributes: true,
      });
      if (nativeResourcesTrigger) {
        resourcesObserver.observe(nativeResourcesTrigger, {
          attributeFilter: ["aria-expanded", "class"],
          attributes: true,
        });
      }
    }

    return {
      host,
      update: render,
      unmount() {
        resizeObserver?.disconnect();
        resourcesObserver?.disconnect();
        document.defaultView?.removeEventListener("resize", syncShellHeight);
        clearTaskFinderOpen();
        restoreShellHeight();
        nativeResourcesMenu?.removeAttribute(
          NATIVE_RESOURCES_OPEN_ATTRIBUTE,
        );
        root?.unmount();
        host.remove();
      },
    };
  } catch (error) {
    try {
      root?.unmount();
    } catch {
      // Cleanup must not obscure the original rendering failure.
    }
    resizeObserver?.disconnect();
    document.defaultView?.removeEventListener("resize", syncShellHeight);
    clearTaskFinderOpen();
    restoreShellHeight();
    nativeControlDocument
      .getElementById(NATIVE_RESOURCES_MENU_ID)
      ?.removeAttribute(NATIVE_RESOURCES_OPEN_ATTRIBUTE);
    host.remove();
    throw error;
  }
}
