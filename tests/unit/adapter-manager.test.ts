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
      if (pageFamily === "home") {
        const holdsTarget = document.querySelector(
          '[data-better-albert-region="holds-status"]',
        );
        const registrationTarget = document.querySelector(
          '[data-better-albert-region="registration-time"]',
        );
        const todoTarget = document.querySelector(
          '[data-better-albert-region="todo-status"]',
        );
        expect(holdsTarget?.textContent).toContain("Holds");
        expect(holdsTarget?.getAttribute("tabindex")).toBe("-1");
        expect(registrationTarget?.textContent).toContain("Enrollment Dates");
        expect(registrationTarget?.getAttribute("tabindex")).toBe("-1");
        expect(todoTarget?.textContent).toContain("To Do");
        expect(todoTarget?.getAttribute("tabindex")).toBe("-1");
      } else if (pageFamily === "finances") {
        const bursarDirectory = document.querySelector("#NYUBursarLinks");
        const financialAidTarget = document.querySelector(
          '[data-better-albert-region="aid-section"]',
        );
        expect(
          document.querySelectorAll('[data-better-albert-region="directory"]'),
        ).toHaveLength(1);
        expect(bursarDirectory?.getAttribute("data-better-albert-region")).toBe(
          "directory",
        );
        expect(bursarDirectory?.getAttribute("inert")).toBe("");
        expect(
          document.querySelector('[data-better-albert-region="payment-action"]'),
        ).toBe(nativeForm);
        expect(nativeForm?.getAttribute("aria-label")).toBe(
          "Official Albert payment step",
        );
        expect(nativeForm?.getAttribute("aria-description")).toBe(
          "Payment processing remains outside Better Albert.",
        );
        expect(financialAidTarget?.getAttribute("tabindex")).toBe("-1");
        expect(
          financialAidTarget?.getAttribute(
            "data-better-albert-focus-target",
          ),
        ).toBe("");
      } else if (pageFamily === "academics") {
        expect(
          nativeForm?.getAttribute("data-better-albert-region"),
        ).toBe("enrollment-action");
        expect(nativeForm?.getAttribute("aria-label")).toBe(
          "Official Albert enrollment step",
        );
        expect(nativeForm?.getAttribute("aria-description")).toBe(
          "Review your selections in Albert before submitting.",
        );
        const academicJourney = Array.from(
          document.querySelectorAll("[data-better-albert-academic-step]"),
        );
        expect(
          academicJourney.map((section) =>
            section.getAttribute("data-better-albert-academic-step"),
          ),
        ).toEqual([
          "Step 1 of 5 · Plan your path",
          "Step 2 of 5 · Check requirements",
          "Step 3 of 5 · Meet your advisor",
          "Step 4 of 5 · Review enrollment",
          "Step 5 of 5 · Track completion",
        ]);
        for (const section of academicJourney) {
          expect(section.getAttribute("role")).toBe("region");
          expect(section.getAttribute("aria-label")).toBe(
            section.getAttribute("data-better-albert-academic-step"),
          );
        }
        const advisingTarget = document.querySelector(
          '[data-better-albert-region="advising-section"]',
        );
        expect(advisingTarget?.getAttribute("tabindex")).toBe("-1");
        expect(
          advisingTarget?.hasAttribute("data-better-albert-focus-target"),
        ).toBe(true);
      } else if (pageFamily === "grades") {
        const recordsDirectory = document.querySelector("#nyuGradesLinks");
        const gradeViewerTarget = document.querySelector(
          '[data-better-albert-region="grade-viewer"]',
        );
        expect(
          recordsDirectory?.getAttribute(
            "data-better-albert-records-guidance",
          ),
        ).toContain("Choose an academic career and term");
        expect(recordsDirectory?.getAttribute("aria-description")).toContain(
          "Quick access shows the transcript and enrollment-record options",
        );
        expect(gradeViewerTarget?.matches("select")).toBe(true);
        expect(
          gradeViewerTarget?.getAttribute(
            "data-better-albert-focus-target",
          ),
        ).toBe("");
        expect(gradeViewerTarget?.hasAttribute("tabindex")).toBe(false);
      } else if (pageFamily === "personal") {
        expect(
          Array.from(
            document.querySelectorAll(
              "[data-better-albert-personal-group]",
            ),
          ).map((section) => [
            section.getAttribute("data-better-albert-region"),
            section.getAttribute("data-better-albert-personal-group"),
          ]),
        ).toEqual([
          ["profile-directory", "Official details"],
          ["address-section", "Contact information"],
          ["missing-person-section", "Safety contact"],
          ["citizenship-section", "Official records"],
        ]);
        for (const region of [
          "missing-person-section",
          "citizenship-section",
          "identifier-section",
        ]) {
          const focusTarget = document.querySelector(
            `[data-better-albert-region="${region}"]`,
          );
          expect(focusTarget?.getAttribute("tabindex")).toBe("-1");
          expect(
            focusTarget?.getAttribute("data-better-albert-focus-target"),
          ).toBe("");
        }
        expect(
          nativeForm?.getAttribute("data-better-albert-region"),
        ).toBe("personal-edit-form");
        expect(nativeForm?.getAttribute("aria-label")).toBe(
          "Official Albert personal information form",
        );
        expect(nativeForm?.getAttribute("aria-description")).toBe(
          "Albert saves these changes. Better Albert does not store this information.",
        );
      } else {
        expect(
          document.querySelectorAll('[data-better-albert-region="directory"]'),
        ).not.toHaveLength(0);
      }
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

  it("omits an ambiguous count-suffixed Home Holds card", () => {
    const document = fixture("tests/fixtures/albert-shell.html");
    const nativeHolds = document.querySelector(".native-hold-error");
    nativeHolds?.after(nativeHolds.cloneNode(true));
    const manager = new AdapterManager();

    expect(
      manager.reconcile({
        document,
        location: PORTAL_LOCATION,
        pageFamily: "home",
        topLevel: true,
      }),
    ).toBe("family-home");
    expect(
      document.querySelector('[data-better-albert-region="holds-status"]'),
    ).toBeNull();
    expect(
      document.querySelector('[data-better-albert-region="registration-time"]'),
    ).not.toBeNull();
  });

  it("preserves an active verified destination across reconciliation", () => {
    const source = fixture("tests/fixtures/families/personal.html");
    const previousMarkup = document.documentElement.innerHTML;
    document.head.innerHTML = source.head.innerHTML;
    document.body.innerHTML = source.body.innerHTML;
    const manager = new AdapterManager();
    const context = {
      document,
      location: PORTAL_LOCATION,
      pageFamily: "personal" as const,
      topLevel: true,
    };

    try {
      expect(manager.reconcile(context)).toBe("family-personal");
      const identifierSection = document.querySelector<HTMLElement>(
        '[data-better-albert-region="identifier-section"]',
      );
      expect(identifierSection).toBeTruthy();

      identifierSection?.focus();
      expect(document.activeElement).toBe(identifierSection);

      expect(manager.reconcile(context)).toBe("family-personal");
      expect(document.activeElement).toBe(identifierSection);
    } finally {
      manager.rollback();
      document.documentElement.innerHTML = previousMarkup;
    }
  });

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

  it("adapts a trusted generic PeopleSoft response wrapper", () => {
    const document = fixture("tests/fixtures/albert-generic-deep-page.html");
    const manager = new AdapterManager();
    const root = document.querySelector("#IS_AC_RESPONSE > .ptprtlcontainer");
    const form = document.querySelector("form");
    const before = document.documentElement.outerHTML;

    expect(
      manager.reconcile({
        document,
        location: new URL(
          "https://sis.portal.nyu.edu/psp/ihprod/EMPLOYEE/SA/s/WEBLIB_NYU_NCOA.ISCRIPT1.FieldFormula.IScript_Open",
        ),
        pageFamily: "personal",
        topLevel: true,
      }),
    ).toBe("peoplesoft-deep");
    expect(document.documentElement.dataset.betterAlbertAdapter).toBe(
      "peoplesoft-deep",
    );
    const title = document.querySelector('[data-better-albert-region="page-title"]');
    expect(title?.textContent).toContain("Pronouns");
    expect(document.querySelector('[data-better-albert-region="form"]')).toBe(
      form,
    );
    expect(root?.getAttribute("data-better-albert-layout")).toBe(
      "peoplesoft-page",
    );

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
    expect(
      document.querySelector('[data-better-albert-search-mode="subject"]'),
    ).toBe(document.querySelector(".ps_box-page"));
    expect(document.querySelector("#subject")?.getAttribute("placeholder")).toBe(
      "Enter a subject",
    );
    expect(
      document.querySelector("#subject")?.getAttribute("aria-description"),
    ).toBe("Enter a department or subject, then use Search.");
    expect(
      document.querySelectorAll(
        '[data-better-albert-region="primary-search-action"]',
      ),
    ).toHaveLength(1);
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
    expect(document.querySelectorAll('[data-better-albert-region="group"]')).toHaveLength(0);
    expect(document.querySelectorAll('[data-better-albert-region="filter"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-better-albert-region="results"]')).toHaveLength(1);
    expect(
      document.querySelectorAll(
        '[data-better-albert-region="result-actions"]',
      ),
    ).toHaveLength(1);
    expect(
      document.querySelector('[data-better-albert-region="primary-search-input"]'),
    ).toBe(document.querySelector("#subject"));
    expect(document.querySelector("#subject")?.getAttribute("aria-label")).toBe(
      "Find a class by subject, course number, title, or instructor",
    );
    expect(document.querySelector("#subject")?.getAttribute("placeholder")).toBe(
      "Subject, course, title, or instructor",
    );
    expect(
      document.querySelector("#subject")?.getAttribute("aria-description"),
    ).toBe(
      "Use one field for subject, course number, title, or instructor.",
    );
    expect(
      document.querySelector('[data-better-albert-region="primary-search-label"]')
        ?.textContent,
    ).toContain("Subject, Catalog Number");
    expect(
      document.querySelectorAll(
        '[data-better-albert-region="primary-search-action"]',
      ),
    ).toHaveLength(1);
    expect(
      document.querySelector('[data-better-albert-layout="class-search-body"]'),
    ).toBe(document.querySelector("#legacy-main"));
    expect(
      document.querySelector('[data-better-albert-search-mode="combined"]'),
    ).toBe(document.querySelector("#PT_WRAPPER"));
    expect(submit?.closest("form")).toBe(form);
    expect(form?.getAttribute("action")).toBe(formContract.action);
    expect(form?.getAttribute("method")).toBe(formContract.method);
    expect(
      form?.querySelector<HTMLInputElement>('[name="native_token"]')?.value,
    ).toBe(formContract.token);

    manager.rollback();
    expect(document.documentElement.outerHTML).toBe(before);
  });

  it("adapts the exact Class Search browse state before a results grid exists", () => {
    const document = new DOMParser().parseFromString(
      `<!doctype html><title>Course Search</title>
      <form id="NYU_CLS_SRCH" class="PSForm" action="/native/class-search">
        <div id="PT_WRAPPER" class="ps_wrapper">
          <section class="ps_box-group">
            <span>Subject, Catalog Number, Title &amp; Instructor Names</span>
            <input id="combined-query" type="text">
            <button type="button">Search</button>
          </section>
          <section class="ps_box-group">
            <label for="description-query">Course Description</label>
            <input id="description-query" type="text">
            <button type="button">Search</button>
          </section>
        </div>
      </form>`,
      "text/html",
    );
    const manager = new AdapterManager();

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
    expect(
      document.querySelector('[data-better-albert-region="primary-search-input"]'),
    ).toBe(document.querySelector("#combined-query"));
    expect(
      document.querySelectorAll('[data-better-albert-region="results"]'),
    ).toHaveLength(0);
    expect(
      document.querySelectorAll('[data-better-albert-region="group"]'),
    ).toHaveLength(0);
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

  it("does not promote an unverified text field as universal Class Search", () => {
    const document = new DOMParser().parseFromString(
      `<!doctype html><title>Class Search</title>
      <main class="ps_box-page">
        <h1 class="ps_box-pagetitle">Class Search</h1>
        <section class="ps_box-search">
          <label for="keyword">Keywords</label>
          <input id="keyword" type="text">
          <button type="button">Search</button>
        </section>
        <section class="ps_grid-flex" aria-label="Search results"></section>
      </main>`,
      "text/html",
    );
    const manager = new AdapterManager();

    expect(
      manager.reconcile({
        document,
        location: CLASS_SEARCH_LOCATION,
        pageFamily: "academics",
        topLevel: false,
      }),
    ).toBe("class-search");
    expect(
      document.querySelector("[data-better-albert-search-mode]"),
    ).toBeNull();
    expect(
      document.querySelector('[data-better-albert-region="primary-search-input"]'),
    ).toBeNull();
    expect(document.querySelector("#keyword")?.hasAttribute("placeholder")).toBe(
      false,
    );
  });

  it.each([
    "tests/fixtures/albert-class-search-empty.html",
    "tests/fixtures/albert-class-search-error.html",
  ])("keeps Class Search empty and validation states inside the exact layout for %s", (path) => {
    const document = fixture(path);
    const manager = new AdapterManager();
    const before = document.documentElement.outerHTML;
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
      expect(nativeAlert.getAttribute("data-better-albert-region")).toBe(
        "validation-alert",
      );
      const invalidControl = document.querySelector(
        '[aria-describedby="search-error"]',
      );
      expect(invalidControl?.getAttribute("data-better-albert-region")).toBe(
        "validation-control",
      );
      expect(invalidControl?.getAttribute("aria-invalid")).toBe("true");
      expect(invalidControl?.hasAttribute("aria-description")).toBe(false);
    }
    manager.rollback();
    expect(document.documentElement.outerHTML).toBe(before);
  });

  it("preserves native Class Search guidance instead of replacing it", () => {
    const document = fixture("tests/fixtures/albert-class-search.html");
    const manager = new AdapterManager();
    const input = document.querySelector("#subject");
    input?.setAttribute("aria-description", "Native subject guidance");

    expect(
      manager.reconcile({
        document,
        location: CLASS_SEARCH_LOCATION,
        pageFamily: "academics",
        topLevel: false,
      }),
    ).toBe("class-search");
    expect(input?.getAttribute("aria-description")).toBe(
      "Native subject guidance",
    );
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

  it("adapts the verified live Finances structure without a PeopleSoft directory container", () => {
    const document = fixture("tests/fixtures/families/finances.html");
    document.querySelector(".is_bb_LinkContainer")?.remove();
    const manager = new AdapterManager();

    expect(
      manager.reconcile({
        document,
        location: PORTAL_LOCATION,
        pageFamily: "finances",
        topLevel: true,
      }),
    ).toBe("family-finances");
    expect(
      document.querySelector('[data-better-albert-region="account-section"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-better-albert-region="aid-section"]'),
    ).not.toBeNull();
    expect(
      document.querySelectorAll('[data-better-albert-region="directory"]'),
    ).toHaveLength(1);
    expect(
      document.querySelector("#NYUBursarLinks")?.getAttribute("inert"),
    ).toBe("");
  });

  it("labels an unlabeled native account region without replacing native headings", () => {
    const document = fixture("tests/fixtures/families/finances.html");
    document.querySelector("#NYU_SSS_BURSAR_AMOUNTS h1")?.remove();
    const account = document.querySelector("#NYUBursarDisplay");
    const manager = new AdapterManager();

    expect(
      manager.reconcile({
        document,
        location: PORTAL_LOCATION,
        pageFamily: "finances",
        topLevel: true,
      }),
    ).toBe("family-finances");
    expect(account?.getAttribute("data-better-albert-section-label")).toBe(
      "Account and billing",
    );
    expect(account?.getAttribute("role")).toBe("region");
    expect(account?.getAttribute("aria-label")).toBe("Account and billing");
  });

  it("labels an unlabeled Home schedule region without copying schedule values", () => {
    const document = fixture("tests/fixtures/albert-shell.html");
    document.querySelector("#schedule-title")?.remove();
    const schedule = document.querySelector(".isSSS_ShCtSchWrp");
    const manager = new AdapterManager();

    expect(
      manager.reconcile({
        document,
        location: PORTAL_LOCATION,
        pageFamily: "home",
        topLevel: true,
      }),
    ).toBe("family-home");
    expect(schedule?.getAttribute("data-better-albert-section-label")).toBe(
      "Today and weekly schedule",
    );
    expect(schedule?.getAttribute("role")).toBe("region");
    expect(schedule?.getAttribute("aria-label")).toBe(
      "Today and weekly schedule",
    );
  });

  it("labels the selected schedule nested inside the Home shopping cart", () => {
    const document = fixture("tests/fixtures/albert-shell.html");
    const schedule = document.querySelector(".isSSS_ShCtSchWrp");
    const contentRoot = document.querySelector(".isDS_Section");
    if (!schedule || !contentRoot) {
      throw new Error("Home fixture is missing its schedule content");
    }
    schedule.classList.add("selected");
    schedule.removeAttribute("aria-labelledby");
    schedule.querySelector("h1")?.replaceChildren(
      document.createTextNode("Enrolled Courses - Summer 2026"),
    );
    const shoppingCart = document.createElement("div");
    shoppingCart.className = "isSSS_ShopCart";
    schedule.replaceWith(shoppingCart);
    shoppingCart.append(schedule);
    contentRoot.append(shoppingCart);

    const manager = new AdapterManager();

    expect(
      manager.reconcile({
        document,
        location: PORTAL_LOCATION,
        pageFamily: "home",
        topLevel: true,
      }),
    ).toBe("family-home");
    expect(schedule.getAttribute("data-better-albert-region")).toBe(
      "schedule-section",
    );
    expect(schedule.getAttribute("data-better-albert-section-label")).toBe(
      "Today and weekly schedule",
    );
    expect(schedule.getAttribute("role")).toBe("region");
    expect(schedule.getAttribute("aria-label")).toBe(
      "Today and weekly schedule",
    );
  });

  it("labels the live Home schedule-link cluster when it is the only verified wrapper", () => {
    const document = fixture("tests/fixtures/albert-shell.html");
    const contentRoot = document.querySelector(".isDS_Section");
    if (!contentRoot) {
      throw new Error("Home fixture is missing its content root");
    }
    const shoppingCart = document.createElement("div");
    shoppingCart.className = "isSSS_ShopCart";
    const scheduleLinks = document.createElement("div");
    scheduleLinks.className = "isSSS_ShCtLnkWrp";
    scheduleLinks.textContent = "Legend Weekly Schedule";
    shoppingCart.append(scheduleLinks);
    contentRoot.append(shoppingCart);

    const manager = new AdapterManager();

    expect(
      manager.reconcile({
        document,
        location: PORTAL_LOCATION,
        pageFamily: "home",
        topLevel: true,
      }),
    ).toBe("family-home");
    expect(scheduleLinks.getAttribute("data-better-albert-region")).toBe(
      "schedule-section",
    );
    expect(
      scheduleLinks.getAttribute("data-better-albert-section-label"),
    ).toBe("Today and weekly schedule");
  });

  it("keeps the Home news carousel out of the weekly schedule region", () => {
    const document = fixture("tests/fixtures/albert-shell.html");
    const news = document.querySelector(".isSSS_ShCtSchWrp");
    news?.setAttribute("id", "IS_SSS_SUMMARY_NEWS");
    news?.removeAttribute("aria-labelledby");
    news?.querySelector("h1")?.remove();
    const manager = new AdapterManager();

    expect(
      manager.reconcile({
        document,
        location: PORTAL_LOCATION,
        pageFamily: "home",
        topLevel: true,
      }),
    ).toBe("family-home");
    expect(news?.getAttribute("data-better-albert-region")).toBe(
      "news-section",
    );
    expect(news?.getAttribute("data-better-albert-section-label")).toBe(
      "Updates and deadlines",
    );
  });

  it("keeps an incomplete Finances link boundary visible", () => {
    const document = fixture("tests/fixtures/families/finances.html");
    const bursarLinks = document.querySelector("#NYUBursarLinks");
    bursarLinks?.insertAdjacentHTML(
      "beforeend",
      '<a href="#unknown-account-action">Review another account action</a>',
    );
    const manager = new AdapterManager();

    expect(
      manager.reconcile({
        document,
        location: PORTAL_LOCATION,
        pageFamily: "finances",
        topLevel: true,
      }),
    ).toBe("family-finances");
    expect(bursarLinks?.hasAttribute("inert")).toBe(false);
    expect(
      bursarLinks?.hasAttribute("data-better-albert-region"),
    ).toBe(false);
  });

  it("keeps an ambiguous Finances link boundary visible", () => {
    const document = fixture("tests/fixtures/families/finances.html");
    const bursarLinks = document.querySelector("#NYUBursarLinks");
    bursarLinks?.insertAdjacentHTML(
      "beforeend",
      '<a href="#duplicate-balance">View Bursar Balance</a>',
    );
    const manager = new AdapterManager();

    expect(
      manager.reconcile({
        document,
        location: PORTAL_LOCATION,
        pageFamily: "finances",
        topLevel: true,
      }),
    ).toBe("family-finances");
    expect(bursarLinks?.hasAttribute("inert")).toBe(false);
    expect(
      bursarLinks?.hasAttribute("data-better-albert-region"),
    ).toBe(false);
  });

  it("does not label an ambiguous Finances payment boundary", () => {
    const document = fixture("tests/fixtures/families/finances.html");
    const account = document.querySelector("#NYUBursarDisplay");
    const originalForm = account?.querySelector("form");
    if (originalForm) {
      account?.append(originalForm.cloneNode(true));
    }
    const manager = new AdapterManager();

    expect(
      manager.reconcile({
        document,
        location: PORTAL_LOCATION,
        pageFamily: "finances",
        topLevel: true,
      }),
    ).toBe("family-finances");
    expect(
      document.querySelectorAll('[data-better-albert-region="payment-action"]'),
    ).toHaveLength(0);
    for (const form of document.querySelectorAll("#NYUBursarDisplay form")) {
      expect(form.hasAttribute("aria-label")).toBe(false);
    }
  });

  it("does not label an ambiguous Academics enrollment boundary", () => {
    const document = fixture("tests/fixtures/families/academics.html");
    const enrollment = document.querySelector(
      '[data-albert-section="enrollment"]',
    );
    const originalForm = enrollment?.querySelector("form");
    if (originalForm) {
      enrollment?.append(originalForm.cloneNode(true));
    }
    const manager = new AdapterManager();

    expect(
      manager.reconcile({
        document,
        location: PORTAL_LOCATION,
        pageFamily: "academics",
        topLevel: true,
      }),
    ).toBe("family-academics");
    expect(
      document.querySelectorAll(
        '[data-better-albert-region="enrollment-action"]',
      ),
    ).toHaveLength(0);
    for (const form of document.querySelectorAll(
      '[data-albert-section="enrollment"] form',
    )) {
      expect(form.hasAttribute("aria-label")).toBe(false);
    }
  });

  it.each([
    ["aria-description", "Native Albert enrollment guidance"],
    ["aria-describedby", "native-enrollment-help"],
  ])("preserves native enrollment guidance from %s", (attribute, value) => {
    const document = fixture("tests/fixtures/families/academics.html");
    const form = document.querySelector('form[action="/native/enrollment"]');
    form?.setAttribute(attribute, value);
    const manager = new AdapterManager();

    expect(
      manager.reconcile({
        document,
        location: PORTAL_LOCATION,
        pageFamily: "academics",
        topLevel: true,
      }),
    ).toBe("family-academics");
    expect(form?.getAttribute(attribute)).toBe(value);
    if (attribute === "aria-describedby") {
      expect(form?.hasAttribute("aria-description")).toBe(false);
    }
  });

  it("does not label an incomplete Academics journey", () => {
    const document = fixture("tests/fixtures/families/academics.html");
    const manager = new AdapterManager();
    document
      .querySelector('[data-albert-section="graduation"]')
      ?.remove();

    expect(
      manager.reconcile({
        document,
        location: PORTAL_LOCATION,
        pageFamily: "academics",
        topLevel: true,
      }),
    ).toBe("family-academics");
    expect(
      document.querySelectorAll("[data-better-albert-academic-step]"),
    ).toHaveLength(0);
    expect(document.querySelectorAll('[role="region"]')).toHaveLength(0);
  });

  it.each([
    ["aria-description", "Native Albert records guidance"],
    ["aria-describedby", "native-records-help"],
  ])("preserves native records guidance from %s", (attribute, value) => {
    const document = fixture("tests/fixtures/families/grades.html");
    const recordsDirectory = document.querySelector("#nyuGradesLinks");
    recordsDirectory?.setAttribute(attribute, value);
    const manager = new AdapterManager();

    expect(
      manager.reconcile({
        document,
        location: PORTAL_LOCATION,
        pageFamily: "grades",
        topLevel: true,
      }),
    ).toBe("family-grades");
    expect(recordsDirectory?.getAttribute(attribute)).toBe(value);
    if (attribute === "aria-describedby") {
      expect(recordsDirectory?.hasAttribute("aria-description")).toBe(false);
    }
    expect(
      recordsDirectory?.getAttribute("data-better-albert-records-guidance"),
    ).toContain("Quick access shows the transcript");
  });

  it("marks the exact native career chooser link for live Grades pages", () => {
    const document = fixture("tests/fixtures/families/grades.html");
    const careerSection = document.querySelector(".isSSS_CareerSelect");
    careerSection!.innerHTML =
      '<a href="javascript:void(0);">Undergraduate : /</a>';
    const manager = new AdapterManager();

    expect(
      manager.reconcile({
        document,
        location: PORTAL_LOCATION,
        pageFamily: "grades",
        topLevel: true,
      }),
    ).toBe("family-grades");

    const gradeViewerTarget = document.querySelector(
      '[data-better-albert-region="grade-viewer"]',
    );
    expect(gradeViewerTarget?.matches("a")).toBe(true);
    expect(gradeViewerTarget?.textContent).toContain("Undergraduate");
    expect(
      gradeViewerTarget?.hasAttribute("data-better-albert-focus-target"),
    ).toBe(true);
  });

  it("does not label a Personal Info form without an exact Save and Cancel boundary", () => {
    const document = fixture("tests/fixtures/families/personal.html");
    document
      .querySelector('form[action="/native/profile"] button[type="button"]')
      ?.remove();
    const manager = new AdapterManager();

    expect(
      manager.reconcile({
        document,
        location: PORTAL_LOCATION,
        pageFamily: "personal",
        topLevel: true,
      }),
    ).toBe("family-personal");
    const form = document.querySelector('form[action="/native/profile"]');
    expect(form?.hasAttribute("data-better-albert-region")).toBe(false);
    expect(form?.hasAttribute("aria-label")).toBe(false);
    expect(form?.hasAttribute("aria-description")).toBe(false);
  });

  it.each([
    ["aria-description", "Native Albert guidance"],
    ["aria-describedby", "native-personal-help"],
  ])("preserves native Personal Info form guidance from %s", (attribute, value) => {
    const document = fixture("tests/fixtures/families/personal.html");
    const form = document.querySelector('form[action="/native/profile"]');
    form?.setAttribute(attribute, value);
    const manager = new AdapterManager();

    expect(
      manager.reconcile({
        document,
        location: PORTAL_LOCATION,
        pageFamily: "personal",
        topLevel: true,
      }),
    ).toBe("family-personal");
    expect(form?.getAttribute(attribute)).toBe(value);
    if (attribute === "aria-describedby") {
      expect(form?.hasAttribute("aria-description")).toBe(false);
    }
  });

  it.each([
    ["aria-description", "Native Albert payment guidance"],
    ["aria-describedby", "native-payment-help"],
  ])("preserves native payment guidance from %s", (attribute, value) => {
    const document = fixture("tests/fixtures/families/finances.html");
    const form = document.querySelector('form[action="/native/payment-provider"]');
    form?.setAttribute(attribute, value);
    const manager = new AdapterManager();

    expect(
      manager.reconcile({
        document,
        location: PORTAL_LOCATION,
        pageFamily: "finances",
        topLevel: true,
      }),
    ).toBe("family-finances");
    expect(form?.getAttribute(attribute)).toBe(value);
    if (attribute === "aria-describedby") {
      expect(form?.hasAttribute("aria-description")).toBe(false);
    }
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
