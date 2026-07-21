import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

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
  const [isTaskFinderOpen, setIsTaskFinderOpen] = useState(false);
  const taskFinderId = useId();
  const taskFinderRef = useRef<HTMLElement>(null);
  const taskFinderCloseRef = useRef<HTMLButtonElement>(null);
  const taskFinderToggleRef = useRef<HTMLButtonElement>(null);
  const currentPage = PAGE_FAMILY_DEFINITIONS[currentPageFamily];
  const availableTaskFamilies = PRIMARY_PAGE_FAMILIES.filter((pageFamily) =>
    availablePageFamilies.includes(pageFamily),
  );
  const hasTaskFinderContent =
    availableTaskFamilies.length > 0 || availablePageTools.length > 0;
  const taskFinderViewSignature = [
    currentPageFamily,
    availableTaskFamilies.join(","),
    availablePageTools.map(({ id }) => id).join(","),
  ].join(":");
  const previousTaskFinderViewSignature = useRef(taskFinderViewSignature);

  useEffect(() => {
    if (!isTaskFinderOpen) {
      return;
    }

    taskFinderCloseRef.current?.focus();
  }, [isTaskFinderOpen]);

  useEffect(() => {
    const viewChanged =
      previousTaskFinderViewSignature.current !== taskFinderViewSignature;
    previousTaskFinderViewSignature.current = taskFinderViewSignature;

    if (!viewChanged || !isTaskFinderOpen) {
      return;
    }

    const taskFinder = taskFinderRef.current;
    const root = taskFinder?.getRootNode();
    const activeElement =
      root instanceof ShadowRoot ? root.activeElement : document.activeElement;
    const shouldReturnFocus = Boolean(
      activeElement && taskFinder?.contains(activeElement),
    );

    setIsTaskFinderOpen(false);
    if (shouldReturnFocus) {
      taskFinderToggleRef.current?.focus();
    }
  }, [isTaskFinderOpen, taskFinderViewSignature]);

  const handleDisable = (): void => {
    setIsDisabling(true);
    void onDisable();
  };

  const closeTaskFinder = (returnFocus = false): void => {
    setIsTaskFinderOpen(false);
    if (returnFocus) {
      taskFinderToggleRef.current?.focus();
    }
  };

  const handleTaskFinderNavigation = (
    pageFamily: PrimaryPageFamily,
  ): void => {
    closeTaskFinder(true);
    onNavigate(pageFamily);
  };

  const handleTaskFinderTool = (toolId: PageToolId): void => {
    closeTaskFinder(true);
    onOpenTool(toolId);
  };

  const handleTaskFinderKeyDown = (
    event: ReactKeyboardEvent<HTMLElement>,
  ): void => {
    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    closeTaskFinder(true);
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

      {hasTaskFinderContent && (
        <>
          <button
            className="ba-task-finder-toggle"
            type="button"
            aria-controls={taskFinderId}
            aria-expanded={isTaskFinderOpen}
            ref={taskFinderToggleRef}
            onClick={() => setIsTaskFinderOpen((isOpen) => !isOpen)}
          >
            <span className="ba-task-finder-toggle-copy">
              <strong>Find a task</strong>
              <span>Browse areas and verified Albert links</span>
            </span>
            <span className="ba-task-finder-toggle-arrow" aria-hidden="true">
              ⌄
            </span>
          </button>

          <section
            className="ba-task-finder"
            id={taskFinderId}
            aria-label="Find a task"
            hidden={!isTaskFinderOpen}
            ref={taskFinderRef}
            onKeyDown={handleTaskFinderKeyDown}
          >
            <div className="ba-task-finder-heading">
              <div className="ba-task-finder-intro">
                <span className="ba-task-finder-eyebrow">Find a task</span>
                <strong>Where do you want to go?</strong>
                <span>
                  Choose an area or an original Albert link. Better Albert
                  never invents destinations.
                </span>
              </div>
              <button
                className="ba-task-finder-close"
                type="button"
                aria-label="Close task finder"
                ref={taskFinderCloseRef}
                onClick={() => closeTaskFinder(true)}
              >
                Close
              </button>
            </div>

            <div className="ba-task-finder-sections">
              {availableTaskFamilies.length > 0 && (
                <section
                  className="ba-task-finder-section"
                  aria-labelledby={`${taskFinderId}-areas`}
                >
                  <h2 id={`${taskFinderId}-areas`}>Student services</h2>
                  <div className="ba-task-finder-list">
                    {availableTaskFamilies.map((pageFamily) => {
                      const definition = PAGE_FAMILY_DEFINITIONS[pageFamily];
                      const descriptionId = `${taskFinderId}-${pageFamily}`;

                      return (
                        <button
                          className="ba-task-finder-item ba-task-finder-area"
                          type="button"
                          aria-current={
                            currentPageFamily === pageFamily ? "page" : undefined
                          }
                          aria-describedby={descriptionId}
                          aria-label={`Open ${definition.label}`}
                          key={pageFamily}
                          onClick={() =>
                            handleTaskFinderNavigation(pageFamily)
                          }
                        >
                          <span className="ba-task-finder-item-copy">
                            <strong>{definition.label}</strong>
                            <span id={descriptionId}>
                              {definition.navigationHint}
                            </span>
                          </span>
                          <span aria-hidden="true">›</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {availablePageTools.length > 0 && (
                <section
                  className="ba-task-finder-section"
                  aria-labelledby={`${taskFinderId}-links`}
                >
                  <div className="ba-task-finder-section-heading">
                    <h2 id={`${taskFinderId}-links`}>Quick access</h2>
                    <span>Original Albert links</span>
                  </div>
                  <div className="ba-task-finder-list">
                    {availablePageTools.map((tool) => {
                      const descriptionId = `${taskFinderId}-${tool.id}`;

                      return (
                        <button
                          className="ba-task-finder-item ba-task-finder-tool"
                          type="button"
                          aria-describedby={descriptionId}
                          aria-label={`Open ${tool.label}`}
                          key={tool.id}
                          onClick={() => handleTaskFinderTool(tool.id)}
                        >
                          <span className="ba-task-finder-item-copy">
                            <strong>{tool.label}</strong>
                            <span id={descriptionId}>{tool.description}</span>
                          </span>
                          <span aria-hidden="true">›</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          </section>
        </>
      )}

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
