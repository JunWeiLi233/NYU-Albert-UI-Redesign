import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAvailablePageTools,
  openNativePageTool,
} from "../../src/content/page-tools";

describe("page-family native tools", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section class="is_bb_LinkContainer">
        <div class="is_bb_LinkItem"><a href="#search">Course Search</a></div>
        <div class="is_bb_LinkItem"><a href="#transaction">Accept/Decline Awards</a></div>
      </section>
      <main><a href="#outside">Weekly Schedule</a></main>
    `;
  });

  it("exposes and delegates only allowlisted tools in verified containers", () => {
    const search = document.querySelector<HTMLAnchorElement>('a[href="#search"]');
    const click = vi.fn((event: Event) => event.preventDefault());
    search?.addEventListener("click", click);

    expect(getAvailablePageTools(document, "home").map(({ id }) => id)).toEqual([
      "course-search",
    ]);
    expect(openNativePageTool(document, "home", "course-search")).toBe(true);
    expect(click).toHaveBeenCalledOnce();
  });

  it("preserves native tool handlers while blocking javascript URL evaluation", () => {
    const search = document.querySelector<HTMLAnchorElement>('a[href="#search"]');
    search?.setAttribute("href", "javascript:void(0)");
    const click = vi.fn((event: Event) => {
      expect(event.defaultPrevented).toBe(true);
    });
    search?.addEventListener("click", click);

    expect(openNativePageTool(document, "home", "course-search")).toBe(true);
    expect(click).toHaveBeenCalledOnce();
  });

  it("does not expose transaction labels or same-label links outside tool containers", () => {
    expect(
      getAvailablePageTools(document, "finances").map(({ label }) => label),
    ).not.toContain("Accept/Decline Awards");
    expect(getAvailablePageTools(document, "home").map(({ id }) => id)).not.toContain(
      "weekly-schedule",
    );
    expect(openNativePageTool(document, "home", "weekly-schedule")).toBe(
      false,
    );
  });

  it("exposes Home tools from Albert's selected shopping-cart workspace", () => {
    document.body.innerHTML = `
      <main class="isSSS_Main selected">
        <span id="IS_AC_RESPONSE">
          <section class="isSSS_FullW isSSS_ShopCart selected">
            <div class="isSSS_ShCtLnkWrp">
              <a href="#weekly">Weekly Schedule</a>
            </div>
            <div class="isSSS_ShCtEmpWrp">
              <p><a href="#search">Course Search</a></p>
            </div>
          </section>
        </span>
      </main>
    `;

    expect(getAvailablePageTools(document, "home").map(({ id }) => id)).toEqual([
      "course-search",
      "weekly-schedule",
    ]);
  });

  it("ignores Home shopping-cart tools outside the selected workspace", () => {
    document.body.innerHTML = `
      <main class="isSSS_Main">
        <span id="IS_AC_RESPONSE">
          <section class="isSSS_FullW isSSS_ShopCart selected">
            <a href="#weekly">Weekly Schedule</a>
          </section>
        </span>
      </main>
    `;

    expect(getAvailablePageTools(document, "home")).toEqual([]);
  });

  it("ignores tools hidden by the native page", () => {
    document.querySelector(".is_bb_LinkContainer")?.setAttribute("hidden", "");
    expect(getAvailablePageTools(document, "home")).toEqual([]);
  });
});
