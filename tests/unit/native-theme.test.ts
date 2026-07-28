import { beforeEach, describe, expect, it } from "vitest";

import {
  applyNativeTheme,
  NATIVE_MODAL_OPEN_ATTRIBUTE,
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

  it("suppresses the rail for the visible cross-origin Class Search relay", () => {
    document.body.innerHTML = `
      <iframe src="https://sis.portal.nyu.edu/psp/ihprod/EMPLOYEE/SA/s/WEBLIB_NYU_NCOA.ISCRIPT1.FieldFormula.IScript_Open"></iframe>
    `;

    applyNativeTheme(document, "home", false);

    expect(
      document.documentElement.hasAttribute(NATIVE_MODAL_OPEN_ATTRIBUTE),
    ).toBe(true);
  });
});
