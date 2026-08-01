import { describe, expect, it, vi } from "vitest";

import {
  advanceToNativeClassSearch,
  createCourseSearchFrameHandoff,
  hasOpenCourseSearchFrame,
  isClassSearchUrl,
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

  it("directly activates PeopleSoft's verified javascript Search anchor", () => {
    document.body.innerHTML = `
      <h3>Find Classes to add to your Enrollment cart using the options below</h3>
      <label><input type="radio" checked>Class Search</label>
      <a href="javascript:submitAction_win0(document.win0,'SMALL_BUTTON');">Search</a>
    `;
    const search = document.querySelector<HTMLAnchorElement>("a");
    const click = vi.fn((event: Event) => event.preventDefault());
    search?.addEventListener("click", click);

    expect(advanceToNativeClassSearch(document)).toBe(true);
    expect(click).toHaveBeenCalledOnce();
  });

  it("recognizes a dynamically selected Class Search radio", () => {
    document.body.innerHTML = `
      <h3>Find Classes to add to your Enrollment cart using the options below</h3>
      <label>
        <input type="radio" name="mode" aria-checked="true">
        Class Search
      </label>
      <button type="button">Search</button>
    `;
    const search = document.querySelector<HTMLButtonElement>("button");
    const click = vi.fn();
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

  it("recognizes PeopleSoft's nested radio label structure", () => {
    document.body.innerHTML = `
      <h3>Find Classes to add to your Enrollment cart using the options below</h3>
      <div class="ps_box-field" id="win0divFIND_OPTION_1">
        <div class="ps_box-control" id="win0divFIND_OPTION_1ctrl">
          <input type="radio" name="FIND_OPTION_1" checked>
        </div>
        <span>Class Search</span>
      </div>
      <a href="#native-search" role="button">Search</a>
    `;
    const search = document.querySelector<HTMLAnchorElement>("a");
    const click = vi.fn((event: Event) => event.preventDefault());
    search?.addEventListener("click", click);

    expect(advanceToNativeClassSearch(document)).toBe(true);
    expect(click).toHaveBeenCalledOnce();
  });

  it("ignores hidden duplicate launcher headings from PeopleSoft templates", () => {
    loadNativeLauncher();
    const hiddenHeading = document.createElement("h3");
    hiddenHeading.textContent =
      "Find Classes to add to your Enrollment cart using the options below";
    hiddenHeading.hidden = true;
    document.body.prepend(hiddenHeading);
    const search = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Search",
    );
    const click = vi.fn();
    search?.addEventListener("click", click);

    expect(advanceToNativeClassSearch(document)).toBe(true);
    expect(click).toHaveBeenCalledOnce();
  });

  it("accepts an accessible heading with a tenant-specific suffix", () => {
    loadNativeLauncher();
    const heading = document.querySelector("h3");
    if (!heading) {
      throw new Error("Expected launcher heading");
    }
    heading.textContent += " — Summer 2026";
    const search = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Search",
    );
    const click = vi.fn();
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

  it("finds an allowlisted cart frame mounted inside an open shadow root", () => {
    const host = document.createElement("div");
    const shadowRoot = host.attachShadow({ mode: "open" });
    shadowRoot.innerHTML =
      '<iframe src="https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR_FL.NYU_SSENRL_CART_FL.GBL"></iframe>';
    document.body.append(host);

    const frame = shadowRoot.querySelector<HTMLIFrameElement>("iframe");
    const postMessage = vi.fn();
    if (!frame) {
      throw new Error("Expected a shadow-root frame");
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
    expect(hasOpenCourseSearchFrame(document)).toBe(true);
  });

  it("responds directly to a verified frame-ready source", () => {
    const postMessage = vi.fn();
    const frameWindow = { postMessage } as unknown as Window;
    const handoff = createCourseSearchFrameHandoff(document);
    handoff.request();

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "better-albert:course-search-frame-ready" },
        origin: "https://sis.nyu.edu",
        source: frameWindow,
      }),
    );

    expect(postMessage).toHaveBeenCalledWith(
      { type: "better-albert:open-native-course-search" },
      "https://sis.nyu.edu",
    );
    handoff.stop();
  });

  it("routes verified Course Search wheel deltas to its bounded modal", () => {
    document.body.innerHTML = `
      <section id="pt_modals" data-better-albert-course-search-modal>
        <iframe src="https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR_FL.NYU_SSENRL_CART_FL.GBL"></iframe>
      </section>
    `;
    const modal = document.querySelector<HTMLElement>("#pt_modals");
    if (!modal) {
      throw new Error("Expected a Course Search modal");
    }
    modal.scrollTop = 20;

    const handoff = createCourseSearchFrameHandoff(document);
    handoff.request();
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "better-albert:course-search-scroll", deltaY: 160 },
        origin: "https://sis.nyu.edu",
        source: {} as Window,
      }),
    );

    expect(modal.scrollTop).toBe(180);
    handoff.stop();
  });

  it("keeps the scroll bridge active after the cart navigates to Class Search", () => {
    document.body.innerHTML = `
      <section id="pt_modals" data-better-albert-course-search-modal>
        <iframe src="https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR.NYU_CLS_SRCH.GBL"></iframe>
      </section>
    `;
    const modal = document.querySelector<HTMLElement>("#pt_modals");
    if (!modal) {
      throw new Error("Expected a Course Search modal");
    }
    modal.scrollTop = 40;

    const handoff = createCourseSearchFrameHandoff(document);
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "better-albert:course-search-scroll", deltaY: 220 },
        origin: "https://sis.nyu.edu",
        source: {} as Window,
      }),
    );

    expect(isClassSearchUrl(
      "https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR.NYU_CLS_SRCH.GBL?Page=1",
    )).toBe(true);
    expect(hasOpenCourseSearchFrame(document)).toBe(true);
    expect(modal.scrollTop).toBe(260);
    handoff.stop();
  });

  it("uses the unique native modal during marker reconciliation", () => {
    document.body.innerHTML = `
      <section id="pt_modals">
        <iframe src="https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR.NYU_CLS_SRCH.GBL"></iframe>
      </section>
    `;
    const modal = document.querySelector<HTMLElement>("#pt_modals");
    if (!modal) {
      throw new Error("Expected a Course Search modal");
    }
    modal.scrollTop = 10;

    const handoff = createCourseSearchFrameHandoff(document);
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "better-albert:course-search-scroll", deltaY: 90 },
        origin: "https://sis.nyu.edu",
        source: {} as Window,
      }),
    );

    expect(modal.scrollTop).toBe(100);
    handoff.stop();
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
      isClassSearchUrl(
        "https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR.NYU_CLS_SRCH.GBL",
      ),
    ).toBe(true);
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

  it("detects an allowlisted cart nested inside a same-origin relay", () => {
    document.body.innerHTML = "<iframe title='portal relay'></iframe>";
    const relay = document.querySelector<HTMLIFrameElement>("iframe");
    const relayDocument = relay?.contentDocument;
    if (!relayDocument) {
      throw new Error("Expected a same-origin relay document");
    }
    relayDocument.body.innerHTML = `
      <iframe src="https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR_FL.NYU_SSENRL_CART_FL.GBL"></iframe>
    `;

    expect(hasOpenCourseSearchFrame(document)).toBe(true);
  });
});
