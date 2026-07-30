import { beforeEach, describe, expect, it } from "vitest";

import {
  applyNativeTheme,
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
