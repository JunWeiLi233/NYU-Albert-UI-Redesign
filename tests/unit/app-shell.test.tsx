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
          keywords: ["book an appointment with nyu connect"],
          label: "NYU Connect",
          nativeLabels: ["NYU Connect"],
        },
        {
          category: "wellbeing-campus",
          description: "Find NYU health and wellness support",
          featured: true,
          id: "wellness-center",
          keywords: ["counseling appointment", "mental health appointment"],
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

    const aidAppointmentText = await search("financial aid appointment");
    expect(aidAppointmentText).toContain(
      "Verified destination: Financial Aid",
    );
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
    expect(shadowRoot?.textContent).toContain("Open Course SearchFind classes");

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
            "browse classes",
            "class search",
            "find course offerings",
            "find classes",
            "look for a course",
            "look for classes",
            "search for a course",
            "search for classes",
            "where can I find a course",
            "what classes are available",
            "which courses are offered",
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
      "class search",
      "find course offerings",
      "find classes",
      "look for classes",
      "search for a course",
      "search for classes",
      "what classes are available",
      "which courses are offered",
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

    expect(onOpenTool).toHaveBeenCalledTimes(9);
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

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        taskSearch,
        "need help with NYU",
      );
      taskSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(shadowRoot?.textContent).toContain(
      '1 result for “need help with NYU”',
    );
    expect(shadowRoot?.textContent).toContain(
      "Verified destination: Student Services",
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

    expect(onOpenResource).toHaveBeenCalledWith("student-services");
  });
});
