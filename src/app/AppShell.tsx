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
          <span className="ba-primary-label">Student services</span>
          {PRIMARY_PAGE_FAMILIES.map((pageFamily) => {
            const definition = PAGE_FAMILY_DEFINITIONS[pageFamily];
            const isAvailable = availablePageFamilies.includes(pageFamily);
            const isCurrent = currentPageFamily === pageFamily;
            const descriptionId = `ba-nav-description-${pageFamily}`;

            return (
              <button
                className="ba-nav-item"
                type="button"
                aria-describedby={descriptionId}
                aria-label={definition.label}
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
                <span className="ba-nav-copy">
                  <span className="ba-nav-label-text">{definition.label}</span>
                  <span className="ba-nav-hint" id={descriptionId}>
                    {definition.navigationHint}
                  </span>
                </span>
                <span className="ba-nav-arrow" aria-hidden="true">
                  ›
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {availablePageTools.length > 0 && (
        <nav className="ba-tool-nav" aria-label={`${currentPage.label} tools`}>
          <div className="ba-tool-heading">
            <span className="ba-tool-label">Quick access</span>
            <span className="ba-tool-origin">Original Albert links</span>
          </div>
          <div className="ba-tool-list">
            {availablePageTools.map((tool) => {
              const descriptionId = `ba-tool-description-${tool.id}`;

              return (
                <button
                  className="ba-tool-item"
                  type="button"
                  aria-describedby={descriptionId}
                  aria-label={tool.label}
                  key={tool.id}
                  onClick={() => onOpenTool(tool.id)}
                >
                  <span className="ba-tool-copy">
                    <span className="ba-tool-name">{tool.label}</span>
                    <span className="ba-tool-description" id={descriptionId}>
                      {tool.description}
                    </span>
                  </span>
                  <span className="ba-tool-arrow" aria-hidden="true">
                    ›
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      <div className="ba-trust-note">
        Native Albert controls remain authoritative. Better Albert changes presentation only.
      </div>
    </header>
  );
}
