import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAvailablePageFamilies,
  navigateWithNativeAlbert,
} from "../../src/content/native-navigation";

describe("native Albert navigation delegation", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <nav id="albert-native-navigation">
        <a href="#home">Home</a>
        <a href="#finances">Finances</a>
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
});
