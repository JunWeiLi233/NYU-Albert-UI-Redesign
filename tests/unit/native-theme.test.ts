import { beforeEach, describe, expect, it } from "vitest";

import {
  applyAuthenticationTheme,
  applyNativeTheme,
  AUTHENTICATION_THEME_ATTRIBUTE,
  COURSE_SEARCH_MODAL_ATTRIBUTE,
  NATIVE_MODAL_OPEN_ATTRIBUTE,
  READ_ONLY_MODAL_OPEN_ATTRIBUTE,
  removeNativeTheme,
} from "../../src/content/native-theme";

describe("native modal markers", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="pt_modalMaskCover" hidden></div>
      <section id="pt_modals" hidden>
        <button type="button">Close</button>
      </section>
    `;
    removeNativeTheme(document);
  });

  it("recognizes live PeopleSoft modal containers without a legacy class", () => {
    const modal = document.querySelector<HTMLElement>("#pt_modals");
    modal?.removeAttribute("hidden");

    applyNativeTheme(document, "home", false);

    expect(
      document.documentElement.hasAttribute(NATIVE_MODAL_OPEN_ATTRIBUTE),
    ).toBe(true);
  });

  it("does not mark hidden modal containers as open", () => {
    applyNativeTheme(document, "home", false);

    expect(
      document.documentElement.hasAttribute(NATIVE_MODAL_OPEN_ATTRIBUTE),
    ).toBe(false);
  });

  it("styles a current Degree Progress container without the legacy class", () => {
    document.body.innerHTML = `
      <div id="pt_modalMaskCover" hidden></div>
      <section id="pt_modals" hidden>
        <div class="ptpopuptitlebar">
          <h2 class="PTPOPUP_TITLE">My Degree Progress Report</h2>
        </div>
        <div class="PTPOPUP_INNER"><button type="button">Close</button></div>
      </section>
    `;
    const modal = document.querySelector<HTMLElement>("#pt_modals");
    modal?.removeAttribute("hidden");

    applyNativeTheme(document, "academics", true);

    expect(modal?.hasAttribute("data-better-albert-readonly-modal")).toBe(
      true,
    );
    expect(
      document.documentElement.hasAttribute(READ_ONLY_MODAL_OPEN_ATTRIBUTE),
    ).toBe(true);
  });

  it("styles a current Degree Progress lightbox portal", () => {
    document.body.innerHTML = `
      <div id="lbBg"></div>
      <section id="lbContainer">
        <div id="lbWrapper">
          <div id="lbWrapperInner">
            <span id="app_label" role="heading">My Degree Progress Report</span>
          </div>
        </div>
      </section>
    `;
    document.body.classList.add("iLightboxOpen");

    applyNativeTheme(document, "academics", true);

    const lightbox = document.querySelector<HTMLElement>("#lbContainer");
    expect(
      lightbox?.hasAttribute("data-better-albert-readonly-modal"),
    ).toBe(true);
    expect(
      document.documentElement.hasAttribute(READ_ONLY_MODAL_OPEN_ATTRIBUTE),
    ).toBe(true);
  });

  it("suppresses the rail for the visible cross-origin Class Search relay", () => {
    document.body.innerHTML = `
      <iframe src="https://sis.portal.nyu.edu/psp/ihprod/EMPLOYEE/SA/s/WEBLIB_NYU_NCOA.ISCRIPT1.FieldFormula.IScript_Open"></iframe>
    `;

    applyNativeTheme(document, "home", false);

    expect(
      document.documentElement.hasAttribute(NATIVE_MODAL_OPEN_ATTRIBUTE),
    ).toBe(true);
  });

  it("marks the native Course Search modal as the bounded scroll owner", () => {
    document.body.innerHTML = `
      <section id="pt_modals">
        <iframe src="https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR_FL.NYU_SSENRL_CART_FL.GBL"></iframe>
      </section>
    `;

    applyNativeTheme(document, "home", false);

    expect(
      document
        .querySelector("#pt_modals")
        ?.hasAttribute(COURSE_SEARCH_MODAL_ATTRIBUTE),
    ).toBe(true);

    removeNativeTheme(document);
    expect(
      document
        .querySelector("#pt_modals")
        ?.hasAttribute(COURSE_SEARCH_MODAL_ATTRIBUTE),
    ).toBe(false);
  });

  it("keeps the classic Class Search iframe marked after cart navigation", () => {
    document.body.innerHTML = `
      <section id="pt_modals">
        <iframe src="https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR.NYU_CLS_SRCH.GBL"></iframe>
      </section>
    `;

    applyNativeTheme(document, "home", false);

    expect(
      document
        .querySelector("#pt_modals")
        ?.hasAttribute(COURSE_SEARCH_MODAL_ATTRIBUTE),
    ).toBe(true);
  });

  it("suppresses the rail for a PeopleSoft lightbox body marker", () => {
    document.body.classList.add("iLightboxOpen");

    applyNativeTheme(document, "academics", true);

    expect(
      document.documentElement.hasAttribute(NATIVE_MODAL_OPEN_ATTRIBUTE),
    ).toBe(true);

    document.body.classList.remove("iLightboxOpen");
    applyNativeTheme(document, "academics", true);

    expect(
      document.documentElement.hasAttribute(NATIVE_MODAL_OPEN_ATTRIBUTE),
    ).toBe(false);
  });
});

describe("authentication theme markers", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <header id="ptbr_header_container">NYU</header>
      <main>
        <h1>Albert Login</h1>
        <section>
          <p>Sign in below to access the Albert portal.</p>
          <a href="/signin">Sign in to Albert</a>
          <a href="/search">Public Course Search</a>
        </section>
      </main>
    `;
    removeNativeTheme(document);
  });

  it("scopes a reversible login presentation without adding a shell", () => {
    applyAuthenticationTheme(document);

    expect(
      document.documentElement.hasAttribute(AUTHENTICATION_THEME_ATTRIBUTE),
    ).toBe(true);
    expect(
      document.querySelector("[data-better-albert-login-heading]")?.textContent,
    ).toContain("Albert Login");
    expect(document.querySelector("[data-better-albert-login-content]")).not.toBeNull();
    expect(document.querySelector("#ptbr_header_container")).not.toBeNull();
    expect(document.querySelector("#better-albert-header-host")).toBeNull();

    removeNativeTheme(document);
    expect(
      document.documentElement.hasAttribute(AUTHENTICATION_THEME_ATTRIBUTE),
    ).toBe(false);
    expect(document.querySelector("[data-better-albert-login-heading]")).toBeNull();
    expect(document.querySelector("[data-better-albert-login-content]")).toBeNull();
  });
});
