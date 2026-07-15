import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";

import headerCss from "../design-system/header.css?inline";
import tokensCss from "../design-system/tokens.css?inline";
import { AppHeader } from "./AppHeader";

export const HEADER_HOST_ID = "better-albert-header-host";

export interface MountHeaderOptions {
  document: Document;
  onDisable: () => Promise<void>;
}

export interface MountedHeader {
  host: HTMLElement;
  unmount(): void;
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
  document,
  onDisable,
}: MountHeaderOptions): MountedHeader {
  const existingHost = document.getElementById(HEADER_HOST_ID);
  if (existingHost) {
    return {
      host: existingHost,
      unmount: () => existingHost.remove(),
    };
  }

  const host = document.createElement("div");
  host.id = HEADER_HOST_ID;
  host.style.all = "initial";
  host.style.display = "block";
  host.style.position = "relative";
  host.style.width = "100%";

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
    flushSync(() => {
      root?.render(<AppHeader onDisable={onDisable} />);
    });

    return {
      host,
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
