import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAvailablePageFamilies,
  navigateWithNativeAlbert,
} from "../../src/content/native-navigation";

describe("native Albert navigation delegation", () => {
  beforeEach(() => {
    document.documentElement.scrollTop = 400;
    document.body.innerHTML = `
      <nav id="albert-native-navigation">
        <a href="#home">Home</a>
        <a href="#finances">Finances</a>
        <a href="#generic-resources">Other Resources</a>
      </nav>
      <nav id="IS_BB_HEADER_MENU">
        <ul>
          <li
            id="MENU_ID_NYU_OTHER_RESOURCES_FLDR"
            onclick="javascript:toggleMegaMenu('MENU_ID_NYU_OTHER_RESOURCES_FLDR', 'SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR', 'megaMenuSelected');"
          >
            <a href="#" onclick="this.parent().click();">Other Resources</a>
          </li>
        </ul>
        <div id="SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR"></div>
      </nav>
      <main><a href="#content-finances">Finances</a></main>
    `;
  });

  it("delegates only to controls inside a verified navigation container", () => {
    const nativeControl = document.querySelector<HTMLAnchorElement>(
      'nav a[href="#finances"]',
    );
    const click = vi.fn((event: Event) => event.preventDefault());
    nativeControl?.addEventListener("click", click);

    expect(getAvailablePageFamilies(document)).toContain("finances");
    expect(navigateWithNativeAlbert(document, "finances")).toBe(true);
    expect(document.documentElement.scrollTop).toBe(0);
    expect(click).toHaveBeenCalledOnce();
  });

  it("preserves native click handlers while blocking javascript URL evaluation", () => {
    const nativeControl = document.querySelector<HTMLAnchorElement>(
      'nav a[href="#finances"]',
    );
    nativeControl?.setAttribute("href", "javascript:void(0)");
    const click = vi.fn((event: Event) => {
      expect(event.defaultPrevented).toBe(true);
    });
    nativeControl?.addEventListener("click", click);

    expect(navigateWithNativeAlbert(document, "finances")).toBe(true);
    expect(click).toHaveBeenCalledOnce();
  });

  it("never falls back to a same-label link in page content", () => {
    document.querySelector("nav")?.remove();
    const contentControl = document.querySelector<HTMLAnchorElement>(
      'main a[href="#content-finances"]',
    );
    const click = vi.fn((event: Event) => event.preventDefault());
    contentControl?.addEventListener("click", click);

    expect(getAvailablePageFamilies(document)).not.toContain("finances");
    expect(navigateWithNativeAlbert(document, "finances")).toBe(false);
    expect(click).not.toHaveBeenCalled();
  });

  it("delegates Other Resources to the exact native overlay parent", () => {
    const overlayTrigger = document.querySelector<HTMLLIElement>(
      "#MENU_ID_NYU_OTHER_RESOURCES_FLDR",
    );
    const genericControl = document.querySelector<HTMLAnchorElement>(
      'nav a[href="#generic-resources"]',
    );
    const overlayClick = vi.fn((event: Event) => {
      event.stopImmediatePropagation();
    });
    const genericClick = vi.fn((event: Event) => event.preventDefault());
    overlayTrigger?.addEventListener("click", overlayClick, true);
    genericControl?.addEventListener("click", genericClick);

    expect(getAvailablePageFamilies(document)).toContain("resources");
    expect(navigateWithNativeAlbert(document, "resources")).toBe(true);
    expect(document.documentElement.scrollTop).toBe(400);
    expect(overlayClick).toHaveBeenCalledOnce();
    expect(genericClick).not.toHaveBeenCalled();
  });

  it("fails open when the exact Other Resources overlay trigger is absent", () => {
    document.querySelector("#MENU_ID_NYU_OTHER_RESOURCES_FLDR")?.remove();
    const genericControl = document.querySelector<HTMLAnchorElement>(
      'nav a[href="#generic-resources"]',
    );
    const genericClick = vi.fn((event: Event) => event.preventDefault());
    genericControl?.addEventListener("click", genericClick);

    expect(getAvailablePageFamilies(document)).not.toContain("resources");
    expect(navigateWithNativeAlbert(document, "resources")).toBe(false);
    expect(genericClick).not.toHaveBeenCalled();
  });

  it("fails open when the verified Other Resources submenu is absent", () => {
    document
      .querySelector("#SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR")
      ?.remove();

    expect(getAvailablePageFamilies(document)).not.toContain("resources");
    expect(navigateWithNativeAlbert(document, "resources")).toBe(false);
  });
});
