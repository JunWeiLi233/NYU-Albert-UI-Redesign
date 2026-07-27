import { describe, expect, it, vi } from "vitest";

import {
  advanceToNativeClassSearch,
  isEnrollmentCartUrl,
  isTrustedCourseSearchIntentSource,
} from "../../src/content/course-search-handoff";

function loadNativeLauncher({
  checked = true,
  duplicateSearch = false,
}: {
  checked?: boolean;
  duplicateSearch?: boolean;
} = {}): void {
  document.body.innerHTML = `
    <main>
      <h3>Find Classes to add to your Enrollment cart using the options below</h3>
      <label>
        <input type="radio" name="mode" ${checked ? "checked" : ""}>
        Class Search
      </label>
      <button type="button">Search</button>
      ${duplicateSearch ? '<button type="button">Search</button>' : ""}
      <button type="button">Enter</button>
      <button type="button">Proceed to Step 2 of 3</button>
    </main>
  `;
}

describe("course-search handoff", () => {
  it("activates only the exact native Class Search launcher", () => {
    loadNativeLauncher();
    const search = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Search",
    );
    const click = vi.fn();
    search?.addEventListener("click", click);

    expect(advanceToNativeClassSearch(document)).toBe(true);
    expect(click).toHaveBeenCalledOnce();
  });

  it("recognizes PeopleSoft's native image-input Search control", () => {
    document.body.innerHTML = `
      <h3>Find Classes to add to your Enrollment cart using the options below</h3>
      <label><input type="radio" checked>Class Search</label>
      <input type="image" alt="Search" src="/native/search.png">
    `;
    const search = document.querySelector<HTMLInputElement>(
      'input[type="image"]',
    );
    const click = vi.fn((event: Event) => event.preventDefault());
    search?.addEventListener("click", click);

    expect(advanceToNativeClassSearch(document)).toBe(true);
    expect(click).toHaveBeenCalledOnce();
  });

  it("recognizes PeopleSoft's linked image and adjacent radio label", () => {
    document.body.innerHTML = `
      <h3>Find Classes to add to your Enrollment cart using the options below</h3>
      <span><input type="radio" checked>Class Search</span>
      <a href="#native-search"><img alt="Search" src="/native/search.png"></a>
    `;
    const search = document.querySelector<HTMLAnchorElement>("a");
    const click = vi.fn((event: Event) => event.preventDefault());
    search?.addEventListener("click", click);

    expect(advanceToNativeClassSearch(document)).toBe(true);
    expect(click).toHaveBeenCalledOnce();
  });

  it("fails open when the native mode is unchecked or ambiguous", () => {
    loadNativeLauncher({ checked: false });
    expect(advanceToNativeClassSearch(document)).toBe(false);

    loadNativeLauncher({ duplicateSearch: true });
    expect(advanceToNativeClassSearch(document)).toBe(false);
  });

  it("accepts only the verified portal and enrollment-cart routes", () => {
    expect(
      isTrustedCourseSearchIntentSource(
        "https://sis.portal.nyu.edu/psp/ihprod/EMPLOYEE/EMPL/h/",
      ),
    ).toBe(true);
    expect(
      isTrustedCourseSearchIntentSource(
        "https://example.com/psp/ihprod/EMPLOYEE/EMPL/h/",
      ),
    ).toBe(false);
    expect(
      isEnrollmentCartUrl(
        "https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR_FL.NYU_SSENRL_CART_FL.GBL?STRM=1266",
      ),
    ).toBe(true);
    expect(
      isEnrollmentCartUrl(
        "https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR.NYU_CLS_SRCH.GBL",
      ),
    ).toBe(false);
  });
});
