import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mountHeader, type MountedHeader } from "../../src/app/mount-header";

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

describe("AppShell cross-area task handoffs", () => {
  let mountedHeader: MountedHeader | undefined;

  afterEach(() => {
    mountedHeader?.unmount();
    mountedHeader = undefined;
    document.body.innerHTML = "";
  });

  it("describes the original-Albert escape hatch as an immediate switch", () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home"],
      availablePageTools: [],
      availableResourceTools: [],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    const disableButton = shadowRoot?.querySelector<HTMLButtonElement>(
      '[aria-label="Use original Albert"]',
    );
    expect(disableButton?.title).toBe(
      "Switches to original Albert now. Use the browser extension icon to turn Better Albert back on.",
    );
    expect(
      shadowRoot?.getElementById("ba-original-albert-help")?.textContent,
    ).toBe(
      "Switches to original Albert now. Use the browser extension icon to turn Better Albert back on.",
    );
  });

  it("explains the one-step Class Search handoff before typing", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home"],
      availablePageTools: [],
      availableResourceTools: [],
      availableTaskTools: [
        {
          description:
            "Search by subject, course number, title, or instructor",
          id: "course-search",
          label: "Find Classes",
          nativeLabels: ["Course Search"],
          pageFamily: "home",
        },
      ],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    await act(async () => {
      shadowRoot
        ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
        ?.click();
      await Promise.resolve();
    });

    const searchInput = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(searchInput?.getAttribute("aria-describedby")).toContain(
      "search-help",
    );
    expect(shadowRoot?.querySelector(".ba-task-finder-search-help")?.textContent)
      .toContain(
        "Choose Find classes to open Albert’s Course Search, then enter a subject, course number, title, or instructor.",
      );
  });

  it("gives Home starters a concise newcomer cue", () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home"],
      availablePageTools: [
        {
          description:
            "Search by subject, course number, title, or instructor",
          id: "course-search",
          label: "Find Classes",
          nativeLabels: ["Course Search"],
        },
      ],
      availableResourceTools: [],
      availableTaskTools: [
        {
          description:
            "Search by subject, course number, title, or instructor",
          id: "course-search",
          label: "Find Classes",
          nativeLabels: ["Course Search"],
          pageFamily: "home",
        },
      ],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    expect(shadowRoot?.querySelector(".ba-tool-label")?.textContent).toBe(
      "Start here",
    );
    expect(shadowRoot?.querySelector(".ba-tool-guidance")?.textContent).toBe(
      "New to NYU? Start with classes, holds, and registration dates.",
    );
  });

  it("routes public Get Support advisor wording to Academics", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "academics", "resources"],
      availablePageTools: [],
      availableResourceTools: [],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    await act(async () => {
      shadowRoot
        ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
        ?.click();
      await Promise.resolve();
    });

    const searchInput = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(searchInput).not.toBeNull();
    if (!searchInput) {
      return;
    }

    for (const query of [
      "schedule advisor appointment",
      "Your Academic Advisor",
    ]) {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
          searchInput,
          query,
        );
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
        await Promise.resolve();
      });

      expect(shadowRoot?.textContent).toContain(`1 result for “${query}”`);
      expect(shadowRoot?.textContent).toContain(
        "Verified destination: Academics",
      );
    }
  });

  it("keeps degree-audit wording on the verified Academics fallback", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "academics"],
      availablePageTools: [],
      availableResourceTools: [],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    for (const query of [
      "degree audit",
      "audit my degree",
      "degree progress tracking",
    ]) {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
          taskSearch,
          query,
        );
        taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
        await Promise.resolve();
      });

      expect(shadowRoot?.textContent).toContain(`1 result for “${query}”`);
      expect(shadowRoot?.textContent).toContain(
        "Verified destination: Academics",
      );
    }
  });

  it("keeps ordinary transportation searches away from Campus Safety", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "wellbeing-campus",
          description: "Find safety services and emergency guidance",
          featured: false,
          id: "campus-safety",
          keywords: ["campus police", "emergency", "security"],
          label: "Campus Safety",
          nativeLabels: ["Campus Safety"],
        },
      ],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        taskSearch,
        "transportation",
      );
      taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(shadowRoot?.textContent).toContain('1 result for “transportation”');
    expect(shadowRoot?.textContent).toContain(
      "Verified destination: Other Resources",
    );
    expect(shadowRoot?.textContent).not.toContain(
      "Verified destination: Campus Safety",
    );
  });

  it("keeps public student-service wording recoverable without missing anchors", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "resources"],
      availablePageTools: [],
      availableResourceTools: [],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    for (const query of [
      "accessibility",
      "accessibility and accommodations",
      "athletics and fitness",
      "gyms and campus recreation",
      "student government",
      "service opportunities and civic engagement",
      "wifi streaming technology",
      "safety security transportation",
      "sustainability",
      "student centers and spaces",
      "student tech centers",
      "intramural and club sports",
      "multicultural education and programs",
      "veteran services",
      "center for global spiritual life",
      "time management",
    ]) {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
          taskSearch,
          query,
        );
        taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
        await Promise.resolve();
      });

      expect(shadowRoot?.textContent).toContain(`1 result for “${query}”`);
      expect(shadowRoot?.textContent).toContain(
        "Verified destination: Other Resources",
      );
    }
  });

  it("keeps current community, career, and engagement labels searchable without guessing", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "learning-career",
          description: "Find career coaching, jobs, and internships",
          featured: false,
          id: "wasserman",
          keywords: [
            "undergraduate students",
            "graduate students",
            "career development mentorship entrepreneurship",
            "employers",
            "employer services",
            "alumni career services",
            "campus partners",
          ],
          label: "Wasserman",
          nativeLabels: ["Wasserman"],
        },
        {
          category: "wellbeing-campus",
          description: "Find clubs, activities, and community support",
          featured: false,
          id: "student-life",
          keywords: [
            "graduate students",
            "connect with other students",
            "interfaith supper club",
            "multifaith advisory council",
            "violet voices",
            "leadership and awards",
            "on demand media activities",
            "religious spiritual life",
            "social justice and diversity opportunities",
            "student communities organizations",
            "volunteering and relief opportunities",
          ],
          label: "Student Life",
          nativeLabels: ["Student Life"],
        },
        {
          category: "wellbeing-campus",
          description: "Find NYU health and wellness support",
          featured: false,
          id: "wellness-center",
          keywords: [
            "listening labs",
            "health wellness accessibility services",
          ],
          label: "Wellness Center",
          nativeLabels: ["Wellness Center"],
        },
      ],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    for (const [query, expected] of [
      ["undergraduate students", "Verified destination: Wasserman"],
      ["connect with other students", "Verified destination: Student Life"],
      ["employers", "Verified destination: Wasserman"],
      ["employer services", "Verified destination: Wasserman"],
      ["alumni career services", "Verified destination: Wasserman"],
      ["campus partners", "Verified destination: Wasserman"],
    ] as const) {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
          taskSearch,
          query,
        );
        taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
        await Promise.resolve();
      });

      expect(shadowRoot?.textContent).toContain(`1 result for “${query}”`);
      expect(shadowRoot?.textContent).toContain(expected);
    }

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        taskSearch,
        "graduate students",
      );
      taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(shadowRoot?.textContent).toContain(
      '2 results for “graduate students”',
    );
    expect(shadowRoot?.textContent).toContain("Wasserman");
    expect(shadowRoot?.textContent).toContain("Student Life");

    for (const [query, destination] of [
      ["listening labs", "Wellness Center"],
      ["interfaith supper club", "Student Life"],
      ["multifaith advisory council", "Student Life"],
      ["violet voices", "Student Life"],
      ["leadership and awards", "Student Life"],
      ["on demand media activities", "Student Life"],
      ["religious spiritual life", "Student Life"],
      ["social justice and diversity opportunities", "Student Life"],
      ["student communities organizations", "Student Life"],
      ["volunteering and relief opportunities", "Student Life"],
      ["health wellness accessibility services", "Wellness Center"],
      [
        "career development mentorship entrepreneurship",
        "Wasserman",
      ],
    ] as const) {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
          taskSearch,
          query,
        );
        taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
        await Promise.resolve();
      });

      expect(shadowRoot?.textContent).toContain(`1 result for “${query}”`);
      expect(shadowRoot?.textContent).toContain(
        `Verified destination: ${destination}`,
      );
    }

    for (const query of [
      "around the longest table",
      "fall 2026 how we engage toolkit faqs",
      "nyu in dialogue",
      "the resilient society",
    ]) {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
          taskSearch,
          query,
        );
        taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
        await Promise.resolve();
      });

      expect(shadowRoot?.textContent).toContain(`1 result for “${query}”`);
      expect(shadowRoot?.textContent).toContain(
        "Verified destination: Other Resources",
      );
    }
  });

  it("does not let housing keywords capture generic accessibility requests", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "wellbeing-campus",
          description: "Find housing, residence halls, dining, and meal plans",
          featured: true,
          id: "housing",
          keywords: ["accessibility and support", "housing"],
          label: "Housing",
          nativeLabels: ["Housing"],
        },
      ],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        taskSearch,
        "accessibility",
      );
      taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(shadowRoot?.textContent).toContain(
      '1 result for “accessibility”',
    );
    expect(shadowRoot?.textContent).toContain(
      "Verified destination: Other Resources",
    );
    expect(shadowRoot?.textContent).not.toContain(
      "Verified destination: Housing",
    );
  });

  it("keeps international employment wording on the verified OGS resource", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "global",
          description: "Find visa and immigration guidance",
          featured: false,
          id: "ogs",
          keywords: ["international student employment"],
          label: "OGS",
          nativeLabels: ["OGS"],
        },
      ],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        taskSearch,
        "international student employment",
      );
      taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(shadowRoot?.textContent).toContain(
      '1 result for “international student employment”',
    );
    expect(shadowRoot?.textContent).toContain("Verified destination: OGS");
  });

  it("routes class-location and international-office wording to exact destinations", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "global",
          description: "Find visa and immigration guidance",
          featured: false,
          id: "ogs",
          keywords: ["international office"],
          label: "OGS",
          nativeLabels: ["OGS"],
        },
      ],
      availableTaskTools: [
        {
          description: "Review your class week",
          id: "weekly-schedule",
          keywords: ["where are my classes"],
          label: "Weekly Schedule",
          nativeLabels: ["Weekly Schedule"],
          pageFamily: "home",
        },
      ],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    for (const [query, destination] of [
      ["where are my classes", "Weekly Schedule"],
      ["international office", "OGS"],
    ] as const) {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
          taskSearch,
          query,
        );
        taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
        await Promise.resolve();
      });

      expect(shadowRoot?.textContent).toContain(`1 result for “${query}”`);
      expect(shadowRoot?.textContent).toContain(
        `Verified destination: ${destination}`,
      );
    }
  });

  it("keeps first-semester records, tuition, and insurance wording discoverable", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "grades", "finances", "resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "wellbeing-campus",
          description: "Find NYU health and wellness support",
          featured: true,
          id: "wellness-center",
          keywords: ["health insurance", "health insurance waiver"],
          label: "Wellness Center",
          nativeLabels: ["Wellness Center"],
        },
      ],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    await act(async () => {
      shadowRoot
        ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
        ?.click();
      await Promise.resolve();
    });

    const searchInput = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(searchInput).not.toBeNull();
    if (!searchInput) {
      return;
    }

    const search = async (query: string) => {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
          searchInput,
          query,
        );
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
        await Promise.resolve();
      });
      return shadowRoot?.textContent ?? "";
    };

    for (const [query, destination] of [
      ["report card", "Grades & Transcripts"],
      ["verify enrollment", "Grades & Transcripts"],
      ["student records and transcripts", "Grades & Transcripts"],
      ["verify your enrollment or degree", "Grades & Transcripts"],
      ["how much is tuition", "Finances"],
      ["tuition and fee rates", "Finances"],
      ["how billing and payment work at NYU", "Finances"],
      ["payment due dates", "Finances"],
      ["financial aid refunds", "Finances"],
      ["housing payments and tax documents", "Finances"],
      ["health insurance waiver", "Wellness Center"],
      ["I need health insurance help", "Wellness Center"],
    ] as const) {
      const resultText = await search(query);
      expect(resultText).toContain(`1 result for “${query}”`);
      expect(resultText).toContain(`Verified destination: ${destination}`);
    }
  });

  it("does not advertise Student support without its exact verified resource", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "academic-records",
          description: "Check NYU academic dates and deadlines",
          featured: false,
          id: "academic-calendar",
          keywords: ["academic calendar", "dates"],
          label: "Academic Calendar",
          nativeLabels: ["Academic Calendar"],
        },
      ],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    await act(async () => {
      shadowRoot
        ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
        ?.click();
      await Promise.resolve();
    });

    expect(
      Array.from(
        shadowRoot?.querySelectorAll<HTMLButtonElement>(
          ".ba-task-finder-common-task",
        ) ?? [],
      ).map((button) => button.textContent),
    ).not.toContain("Student support");
  });

  it("keeps missing exact resource intents from matching a longer unrelated alias", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "global",
          description: "Find visa and immigration guidance",
          featured: false,
          id: "ogs",
          keywords: ["international student services"],
          label: "OGS",
          nativeLabels: ["OGS"],
        },
      ],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    const finderToggle = shadowRoot?.querySelector<HTMLButtonElement>(
      '[aria-label="Find a task"]',
    );
    finderToggle?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        taskSearch,
        "student services",
      );
      taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(shadowRoot?.textContent).toContain(
      '1 result for “student services”',
    );
    expect(shadowRoot?.textContent).toContain(
      "Verified destination: Other Resources",
    );
    expect(shadowRoot?.textContent).not.toContain("Verified destination: OGS");
  });

  it("routes student employment to the verified Wasserman resource", async () => {
    const onOpenResource = vi.fn();
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "learning-career",
          description: "Find career coaching, jobs, and internships",
          featured: false,
          id: "wasserman",
          keywords: ["student employment"],
          label: "Wasserman",
          nativeLabels: ["Wasserman"],
        },
      ],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource,
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        taskSearch,
        "student employment",
      );
      taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(shadowRoot?.textContent).toContain(
      "Verified destination: Wasserman",
    );
    expect(shadowRoot?.textContent).not.toContain(
      "Verified destination: Other Resources",
    );
    expect(shadowRoot?.querySelectorAll(".ba-task-finder-resource")).toHaveLength(
      0,
    );
    const openResource = shadowRoot?.querySelector<HTMLButtonElement>(
      ".ba-task-finder-search-action",
    );
    expect(openResource?.getAttribute("aria-label")).toBe(
      "Open Wasserman — Find career coaching, jobs, and internships",
    );
    await act(async () => {
      openResource?.click();
    });
    expect(onOpenResource).toHaveBeenCalledWith("wasserman");
  });

  it("keeps a generic events query out of OGS", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "global",
          description: "Find visa and immigration guidance",
          featured: false,
          id: "ogs",
          keywords: ["immigration updates and events"],
          label: "OGS",
          nativeLabels: ["OGS"],
        },
      ],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        taskSearch,
        "events",
      );
      taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(shadowRoot?.textContent).toContain(
      "Verified destination: Other Resources",
    );
    expect(shadowRoot?.textContent).not.toContain("Verified destination: OGS");
  });

  it("does not typo-match parking to OGS packing guidance", async () => {
    document.body.innerHTML = `
      <nav id="IS_BB_HEADER_MENU">
        <li
          id="MENU_ID_NYU_OTHER_RESOURCES_FLDR"
          class="megaMenuSelected"
          onclick="toggleMegaMenu('MENU_ID_NYU_OTHER_RESOURCES_FLDR', 'SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR', 'megaMenuSelected');"
        >
          <a href="#">Other Resources</a>
        </li>
        <div id="SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR">
          <a href="#ogs">OGS</a>
        </div>
      </nav>
    `;

    mountedHeader = mountHeader({
      availablePageFamilies: ["resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "global",
          description: "Find visa and immigration guidance",
          featured: false,
          id: "ogs",
          keywords: ["packing tips"],
          label: "OGS",
          nativeLabels: ["OGS"],
        },
      ],
      availableTaskTools: [],
      currentPageFamily: "resources",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        taskSearch,
        "parking",
      );
      taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(shadowRoot?.textContent).toContain('0 results for “parking”');
    expect(shadowRoot?.textContent).not.toContain("Verified destination: OGS");
    expect(shadowRoot?.textContent).toContain(
      "No exact link is available here. Use “View Albert resource directory” below",
    );
  });

  it("finds campus wi-fi through the official resource directory", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "resources"],
      availablePageTools: [],
      availableResourceTools: [],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        taskSearch,
        "campus wi fi",
      );
      taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(shadowRoot?.textContent).toContain(
      '1 result for “campus wi fi”',
    );
    expect(shadowRoot?.textContent).toContain(
      "Verified destination: Other Resources",
    );
  });

  it("routes major-change wording to the verified Academics area", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "academics"],
      availablePageTools: [],
      availableResourceTools: [],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        taskSearch,
        "change major",
      );
      taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(shadowRoot?.textContent).toContain('1 result for “change major”');
    expect(shadowRoot?.textContent).toContain(
      "Verified destination: Academics",
    );
    expect(shadowRoot?.textContent).toContain(
      "Plan courses, manage enrollment, meet your advisor, and track degree progress",
    );
  });

  it("keeps major planning, student clubs, and scholarships one-step discoverable", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "academics", "resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "learning-career",
          description: "Find career coaching, jobs, and internships",
          featured: false,
          id: "wasserman",
          keywords: ["grants scholarships and fellowships"],
          label: "Wasserman",
          nativeLabels: ["Wasserman"],
        },
        {
          category: "money-services",
          description: "Open NYU financial aid resources",
          featured: false,
          id: "financial-aid-resources",
          keywords: ["scholarships"],
          label: "Financial Aid",
          nativeLabels: ["Financial Aid"],
        },
      ],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    const search = async (query: string) => {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
          taskSearch,
          query,
        );
        taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
        await Promise.resolve();
      });
      return shadowRoot?.textContent ?? "";
    };

    const majorPlanningText = await search("major planning");
    expect(majorPlanningText).toContain('1 result for “major planning”');
    expect(majorPlanningText).toContain("Verified destination: Academics");

    const advisorText = await search("advisor");
    expect(advisorText).toContain('1 result for “advisor”');
    expect(advisorText).toContain("Verified destination: Academics");

    const studentClubsText = await search("student clubs");
    expect(studentClubsText).toContain('1 result for “student clubs”');
    expect(studentClubsText).toContain(
      "Verified destination: Other Resources",
    );

    const scholarshipText = await search("scholarship");
    expect(scholarshipText).toContain('1 result for “scholarship”');
    expect(scholarshipText).toContain("Verified destination: Financial Aid");
    expect(scholarshipText).not.toContain("Verified destination: Wasserman");
  });

  it("keeps generic newcomer questions on the verified resources area", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "academic-records",
          description: "Check NYU academic dates and deadlines",
          featured: true,
          id: "academic-calendar",
          keywords: ["first day classes", "dates"],
          label: "Academic Calendar",
          nativeLabels: ["Academic Calendar"],
        },
      ],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        taskSearch,
        "what do I do first",
      );
      taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(shadowRoot?.textContent).toContain(
      '1 result for “what do I do first”',
    );
    expect(shadowRoot?.textContent).toContain(
      "Verified destination: Other Resources",
    );
    expect(shadowRoot?.textContent).not.toContain(
      "Verified destination: Academic Calendar",
    );

  });

  it("routes pronoun wording to the verified Personal Info area", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "personal"],
      availablePageTools: [],
      availableResourceTools: [],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        taskSearch,
        "pronouns",
      );
      taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(shadowRoot?.textContent).toContain('1 result for “pronouns”');
    expect(shadowRoot?.textContent).toContain(
      "Verified destination: Personal Info",
    );
  });

  it("keeps generic appointment wording honest and specific needs direct", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "learning-career",
          description: "Find career coaching, jobs, and internships",
          featured: false,
          id: "wasserman",
          keywords: ["schedule an appointment with a career coach"],
          label: "Wasserman",
          nativeLabels: ["Wasserman"],
        },
        {
          category: "learning-career",
          description: "Schedule support appointments and view your Success Network",
          featured: false,
          id: "nyu-connect",
          keywords: [
            "book an appointment with nyu connect",
            "find tips for remote learning",
            "personalized support",
            "connect with a student success specialist for personalized support",
            "navigating college and nyu",
            "organization support",
            "time management tips",
            "coaching and mentoring",
            "success toolbox",
            "your success toolbox essential guides and resources for navigating nyu",
            "time management guide",
          ],
          label: "NYU Connect",
          nativeLabels: ["NYU Connect"],
        },
        {
          category: "wellbeing-campus",
          description: "Find NYU health and wellness support",
          featured: true,
          id: "wellness-center",
          keywords: [
            "counseling appointment",
            "mental health appointment",
            "schedule appointments with doctors counselors nurses and other experts",
            "connect with us for urgent mental health needs or medical questions or support after sexual assault",
            "explore tips and strategies for everyday healthy living",
            "get expert guidance on bringing wellbeing into your clubs classrooms lounges and more",
            "student wellbeing team",
            "free flu shots",
          ],
          label: "Wellness Center",
          nativeLabels: ["Wellness Center"],
        },
        {
          category: "money-services",
          description: "Open NYU financial aid resources",
          featured: false,
          id: "financial-aid-resources",
          keywords: ["financial aid appointment"],
          label: "Financial Aid",
          nativeLabels: ["Financial Aid"],
        },
      ],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    const search = async (query: string) => {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
          taskSearch,
          query,
        );
        taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
        await Promise.resolve();
      });
      return shadowRoot?.textContent ?? "";
    };

    const genericAppointmentText = await search("schedule appointment");
    expect(genericAppointmentText).toContain(
      '1 result for “schedule appointment”',
    );
    expect(genericAppointmentText).toContain(
      "Verified destination: Other Resources",
    );
    expect(genericAppointmentText).not.toContain(
      "Verified destination: Wasserman",
    );

    const counselingText = await search("counseling appointment");
    expect(counselingText).toContain(
      "Verified destination: Wellness Center",
    );

    const remoteLearningText = await search("find tips for remote learning");
    expect(remoteLearningText).toContain(
      "Verified destination: NYU Connect",
    );

    for (const query of [
      "personalized support",
      "connect with a student success specialist for personalized support",
      "navigating college and nyu",
      "organization support",
      "time management tips",
      "coaching and mentoring",
      "success toolbox",
      "your success toolbox essential guides and resources for navigating nyu",
      "time management guide",
    ]) {
      const supportText = await search(query);
      expect(supportText).toContain(`1 result for “${query}”`);
      expect(supportText).toContain("Verified destination: NYU Connect");
    }

    const aidAppointmentText = await search("financial aid appointment");
    expect(aidAppointmentText).toContain(
      "Verified destination: Financial Aid",
    );

    for (const query of [
      "schedule appointments with doctors, counselors, nurses, and other experts",
      "connect with us for urgent mental health needs or medical questions, or support after sexual assault",
      "explore tips and strategies for everyday healthy living",
      "get expert guidance on bringing wellbeing into your clubs, classrooms, lounges, and more",
      "student wellbeing team",
      "free flu shots",
    ]) {
      const wellbeingText = await search(query);
      expect(wellbeingText).toContain(`1 result for “${query}”`);
      expect(wellbeingText).toContain("Verified destination: Wellness Center");
    }
  });

  it("keeps newcomer support aliases on the native resource directory", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "resources"],
      availablePageTools: [],
      availableResourceTools: [],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    const search = async (query: string) => {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
          taskSearch,
          query,
        );
        taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
        await Promise.resolve();
      });
      return shadowRoot?.textContent ?? "";
    };

    for (const query of [
      "academic support",
      "student life",
      "disability support",
      "testing accommodations",
      "campus accessibility",
      "I need help with NYU",
      "Help with your bill, financial aid, registration, and more",
      "For answers about your bill, financial aid, registration, international student services, and more",
      "Class Registration, Transcripts, Graduation",
      "Find tips for remote learning",
    ]) {
      const text = await search(query);
      expect(text).toContain(`1 result for “${query}”`);
      expect(text).toContain("Verified destination: Other Resources");
      expect(text).not.toContain("No verified destination matches");
    }
  });

  it("prefers an exact newcomer resource over a broader area match", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "academics", "resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "academic-records",
          description: "Find academic support resources",
          featured: false,
          id: "academic-support",
          keywords: ["academic support"],
          label: "Academic Support",
          nativeLabels: ["Academic Support"],
        },
      ],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        taskSearch,
        "academic support",
      );
      taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(shadowRoot?.textContent).toContain(
      '1 result for “academic support”',
    );
    expect(shadowRoot?.textContent).toContain(
      "Verified destination: Academic Support",
    );
    expect(shadowRoot?.textContent).not.toContain(
      "Verified destination: Academics",
    );
  });

  it("keeps enrollment and transcript language discoverable from other areas", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "grades"],
      availablePageTools: [],
      availableResourceTools: [],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    for (const query of [
      "proof of enrollment",
      "enrollment verification letter",
      "unofficial transcript",
      "official transcript",
    ]) {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
          taskSearch,
          query,
        );
        taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
        await Promise.resolve();
      });

      expect(shadowRoot?.textContent).toContain(`1 result for “${query}”`);
      expect(shadowRoot?.textContent).toContain(
        "Verified destination: Grades & Transcripts",
      );
    }
  });

  it("routes everyday records and finance wording to verified destinations", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "grades", "finances"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "academic-records",
          description: "Open registration and official records resources",
          featured: false,
          id: "university-registrar",
          keywords: ["order transcript"],
          label: "University Registrar",
          nativeLabels: ["University Registrar"],
        },
      ],
      availableTaskTools: [
        {
          description: "Choose an academic career and term",
          id: "view-grades",
          keywords: ["grades", "my report card", "report card"],
          label: "View Grades",
          nativeLabels: [],
          pageFamily: "grades",
        },
        {
          description: "Request proof through National Student Clearinghouse",
          id: "enrollment-verification",
          keywords: ["enrollment verification", "verify enrollment"],
          label: "Proof of Enrollment",
          nativeLabels: ["Enrollment Verification"],
          pageFamily: "grades",
        },
        {
          description: "Review coursework transferred to NYU",
          id: "transfer-credit",
          keywords: ["credit transfer"],
          label: "Review Transfer Credit",
          nativeLabels: ["Transfer Credit"],
          pageFamily: "grades",
        },
        {
          compactDescription: true,
          description: "See what you currently owe NYU",
          id: "bursar-balance",
          keywords: ["current balance"],
          label: "Check Account Balance",
          nativeLabels: ["View Bursar Balance"],
          pageFamily: "finances",
        },
      ],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    const search = async (query: string) => {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
          taskSearch,
          query,
        );
        taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
        await Promise.resolve();
      });
      return shadowRoot?.textContent ?? "";
    };

    const reportCardText = await search("report card");
    expect(reportCardText).toContain('1 result for “report card”');
    expect(reportCardText).toContain("Verified destination: View Grades");

    const verificationText = await search("verify enrollment");
    expect(verificationText).toContain('1 result for “verify enrollment”');
    expect(verificationText).toContain("Verified destination: Proof of Enrollment");

    const balanceText = await search("current balance");
    expect(balanceText).toContain('1 result for “current balance”');
    expect(balanceText).toContain("Verified destination: Check Account Balance");

    const aidText = await search("accept financial aid");
    expect(aidText).toContain('1 result for “accept financial aid”');
    expect(aidText).toContain("Verified destination: Finances");

    const transcriptOrderText = await search("order transcript");
    expect(transcriptOrderText).toContain('1 result for “order transcript”');
    expect(transcriptOrderText).toContain(
      "Verified destination: University Registrar",
    );
  });

  it("prefers exact Personal Info tasks over unrelated resource aliases", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["personal", "resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "global",
          description: "Find international student guidance",
          featured: false,
          id: "ogs",
          keywords: ["journey to NYU email series"],
          label: "OGS",
          nativeLabels: ["OGS"],
        },
        {
          category: "wellbeing-campus",
          description: "Find housing information",
          featured: false,
          id: "housing",
          keywords: ["gender inclusive housing"],
          label: "Housing",
          nativeLabels: ["Housing"],
        },
      ],
      availableTaskTools: [
        {
          description: "Change or review a saved email in Albert",
          id: "email-addresses",
          keywords: ["email address"],
          label: "Update Email Addresses",
          nativeLabels: ["Edit Email Addresses"],
          pageFamily: "personal",
        },
        {
          description:
            "Review official demographic information, including legal name, gender, and date of birth",
          id: "demographic-information",
          keywords: ["gender"],
          label: "Review Personal Details",
          nativeLabels: ["Demographic Information"],
          pageFamily: "personal",
        },
        {
          description: "Change or review a saved address in Albert",
          id: "addresses",
          keywords: ["home address"],
          label: "Update Addresses",
          nativeLabels: ["Edit Addresses"],
          pageFamily: "personal",
        },
        {
          description: "Change or review a saved phone number in Albert",
          id: "phone-numbers",
          keywords: ["mobile phone"],
          label: "Update Phone Numbers",
          nativeLabels: ["Edit Phone Numbers"],
          pageFamily: "personal",
        },
        {
          description: "Review citizenship information in Albert",
          id: "citizenship-information",
          keywords: ["nationality"],
          label: "Review Citizenship Information",
          nativeLabels: [],
          pageFamily: "personal",
        },
      ],
      currentPageFamily: "personal",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    const search = async (query: string) => {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
          taskSearch,
          query,
        );
        taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
        await Promise.resolve();
      });
      return shadowRoot?.textContent ?? "";
    };

    const emailText = await search("email");
    expect(emailText).toContain('1 result for “email”');
    expect(emailText).toContain("Verified destination: Update Email Addresses");
    expect(emailText).not.toContain("Verified destination: OGS");

    const genderText = await search("gender");
    expect(genderText).toContain('1 result for “gender”');
    expect(genderText).toContain("Verified destination: Review Personal Details");
    expect(genderText).not.toContain("Verified destination: Housing");

    const addressText = await search("home address");
    expect(addressText).toContain('1 result for “home address”');
    expect(addressText).toContain("Verified destination: Update Addresses");

    const phoneText = await search("mobile phone");
    expect(phoneText).toContain('1 result for “mobile phone”');
    expect(phoneText).toContain("Verified destination: Update Phone Numbers");

    const nationalityText = await search("nationality");
    expect(nationalityText).toContain('1 result for “nationality”');
    expect(nationalityText).toContain(
      "Verified destination: Review Citizenship Information",
    );

    const profileText = await search("edit profile");
    expect(profileText).toContain('1 result for “edit profile”');
    expect(profileText).toContain("Verified destination: Personal Info");
  });

  it("keeps finance wording on the verified billing path", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "finances", "resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "academic-records",
          description: "Check NYU academic dates and deadlines",
          featured: true,
          id: "academic-calendar",
          keywords: ["bursar deadline"],
          label: "Academic Calendar",
          nativeLabels: ["Academic Calendar"],
        },
      ],
      availableTaskTools: [
        {
          compactDescription: true,
          description: "Pay tuition or review charges in NYU eSuite",
          id: "bursar-account",
          keywords: ["pay my bill", "pay tuition bill"],
          label: "Pay Tuition & View Bills",
          nativeLabels: ["View Bursar Account (log into eSuite)"],
          pageFamily: "finances",
        },
      ],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    const search = async (query: string) => {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
          taskSearch,
          query,
        );
        taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
        await Promise.resolve();
      });
      return shadowRoot?.textContent ?? "";
    };

    const billText = await search("pay my bill");
    expect(billText).toContain('1 result for “pay my bill”');
    expect(billText).toContain(
      "Verified destination: Pay Tuition & View Bills",
    );

    const bursarText = await search("bursar");
    expect(bursarText).toContain('1 result for “bursar”');
    expect(bursarText).toContain("Verified destination: Finances");
    expect(bursarText).not.toContain("Verified destination: Academic Calendar");
  });

  it("keeps registration wording on Course Search", async () => {
    const onOpenTool = vi.fn();

    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "academics", "resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "academic-records",
          description: "Open registration and official records resources",
          featured: false,
          id: "university-registrar",
          keywords: ["registration", "official records"],
          label: "University Registrar",
          nativeLabels: ["University Registrar"],
        },
      ],
      availableTaskTools: [
        {
          description: "Search by subject, course number, title, or instructor",
          id: "course-search",
          keywords: [
            "register",
            "where can i register",
            "registering for classes",
            "registration process",
            "navigate the registration process",
          ],
          label: "Find Classes",
          nativeLabels: ["Course Search"],
          pageFamily: "home",
        },
      ],
      currentPageFamily: "academics",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool,
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    for (const query of [
      "where can I register",
      "how do I register",
      "registering for classes",
      "navigate the registration process",
    ]) {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
          taskSearch,
          query,
        );
        taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
        await Promise.resolve();
      });

      expect(shadowRoot?.textContent).toContain(`1 result for “${query}”`);
      expect(shadowRoot?.textContent).toContain(
        "Verified destination: Find Classes",
      );
      expect(shadowRoot?.textContent).not.toContain(
        "Verified destination: University Registrar",
      );

      await act(async () => {
        shadowRoot
          ?.querySelector<HTMLButtonElement>(".ba-task-finder-search-action")
          ?.click();
      });
    }
    expect(onOpenTool).toHaveBeenCalledTimes(4);
    expect(onOpenTool).toHaveBeenNthCalledWith(1, "course-search");
    expect(onOpenTool).toHaveBeenNthCalledWith(2, "course-search");
    expect(onOpenTool).toHaveBeenNthCalledWith(3, "course-search");
    expect(onOpenTool).toHaveBeenNthCalledWith(4, "course-search");
  });

  it("routes plain planning and graduation wording to verified academic tasks", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["academics", "grades"],
      availablePageTools: [],
      availableResourceTools: [],
      availableTaskTools: [
        {
          allowJavascriptUrl: true,
          description: "Open Albert's Academic Planner",
          id: "academic-planner",
          keywords: ["course planning", "plan courses", "plan my courses"],
          label: "Plan Future Courses",
          nativeLabels: ["Academic Planner"],
          pageFamily: "academics",
        },
        {
          allowJavascriptUrl: true,
          description: "Review your graduation progress",
          id: "graduation-status",
          keywords: [
            "expected graduation",
            "graduation date",
            "when do i graduate",
          ],
          label: "Check Graduation Status",
          nativeLabels: ["View My Graduation Status"],
          pageFamily: "academics",
        },
        {
          allowJavascriptUrl: true,
          description: "Review remaining degree requirements",
          id: "degree-progress",
          keywords: [
            "audit my degree",
            "classes need",
            "degree audit",
            "degree check",
            "degree requirements",
            "remaining requirements",
          ],
          label: "Check Degree Progress",
          nativeLabels: ["Degree Progress Report"],
          pageFamily: "academics",
        },
      ],
      currentPageFamily: "academics",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    shadowRoot
      ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
      ?.click();
    await act(async () => Promise.resolve());

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    const search = async (query: string) => {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
          taskSearch,
          query,
        );
        taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
        await Promise.resolve();
      });
      return shadowRoot?.textContent ?? "";
    };

    const planningText = await search("plan my courses");
    expect(planningText).toContain('1 result for “plan my courses”');
    expect(planningText).toContain("Verified destination: Plan Future Courses");

    const graduationText = await search("when do I graduate");
    expect(graduationText).toContain('1 result for “when do I graduate”');
    expect(graduationText).toContain(
      "Verified destination: Check Graduation Status",
    );

    const degreeText = await search("degree audit");
    expect(degreeText).toContain('1 result for “degree audit”');
    expect(degreeText).toContain("Verified destination: Check Degree Progress");

    const applicationText = await search("apply to graduate");
    expect(applicationText).toContain('1 result for “apply to graduate”');
    expect(applicationText).toContain("Verified destination: Academics");

    const majorText = await search("choose a major");
    expect(majorText).toContain('1 result for “choose a major”');
    expect(majorText).toContain("Verified destination: Academics");
  });

  it("does not advertise class search without a verified Course Search path", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "resources"],
      availablePageTools: [],
      availableResourceTools: [],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    await act(async () => {
      shadowRoot
        ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
        ?.click();
      await Promise.resolve();
    });

    expect(
      Array.from(
        shadowRoot?.querySelectorAll<HTMLButtonElement>(
          ".ba-task-finder-common-task",
        ) ?? [],
      ).map((button) => button.textContent),
    ).not.toContain("Find classes");

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        taskSearch,
        "find a course",
      );
      taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(shadowRoot?.textContent).toContain('0 results for “find a course”');
    expect(
      Array.from(
        shadowRoot?.querySelectorAll<HTMLButtonElement>(
          ".ba-task-finder-common-task, .ba-task-finder-item",
        ) ?? [],
      ).map((button) => button.textContent),
    ).not.toContain("Find classes");
  });

  it("does not advertise Home status starters without their native controls", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "resources"],
      availablePageTools: [],
      availableResourceTools: [],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    await act(async () => {
      shadowRoot
        ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
        ?.click();
      await Promise.resolve();
    });

    const commonTaskLabels = Array.from(
      shadowRoot?.querySelectorAll<HTMLButtonElement>(
        ".ba-task-finder-common-task",
      ) ?? [],
    ).map((button) => button.textContent);
    expect(commonTaskLabels).not.toEqual(
      expect.arrayContaining([
        "Class schedule",
        "Check holds",
        "When can I register?",
        "To-do list",
      ]),
    );
  });

  it("explains the verified Show all recovery for an unmatched task query", async () => {
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "resources"],
      availablePageTools: [],
      availableResourceTools: [],
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    await act(async () => {
      shadowRoot
        ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
        ?.click();
      await Promise.resolve();
    });

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        taskSearch,
        "not a verified destination",
      );
      taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(shadowRoot?.textContent).toContain(
      "choose “Show all” above to browse every verified destination available in this Albert view",
    );
  });

  it("opens Course Search from a course query while the current area is Academics", async () => {
    const onNavigate = vi.fn();
    const onNavigateToCourseSearch = vi.fn();

    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "academics", "resources"],
      availablePageTools: [],
      availableResourceTools: [],
      availableTaskTools: [],
      currentPageFamily: "academics",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate,
      onNavigateToCourseSearch,
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    const finderToggle = shadowRoot?.querySelector<HTMLButtonElement>(
      '[aria-label="Find a task"]',
    );
    expect(finderToggle).not.toBeNull();

    await act(async () => {
      finderToggle?.click();
      await Promise.resolve();
    });

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        taskSearch,
        "find a course",
      );
      taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });
    expect(shadowRoot?.textContent).toContain('1 result for “find a course”');
    expect(shadowRoot?.textContent).toContain(
      "Verified destination: Find classes — Open Course Search",
    );
    expect(shadowRoot?.querySelectorAll(".ba-task-finder-tool")).toHaveLength(
      0,
    );

    const openResult = shadowRoot?.querySelector<HTMLButtonElement>(
      ".ba-task-finder-search-action",
    );
    expect(openResult?.textContent).toBe("Open Find classes");
    expect(openResult?.getAttribute("aria-describedby")).toContain(
      "search-destination",
    );
    expect(openResult?.getAttribute("aria-describedby")).toContain(
      "search-hint",
    );

    await act(async () => {
      openResult?.click();
    });

    expect(onNavigateToCourseSearch).toHaveBeenCalledOnce();
    expect(onNavigate).not.toHaveBeenCalled();

    await act(async () => {
      finderToggle?.click();
      await Promise.resolve();
    });
    const registrationSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(registrationSearch).not.toBeNull();
    if (!registrationSearch) {
      return;
    }

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        registrationSearch,
        "when can I register",
      );
      registrationSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
      registrationSearch.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          key: "Enter",
        }),
      );
    });

    expect(onNavigateToCourseSearch).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledWith("home");
  });

  it("hands classroom and current-class phrasing through verified Home", async () => {
    const onNavigate = vi.fn();
    const onNavigateToCourseSearch = vi.fn();

    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "academics"],
      availablePageTools: [],
      availableResourceTools: [],
      availableTaskTools: [],
      currentPageFamily: "academics",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate,
      onNavigateToCourseSearch,
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    const finderToggle = shadowRoot?.querySelector<HTMLButtonElement>(
      '[aria-label="Find a task"]',
    );
    expect(finderToggle).not.toBeNull();

    const searchFor = async (query: string) => {
      await act(async () => {
        finderToggle?.click();
        await Promise.resolve();
      });
      const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
        'input[type="search"]',
      );
      expect(taskSearch).not.toBeNull();
      if (!taskSearch) {
        return undefined;
      }
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
          taskSearch,
          query,
        );
        taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
        await Promise.resolve();
      });
      return taskSearch;
    };

    const classroomSearch = await searchFor("where is my classroom");
    expect(classroomSearch).not.toBeUndefined();
    expect(shadowRoot?.textContent).toContain(
      '1 result for “where is my classroom”',
    );
    expect(shadowRoot?.textContent).toContain(
      "Verified destination: Find classes — Open Course Search",
    );
    await act(async () => {
      shadowRoot
        ?.querySelector<HTMLButtonElement>(".ba-task-finder-search-action")
        ?.click();
    });
    expect(onNavigateToCourseSearch).toHaveBeenCalledOnce();
    expect(onNavigate).not.toHaveBeenCalled();

    const currentClassesSearch = await searchFor("what classes am I taking");
    expect(currentClassesSearch).not.toBeUndefined();
    expect(shadowRoot?.textContent).toContain(
      '1 result for “what classes am I taking”',
    );
    expect(shadowRoot?.textContent).toContain(
      "Verified destination: Home — Find classes, check holds, and review your schedule",
    );
    await act(async () => {
      currentClassesSearch?.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          key: "Enter",
        }),
      );
    });
    expect(onNavigate).toHaveBeenCalledWith("home");
  });

  it("prioritizes a conversational course request over loosely matching resources", async () => {
    const onOpenTool = vi.fn();

    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "academic-records",
          description: "Review published course feedback",
          featured: false,
          id: "course-feedback-results",
          keywords: ["course feedback"],
          label: "Course Feedback Results",
          nativeLabels: ["Course Feedback Results"],
        },
        {
          category: "learning-career",
          description: "Open NYU's learning platform",
          featured: false,
          id: "nyu-brightspace",
          keywords: ["course materials", "learning platform"],
          label: "NYU Brightspace",
          nativeLabels: ["NYU Brightspace"],
        },
        {
          category: "learning-career",
          description: "Explore summer courses and programs",
          featured: false,
          id: "nyu-summer",
          keywords: ["summer courses"],
          label: "NYU Summer",
          nativeLabels: ["NYU Summer"],
        },
      ],
      availableTaskTools: [
        {
          description: "Search by subject, course number, title, or instructor",
          id: "course-search",
          keywords: ["find a course", "course search"],
          label: "Find Classes",
          nativeLabels: ["Course Search"],
          pageFamily: "home",
        },
      ],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool,
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    const finderToggle = shadowRoot?.querySelector<HTMLButtonElement>(
      '[aria-label="Find a task"]',
    );
    expect(finderToggle).not.toBeNull();

    await act(async () => {
      finderToggle?.click();
      await Promise.resolve();
    });

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        taskSearch,
        "look for a course",
      );
      taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(shadowRoot?.textContent).toContain(
      '1 result for “look for a course”',
    );
    expect(shadowRoot?.textContent).toContain(
      "Verified destination: Find Classes",
    );

    await act(async () => {
      taskSearch.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          key: "Enter",
        }),
      );
    });

    expect(onOpenTool).toHaveBeenCalledWith("course-search");
  });

  it("accepts concise student wording for one-step class search", async () => {
    const onOpenTool = vi.fn();

    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "resources"],
      availablePageTools: [],
      availableResourceTools: [],
      availableTaskTools: [
        {
          description: "Search by subject, course number, title, or instructor",
          id: "course-search",
          keywords: [
            "class finder",
            "class course lookup",
            "class lookup",
            "browse classes",
            "class search",
            "class list",
            "class offerings",
            "class listings",
            "classes available",
            "course list",
            "course offerings",
            "course listings",
            "course finder",
            "course lookup",
            "available classes",
            "available courses",
            "browse courses",
            "find course offerings",
            "find available classes",
            "find available classes courses",
            "find available courses",
            "find me a course",
            "find classes",
            "find courses",
            "look for a course",
            "look for classes",
            "look up classes",
            "search for a course",
            "search for a class",
            "search for classes",
            "search courses",
            "where can I find a course",
            "what classes are available",
            "what classes can i take",
            "what classes courses can i take",
            "what courses can i take",
            "what courses are offered",
            "when are classes offered",
            "which courses are offered",
            "show available classes",
            "show available classes courses",
            "show available courses",
            "take a class classes courses",
            "take a class",
            "take classes",
            "take courses",
          ],
          label: "Find Classes",
          nativeLabels: ["Course Search"],
          pageFamily: "home",
        },
      ],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool,
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    const finderToggle = shadowRoot?.querySelector<HTMLButtonElement>(
      '[aria-label="Find a task"]',
    );
    expect(finderToggle).not.toBeNull();

    for (const phrase of [
      "browse classes",
      "class/course lookup",
      "class finder",
      "class lookup",
      "class search",
      "class list",
      "class offerings",
      "class listings",
      "classes available",
      "course list",
      "course offerings",
      "course listings",
      "course finder",
      "course lookup",
      "available classes",
      "available courses",
      "browse courses",
      "find course offerings",
      "find available classes",
      "find available classes/courses",
      "find available courses",
      "find me a course",
      "find classes",
      "find courses",
      "look for classes",
      "look up classes",
      "search for a course",
      "search for a class",
      "search for classes",
      "search courses",
      "what classes are available",
      "what classes can i take",
      "what classes/courses can i take",
      "what courses can i take",
      "what courses are offered",
      "when are classes offered",
      "which courses are offered",
      "show available classes",
      "show available classes/courses",
      "show available courses",
      "take a class/classes/courses",
      "take a class",
      "take classes",
      "take courses",
    ]) {
      await act(async () => {
        finderToggle?.click();
        await Promise.resolve();
      });
      const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
        'input[type="search"]',
      );
      expect(taskSearch).not.toBeNull();
      if (!taskSearch) {
        return;
      }

      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
          taskSearch,
          phrase,
        );
        taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
        await Promise.resolve();
      });

      expect(shadowRoot?.textContent).toContain(`1 result for “${phrase}”`);
      expect(shadowRoot?.textContent).toContain(
        "Verified destination: Find Classes",
      );

      await act(async () => {
        taskSearch.dispatchEvent(
          new KeyboardEvent("keydown", {
            bubbles: true,
            cancelable: true,
            key: "Enter",
          }),
        );
      });
    }

    expect(onOpenTool).toHaveBeenCalledTimes(44);
    expect(onOpenTool).toHaveBeenCalledWith("course-search");
  });

  it("keeps verified resource starters available after an empty resource search", async () => {
    document.body.innerHTML = `
      <nav id="IS_BB_HEADER_MENU">
        <li
          id="MENU_ID_NYU_OTHER_RESOURCES_FLDR"
          class="megaMenuSelected"
          onclick="toggleMegaMenu('MENU_ID_NYU_OTHER_RESOURCES_FLDR', 'SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR', 'megaMenuSelected');"
        >
          <a href="#">Other Resources</a>
        </li>
        <div id="SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR">
          <a href="#calendar">Academic Calendar</a>
        </div>
      </nav>
    `;

    const onOpenResource = vi.fn();
    mountedHeader = mountHeader({
      availablePageFamilies: ["resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "academic-records",
          description: "Check NYU academic dates and deadlines",
          featured: true,
          id: "academic-calendar",
          keywords: ["academic calendar", "dates"],
          label: "Academic Calendar",
          nativeLabels: ["Academic Calendar"],
        },
      ],
      availableTaskTools: [],
      currentPageFamily: "resources",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource,
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    await act(async () => {
      await Promise.resolve();
    });
    expect(shadowRoot?.textContent).toContain("Popular resources");

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        taskSearch,
        "student support",
      );
      taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(shadowRoot?.textContent).toContain(
      '0 results for “student support”',
    );
    expect(shadowRoot?.textContent).toContain("Try a verified starter");
    expect(shadowRoot?.textContent).toContain(
      'No exact link is available here. Use “View Albert resource directory” below',
    );

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        taskSearch,
        "need help with NYU",
      );
      taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(shadowRoot?.textContent).toContain(
      '0 results for “need help with NYU”',
    );

    const popularStarter = Array.from(
      shadowRoot?.querySelectorAll<HTMLButtonElement>(
        ".ba-task-finder-common-task",
      ) ?? [],
    ).find((button) => button.textContent === "Academic dates");
    expect(popularStarter).not.toBeUndefined();

    await act(async () => {
      popularStarter?.click();
      await Promise.resolve();
    });
    expect(onOpenResource).toHaveBeenCalledWith("academic-calendar");
  });

  it("keeps broad help search on the directory when Student Services is unavailable", async () => {
    document.body.innerHTML = `
      <nav id="IS_BB_HEADER_MENU">
        <li
          id="MENU_ID_NYU_OTHER_RESOURCES_FLDR"
          class="megaMenuSelected"
          onclick="toggleMegaMenu('MENU_ID_NYU_OTHER_RESOURCES_FLDR', 'SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR', 'megaMenuSelected');"
        >
          <a href="#">Other Resources</a>
        </li>
        <div id="SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR">
          <a href="#wasserman">Wasserman</a>
          <a href="#wellness">Wellness Center</a>
        </div>
      </nav>
    `;

    mountedHeader = mountHeader({
      availablePageFamilies: ["resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "learning-career",
          description: "Find career coaching, jobs, and internships",
          featured: false,
          id: "wasserman",
          keywords: ["career coaching", "jobs"],
          label: "Wasserman",
          nativeLabels: ["Wasserman"],
        },
        {
          category: "wellbeing-campus",
          description: "Find NYU health and wellness support",
          featured: true,
          id: "wellness-center",
          keywords: ["counseling", "health"],
          label: "Wellness Center",
          nativeLabels: ["Wellness Center"],
        },
      ],
      availableTaskTools: [],
      currentPageFamily: "resources",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        taskSearch,
        "get help",
      );
      taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(shadowRoot?.textContent).toContain('0 results for “get help”');
    expect(shadowRoot?.textContent).toContain(
      'No exact link is available here. Use “View Albert resource directory” below',
    );
    expect(shadowRoot?.textContent).not.toContain("Open Wasserman");
    expect(shadowRoot?.textContent).not.toContain("Open Wellness Center");
  });

  it("keeps generic newcomer prompts on verified starters after the relaxed search pass", async () => {
    document.body.innerHTML = `
      <nav id="IS_BB_HEADER_MENU">
        <li
          id="MENU_ID_NYU_OTHER_RESOURCES_FLDR"
          onclick="toggleMegaMenu('MENU_ID_NYU_OTHER_RESOURCES_FLDR', 'SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR', 'megaMenuSelected');"
        >
          <a href="#">Other Resources</a>
        </li>
        <div id="SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR">
          <a href="#calendar">Academic Calendar</a>
        </div>
      </nav>
    `;

    const resources = [
      {
        category: "academic-records" as const,
        description: "Check NYU academic dates and deadlines",
        featured: true,
        id: "academic-calendar" as const,
        keywords: ["academic calendar", "dates", "classes start"],
        label: "Academic Calendar",
        nativeLabels: ["Academic Calendar"],
      },
      {
        category: "wellbeing-campus" as const,
        description: "Find tutoring and academic support",
        featured: false,
        id: "academic-support" as const,
        keywords: ["academic support"],
        label: "Academic Support",
        nativeLabels: ["Academic Support"],
      },
      {
        category: "wellbeing-campus" as const,
        description: "Find technology and campus services",
        featured: false,
        id: "campus-resources" as const,
        keywords: ["technology help"],
        label: "Campus Resources",
        nativeLabels: ["Campus Resources"],
      },
      {
        category: "wellbeing-campus" as const,
        description: "Find housing, residence halls, dining, and meal plans",
        featured: false,
        id: "housing" as const,
        keywords: ["housing"],
        label: "Housing",
        nativeLabels: ["Housing"],
      },
      {
        category: "learning-career" as const,
        description: "Open NYU's learning platform",
        featured: false,
        id: "nyu-brightspace" as const,
        keywords: ["course materials"],
        label: "NYU Brightspace",
        nativeLabels: ["NYU Brightspace"],
      },
      {
        category: "wellbeing-campus" as const,
        description: "Find general student services and support",
        featured: false,
        id: "student-services" as const,
        keywords: ["student support"],
        label: "Student Services",
        nativeLabels: ["Student Services"],
      },
      {
        category: "learning-career" as const,
        description: "Schedule support appointments and view your Success Network",
        featured: false,
        id: "nyu-connect" as const,
        keywords: ["student success"],
        label: "NYU Connect",
        nativeLabels: ["NYU Connect"],
      },
      {
        category: "wellbeing-campus" as const,
        description: "Find clubs, activities, and community support",
        featured: false,
        id: "student-life" as const,
        keywords: ["clubs", "getting involved"],
        label: "Student Life",
        nativeLabels: ["Student Life"],
      },
    ];
    const onNavigate = vi.fn(() => {
      document
        .getElementById("MENU_ID_NYU_OTHER_RESOURCES_FLDR")
        ?.classList.add("megaMenuSelected");
      mountedHeader?.update({
        availablePageFamilies: ["home", "resources"],
        availablePageTools: [],
        availableResourceTools: resources,
        availableTaskTools: [],
        currentPageFamily: "resources",
      });
    });
    mountedHeader = mountHeader({
      availablePageFamilies: ["home", "resources"],
      availablePageTools: [],
      availableResourceTools: resources,
      availableTaskTools: [],
      currentPageFamily: "home",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate,
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource: vi.fn(),
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    await act(async () => {
      shadowRoot
        ?.querySelector<HTMLButtonElement>('[aria-label="Find a task"]')
        ?.click();
      await Promise.resolve();
    });

    const newcomerStarter = Array.from(
      shadowRoot?.querySelectorAll<HTMLButtonElement>(
        ".ba-task-finder-common-task",
      ) ?? [],
    ).find((button) => button.textContent === "New student help");
    expect(newcomerStarter).not.toBeUndefined();

    await act(async () => {
      newcomerStarter?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    expect(taskSearch.placeholder).toBe(
      "Try academic dates, course materials, or student support",
    );
    expect(shadowRoot?.textContent).toContain(
      "Student guide wording works too: try “first semester,” “transfer student,” “time management,” or “student tech guide.”",
    );
    const studentGuides = shadowRoot?.querySelector<HTMLElement>(
      '[aria-label="Student Guides"]',
    );
    expect(studentGuides).not.toBeNull();
    const keyLinks = shadowRoot?.querySelector<HTMLElement>(
      '[aria-label="NYU Key Links"]',
    );
    expect(keyLinks).not.toBeNull();
    expect(
      Array.from(
        keyLinks?.querySelectorAll<HTMLButtonElement>(
          ".ba-task-finder-key-link",
        ) ?? [],
      ).map((button) => button.textContent?.replace(/\s+/g, " ").trim()),
    ).toEqual([
      "Academic datesCheck NYU academic dates and deadlines›",
      "Course materialsOpen NYU's learning platform›",
      "Student supportFind general student services and support›",
    ]);
    expect(shadowRoot?.textContent).toContain("Start here");
    const supportLinks = shadowRoot?.querySelector<HTMLElement>(
      '[aria-label="Get Support"]',
    );
    expect(supportLinks).not.toBeNull();
    expect(
      Array.from(
        supportLinks?.querySelectorAll<HTMLButtonElement>(
          ".ba-task-finder-key-link",
        ) ?? [],
      ).map((button) => button.textContent?.replace(/\s+/g, " ").trim()),
    ).toEqual([
      "Academic supportFind tutoring and academic support›",
      "Student successSchedule support appointments and view your Success Network›",
      "Get involvedFind clubs, activities, and community support›",
    ]);
    expect(
      Array.from(
        studentGuides?.querySelectorAll<HTMLButtonElement>(
          ".ba-task-finder-guide",
        ) ?? [],
      ).map((button) => button.textContent),
    ).toEqual([
      "Advice for Your First Semester",
      "Advice for Transfer Students",
      "Time Management Guide",
      "Student Tech Guide",
    ]);
    expect(
      Array.from(
        shadowRoot?.querySelector<HTMLElement>(
          '[aria-label="Browse by student need"]',
        )?.querySelectorAll<HTMLButtonElement>(".ba-task-finder-guide") ?? [],
      ).map((button) => button.textContent),
    ).toEqual([
      "Academic Services",
      "Getting Around Campus",
      "Housing and Dining",
      "Communities and Groups",
    ]);

    await act(async () => {
      Array.from(
        studentGuides?.querySelectorAll<HTMLButtonElement>(
          ".ba-task-finder-guide",
        ) ?? [],
      )
        .find((button) => button.textContent === "Advice for Your First Semester")
        ?.click();
      await Promise.resolve();
    });
    expect(taskSearch.value).toBe("first semester");

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        taskSearch,
        "how do i get started",
      );
      taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(shadowRoot?.textContent).toContain(
      '0 results for “how do i get started”',
    );
    expect(shadowRoot?.textContent).toContain("Try a verified starter");
    expect(shadowRoot?.textContent).not.toContain(
      "Verified destination: Academic Calendar",
    );

  });

  it("resolves the full need-help phrase only to Student Services when verified", async () => {
    document.body.innerHTML = `
      <nav id="IS_BB_HEADER_MENU">
        <li
          id="MENU_ID_NYU_OTHER_RESOURCES_FLDR"
          class="megaMenuSelected"
          onclick="toggleMegaMenu('MENU_ID_NYU_OTHER_RESOURCES_FLDR', 'SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR', 'megaMenuSelected');"
        >
          <a href="#">Other Resources</a>
        </li>
        <div id="SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR">
          <a href="#student-services">Student Services</a>
        </div>
      </nav>
    `;

    const onOpenResource = vi.fn();
    mountedHeader = mountHeader({
      availablePageFamilies: ["resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "wellbeing-campus",
          description: "Find general student services and support",
          featured: false,
          id: "student-services",
          keywords: [
            "help with nyu",
            "need help with nyu",
            "need help",
            "student support",
          ],
          label: "Student Services",
          nativeLabels: ["Student Services"],
        },
        {
          category: "academic-records",
          description: "Check NYU academic dates and deadlines",
          featured: true,
          id: "academic-calendar",
          keywords: ["academic calendar", "dates"],
          label: "Academic Calendar",
          nativeLabels: ["Academic Calendar"],
        },
      ],
      availableTaskTools: [],
      currentPageFamily: "resources",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource,
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    for (const query of ["I need help", "need help with NYU"]) {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
          taskSearch,
          query,
        );
        taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
        await Promise.resolve();
      });

      expect(shadowRoot?.textContent).toContain(`1 result for “${query}”`);
      expect(shadowRoot?.textContent).toContain(
        "Verified destination: Student Services",
      );
    }

    await act(async () => {
      taskSearch.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          key: "Enter",
        }),
      );
    });

    expect(onOpenResource).toHaveBeenCalledWith("student-services");
  });

  it("resolves broad support wording to the verified Student Services anchor", async () => {
    document.body.innerHTML = `
      <nav id="IS_BB_HEADER_MENU">
        <li
          id="MENU_ID_NYU_OTHER_RESOURCES_FLDR"
          class="megaMenuSelected"
          onclick="toggleMegaMenu('MENU_ID_NYU_OTHER_RESOURCES_FLDR', 'SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR', 'megaMenuSelected');"
        >
          <a href="#">Other Resources</a>
        </li>
        <div id="SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR">
          <a href="#student-services">Student Services</a>
          <a href="#connect">NYU Connect</a>
        </div>
      </nav>
    `;

    const onOpenResource = vi.fn();
    mountedHeader = mountHeader({
      availablePageFamilies: ["resources"],
      availablePageTools: [],
      availableResourceTools: [
        {
          category: "wellbeing-campus",
          description: "Find general student services and support",
          featured: false,
          id: "student-services",
          keywords: ["need help", "student support", "support"],
          label: "Student Services",
          nativeLabels: ["Student Services"],
        },
        {
          category: "learning-career",
          description: "Schedule support appointments and view your Success Network",
          featured: false,
          id: "nyu-connect",
          keywords: ["student success", "support appointment"],
          label: "NYU Connect",
          nativeLabels: ["NYU Connect"],
        },
      ],
      availableTaskTools: [],
      currentPageFamily: "resources",
      document,
      onDisable: vi.fn(async () => undefined),
      onNavigate: vi.fn(),
      onNavigateToCourseSearch: vi.fn(),
      onOpenResource,
      onOpenTool: vi.fn(),
      onSkipToContent: vi.fn(),
    });

    const shadowRoot = mountedHeader.host.shadowRoot;
    const taskSearch = shadowRoot?.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    expect(taskSearch).not.toBeNull();
    if (!taskSearch) {
      return;
    }

    for (const query of ["support", "I need support"]) {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
          taskSearch,
          query,
        );
        taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
        await Promise.resolve();
      });

      expect(shadowRoot?.textContent).toContain(`1 result for “${query}”`);
      expect(shadowRoot?.textContent).toContain(
        "Verified destination: Student Services",
      );
    }

    await act(async () => {
      taskSearch.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          key: "Enter",
        }),
      );
    });

    expect(onOpenResource).toHaveBeenCalledWith("student-services");
  });
});
