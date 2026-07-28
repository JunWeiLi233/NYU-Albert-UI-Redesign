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

    await act(async () => {
      taskSearch.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          key: "Enter",
        }),
      );
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
});
