import { describe, expect, it, vi } from "vitest";

import {
  advanceToNativeClassSearch,
  createCourseSearchFrameHandoff,
  hasOpenCourseSearchFrame,
  isCourseSearchRelayUrl,
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

  it("uses a non-sensitive handshake for an allowlisted frame whose redirect is unsettled", () => {
    document.body.innerHTML =
      '<iframe src="https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR_FL.NYU_SSENRL_CART_FL.GBL"></iframe>';
    const frame = document.querySelector("iframe");
    const postMessage = vi.fn();
    if (!frame) {
      throw new Error("Expected a frame");
    }
    Object.defineProperty(frame, "contentWindow", {
      configurable: true,
      value: {
        get location(): never {
          throw new DOMException("cross-origin", "SecurityError");
        },
        postMessage,
      },
    });

    const handoff = createCourseSearchFrameHandoff(document);
    handoff.request();
    handoff.stop();

    expect(postMessage).toHaveBeenCalledWith(
      { type: "better-albert:open-native-course-search" },
      "*",
    );
  });

  it("does not send the handoff to an untrusted frame source", () => {
    document.body.innerHTML =
      '<iframe src="https://example.com/unknown-frame"></iframe>';
    const frame = document.querySelector("iframe");
    const postMessage = vi.fn();
    if (!frame?.contentWindow) {
      throw new Error("Expected a frame window");
    }
    frame.contentWindow.postMessage = postMessage;

    const handoff = createCourseSearchFrameHandoff(document);
    handoff.request();
    handoff.stop();

    expect(postMessage).not.toHaveBeenCalled();
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
    expect(
      isCourseSearchRelayUrl(
        "https://sis.portal.nyu.edu/psp/ihprod/EMPLOYEE/SA/s/WEBLIB_NYU_NCOA.ISCRIPT1.FieldFormula.IScript_Open",
      ),
    ).toBe(true);
    expect(
      isCourseSearchRelayUrl(
        "https://sis.portal.nyu.edu/psp/ihprod/EMPLOYEE/SA/s/OTHER_SCRIPT",
      ),
    ).toBe(false);
  });

  it("detects only visible allowlisted Class Search frames", () => {
    document.body.innerHTML = `
      <iframe src="https://sis.portal.nyu.edu/psp/ihprod/EMPLOYEE/SA/s/WEBLIB_NYU_NCOA.ISCRIPT1.FieldFormula.IScript_Open"></iframe>
    `;
    expect(hasOpenCourseSearchFrame(document)).toBe(true);
    document.querySelector("iframe")?.setAttribute("hidden", "");
    expect(hasOpenCourseSearchFrame(document)).toBe(false);
  });
});
