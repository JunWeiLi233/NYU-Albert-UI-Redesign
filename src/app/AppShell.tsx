import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
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
  ResourceCategory,
  ResourceToolDefinition,
  TaskToolDefinition,
} from "../content/page-tools";
import {
  RESOURCE_CATEGORIES,
  RESOURCE_CATEGORY_DEFINITIONS,
} from "../content/page-tools";

export interface AppShellProps {
  availablePageFamilies: readonly PrimaryPageFamily[];
  availablePageTools: readonly PageToolDefinition[];
  availableResourceTools: readonly ResourceToolDefinition[];
  availableTaskTools: readonly TaskToolDefinition[];
  currentPageFamily: PageFamily;
  delegatesCurrentAreaNavigation: boolean;
  isNativeResourcesOpen: boolean;
  onDisable: () => Promise<void>;
  onNavigate: (pageFamily: PrimaryPageFamily) => void;
  onNavigateToCourseSearch: () => void;
  onOpenResource: (toolId: PageToolId) => void;
  onOpenTool: (toolId: PageToolId) => void;
  onSkipToContent: () => void;
  onTaskFinderOpenChange: (isOpen: boolean) => void;
}

const TASK_SEARCH_SUGGESTIONS = [
  { label: "Find classes", query: "find a course" },
  { label: "Class schedule", query: "class schedule" },
  { label: "Course materials", query: "course materials" },
  { label: "Academic dates", query: "academic calendar" },
  { label: "Housing", query: "housing" },
  { label: "New student help", query: "new student" },
  { label: "Student support", query: "student support" },
  { label: "Check holds", query: "check holds" },
  { label: "When can I register?", query: "when can I register" },
  { label: "To-do list", query: "to do list" },
  { label: "Meet advisor", query: "meet advisor" },
  { label: "View grades", query: "view grades" },
  { label: "Check balance", query: "check balance" },
  { label: "Pay tuition", query: "pay tuition" },
  { label: "Financial aid status", query: "financial aid status" },
] as const;

const RESOURCE_SEARCH_SUGGESTIONS = [
  { label: "Academic dates", toolId: "academic-calendar" },
  { label: "Course materials", toolId: "nyu-brightspace" },
  { label: "Academic support", toolId: "academic-support" },
  { label: "Student life", toolId: "student-life" },
  { label: "Career help", toolId: "wasserman" },
  { label: "Financial aid", toolId: "financial-aid-resources" },
  { label: "ID card", toolId: "nyu-card-center" },
  { label: "Health & counseling", toolId: "wellness-center" },
  { label: "Housing", toolId: "housing" },
  { label: "Tech & Wi-Fi", toolId: "campus-resources" },
  { label: "International students", toolId: "ogs" },
  { label: "Student success", toolId: "nyu-connect" },
  { label: "Student support", toolId: "student-services" },
  { label: "Campus safety", toolId: "campus-safety" },
] as const satisfies readonly {
  label: string;
  toolId: PageToolId;
}[];

const OFFICIAL_TRANSCRIPT_SHORTCUT = {
  afterToolId: "unofficial-transcript",
  description:
    "Open NYU Registrar instructions for ordering an official transcript",
  id: "university-registrar",
  label: "Official Transcript Guidance",
} as const satisfies {
  afterToolId: PageToolId;
  description: string;
  id: PageToolId;
  label: string;
};

const TASK_SEARCH_IGNORED_WORDS = new Set([
  "a",
  "am",
  "an",
  "and",
  "are",
  "can",
  "do",
  "for",
  "get",
  "have",
  "how",
  "i",
  "is",
  "me",
  "my",
  "the",
  "to",
  "was",
  "what",
  "where",
  "with",
]);

const TASK_SEARCH_CONVERSATIONAL_WORDS = new Set([
  "find",
  "look",
  "looking",
  "please",
  "want",
]);

const TASK_SEARCH_RELAXED_WORDS = new Set(["help", "need"]);

function normalizeTaskSearchValue(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isEditableSearchShortcutTarget(
  target: EventTarget | null,
): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox']",
      ),
    )
  );
}

function getTaskSearchWords(
  query: string,
  ignoreConversationalWords = false,
): readonly string[] {
  const words = normalizeTaskSearchValue(query).split(/\s+/);
  const isConversationalPhrase =
    ignoreConversationalWords || words.length > 3;

  return words
    .filter(
      (word) =>
        word.length > 0 &&
        !TASK_SEARCH_IGNORED_WORDS.has(word) &&
        (!isConversationalPhrase ||
          !TASK_SEARCH_CONVERSATIONAL_WORDS.has(word)),
    );
}

function getMeaningfulTaskSearchValue(value: string): string {
  return getTaskSearchWords(value, true).join(" ");
}

function isWithinOneTaskSearchEdit(left: string, right: string): boolean {
  if (Math.abs(left.length - right.length) > 1) {
    return false;
  }

  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;
  let shorterIndex = 0;
  let longerIndex = 0;
  let edits = 0;

  while (shorterIndex < shorter.length && longerIndex < longer.length) {
    if (shorter[shorterIndex] === longer[longerIndex]) {
      shorterIndex += 1;
      longerIndex += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) {
      return false;
    }

    if (shorter.length === longer.length) {
      shorterIndex += 1;
    }
    longerIndex += 1;
  }

  return edits + (longer.length - longerIndex) <= 1;
}

function matchesTaskSearchWord(
  queryWord: string,
  searchableValue: string,
  allowTypos: boolean,
): boolean {
  const searchableWords = searchableValue.split(/\s+/).flatMap((word) => [
    word,
    ...(word.length >= 5 && word.endsWith("es")
      ? [word.slice(0, -2)]
      : []),
    ...(word.length >= 4 && word.endsWith("s")
      ? [word.slice(0, -1)]
      : []),
  ]);
  if (
    searchableWords.some(
      (candidateWord) =>
        candidateWord === queryWord ||
        candidateWord.startsWith(queryWord) ||
        (candidateWord.length >= 4 &&
          queryWord.length - candidateWord.length <= 2 &&
          queryWord.startsWith(candidateWord)),
    )
  ) {
    return true;
  }
  if (!allowTypos || queryWord.length < 5) {
    return false;
  }

  return searchableWords.some(
      (candidateWord) =>
        candidateWord.length >= 5 &&
        isWithinOneTaskSearchEdit(queryWord, candidateWord),
  );
}

function hasContiguousTaskSearchPhrase(
  queryWords: readonly string[],
  searchableValue: string,
  allowTypos: boolean,
): boolean {
  if (queryWords.length < 2) {
    return true;
  }

  const searchableWords = searchableValue
    .split(/\s+/)
    .filter((word) => !TASK_SEARCH_IGNORED_WORDS.has(word));
  return searchableWords.some((_, startIndex) =>
    queryWords.every((queryWord, offset) => {
      const candidateWord = searchableWords[startIndex + offset];
      return (
        candidateWord !== undefined &&
        matchesTaskSearchWord(queryWord, candidateWord, allowTypos)
      );
    }),
  );
}

function matchesTaskSearch(
  query: string,
  values: readonly string[],
  allowTypos = false,
): boolean {
  if (query.length === 0) {
    return true;
  }

  const normalizedQuery = normalizeTaskSearchValue(query);
  const queryWords = getTaskSearchWords(query);
  if (queryWords.length === 0) {
    return values.some((value) =>
      normalizeTaskSearchValue(value).includes(normalizedQuery),
    );
  }
  return values.some((value) => {
    const searchableValue = normalizeTaskSearchValue(value);
    const looseMatch = queryWords.every((word) =>
      matchesTaskSearchWord(word, searchableValue, allowTypos),
    );
    return (
      looseMatch &&
      (queryWords.length !== 2 ||
        hasContiguousTaskSearchPhrase(queryWords, searchableValue, allowTypos))
    );
  });
}

function PageToolNavigation({
  isHomeStarter = false,
  onOpenResourceDirectory,
  onOpenResource,
  onOpenTool,
  pageLabel,
  contextualResourceShortcut,
  resourceDirectoryToggleRef,
  tools,
}: {
  contextualResourceShortcut?: {
    afterToolId: PageToolId;
    description: string;
    id: PageToolId;
    label: string;
  };
  isHomeStarter?: boolean;
  onOpenResourceDirectory?: () => void;
  onOpenResource: (toolId: PageToolId) => void;
  onOpenTool: (toolId: PageToolId) => void;
  pageLabel: string;
  resourceDirectoryToggleRef?: RefObject<HTMLButtonElement | null>;
  tools: readonly PageToolDefinition[];
}) {
  const renderContextualResourceShortcut = (
    resource: NonNullable<typeof contextualResourceShortcut>,
  ) => {
    const descriptionId = `ba-context-resource-description-${resource.id}`;

    return (
      <button
        className="ba-tool-item ba-context-resource-item"
        type="button"
        aria-describedby={descriptionId}
        aria-label={resource.label}
        data-compact-description="true"
        data-resource-id={resource.id}
        key={resource.id}
        onClick={() => onOpenResource(resource.id)}
      >
        <span className="ba-tool-copy">
          <span className="ba-tool-name">{resource.label}</span>
          <span className="ba-tool-description" id={descriptionId}>
            {resource.description}
          </span>
        </span>
        <span className="ba-tool-arrow" aria-hidden="true">
          ›
        </span>
      </button>
    );
  };
  const hasContextualPlacement = Boolean(
    contextualResourceShortcut &&
    tools.some(
      (tool) => tool.id === contextualResourceShortcut.afterToolId,
    ),
  );

  return (
    <nav
      className={`ba-tool-nav${isHomeStarter ? " ba-home-starter-nav" : ""}`}
      aria-label={`${pageLabel} tools`}
    >
      <div className="ba-tool-heading">
        <span className="ba-tool-label">
          {isHomeStarter ? "Start here" : "Quick access"}
        </span>
        <span className="ba-tool-origin">Original Albert links</span>
      </div>
      <div className="ba-tool-list">
        {tools.map((tool) => {
          const descriptionId = `ba-tool-description-${tool.id}`;

          return (
            <Fragment key={tool.id}>
              <button
                className="ba-tool-item"
                type="button"
                aria-describedby={descriptionId}
                aria-label={tool.label}
                data-compact-description={
                  tool.compactDescription ? "true" : undefined
                }
                data-primary-task={
                  isHomeStarter && tool.id === "course-search"
                    ? "true"
                    : undefined
                }
                data-tool-id={tool.id}
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
              {contextualResourceShortcut?.afterToolId === tool.id &&
                renderContextualResourceShortcut(
                  contextualResourceShortcut,
                )}
            </Fragment>
          );
        })}
        {contextualResourceShortcut &&
          !hasContextualPlacement &&
          renderContextualResourceShortcut(contextualResourceShortcut)}
        {onOpenResourceDirectory && (
          <button
            className="ba-tool-item ba-home-resource-item"
            type="button"
            aria-describedby="ba-home-resource-description"
            aria-label="Search NYU resources"
            ref={resourceDirectoryToggleRef}
            onClick={onOpenResourceDirectory}
          >
            <span className="ba-tool-copy">
              <span className="ba-tool-name">NYU resources</span>
              <span
                className="ba-tool-description"
                id="ba-home-resource-description"
              >
                Search official calendars, offices, support, and campus services
              </span>
            </span>
            <span className="ba-tool-arrow" aria-hidden="true">
              ›
            </span>
          </button>
        )}
      </div>
    </nav>
  );
}

export function AppShell({
  availablePageFamilies,
  availablePageTools,
  availableResourceTools,
  availableTaskTools,
  currentPageFamily,
  delegatesCurrentAreaNavigation,
  isNativeResourcesOpen,
  onDisable,
  onNavigate,
  onNavigateToCourseSearch,
  onOpenResource,
  onOpenTool,
  onSkipToContent,
  onTaskFinderOpenChange,
}: AppShellProps) {
  const [isDisabling, setIsDisabling] = useState(false);
  const [isTaskFinderOpen, setIsTaskFinderOpen] = useState(false);
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const taskFinderId = useId();
  const taskFinderRef = useRef<HTMLElement>(null);
  const taskFinderSearchRef = useRef<HTMLInputElement>(null);
  const taskFinderToggleRef = useRef<HTMLButtonElement>(null);
  const resourceDirectoryToggleRef = useRef<HTMLButtonElement>(null);
  const resourceNavigationToggleRef = useRef<HTMLButtonElement>(null);
  const resourceReturnFocusRef = useRef<(() => void) | null>(null);
  const previousNativeResourcesOpenRef = useRef(isNativeResourcesOpen);
  const taskAreaHeadingRef = useRef<HTMLHeadingElement>(null);
  const taskShortcutHeadingRef = useRef<HTMLHeadingElement>(null);
  const resourceSectionHeadingRef = useRef<HTMLHeadingElement>(null);
  const shellRef = useRef<HTMLElement>(null);
  const primaryNavigationRef = useRef<HTMLElement>(null);
  const resourceCategoryHeadingRefs = useRef<
    Map<ResourceCategory, HTMLHeadingElement>
  >(new Map());
  const isResourceSearchMode = isNativeResourcesOpen;
  const currentPage = PAGE_FAMILY_DEFINITIONS[currentPageFamily];

  useEffect(() => {
    const shell = shellRef.current;
    const primaryNavigation = primaryNavigationRef.current;
    if (shell) {
      shell.scrollTop = 0;
    }
    if (primaryNavigation) {
      primaryNavigation.scrollTop = 0;
    }
  }, [currentPageFamily, isResourceSearchMode]);

  useEffect(() => {
    const wasNativeResourcesOpen = previousNativeResourcesOpenRef.current;
    previousNativeResourcesOpenRef.current = isNativeResourcesOpen;
    if (!wasNativeResourcesOpen || isNativeResourcesOpen) {
      return;
    }

    const returnFocus = resourceReturnFocusRef.current;
    resourceReturnFocusRef.current = null;
    const ownerWindow = resourceNavigationToggleRef.current?.ownerDocument
      .defaultView;
    if (!ownerWindow) {
      returnFocus?.();
      return;
    }

    ownerWindow.setTimeout(() => returnFocus?.(), 0);
  }, [isNativeResourcesOpen]);

  const availableTaskFamilies = PRIMARY_PAGE_FAMILIES.filter((pageFamily) =>
    availablePageFamilies.includes(pageFamily),
  );
  const verifiedCourseSearch = availableTaskTools.find(
    ({ id }) => id === "course-search",
  );
  const courseSearchShortcut =
    !isResourceSearchMode && currentPageFamily !== "home"
      ? verifiedCourseSearch
        ? {
            description: verifiedCourseSearch.description,
            mode: "direct" as const,
          }
        : availablePageFamilies.includes("home")
          ? {
              description: "Open Course Search",
              mode: "home" as const,
            }
          : undefined
      : undefined;
  const matchesFamily = (
    pageFamily: PrimaryPageFamily,
    query: string,
    allowTypos = false,
  ): boolean => {
    const definition = PAGE_FAMILY_DEFINITIONS[pageFamily];
    return matchesTaskSearch(
      query,
      [
        definition.label,
        definition.description,
        definition.navigationHint,
        ...definition.keywords,
      ],
      allowTypos,
    );
  };
  const matchesTool = (
    tool: TaskToolDefinition,
    query: string,
    allowTypos = false,
  ): boolean =>
    matchesTaskSearch(
      query,
      [tool.label, tool.description, ...(tool.keywords ?? [])],
      allowTypos,
    );
  const matchesResource = (
    tool: ResourceToolDefinition,
    query: string,
    allowTypos = false,
  ): boolean =>
    matchesTaskSearch(
      query,
      [
        tool.label,
        tool.description,
        RESOURCE_CATEGORY_DEFINITIONS[tool.category].label,
        ...tool.keywords,
      ],
      allowTypos,
    );
  const filterTaskSearchResults = (query: string) => {
    const findResults = (searchQuery: string, allowTypos = false) => {
      let matchingResourceTools = availableResourceTools.filter((tool) =>
        matchesResource(tool, searchQuery, allowTypos),
      );
      if (allowTypos && matchingResourceTools.length > 1) {
        const queryWords = getTaskSearchWords(searchQuery);
        const queryWord = queryWords.length === 1 ? queryWords[0] : undefined;
        if (queryWord) {
          const typoMatches = matchingResourceTools.filter((tool) =>
            normalizeTaskSearchValue(tool.label)
              .split(" ")
              .some((labelWord) =>
                isWithinOneTaskSearchEdit(queryWord, labelWord),
              ),
          );
          if (typoMatches.length > 0) {
            const shortestLabel = Math.min(
              ...typoMatches.map((tool) =>
                normalizeTaskSearchValue(tool.label).split(" ").length,
              ),
            );
            matchingResourceTools = typoMatches.filter(
              (tool) =>
                normalizeTaskSearchValue(tool.label).split(" ").length ===
                shortestLabel,
            );
          }
        }
      }
      const meaningfulQuery = getTaskSearchWords(searchQuery, true).join(" ");
      const exactResourceLabelTools = matchingResourceTools.filter(
        (tool) =>
          getMeaningfulTaskSearchValue(tool.label) === meaningfulQuery,
      );
      const exactResourceAliasTools = matchingResourceTools.filter((tool) =>
        [tool.label, ...tool.keywords].some(
          (value) => getMeaningfulTaskSearchValue(value) === meaningfulQuery,
        ),
      );
      const resourceTools =
        exactResourceLabelTools.length > 0
          ? exactResourceLabelTools
          : exactResourceAliasTools.length > 0
            ? exactResourceAliasTools
            : matchingResourceTools;

      // An exact official resource label is already an actionable destination.
      // Prefer it over a broad area match so common requests such as
      // “financial aid” open the NYU resource on Enter instead of making a
      // new student choose between Finances and Financial Aid.
      const matchingTaskTools =
        isResourceSearchMode
          ? []
          : availableTaskTools.filter((tool) =>
              matchesTool(tool, searchQuery, allowTypos),
            );
      const exactTaskTools = matchingTaskTools.filter((tool) =>
        [tool.label, ...(tool.keywords ?? [])].some(
          (value) => getMeaningfulTaskSearchValue(value) === meaningfulQuery,
        ),
      );
      const taskTools =
        exactResourceLabelTools.length > 0
          ? []
          : exactResourceAliasTools.length > 0 && exactTaskTools.length === 0
            ? []
            : exactTaskTools.length > 0
            ? exactTaskTools
            : matchingTaskTools;
      const hasDirectTaskResult =
        searchQuery.length > 0 && taskTools.length > 0;
      const prefersResourceAlias =
        exactResourceAliasTools.length > 0 && exactTaskTools.length === 0;
      const prefersUniqueResource =
        matchingResourceTools.length === 1 && !hasDirectTaskResult;
      const taskFamilies =
        isResourceSearchMode ||
        exactResourceLabelTools.length > 0 ||
        prefersResourceAlias ||
        prefersUniqueResource
        ? []
        : availableTaskFamilies.filter(
            (pageFamily) =>
              !hasDirectTaskResult &&
              matchesFamily(pageFamily, searchQuery, allowTypos),
          );

      return { resourceTools, taskFamilies, taskTools };
    };
    const strictResults = findResults(query);
    const countResults = ({
      resourceTools,
      taskFamilies,
      taskTools,
    }: ReturnType<typeof findResults>): number =>
      taskFamilies.length + taskTools.length + resourceTools.length;
    const strictResultCount = countResults(strictResults);
    if (query.length === 0 || strictResultCount > 0) {
      return strictResults;
    }

    const relaxedQuery = getTaskSearchWords(query, true)
      .filter((word) => !TASK_SEARCH_RELAXED_WORDS.has(word))
      .join(" ");
    if (relaxedQuery.length > 0 && relaxedQuery !== query) {
      const relaxedResults = findResults(relaxedQuery);
      if (countResults(relaxedResults) > 0) {
        return relaxedResults;
      }
      return findResults(relaxedQuery, true);
    }

    return findResults(query, true);
  };
  const normalizedTaskSearchQuery = taskSearchQuery
    .trim()
    .toLocaleLowerCase();
  const {
    resourceTools: filteredResourceTools,
    taskFamilies: filteredTaskFamilies,
    taskTools: filteredTaskTools,
  } = filterTaskSearchResults(normalizedTaskSearchQuery);
  const filteredTaskToolGroups = PRIMARY_PAGE_FAMILIES.flatMap(
    (pageFamily) => {
      const tools = filteredTaskTools.filter(
        (tool) => tool.pageFamily === pageFamily,
      );
      return tools.length > 0 ? [{ pageFamily, tools }] : [];
    },
  );
  const filteredResourceGroups = RESOURCE_CATEGORIES.flatMap((category) => {
    const tools = filteredResourceTools.filter(
      (tool) => tool.category === category,
    );
    return tools.length > 0 ? [{ category, tools }] : [];
  });
  const featuredResourceTools = availableResourceTools.filter(
    (tool) => tool.featured,
  );
  const contextualResourceShortcut =
    currentPageFamily === "grades" &&
    availableResourceTools.some(
      (tool) => tool.id === OFFICIAL_TRANSCRIPT_SHORTCUT.id,
    )
      ? OFFICIAL_TRANSCRIPT_SHORTCUT
      : undefined;
  const useOfficialTranscriptGuidance = Boolean(
    contextualResourceShortcut &&
      normalizedTaskSearchQuery.includes("transcript") &&
      !normalizedTaskSearchQuery.includes("unofficial"),
  );
  const availableTaskSearchSuggestions =
    !isResourceSearchMode && normalizedTaskSearchQuery.length === 0
      ? TASK_SEARCH_SUGGESTIONS.filter(({ query }) => {
          const normalizedQuery = query.toLocaleLowerCase();
          return (
            availableTaskTools.some((tool) =>
              matchesTool(tool, normalizedQuery),
            ) ||
            availableTaskFamilies.some((pageFamily) =>
              matchesFamily(pageFamily, normalizedQuery),
            ) ||
            availableResourceTools.some((tool) =>
              matchesResource(tool, normalizedQuery),
            )
          );
        })
      : [];
  const availableResourceSearchSuggestions =
    isResourceSearchMode && normalizedTaskSearchQuery.length === 0
      ? RESOURCE_SEARCH_SUGGESTIONS.filter(({ toolId }) =>
          availableResourceTools.some((tool) => tool.id === toolId),
        )
      : [];
  const filteredResultCount =
    filteredTaskFamilies.length +
    filteredTaskTools.length +
    filteredResourceTools.length;
  const singleTaskSearchResult =
    normalizedTaskSearchQuery.length > 0 && filteredResultCount === 1
      ? (() => {
          const pageFamily = filteredTaskFamilies[0];
          if (pageFamily) {
            const definition = PAGE_FAMILY_DEFINITIONS[pageFamily];
            return {
              description: definition.navigationHint,
              label: definition.label,
            };
          }

          const taskTool = filteredTaskTools[0];
          if (taskTool) {
            return {
              description: taskTool.description,
              label: taskTool.label,
            };
          }

          const resourceTool = filteredResourceTools[0];
          if (resourceTool) {
            return {
              description:
                useOfficialTranscriptGuidance &&
                resourceTool.id === OFFICIAL_TRANSCRIPT_SHORTCUT.id
                  ? OFFICIAL_TRANSCRIPT_SHORTCUT.description
                  : resourceTool.description,
              label: resourceTool.label,
            };
          }

          return undefined;
        })()
      : undefined;
  const hasFilteredResults = filteredResultCount > 0;
  const hasNoTaskSearchResults =
    normalizedTaskSearchQuery.length > 0 && !hasFilteredResults;
  const taskSearchResultSummary =
    normalizedTaskSearchQuery.length === 0
      ? `${filteredResultCount} verified destinations available`
      : `${filteredResultCount} ${
          filteredResultCount === 1 ? "result" : "results"
        } for “${taskSearchQuery.trim()}”`;
  const hasTaskFinderContent =
    availableTaskFamilies.length > 0 ||
    availableTaskTools.length > 0 ||
    availableResourceTools.length > 0;
  const taskFinderViewSignature = [
    currentPageFamily,
    isResourceSearchMode ? "resources" : "tasks",
    availableTaskFamilies.join(","),
    availableTaskTools.map(({ id }) => id).join(","),
    availableResourceTools.map(({ id }) => id).join(","),
  ].join(":");
  const previousTaskFinderViewSignature = useRef(taskFinderViewSignature);

  useEffect(() => {
    onTaskFinderOpenChange(isTaskFinderOpen);

    return () => onTaskFinderOpenChange(false);
  }, [isTaskFinderOpen, onTaskFinderOpenChange]);

  useEffect(() => {
    if (!isTaskFinderOpen) {
      return;
    }

    const taskFinder = taskFinderRef.current;
    if (taskFinder) {
      taskFinder.scrollTop = 0;
      taskFinder.scrollLeft = 0;
    }
    taskFinderSearchRef.current?.focus();
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

    setTaskSearchQuery("");
    setIsTaskFinderOpen(false);
    if (shouldReturnFocus) {
      taskFinderToggleRef.current?.focus();
    }
  }, [isTaskFinderOpen, taskFinderViewSignature]);

  useEffect(() => {
    if (!isNativeResourcesOpen || availableResourceTools.length === 0) {
      return;
    }

    setTaskSearchQuery("");
    setIsTaskFinderOpen(true);
  }, [availableResourceTools.length, isNativeResourcesOpen]);

  const handleDisable = (): void => {
    setIsDisabling(true);
    void onDisable();
  };

  const closeTaskFinder = (returnFocus = false): void => {
    setTaskSearchQuery("");
    setIsTaskFinderOpen(false);
    if (returnFocus) {
      taskFinderToggleRef.current?.focus();
    }
  };

  const toggleTaskFinder = (): void => {
    if (isTaskFinderOpen) {
      closeTaskFinder();
      return;
    }

    setTaskSearchQuery("");
    setIsTaskFinderOpen(true);
  };

  useEffect(() => {
    const hasKeyboardSearchContent = isResourceSearchMode
      ? availableResourceTools.length > 0
      : hasTaskFinderContent;
    const ownerDocument = taskFinderToggleRef.current?.ownerDocument;
    if (!hasKeyboardSearchContent || !ownerDocument) {
      return;
    }

    const openTaskFinderFromKeyboard = (
      event: globalThis.KeyboardEvent,
    ): void => {
      if (
        isTaskFinderOpen ||
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        event.key !== "/" ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        isEditableSearchShortcutTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      setTaskSearchQuery("");
      setIsTaskFinderOpen(true);
    };

    ownerDocument.addEventListener("keydown", openTaskFinderFromKeyboard);
    return () =>
      ownerDocument.removeEventListener(
        "keydown",
        openTaskFinderFromKeyboard,
      );
  }, [
    availableResourceTools.length,
    hasTaskFinderContent,
    isResourceSearchMode,
    isTaskFinderOpen,
  ]);

  const focusTaskFinderTarget = (
    target: HTMLElement | null | undefined,
  ): void => {
    target?.scrollIntoView({ block: "start" });
    target?.focus({ preventScroll: true });
  };

  const handleTaskFinderNavigation = (
    pageFamily: PrimaryPageFamily,
  ): void => {
    if (pageFamily === "resources" && !isNativeResourcesOpen) {
      resourceReturnFocusRef.current = () =>
        taskFinderToggleRef.current?.focus({ preventScroll: true });
    }
    if (
      pageFamily === currentPageFamily &&
      !delegatesCurrentAreaNavigation
    ) {
      closeTaskFinder();
      onSkipToContent();
      return;
    }
    closeTaskFinder(true);
    onNavigate(pageFamily);
  };

  const handleTaskFinderTool = (toolId: PageToolId): void => {
    closeTaskFinder();
    const ownerWindow = taskFinderToggleRef.current?.ownerDocument.defaultView;
    if (!ownerWindow) {
      onOpenTool(toolId);
      return;
    }

    ownerWindow.setTimeout(() => onOpenTool(toolId), 0);
  };

  const handleTaskFinderResource = (toolId: PageToolId): void => {
    closeTaskFinder(true);
    onOpenResource(toolId);
  };

  const openSingleVerifiedTaskResult = (query: string): boolean => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const {
      resourceTools,
      taskFamilies,
      taskTools,
    } = filterTaskSearchResults(normalizedQuery);
    if (
      taskFamilies.length + taskTools.length + resourceTools.length !==
      1
    ) {
      return false;
    }

    const pageFamily = taskFamilies[0];
    if (pageFamily) {
      handleTaskFinderNavigation(pageFamily);
      return true;
    }

    const taskTool = taskTools[0];
    if (taskTool) {
      handleTaskFinderTool(taskTool.id);
      return true;
    }

    const resourceTool = resourceTools[0];
    if (resourceTool) {
      handleTaskFinderResource(resourceTool.id);
      return true;
    }

    return false;
  };

  const handleTaskSearchKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement>,
  ): void => {
    if (
      event.key !== "Enter" ||
      normalizedTaskSearchQuery.length === 0
    ) {
      return;
    }

    event.preventDefault();
    if (filteredResultCount !== 1) {
      return;
    }

    const pageFamily = filteredTaskFamilies[0];
    if (pageFamily) {
      handleTaskFinderNavigation(pageFamily);
      return;
    }

    const taskTool = filteredTaskTools[0];
    if (taskTool) {
      handleTaskFinderTool(taskTool.id);
      return;
    }

    const resourceTool = filteredResourceTools[0];
    if (resourceTool) {
      handleTaskFinderResource(resourceTool.id);
    }
  };

  const handlePrimaryNavigation = (
    pageFamily: PrimaryPageFamily,
  ): void => {
    closeTaskFinder();
    if (
      pageFamily === currentPageFamily &&
      !delegatesCurrentAreaNavigation
    ) {
      onSkipToContent();
      return;
    }
    onNavigate(pageFamily);
  };

  const openResourceDirectory = (): void => {
    resourceReturnFocusRef.current = () =>
      resourceDirectoryToggleRef.current?.focus({ preventScroll: true });
    handlePrimaryNavigation("resources");
  };

  const handlePrimaryTool = (toolId: PageToolId): void => {
    closeTaskFinder();
    onOpenTool(toolId);
  };

  const handleCourseSearchShortcut = (): void => {
    closeTaskFinder();
    if (courseSearchShortcut?.mode === "direct") {
      onOpenTool("course-search");
      return;
    }
    if (courseSearchShortcut?.mode === "home") {
      onNavigateToCourseSearch();
    }
  };

  const handlePrimaryResource = (toolId: PageToolId): void => {
    closeTaskFinder();
    onOpenResource(toolId);
  };

  const browseAllResources = (): void => {
    closeTaskFinder(true);
  };

  const dismissTaskFinder = (): void => {
    if (isResourceSearchMode) {
      const returnFocus = resourceReturnFocusRef.current;
      closeTaskFinder();
      onNavigate("resources");
      const ownerWindow = taskFinderToggleRef.current?.ownerDocument.defaultView;
      if (ownerWindow) {
        ownerWindow.setTimeout(() => {
          returnFocus?.();
        }, 0);
      } else {
        returnFocus?.();
      }
      resourceReturnFocusRef.current = null;
      return;
    }

    closeTaskFinder(true);
  };

  const handleTaskFinderKeyDown = (
    event: ReactKeyboardEvent<HTMLElement>,
  ): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      dismissTaskFinder();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableControls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])",
      ),
    ).filter((control) => {
      const style =
        control.ownerDocument.defaultView?.getComputedStyle(control);
      return (
        control.getClientRects().length > 0 &&
        style?.display !== "none" &&
        style?.visibility !== "hidden"
      );
    });
    const firstControl = focusableControls[0];
    const lastControl = focusableControls.at(-1);
    if (!firstControl || !lastControl) {
      return;
    }

    const root = event.currentTarget.getRootNode();
    const activeElement =
      root instanceof ShadowRoot ? root.activeElement : document.activeElement;
    const shouldWrapBackward = event.shiftKey && activeElement === firstControl;
    const shouldWrapForward = !event.shiftKey && activeElement === lastControl;
    if (!shouldWrapBackward && !shouldWrapForward) {
      return;
    }

    event.preventDefault();
    (shouldWrapBackward ? lastControl : firstControl).focus();
  };

  return (
    <header ref={shellRef} className="ba-shell" aria-label="Better Albert">
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
            aria-describedby="ba-original-albert-help"
            aria-label="Use original Albert"
            disabled={isDisabling}
            title="Use original Albert. Better Albert stays off until you turn it on from the browser extension icon."
            onClick={handleDisable}
          >
            {isDisabling ? "Switching…" : "Original Albert"}
          </button>
          <span className="ba-visually-hidden" id="ba-original-albert-help">
            Better Albert stays off until you turn it on from the browser
            extension icon.
          </span>
        </div>
      </div>

      <div className="ba-workspace-row">
        <div
          className="ba-page-context"
          data-page-family={currentPageFamily}
          aria-live="polite"
        >
          <span className="ba-page-eyebrow">Workspace</span>
          <strong className="ba-page-title">{currentPage.label}</strong>
          <span className="ba-page-description">{currentPage.description}</span>
        </div>

        {hasTaskFinderContent && (
          <div
            className="ba-discovery-actions"
            data-has-course-search={courseSearchShortcut ? "true" : undefined}
          >
            {courseSearchShortcut && (
              <button
                className="ba-course-search-shortcut"
                type="button"
                aria-label="Find classes"
                aria-describedby="ba-course-search-shortcut-description"
                data-course-search-mode={courseSearchShortcut.mode}
                onClick={handleCourseSearchShortcut}
              >
                <span className="ba-course-search-shortcut-copy">
                  <strong>Find classes</strong>
                  <span id="ba-course-search-shortcut-description">
                    {courseSearchShortcut.description}
                  </span>
                </span>
                <span
                  className="ba-course-search-shortcut-arrow"
                  aria-hidden="true"
                >
                  ›
                </span>
              </button>
            )}
            <button
              className="ba-task-finder-toggle"
              type="button"
              aria-label={
                isResourceSearchMode ? "Search NYU resources" : "Find a task"
              }
              aria-controls={taskFinderId}
              aria-expanded={isTaskFinderOpen}
              aria-keyshortcuts="/"
              ref={taskFinderToggleRef}
              onClick={toggleTaskFinder}
            >
              <span className="ba-task-finder-toggle-copy">
                <strong>
                  {isResourceSearchMode
                    ? "Search NYU resources"
                    : "Find a task"}
                </strong>
                <span>
                  {isResourceSearchMode
                    ? "Search all official links in this directory"
                    : "Find classes, tasks, and NYU resources"}
                </span>
              </span>
              <span
                className="ba-task-finder-toggle-actions"
                aria-hidden="true"
              >
                <kbd className="ba-task-finder-toggle-shortcut">/</kbd>
                <span className="ba-task-finder-toggle-arrow">⌄</span>
              </span>
            </button>
          </div>
        )}

        {!isNativeResourcesOpen &&
          (availablePageTools.length > 0 ||
            contextualResourceShortcut) && (
          <PageToolNavigation
            {...(contextualResourceShortcut
              ? { contextualResourceShortcut }
              : {})}
            isHomeStarter={currentPageFamily === "home"}
            {...(availablePageFamilies.includes("resources")
              ? {
                  onOpenResourceDirectory: openResourceDirectory,
                  resourceDirectoryToggleRef,
                }
              : {})}
            onOpenResource={handlePrimaryResource}
            onOpenTool={handlePrimaryTool}
            pageLabel={currentPage.label}
            tools={availablePageTools}
          />
        )}

        <nav
          ref={primaryNavigationRef}
          className="ba-primary-nav"
          aria-label="Better Albert areas"
        >
          <span className="ba-primary-label">Student services</span>
          {PRIMARY_PAGE_FAMILIES.map((pageFamily) => {
            const definition = PAGE_FAMILY_DEFINITIONS[pageFamily];
            const isAvailable = availablePageFamilies.includes(pageFamily);
            const isCurrent = currentPageFamily === pageFamily;
            const isResourcesToggle = pageFamily === "resources";
            const isClosingResources =
              isResourcesToggle && isNativeResourcesOpen;
            const descriptionId = `ba-nav-description-${pageFamily}`;
            const navigationLabel = isClosingResources
              ? "Close Other Resources"
              : definition.label;
            const navigationHint = isClosingResources
              ? "Return to your current Albert page"
              : definition.navigationHint;

            return (
              <button
                className={`ba-nav-item${
                  isResourcesToggle ? " ba-nav-item-resources" : ""
                }`}
                type="button"
                aria-describedby={descriptionId}
                aria-expanded={
                  isResourcesToggle ? isNativeResourcesOpen : undefined
                }
                aria-label={navigationLabel}
                aria-current={isCurrent ? "page" : undefined}
                disabled={!isAvailable}
                key={pageFamily}
                title={
                  isAvailable
                    ? isClosingResources
                      ? "Close Albert's native Other Resources directory"
                      : `Open ${definition.label} using Albert navigation`
                    : `${definition.label} is not available in this Albert view`
                }
                ref={isResourcesToggle ? resourceNavigationToggleRef : undefined}
                onClick={() => {
                  if (isResourcesToggle && !isNativeResourcesOpen) {
                    resourceReturnFocusRef.current = () =>
                      resourceNavigationToggleRef.current?.focus({
                        preventScroll: true,
                      });
                  }
                  handlePrimaryNavigation(pageFamily);
                }}
              >
                <span className="ba-nav-copy">
                  <span className="ba-nav-label-text">
                    <span className="ba-nav-label-full">
                      {navigationLabel}
                    </span>
                    {isResourcesToggle && (
                      <span
                        className="ba-nav-label-compact"
                        aria-hidden="true"
                      >
                        {isClosingResources ? "Close" : "Resources"}
                      </span>
                    )}
                  </span>
                  <span className="ba-nav-hint" id={descriptionId}>
                    {navigationHint}
                  </span>
                </span>
                <span className="ba-nav-arrow" aria-hidden="true">
                  {isClosingResources ? "×" : "›"}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {hasTaskFinderContent && (
        <section
          className="ba-task-finder"
          id={taskFinderId}
          aria-label={
            isResourceSearchMode ? "Search NYU resources" : "Find a task"
          }
          aria-modal="true"
          data-resource-search={isResourceSearchMode ? "true" : undefined}
          data-single-result={
            normalizedTaskSearchQuery.length > 0 && filteredResultCount === 1
              ? "true"
              : undefined
          }
          hidden={!isTaskFinderOpen}
          ref={taskFinderRef}
          role="dialog"
          onKeyDown={handleTaskFinderKeyDown}
        >
          <div className="ba-task-finder-heading">
            <div className="ba-task-finder-intro">
              <span className="ba-task-finder-eyebrow">
                {isResourceSearchMode ? "NYU Resources" : "Find a task"}
              </span>
              <strong>
                {isResourceSearchMode
                  ? "Which NYU service do you need?"
                  : "What do you need to do?"}
              </strong>
              <span>
                {isResourceSearchMode
                  ? "Search only the official links already available in Albert’s Other Resources directory."
                  : "Choose a task or a link already available in Albert. Better Albert never invents destinations."}
              </span>
            </div>
            <button
              className="ba-task-finder-heading-close"
              type="button"
              aria-label={
                isResourceSearchMode
                  ? "Close resources"
                  : "Close task finder"
              }
              onClick={dismissTaskFinder}
            >
              {isResourceSearchMode ? "Close resources" : "Close"}
            </button>
          </div>

          <div className="ba-task-finder-search" role="search">
              <label htmlFor={`${taskFinderId}-search`}>
                {isResourceSearchMode
                  ? "Search by service or need"
                  : "Search classes, tasks, and resources"}
              </label>
              <div className="ba-task-finder-search-row">
                <input
                  id={`${taskFinderId}-search`}
                  type="search"
                  aria-controls={`${taskFinderId}-results`}
                  aria-describedby={`${taskFinderId}-search-status${
                    normalizedTaskSearchQuery.length > 0 &&
                    filteredResultCount === 1
                      ? ` ${taskFinderId}-search-destination ${taskFinderId}-search-hint`
                      : ""
                  }`}
                  autoComplete="off"
                  placeholder={
                    isResourceSearchMode
                      ? "Try financial aid, counseling, or ID card"
                      : "Try “find a course” for one-step class search, “new student,” or “financial aid”"
                  }
                  ref={taskFinderSearchRef}
                  spellCheck={false}
                  value={taskSearchQuery}
                  onChange={(event) => setTaskSearchQuery(event.target.value)}
                  onKeyDown={handleTaskSearchKeyDown}
                />
                {normalizedTaskSearchQuery.length > 0 && (
                  <button
                    className="ba-task-finder-search-clear"
                    type="button"
                    aria-label={
                      hasNoTaskSearchResults
                        ? isResourceSearchMode
                          ? "Show all NYU resources"
                          : "Show all tasks and resources"
                        : isResourceSearchMode
                          ? "Clear resource search"
                          : "Clear task search"
                    }
                    onClick={() => {
                      setTaskSearchQuery("");
                      taskFinderSearchRef.current?.focus();
                    }}
                  >
                    {hasNoTaskSearchResults ? "Show all" : "Clear"}
                  </button>
                )}
              </div>
              {(availableTaskSearchSuggestions.length > 0 ||
                availableResourceSearchSuggestions.length > 0) && (
                <div
                  className="ba-task-finder-common"
                  role="group"
                  aria-labelledby={`${taskFinderId}-common-label`}
                >
                  <span
                    className="ba-task-finder-common-label"
                    id={`${taskFinderId}-common-label`}
                  >
                    {isResourceSearchMode
                      ? "Popular resources"
                      : "Common tasks"}
                    <span className="ba-task-finder-common-scroll-hint">
                      Scroll for more
                    </span>
                  </span>
                  <div className="ba-task-finder-common-list">
                    {isResourceSearchMode
                      ? availableResourceSearchSuggestions.map(
                          ({ label, toolId }) => (
                            <button
                              className="ba-task-finder-common-task"
                              type="button"
                              key={toolId}
                              onClick={() =>
                                handleTaskFinderResource(toolId)
                              }
                            >
                              {label}
                            </button>
                          ),
                        )
                      : availableTaskSearchSuggestions.map(
                          ({ label, query }) => (
                            <button
                              className="ba-task-finder-common-task"
                              type="button"
                              data-primary-task={
                                label === "Find classes" ? "true" : undefined
                              }
                              key={query}
                              onClick={() => {
                                if (openSingleVerifiedTaskResult(query)) {
                                  return;
                                }
                                setTaskSearchQuery(query);
                                taskFinderSearchRef.current?.focus();
                              }}
                            >
                              {label}
                            </button>
                          ),
                        )}
                  </div>
                </div>
              )}
              <p
                className="ba-task-finder-search-status"
                id={`${taskFinderId}-search-status`}
                aria-live="polite"
              >
                {taskSearchResultSummary}
              </p>
              {normalizedTaskSearchQuery.length > 0 &&
                filteredResultCount === 1 && (
                  <>
                    {singleTaskSearchResult && (
                      <p
                        className="ba-task-finder-search-result"
                        id={`${taskFinderId}-search-destination`}
                      >
                        <strong>Verified destination:</strong>{" "}
                        {singleTaskSearchResult.label}
                        <span> — {singleTaskSearchResult.description}</span>
                      </p>
                    )}
                    <p
                      className="ba-task-finder-search-hint"
                      id={`${taskFinderId}-search-hint`}
                    >
                      Press Enter to open this verified destination.
                    </p>
                  </>
                )}
            </div>

            <nav
              className="ba-task-finder-jump-nav"
              aria-label={
                isResourceSearchMode
                  ? "Jump to resource search section"
                  : "Jump to task finder section"
              }
            >
              <span className="ba-task-finder-jump-label">Jump to</span>
              <div className="ba-task-finder-jump-links">
                <button
                  className="ba-task-finder-jump"
                  type="button"
                  onClick={() =>
                    focusTaskFinderTarget(taskFinderSearchRef.current)
                  }
                >
                  Search
                </button>
                {filteredTaskFamilies.length > 0 && (
                  <button
                    className="ba-task-finder-jump"
                    type="button"
                    onClick={() =>
                      focusTaskFinderTarget(taskAreaHeadingRef.current)
                    }
                  >
                    Areas
                  </button>
                )}
                {filteredTaskToolGroups.length > 0 && (
                  <button
                    className="ba-task-finder-jump"
                    type="button"
                    aria-label="Task shortcuts"
                    onClick={() =>
                      focusTaskFinderTarget(taskShortcutHeadingRef.current)
                    }
                  >
                    <span className="ba-task-finder-jump-full">
                      Task shortcuts
                    </span>
                    <span
                      className="ba-task-finder-jump-compact"
                      aria-hidden="true"
                    >
                      Tasks
                    </span>
                  </button>
                )}
                {isResourceSearchMode ? (
                  <>
                    <button
                      className="ba-task-finder-jump ba-task-finder-jump-resource-results"
                      type="button"
                      aria-label="NYU resource results"
                      onClick={() =>
                        focusTaskFinderTarget(
                          resourceSectionHeadingRef.current,
                        )
                      }
                    >
                      Results
                    </button>
                    {filteredResourceGroups.map(({ category }) => (
                      <button
                        className="ba-task-finder-jump ba-task-finder-jump-resource-category"
                        type="button"
                        key={category}
                        onClick={() =>
                          focusTaskFinderTarget(
                            resourceCategoryHeadingRefs.current.get(category),
                          )
                        }
                      >
                        {RESOURCE_CATEGORY_DEFINITIONS[category].label}
                      </button>
                    ))}
                  </>
                ) : (
                  filteredResourceTools.length > 0 && (
                    <button
                      className="ba-task-finder-jump"
                      type="button"
                      aria-label="NYU resources"
                      onClick={() =>
                        focusTaskFinderTarget(
                          resourceSectionHeadingRef.current,
                        )
                      }
                    >
                      <span className="ba-task-finder-jump-full">
                        NYU resources
                      </span>
                      <span
                        className="ba-task-finder-jump-compact"
                        aria-hidden="true"
                      >
                        Resources
                      </span>
                    </button>
                  )
                )}
              </div>
              <button
                className="ba-task-finder-close"
                type="button"
                aria-label={
                  isResourceSearchMode
                    ? "Close resources"
                    : "Close task finder"
                }
                onClick={dismissTaskFinder}
              >
                Close
              </button>
            </nav>

            <div
              className="ba-task-finder-sections"
              id={`${taskFinderId}-results`}
            >
              {!hasFilteredResults && (
                <div className="ba-task-finder-empty">
                  <strong>
                    No verified destination matches “{taskSearchQuery.trim()}”
                  </strong>
                  <span>
                    {isResourceSearchMode
                      ? "Try a broader term. Better Albert only searches original links from Other Resources."
                      : "Try a broader term. Better Albert only searches links already available in this Albert view."}
                  </span>
                </div>
              )}

              {filteredTaskFamilies.length > 0 && (
                <section
                  className="ba-task-finder-section"
                  aria-labelledby={`${taskFinderId}-areas`}
                >
                  <h2
                    id={`${taskFinderId}-areas`}
                    ref={taskAreaHeadingRef}
                    tabIndex={-1}
                  >
                    What you can do
                  </h2>
                  <div className="ba-task-finder-list">
                    {filteredTaskFamilies.map((pageFamily) => {
                      const definition = PAGE_FAMILY_DEFINITIONS[pageFamily];
                      const descriptionId = `${taskFinderId}-${pageFamily}`;

                      return (
                        <button
                          className="ba-task-finder-item ba-task-finder-area"
                          type="button"
                          aria-current={
                            currentPageFamily === pageFamily ? "page" : undefined
                          }
                          aria-label={`Open ${definition.label} — ${definition.navigationHint}`}
                          key={pageFamily}
                          onClick={() =>
                            handleTaskFinderNavigation(pageFamily)
                          }
                        >
                          <span className="ba-task-finder-item-copy">
                            <strong>{definition.navigationHint}</strong>
                            <span id={descriptionId}>
                              {definition.label} · Albert area
                            </span>
                          </span>
                          <span aria-hidden="true">›</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {filteredTaskToolGroups.length > 0 && (
                <section
                  className="ba-task-finder-section ba-task-finder-task-section"
                  aria-labelledby={`${taskFinderId}-links`}
                >
                  <div className="ba-task-finder-section-heading">
                    <h2
                      id={`${taskFinderId}-links`}
                      ref={taskShortcutHeadingRef}
                      tabIndex={-1}
                    >
                      Task shortcuts
                    </h2>
                    <span>Verified in this Albert view</span>
                  </div>
                  <div className="ba-task-finder-task-groups">
                    {filteredTaskToolGroups.map(({ pageFamily, tools }) => {
                      const definition = PAGE_FAMILY_DEFINITIONS[pageFamily];
                      const groupId = `${taskFinderId}-task-group-${pageFamily}`;

                      return (
                        <section
                          className="ba-task-finder-task-group"
                          aria-labelledby={groupId}
                          key={pageFamily}
                        >
                          <h3 id={groupId}>{definition.label}</h3>
                          <div className="ba-task-finder-list">
                            {tools.map((tool) => {
                              const descriptionId = `${taskFinderId}-${tool.id}`;

                              return (
                                <button
                                  className="ba-task-finder-item ba-task-finder-tool"
                                  type="button"
                                  aria-label={`Open ${tool.label} — ${tool.description}`}
                                  key={tool.id}
                                  onClick={() => handleTaskFinderTool(tool.id)}
                                >
                                  <span className="ba-task-finder-item-copy">
                                    <strong>{tool.description}</strong>
                                    <span id={descriptionId}>
                                      {tool.label} · {definition.label}
                                    </span>
                                  </span>
                                  <span aria-hidden="true">›</span>
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </section>
              )}

              {filteredResourceTools.length > 0 && (
                <section
                  className="ba-task-finder-section ba-task-finder-resource-section"
                  aria-labelledby={`${taskFinderId}-resources`}
                >
                  <div className="ba-task-finder-section-heading">
                    <h2
                      id={`${taskFinderId}-resources`}
                      ref={resourceSectionHeadingRef}
                      tabIndex={-1}
                    >
                      NYU resources
                    </h2>
                    <span>Verified links from Other Resources</span>
                  </div>
                  <div className="ba-task-finder-resource-groups">
                    {filteredResourceGroups.map(({ category, tools }) => {
                      const categoryDefinition =
                        RESOURCE_CATEGORY_DEFINITIONS[category];
                      const categoryId = `${taskFinderId}-resource-category-${category}`;

                      return (
                        <section
                          className="ba-task-finder-resource-group"
                          aria-labelledby={categoryId}
                          key={category}
                        >
                          <div className="ba-task-finder-resource-group-heading">
                            <h3
                              id={categoryId}
                              ref={(heading) => {
                                if (heading) {
                                  resourceCategoryHeadingRefs.current.set(
                                    category,
                                    heading,
                                  );
                                } else {
                                  resourceCategoryHeadingRefs.current.delete(
                                    category,
                                  );
                                }
                              }}
                              tabIndex={-1}
                            >
                              {categoryDefinition.label}
                            </h3>
                            <span>{categoryDefinition.description}</span>
                          </div>
                          <div className="ba-task-finder-list">
                            {tools.map((tool) => {
                              const descriptionId = `${taskFinderId}-resource-${tool.id}`;
                              const description =
                                useOfficialTranscriptGuidance &&
                                tool.id === OFFICIAL_TRANSCRIPT_SHORTCUT.id
                                  ? OFFICIAL_TRANSCRIPT_SHORTCUT.description
                                  : tool.description;

                              return (
                                <button
                                  className="ba-task-finder-item ba-task-finder-resource"
                                  type="button"
                                  aria-describedby={descriptionId}
                                  aria-label={`Open ${tool.label}`}
                                  key={tool.id}
                                  onClick={() =>
                                    handleTaskFinderResource(tool.id)
                                  }
                                >
                                  <span className="ba-task-finder-item-copy">
                                    <strong>{tool.label}</strong>
                                    <span id={descriptionId}>{description}</span>
                                  </span>
                                  <span aria-hidden="true">›</span>
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </section>
              )}
              {isResourceSearchMode && (
                <button
                  className="ba-task-finder-browse-all"
                  type="button"
                  onClick={browseAllResources}
                >
                  View Albert resource directory
                </button>
              )}
            </div>
        </section>
      )}

      {!isNativeResourcesOpen && featuredResourceTools.length > 0 && (
        <nav className="ba-resource-nav" aria-label="NYU resources">
          <div className="ba-tool-heading">
            <span className="ba-tool-label">NYU resources</span>
            <span className="ba-tool-origin">Native Other Resources links</span>
          </div>
          <div className="ba-tool-list">
            {featuredResourceTools.map((tool) => {
              const descriptionId = `ba-resource-description-${tool.id}`;

              return (
                <button
                  className="ba-resource-item"
                  type="button"
                  aria-describedby={descriptionId}
                  aria-label={tool.label}
                  key={tool.id}
                  onClick={() => handlePrimaryResource(tool.id)}
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
