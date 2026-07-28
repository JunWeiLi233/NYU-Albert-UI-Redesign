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
});
