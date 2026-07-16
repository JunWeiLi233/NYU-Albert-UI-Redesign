import { useState } from "react";

import {
  PAGE_FAMILY_DEFINITIONS,
  PRIMARY_PAGE_FAMILIES,
  type PageFamily,
  type PrimaryPageFamily,
} from "../content/page-families";
import type {
  PageToolDefinition,
  PageToolId,
} from "../content/page-tools";

export interface AppShellProps {
  availablePageFamilies: readonly PrimaryPageFamily[];
  availablePageTools: readonly PageToolDefinition[];
  currentPageFamily: PageFamily;
  onDisable: () => Promise<void>;
  onNavigate: (pageFamily: PrimaryPageFamily) => void;
  onOpenTool: (toolId: PageToolId) => void;
  onSkipToContent: () => void;
}

export function AppShell({
  availablePageFamilies,
  availablePageTools,
  currentPageFamily,
  onDisable,
  onNavigate,
  onOpenTool,
  onSkipToContent,
}: AppShellProps) {
  const [isDisabling, setIsDisabling] = useState(false);
  const currentPage = PAGE_FAMILY_DEFINITIONS[currentPageFamily];

  const handleDisable = (): void => {
    setIsDisabling(true);
    void onDisable();
  };

  return (
    <header className="ba-shell" aria-label="Better Albert">
      <button className="ba-skip-link" type="button" onClick={onSkipToContent}>
        Skip to Albert content
      </button>

      <div className="ba-identity-row">
        <div className="ba-brand-lockup">
          <span className="ba-nyu">NYU</span>
          <span className="ba-brand-rule" aria-hidden="true" />
          <span className="ba-product-name">Better Albert</span>
          <span className="ba-product-status">Unofficial · Local only</span>
        </div>
        <div className="ba-shell-actions">
          <span className="ba-local-status">Official data stays in Albert</span>
          <button
            className="ba-disable-button"
            type="button"
            disabled={isDisabling}
            onClick={handleDisable}
          >
            {isDisabling ? "Disabling…" : "Disable"}
          </button>
        </div>
      </div>

      <div className="ba-workspace-row">
        <div className="ba-page-context" aria-live="polite">
          <span className="ba-page-eyebrow">Workspace</span>
          <strong className="ba-page-title">{currentPage.label}</strong>
          <span className="ba-page-description">{currentPage.description}</span>
        </div>

        <nav className="ba-primary-nav" aria-label="Better Albert areas">
          {PRIMARY_PAGE_FAMILIES.map((pageFamily) => {
            const definition = PAGE_FAMILY_DEFINITIONS[pageFamily];
            const isAvailable = availablePageFamilies.includes(pageFamily);
            const isCurrent = currentPageFamily === pageFamily;

            return (
              <button
                className="ba-nav-item"
                type="button"
                aria-current={isCurrent ? "page" : undefined}
                disabled={!isAvailable}
                key={pageFamily}
                title={
                  isAvailable
                    ? `Open ${definition.label} using Albert navigation`
                    : `${definition.label} is not available in this Albert view`
                }
                onClick={() => onNavigate(pageFamily)}
              >
                {definition.label}
              </button>
            );
          })}
        </nav>
      </div>

      {availablePageTools.length > 0 && (
        <nav className="ba-tool-nav" aria-label={`${currentPage.label} tools`}>
          <span className="ba-tool-label">Native tools</span>
          <div className="ba-tool-list">
            {availablePageTools.map((tool) => (
              <button
                className="ba-tool-item"
                type="button"
                key={tool.id}
                onClick={() => onOpenTool(tool.id)}
              >
                {tool.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      <div className="ba-trust-note">
        Native Albert controls remain authoritative. Better Albert changes presentation only.
      </div>
    </header>
  );
}
