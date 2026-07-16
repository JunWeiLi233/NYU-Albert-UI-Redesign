import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";

import type {
  PageFamily,
  PrimaryPageFamily,
} from "../content/page-families";
import type {
  PageToolDefinition,
  PageToolId,
} from "../content/page-tools";
import headerCss from "../design-system/header.css?inline";
import tokensCss from "../design-system/tokens.css?inline";
import { AppShell } from "./AppShell";

export const HEADER_HOST_ID = "better-albert-header-host";

export interface ShellViewModel {
  availablePageFamilies: readonly PrimaryPageFamily[];
  availablePageTools: readonly PageToolDefinition[];
  currentPageFamily: PageFamily;
}

export interface MountHeaderOptions extends ShellViewModel {
  document: Document;
  onDisable: () => Promise<void>;
  onNavigate: (pageFamily: PrimaryPageFamily) => void;
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
}

export function mountHeader({
  availablePageFamilies,
  availablePageTools,
  currentPageFamily,
  document,
  onDisable,
  onNavigate,
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
  host.style.zIndex = "2147483000";

  let root: Root | undefined;

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

    root = createRoot(mountRoot);

    const render = (viewModel: ShellViewModel): void => {
      flushSync(() => {
        root?.render(
          <AppShell
            availablePageFamilies={viewModel.availablePageFamilies}
            availablePageTools={viewModel.availablePageTools}
            currentPageFamily={viewModel.currentPageFamily}
            onDisable={onDisable}
            onNavigate={onNavigate}
            onOpenTool={onOpenTool}
            onSkipToContent={onSkipToContent}
          />,
        );
      });
    };

    render({ availablePageFamilies, availablePageTools, currentPageFamily });

    return {
      host,
      update: render,
      unmount() {
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
    host.remove();
    throw error;
  }
}
