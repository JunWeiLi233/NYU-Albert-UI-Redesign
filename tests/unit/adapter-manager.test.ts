import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { AdapterManager } from "../../src/adapters/adapter-manager";
import { DomPatchJournal } from "../../src/adapters/dom-patch-journal";
import type { StructuralAdapter } from "../../src/adapters/types";
import type { PageFamily } from "../../src/content/page-families";

const PORTAL_LOCATION = new URL(
  "https://sis.portal.nyu.edu/psp/ihprod/EMPLOYEE/EMPL/h/?cmd=start",
);
const CLASS_SEARCH_LOCATION = new URL(
  "https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR_FL.NYU_SSENRL_CART_FL.GBL",
);

function fixture(path: string): Document {
  return new DOMParser().parseFromString(
    readFileSync(resolve(process.cwd(), path), "utf8"),
    "text/html",
  );
}

describe("structural adapter manager", () => {
  const families: ReadonlyArray<readonly [PageFamily, string]> = [
    ["home", "tests/fixtures/albert-shell.html"],
    ["academics", "tests/fixtures/families/academics.html"],
    ["grades", "tests/fixtures/families/grades.html"],
    ["finances", "tests/fixtures/families/finances.html"],
    ["personal", "tests/fixtures/families/personal.html"],
  ];
  const primaryRegions: Record<PageFamily, string> = {
    albert: "primary-section",
    home: "schedule-section",
    academics: "planning-section",
    grades: "reports-directory",
    finances: "account-section",
    personal: "profile-directory",
    resources: "primary-section",
  };

  it.each(families)(
    "applies and exactly rolls back the %s family layout",
    (pageFamily, fixturePath) => {
      const document = fixture(fixturePath);
      const manager = new AdapterManager();
      const before = document.documentElement.outerHTML;
      const nativeWorkspace = document.querySelector(".isSSS_Main.selected");
      const nativeForm = document.querySelector("form");
      const formSnapshot = nativeForm
        ? {
            action: nativeForm.getAttribute("action"),
            method: nativeForm.getAttribute("method"),
            nativeToken: nativeForm.querySelector<HTMLInputElement>(
              'input[name="native_token"]',
            )?.value,
          }
        : undefined;

      expect(
        manager.reconcile({
          document,
          location: PORTAL_LOCATION,
          pageFamily,
          topLevel: true,
        }),
      ).toBe(`family-${pageFamily}`);
      expect(document.documentElement.dataset.betterAlbertAdapter).toBe(
        `family-${pageFamily}`,
      );
      expect(document.querySelector('[data-better-albert-region="workspace"]')).toBe(
        nativeWorkspace,
      );
      const contentRoot = document.querySelector(
        "#IS_AC_RESPONSE > .ptprtlcontainer > .isDS_Section",
      );
      expect(contentRoot?.getAttribute("data-better-albert-layout")).toBe(
        "family-content",
      );
      expect(
        document.querySelectorAll(
          '[data-better-albert-layout="family-content-container"]',
        ),
      ).toHaveLength(3);
      expect(
        contentRoot?.querySelector(
          `[data-better-albert-region="${primaryRegions[pageFamily]}"]`,
        )
          ?.parentElement,
      ).toBe(contentRoot);
      for (const metadata of document.querySelectorAll(
        ":is(script, style, title)",
      )) {
        expect(metadata.hasAttribute("data-better-albert-region")).toBe(false);
      }
      expect(
        document.querySelectorAll('[data-better-albert-region="directory"]'),
      ).not.toHaveLength(0);
      if (nativeForm && formSnapshot) {
        expect(document.querySelector("form")).toBe(nativeForm);
        expect(nativeForm.getAttribute("action")).toBe(formSnapshot.action);
        expect(nativeForm.getAttribute("method")).toBe(formSnapshot.method);
        expect(
          nativeForm.querySelector<HTMLInputElement>('input[name="native_token"]')
            ?.value,
        ).toBe(formSnapshot.nativeToken);
      }

      manager.rollback();
      expect(document.documentElement.outerHTML).toBe(before);
    },
  );

  it("creates a deep PeopleSoft workspace without changing native form ownership", () => {
    const document = fixture("tests/fixtures/albert-deep-page.html");
    const manager = new AdapterManager();
    const form = document.querySelector("form");
    const select = document.querySelector("select");
    const before = document.documentElement.outerHTML;

    expect(
      manager.reconcile({
        document,
        location: new URL(
          "https://sis.portal.nyu.edu/psc/ihprod/EMPLOYEE/SA/c/UA_DT_STUDENT.UA_DT_SS_FL.GBL?cmd=uninav&uninavpath=Root.NYU_SSS_HIDDEN.Academics",
        ),
        pageFamily: "academics",
        topLevel: true,
      }),
    ).toBe("peoplesoft-deep");
    expect(document.querySelector("form")).toBe(form);
    expect(select?.closest("form")).toBe(form);
    expect(document.querySelectorAll('[data-better-albert-region="group"]')).toHaveLength(2);
    expect(document.querySelectorAll('[data-better-albert-region="table"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-better-albert-region="breadcrumbs"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-better-albert-region="action-area"]')).toHaveLength(1);

    manager.rollback();
    expect(document.documentElement.outerHTML).toBe(before);
  });

  it("creates the exact Class Search workspace and preserves transaction controls", () => {
    const document = fixture("tests/fixtures/albert-class-search.html");
    const manager = new AdapterManager();
    const form = document.querySelector("form");
    const addToCart = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Add to Cart",
    );
    const enroll = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Enroll",
    );

    expect(
      manager.reconcile({
        document,
        location: CLASS_SEARCH_LOCATION,
        pageFamily: "academics",
        topLevel: false,
      }),
    ).toBe("class-search");
    expect(document.documentElement.dataset.betterAlbertAdapter).toBe(
      "class-search",
    );
    expect(document.querySelector('[data-better-albert-region="filter"]')).not.toBeNull();
    expect(document.querySelector('[data-better-albert-region="results"]')).not.toBeNull();
    expect(addToCart?.closest("form")).toBe(form);
    expect(enroll?.closest("form")).toBe(form);
  });

  it("adapts the exact legacy Class Search form without changing its transaction contract", () => {
    const document = fixture("tests/fixtures/albert-class-search-legacy.html");
    const manager = new AdapterManager();
    const form = document.querySelector<HTMLFormElement>(
      "form#NYU_SSENRL_CART_FL.PSForm",
    );
    const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
    const before = document.documentElement.outerHTML;
    const formContract = {
      action: form?.getAttribute("action"),
      method: form?.getAttribute("method"),
      token: form?.querySelector<HTMLInputElement>('[name="native_token"]')?.value,
    };

    expect(
      manager.reconcile({
        document,
        location: CLASS_SEARCH_LOCATION,
        pageFamily: "academics",
        topLevel: false,
      }),
    ).toBe("class-search");
    expect(
      document.querySelector('[data-better-albert-layout="class-search-legacy"]'),
    ).toBe(document.querySelector("#PT_WRAPPER"));
    expect(document.querySelectorAll('[data-better-albert-region="group"]')).toHaveLength(2);
    expect(document.querySelectorAll('[data-better-albert-region="filter"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-better-albert-region="results"]')).toHaveLength(1);
    expect(
      document.querySelector('[data-better-albert-layout="class-search-body"]'),
    ).toBe(document.querySelector("#legacy-main"));
    expect(submit?.closest("form")).toBe(form);
    expect(form?.getAttribute("action")).toBe(formContract.action);
    expect(form?.getAttribute("method")).toBe(formContract.method);
    expect(
      form?.querySelector<HTMLInputElement>('[name="native_token"]')?.value,
    ).toBe(formContract.token);

    manager.rollback();
    expect(document.documentElement.outerHTML).toBe(before);
  });

  it("fails open when the legacy Class Search root is missing or ambiguous", () => {
    const document = new DOMParser().parseFromString(
      `<!doctype html><title>Class Search</title>
      <form id="NYU_SSENRL_CART_FL" class="PSForm"><div class="ps_box-group"></div></form>
      <form id="NYU_SSENRL_CART_FL" class="PSForm"><div id="PT_WRAPPER" class="ps_wrapper"><div class="ps_box-group"></div></div></form>`,
      "text/html",
    );
    const before = document.documentElement.outerHTML;
    const manager = new AdapterManager();

    expect(
      manager.reconcile({
        document,
        location: CLASS_SEARCH_LOCATION,
        pageFamily: "academics",
        topLevel: false,
      }),
    ).toBeUndefined();
    expect(document.documentElement.outerHTML).toBe(before);
  });

  it.each([
    "tests/fixtures/albert-class-search-empty.html",
    "tests/fixtures/albert-class-search-error.html",
  ])("keeps Class Search empty and validation states inside the exact layout for %s", (path) => {
    const document = fixture(path);
    const manager = new AdapterManager();
    const nativeStatus = document.querySelector('[role="status"]');
    const nativeAlert = document.querySelector('[role="alert"]');

    expect(
      manager.reconcile({
        document,
        location: CLASS_SEARCH_LOCATION,
        pageFamily: "academics",
        topLevel: false,
      }),
    ).toBe("class-search");
    expect(nativeStatus?.closest('[data-better-albert-region="results"]')).not.toBeNull();
    if (nativeAlert) {
      expect(nativeAlert.closest('[data-better-albert-region="filter"]')).not.toBeNull();
      expect(document.querySelector('[aria-describedby="search-error"]')).not.toBeNull();
    }
  });

  it("falls back to a conservative workspace when family hub anchors are incomplete", () => {
    const document = new DOMParser().parseFromString(
      "<!doctype html><title>Albert</title><main aria-label='Native Albert'>Native content</main>",
      "text/html",
    );
    const manager = new AdapterManager();

    expect(
      manager.reconcile({
        document,
        location: PORTAL_LOCATION,
        pageFamily: "home",
        topLevel: true,
      }),
    ).toBe("albert-workspace");
    expect(document.querySelector("main")?.dataset.betterAlbertLayout).toBe(
      "generic-workspace",
    );
  });

  it("fails open to the conservative workspace when live family content is ambiguous", () => {
    const document = fixture("tests/fixtures/albert-shell.html");
    const response = document.querySelector("#IS_AC_RESPONSE");
    response?.append(
      document.createRange().createContextualFragment(
        '<div class="ptprtlcontainer"><section class="isDS_Section"></section></div>',
      ),
    );
    const manager = new AdapterManager();

    expect(
      manager.reconcile({
        document,
        location: PORTAL_LOCATION,
        pageFamily: "home",
        topLevel: true,
      }),
    ).toBe("albert-workspace");
    expect(
      document.querySelector('[data-better-albert-layout="family-content"]'),
    ).toBeNull();
    expect(document.documentElement.dataset.betterAlbertAdapter).toBe(
      "albert-workspace",
    );
  });

  it("selects the only rendered live response and leaves inactive duplicates untouched", () => {
    const document = fixture("tests/fixtures/albert-shell.html");
    const response = document.querySelector("#IS_AC_RESPONSE");
    const activeRoot = response?.querySelector(
      ":scope > .ptprtlcontainer > .isDS_Section",
    );
    response?.append(
      document.createRange().createContextualFragment(`
        <div class="ptprtlcontainer">
          <section class="isDS_Section">
            <div class="is_bb_LinkContainer">
              <div class="is_bb_LinkColumn">
                <div class="is_bb_LinkItem"><a href="#inactive">Inactive tool</a></div>
              </div>
            </div>
          </section>
        </div>
      `),
    );
    const inactiveRoot = response?.querySelectorAll(
      ":scope > .ptprtlcontainer > .isDS_Section",
    )[1];
    Object.defineProperty(activeRoot, "getBoundingClientRect", {
      configurable: true,
      value: () =>
        ({
          bottom: 600,
          height: 600,
          left: 0,
          right: 800,
          top: 0,
          width: 800,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    });

    const manager = new AdapterManager();
    expect(
      manager.reconcile({
        document,
        location: PORTAL_LOCATION,
        pageFamily: "home",
        topLevel: true,
      }),
    ).toBe("family-home");
    expect(activeRoot?.getAttribute("data-better-albert-layout")).toBe(
      "family-content",
    );
    expect(inactiveRoot?.hasAttribute("data-better-albert-layout")).toBe(false);
    expect(
      inactiveRoot?.querySelector("[data-better-albert-region]"),
    ).toBeNull();
  });

  it("restores pre-existing attribute values in reverse order", () => {
    const element = document.createElement("div");
    element.setAttribute("data-better-albert-region", "native-value");
    const journal = new DomPatchJournal();
    journal.setAttribute(element, "data-better-albert-region", "workspace");
    journal.setAttribute(element, "data-better-albert-region", "group");
    journal.setAttribute(element, "data-better-albert-label", "Academics");

    journal.rollback();
    expect(element.getAttribute("data-better-albert-region")).toBe("native-value");
    expect(element.hasAttribute("data-better-albert-label")).toBe(false);
  });

  it("contains adapter preparation failures and leaves the native document untouched", () => {
    const document = new DOMParser().parseFromString(
      "<!doctype html><title>Albert</title><main>Native content</main>",
      "text/html",
    );
    const before = document.documentElement.outerHTML;
    const failingAdapter: StructuralAdapter = {
      id: "albert-workspace",
      priority: 999,
      prepare() {
        throw new Error("Synthetic adapter preparation failure");
      },
      apply() {
        throw new Error("The failing plan must never apply");
      },
    };
    const manager = new AdapterManager([failingAdapter]);

    expect(
      manager.reconcile({
        document,
        location: PORTAL_LOCATION,
        pageFamily: "albert",
        topLevel: true,
      }),
    ).toBeUndefined();
    expect(document.documentElement.outerHTML).toBe(before);
  });
});
