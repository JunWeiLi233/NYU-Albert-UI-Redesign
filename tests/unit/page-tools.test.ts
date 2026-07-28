import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAvailablePageTools,
  getAvailableResourceTools,
  getAvailableTaskTools,
  isFullyMirroredPageToolDirectory,
  openNativePageTool,
  openNativeResourceTool,
} from "../../src/content/page-tools";

function nativeResourceMenu(items: string): string {
  return `
    <nav id="IS_BB_HEADER_MENU">
      <ul>
        <li
          id="MENU_ID_NYU_OTHER_RESOURCES_FLDR"
          onclick="toggleMegaMenu('MENU_ID_NYU_OTHER_RESOURCES_FLDR', 'SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR', 'megaMenuSelected')"
        >
          <a href="#">Other Resources</a>
        </li>
      </ul>
      <div id="SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR" hidden>
        <ul>${items}</ul>
      </div>
    </nav>
  `;
}

describe("page-family native tools", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section class="is_bb_LinkContainer">
        <div class="is_bb_LinkItem"><a href="#search">Course Search</a></div>
        <div class="is_bb_LinkItem"><a href="#transaction">Accept/Decline Awards</a></div>
      </section>
      <main><a href="#outside">Weekly Schedule</a></main>
    `;
  });

  it("exposes and delegates only allowlisted tools in verified containers", () => {
    const search = document.querySelector<HTMLAnchorElement>('a[href="#search"]');
    const click = vi.fn((event: Event) => event.preventDefault());
    search?.addEventListener("click", click);

    expect(getAvailablePageTools(document, "home").map(({ id }) => id)).toEqual([
      "course-search",
    ]);
    expect(openNativePageTool(document, "course-search")).toBe(true);
    expect(click).toHaveBeenCalledOnce();
  });

  it("keeps course-registration language on the exact Course Search task", () => {
    const courseSearch = getAvailableTaskTools(document).find(
      ({ id }) => id === "course-search",
    );

    expect(courseSearch?.keywords).toEqual(
      expect.arrayContaining(["course registration"]),
    );
  });

  it("keeps enrollment-letter language on the Proof of Enrollment task", () => {
    document.body.innerHTML = `
      <section class="is_bb_LinkContainer">
        <div class="is_bb_LinkItem"><a href="#verification">Enrollment Verification</a></div>
      </section>
    `;

    const proofOfEnrollment = getAvailableTaskTools(document).find(
      ({ id }) => id === "enrollment-verification",
    );

    expect(proofOfEnrollment?.keywords).toEqual(
      expect.arrayContaining(["enrollment letter"]),
    );
  });

  it("keeps payment-plan language on the native eSuite account task", () => {
    document.body.innerHTML = `
      <section class="is_bb_LinkContainer">
        <div class="is_bb_LinkItem"><a href="#bursar">View Bursar Account (log into eSuite)</a></div>
      </section>
    `;

    const bursarAccount = getAvailableTaskTools(document).find(
      ({ id }) => id === "bursar-account",
    );

    expect(bursarAccount?.keywords).toEqual(
      expect.arrayContaining(["payment plan"]),
    );
  });

  it("keeps precise identity language on verified Personal Info tasks", () => {
    document.body.innerHTML = `
      <section class="is_bb_LinkContainer">
        <div class="is_bb_LinkItem"><a href="#demographic">Demographic Information</a></div>
        <div class="is_bb_LinkItem"><a href="#address">Edit Addresses</a></div>
      </section>
    `;

    const taskTools = getAvailableTaskTools(document);
    const demographic = taskTools.find(
      ({ id }) => id === "demographic-information",
    );
    const addresses = taskTools.find(({ id }) => id === "addresses");

    expect(demographic?.keywords).toEqual(
      expect.arrayContaining(["date of birth", "gender", "legal name"]),
    );
    expect(addresses?.keywords).toEqual(
      expect.arrayContaining(["address"]),
    );
  });

  it("dispatches page-owned clicks without evaluating javascript URLs in the extension", () => {
    const search = document.querySelector<HTMLAnchorElement>('a[href="#search"]');
    search?.setAttribute("href", "javascript:void(0)");
    const click = vi.fn((event: Event) => {
      expect(event.defaultPrevented).toBe(false);
      event.preventDefault();
    });
    search?.addEventListener("click", click);

    expect(openNativePageTool(document, "course-search")).toBe(true);
    expect(click).toHaveBeenCalledOnce();
  });

  it("does not expose transaction labels or same-label links outside tool containers", () => {
    expect(
      getAvailablePageTools(document, "finances").map(({ label }) => label),
    ).not.toContain("Accept/Decline Awards");
    expect(getAvailablePageTools(document, "home").map(({ id }) => id)).not.toContain(
      "weekly-schedule",
    );
    expect(openNativePageTool(document, "weekly-schedule")).toBe(false);
  });

  it("exposes a uniquely verified pronoun destination only in task search", () => {
    document.body.innerHTML = `
      <section class="isSSS_Main selected">
        <span id="IS_AC_RESPONSE">
          <section class="isSSS_PersInfTop">
        <a href="#pronouns">Indicate My Pronouns</a>
          </section>
        </span>
      </section>
    `;
    const pronouns = document.querySelector<HTMLAnchorElement>(
      'a[href="#pronouns"]',
    );
    const click = vi.fn((event: Event) => event.preventDefault());
    pronouns?.addEventListener("click", click);

    expect(getAvailablePageTools(document, "personal")).toEqual([]);
    expect(
      getAvailableTaskTools(document).map(({ id, pageFamily }) => ({
        id,
        pageFamily,
      })),
    ).toEqual([{ id: "pronouns", pageFamily: "personal" }]);
    expect(openNativePageTool(document, "pronouns")).toBe(true);
    expect(click).toHaveBeenCalledOnce();
  });

  it("identifies only native directories fully mirrored by verified tools", () => {
    document.body.innerHTML = `
      <section class="is_bb_LinkContainer" id="complete">
        <div class="is_bb_LinkItem"><a href="#search">Course Search</a></div>
        <div class="is_bb_LinkItem"><a href="#schedule">Weekly Schedule</a></div>
      </section>
      <section class="is_bb_LinkContainer" id="transactional">
        <div class="is_bb_LinkItem"><a href="#planner">Academic Planner</a></div>
        <div class="is_bb_LinkItem"><a href="#awards">Accept/Decline Awards</a></div>
      </section>
    `;

    const complete = document.querySelector("#complete");
    const transactional = document.querySelector("#transactional");
    expect(complete).not.toBeNull();
    expect(transactional).not.toBeNull();
    expect(
      isFullyMirroredPageToolDirectory(document, complete!),
    ).toBe(true);
    expect(
      isFullyMirroredPageToolDirectory(document, transactional!),
    ).toBe(false);

    document.body.insertAdjacentHTML(
      "beforeend",
      '<section class="is_bb_LinkContainer"><a href="#duplicate">Course Search</a></section>',
    );
    expect(
      isFullyMirroredPageToolDirectory(document, complete!),
    ).toBe(false);
  });

  it("discovers and delegates unique cross-family task controls already present in the current view", () => {
    document.body.innerHTML = `
      <section class="is_bb_LinkContainer">
        <a href="#search">Course Search</a>
        <a href="#advisor">Schedule an Advisor Appointment</a>
        <a href="#degree">Degree Progress Report</a>
        <a href="#verification">Enrollment Verification</a>
        <a href="#myhub-verification">MyHub-Enrollment Verification</a>
        <a href="#aid">View Financial Aid Status</a>
        <a href="#addresses">Edit Addresses</a>
      </section>
      <section
        data-better-albert-region="aid-section"
        tabindex="-1"
      ></section>
    `;
    const financialAid = document.querySelector<HTMLAnchorElement>(
      'a[href="#aid"]',
    );
    const myHubVerification = document.querySelector<HTMLAnchorElement>(
      'a[href="#myhub-verification"]',
    );
    const click = vi.fn((event: Event) => event.preventDefault());
    const myHubClick = vi.fn((event: Event) => event.preventDefault());
    financialAid?.addEventListener("click", click);
    myHubVerification?.addEventListener("click", myHubClick);

    expect(
      getAvailableTaskTools(document).map(({ id, pageFamily }) => ({
        id,
        pageFamily,
      })),
    ).toEqual([
      { id: "course-search", pageFamily: "home" },
      { id: "advisor-appointment", pageFamily: "academics" },
      { id: "degree-progress", pageFamily: "academics" },
      { id: "enrollment-verification", pageFamily: "grades" },
      { id: "myhub-enrollment-verification", pageFamily: "grades" },
      { id: "financial-aid-status", pageFamily: "finances" },
      { id: "addresses", pageFamily: "personal" },
    ]);
    expect(
      getAvailableTaskTools(document).find(
        ({ id }) => id === "advisor-appointment",
      )?.keywords,
    ).toEqual(
      expect.arrayContaining([
        "advisor appointment",
        "schedule advisor appointment",
      ]),
    );
    expect(openNativePageTool(document, "financial-aid-status")).toBe(true);
    expect(click).toHaveBeenCalledOnce();
    expect(document.activeElement).not.toBe(
      document.querySelector('[data-better-albert-region="aid-section"]'),
    );
    expect(
      openNativePageTool(document, "myhub-enrollment-verification"),
    ).toBe(true);
    expect(myHubClick).toHaveBeenCalledOnce();
  });

  it("omits ambiguous, disabled, and hidden cross-family task controls", () => {
    document.body.innerHTML = `
      <section class="is_bb_LinkContainer">
        <a href="#degree-one">Degree Progress Report</a>
        <a href="#degree-two">Degree Progress Report</a>
        <button disabled>Edit Addresses</button>
        <a href="#aid" aria-hidden="true">View Financial Aid Status</a>
      </section>
    `;

    expect(getAvailableTaskTools(document)).toEqual([]);
    expect(openNativePageTool(document, "degree-progress")).toBe(false);
    expect(openNativePageTool(document, "addresses")).toBe(false);
    expect(openNativePageTool(document, "financial-aid-status")).toBe(false);
  });

  it("exposes Home tools from Albert's selected shopping-cart workspace", () => {
    document.body.innerHTML = `
      <main class="isSSS_Main selected">
        <span id="IS_AC_RESPONSE">
          <section class="isSSS_FullW isSSS_ShopCart selected">
            <div class="isSSS_ShCtLnkWrp">
              <a href="#weekly">Weekly Schedule</a>
            </div>
            <div class="isSSS_ShCtEmpWrp">
              <p><a href="#search">Course Search</a></p>
            </div>
          </section>
        </span>
      </main>
    `;

    expect(getAvailablePageTools(document, "home").map(({ id }) => id)).toEqual([
      "course-search",
      "weekly-schedule",
    ]);
  });

  it("focuses the uniquely verified native Holds status without recreating it", () => {
    document.body.innerHTML = `
      <section
        data-better-albert-region="holds-status"
        tabindex="-1"
      >
        <h3>Holds</h3>
        <p>Native status remains here.</p>
      </section>
    `;
    const nativeTarget = document.querySelector<HTMLElement>(
      '[data-better-albert-region="holds-status"]',
    );

    expect(getAvailablePageTools(document, "home").map(({ id }) => id)).toEqual([
      "holds-status",
    ]);
    expect(
      getAvailableTaskTools(document).map(({ id, pageFamily }) => ({
        id,
        pageFamily,
      })),
    ).toEqual([{ id: "holds-status", pageFamily: "home" }]);
    expect(openNativePageTool(document, "holds-status")).toBe(true);
    expect(document.activeElement).toBe(nativeTarget);
    expect(nativeTarget?.textContent).toContain("Native status remains here.");
  });

  it("omits an ambiguous Holds status target", () => {
    document.body.innerHTML = `
      <section data-better-albert-region="holds-status" tabindex="-1"></section>
      <section data-better-albert-region="holds-status" tabindex="-1"></section>
    `;

    expect(getAvailablePageTools(document, "home")).toEqual([]);
    expect(openNativePageTool(document, "holds-status")).toBe(false);
  });

  it("focuses the uniquely verified native registration-time status", () => {
    document.body.innerHTML = `
      <section
        data-better-albert-region="registration-time"
        tabindex="-1"
      >
        <h3>Enrollment Dates</h3>
        <p>Native appointment status remains here.</p>
      </section>
    `;
    const nativeTarget = document.querySelector<HTMLElement>(
      '[data-better-albert-region="registration-time"]',
    );

    expect(getAvailablePageTools(document, "home").map(({ id }) => id)).toEqual([
      "registration-time",
    ]);
    expect(openNativePageTool(document, "registration-time")).toBe(true);
    expect(document.activeElement).toBe(nativeTarget);
    expect(nativeTarget?.textContent).toContain(
      "Native appointment status remains here.",
    );
  });

  it("keeps the verified To Do status in task discovery without crowding Home shortcuts", () => {
    document.body.innerHTML = `
      <section
        data-better-albert-region="todo-status"
        tabindex="-1"
      >
        <h3>To Do</h3>
        <p>Native required action remains here.</p>
      </section>
    `;
    const nativeTarget = document.querySelector<HTMLElement>(
      '[data-better-albert-region="todo-status"]',
    );

    expect(getAvailablePageTools(document, "home")).toEqual([]);
    expect(
      getAvailableTaskTools(document).map(({ id, pageFamily }) => ({
        id,
        pageFamily,
      })),
    ).toEqual([{ id: "todo-status", pageFamily: "home" }]);
    expect(openNativePageTool(document, "todo-status")).toBe(true);
    expect(document.activeElement).toBe(nativeTarget);
    expect(nativeTarget?.textContent).toContain(
      "Native required action remains here.",
    );
  });

  it("exposes precise Personal Info section searches without crowding Quick access", () => {
    document.body.innerHTML = `
      <section data-better-albert-region="missing-person-section" tabindex="-1">
        <h2>Missing person contact</h2>
      </section>
      <section data-better-albert-region="citizenship-section" tabindex="-1">
        <h2>Citizenship</h2>
      </section>
      <section data-better-albert-region="identifier-section" tabindex="-1">
        <h2>Identification</h2>
      </section>
    `;

    expect(getAvailablePageTools(document, "personal")).toEqual([]);
    expect(
      getAvailableTaskTools(document)
        .filter(({ pageFamily }) => pageFamily === "personal")
        .map(({ id }) => id),
    ).toEqual([
      "missing-person-contact",
      "citizenship-information",
      "identification-information",
    ]);

    const target = document.querySelector<HTMLElement>(
      '[data-better-albert-region="missing-person-section"]',
    );
    expect(openNativePageTool(document, "missing-person-contact")).toBe(true);
    expect(document.activeElement).toBe(target);
  });

  it("focuses the unique native grade-career selector without changing its value", () => {
    document.body.innerHTML = `
      <label>
        Academic career
        <select
          data-better-albert-region="grade-viewer"
          data-better-albert-focus-target=""
        >
          <option value="undergraduate" selected>Undergraduate</option>
        </select>
      </label>
    `;
    const nativeCareerSelect = document.querySelector<HTMLSelectElement>(
      '[data-better-albert-region="grade-viewer"]',
    );

    expect(getAvailablePageTools(document, "grades").map(({ id }) => id)).toEqual([
      "view-grades",
    ]);
    expect(openNativePageTool(document, "view-grades")).toBe(true);
    expect(document.activeElement).toBe(nativeCareerSelect);
    expect(nativeCareerSelect?.value).toBe("undergraduate");
    expect(nativeCareerSelect?.hasAttribute("tabindex")).toBe(false);
  });

  it("focuses the exact native career chooser link used by live Grades", () => {
    document.body.innerHTML = `
      <a
        href="javascript:void(0);"
        data-better-albert-region="grade-viewer"
      >Undergraduate : /</a>
    `;
    const nativeCareerLink = document.querySelector<HTMLAnchorElement>(
      '[data-better-albert-region="grade-viewer"]',
    );

    expect(getAvailablePageTools(document, "grades").map(({ id }) => id)).toEqual([
      "view-grades",
    ]);
    expect(openNativePageTool(document, "view-grades")).toBe(true);
    expect(document.activeElement).toBe(nativeCareerLink);
  });

  it("omits an ambiguous or disabled grade-career target", () => {
    document.body.innerHTML = `
      <select data-better-albert-region="grade-viewer"></select>
      <select data-better-albert-region="grade-viewer"></select>
    `;
    expect(getAvailablePageTools(document, "grades")).toEqual([]);
    expect(openNativePageTool(document, "view-grades")).toBe(false);

    document.body.innerHTML = `
      <select data-better-albert-region="grade-viewer" disabled></select>
    `;
    expect(getAvailablePageTools(document, "grades")).toEqual([]);
    expect(openNativePageTool(document, "view-grades")).toBe(false);
  });

  it("ignores Home shopping-cart tools outside the selected workspace", () => {
    document.body.innerHTML = `
      <main class="isSSS_Main">
        <span id="IS_AC_RESPONSE">
          <section class="isSSS_FullW isSSS_ShopCart selected">
            <a href="#weekly">Weekly Schedule</a>
          </section>
        </span>
      </main>
    `;

    expect(getAvailablePageTools(document, "home")).toEqual([]);
  });

  it("exposes only exact actionable finance controls in the selected workspace", () => {
    document.body.innerHTML = `
      <main class="isSSS_Main selected">
        <span id="IS_AC_RESPONSE">
          <section id="NYUBursarDisplay">
            <button>View Bursar Balance</button>
            <a href="#account">View Bursar Account (log into eSuite)</a>
            <a href="#statement">Print Official Statement Of Account</a>
          </section>
          <section id="NYUFinancialAidDisplay">
            <h2>View Financial Aid Status</h2>
            <a href="#awards">Accept/Decline Awards</a>
          </section>
        </span>
      </main>
    `;
    const account = document.querySelector<HTMLAnchorElement>(
      'a[href="#account"]',
    );
    const click = vi.fn((event: Event) => event.preventDefault());
    account?.addEventListener("click", click);

    expect(
      getAvailablePageTools(document, "finances").map(({ id, label }) => ({
        id,
        label,
      })),
    ).toEqual([
      { id: "bursar-balance", label: "Check Account Balance" },
      { id: "bursar-account", label: "Pay Tuition & View Bills" },
      { id: "account-statement", label: "Get Account Statement" },
    ]);
    expect(openNativePageTool(document, "bursar-account")).toBe(true);
    expect(click).toHaveBeenCalledOnce();
    expect(openNativePageTool(document, "financial-aid-status")).toBe(false);
  });

  it("focuses one verified native financial-aid section when no direct status link exists", () => {
    document.body.innerHTML = `
      <section
        data-better-albert-region="aid-section"
        tabindex="-1"
      >
        <h2>Financial aid</h2>
        <p>Native award details remain here.</p>
      </section>
    `;
    const nativeAidSection = document.querySelector<HTMLElement>(
      '[data-better-albert-region="aid-section"]',
    );

    expect(
      getAvailablePageTools(document, "finances").map(({ id }) => id),
    ).toEqual(["financial-aid-status"]);
    expect(openNativePageTool(document, "financial-aid-status")).toBe(true);
    expect(document.activeElement).toBe(nativeAidSection);
    expect(nativeAidSection?.textContent).toContain(
      "Native award details remain here.",
    );
  });

  it("omits an ambiguous financial-aid section fallback", () => {
    document.body.innerHTML = `
      <section data-better-albert-region="aid-section" tabindex="-1"></section>
      <section data-better-albert-region="aid-section" tabindex="-1"></section>
    `;

    expect(getAvailablePageTools(document, "finances")).toEqual([]);
    expect(openNativePageTool(document, "financial-aid-status")).toBe(false);
  });

  it("ignores finance controls outside the selected workspace", () => {
    document.body.innerHTML = `
      <main class="isSSS_Main">
        <span id="IS_AC_RESPONSE">
          <section id="NYUBursarDisplay">
            <a href="#balance">View Bursar Balance</a>
          </section>
        </span>
      </main>
    `;

    expect(getAvailablePageTools(document, "finances")).toEqual([]);
    expect(openNativePageTool(document, "bursar-balance")).toBe(false);
  });

  it("presents Academics tools as student jobs and delegates to native Albert labels", () => {
    document.body.innerHTML = `
      <section class="is_bb_LinkContainer">
        <a href="#planner">Academic Planner</a>
        <a href="#advisor">Schedule an Advisor Appointment</a>
        <a href="#degree">Degree Progress Report</a>
        <a href="#what-if">What If Report</a>
        <a href="#graduation">View My Graduation Status</a>
      </section>
    `;
    const nativePlanner = document.querySelector<HTMLAnchorElement>(
      'a[href="#planner"]',
    );
    const nativePlannerClick = vi.fn((event: Event) => event.preventDefault());
    nativePlanner?.addEventListener("click", nativePlannerClick);

    expect(
      getAvailablePageTools(document, "academics").map(({ id, label }) => ({
        id,
        label,
      })),
    ).toEqual([
      { id: "academic-planner", label: "Plan Future Courses" },
      { id: "advisor-appointment", label: "Schedule Advisor Meeting" },
      { id: "degree-progress", label: "Check Degree Progress" },
      { id: "what-if-report", label: "Explore Another Program" },
      { id: "graduation-status", label: "Check Graduation Status" },
    ]);
    expect(openNativePageTool(document, "academic-planner")).toBe(true);
    expect(nativePlannerClick).toHaveBeenCalledOnce();
  });

  it("presents Grades tools as student jobs and delegates to native Albert labels", () => {
    document.body.innerHTML = `
      <section class="is_bb_LinkContainer">
        <a href="#verification">Enrollment Verification</a>
        <a href="#myhub-verification">MyHub-Enrollment Verification</a>
        <a href="#scores">Test Scores</a>
        <a href="#transcript">Transcripts Unofficial</a>
        <a href="#transfer">Transfer Credit Report</a>
      </section>
    `;
    const nativeTranscript = document.querySelector<HTMLAnchorElement>(
      'a[href="#transcript"]',
    );
    const nativeTranscriptClick = vi.fn((event: Event) => event.preventDefault());
    nativeTranscript?.addEventListener("click", nativeTranscriptClick);

    expect(
      getAvailablePageTools(document, "grades").map(({ id, label }) => ({
        id,
        label,
      })),
    ).toEqual([
      { id: "enrollment-verification", label: "Proof of Enrollment" },
      {
        id: "myhub-enrollment-verification",
        label: "Share Enrollment in MyHub",
      },
      { id: "test-scores", label: "View Test Scores" },
      { id: "unofficial-transcript", label: "Get Unofficial Transcript" },
      { id: "transfer-credit", label: "Review Transfer Credit" },
    ]);
    expect(openNativePageTool(document, "unofficial-transcript")).toBe(true);
    expect(nativeTranscriptClick).toHaveBeenCalledOnce();
  });

  it("exposes exact Personal Info edit controls from adapted selected sections", () => {
    document.body.innerHTML = `
      <main class="isSSS_Main selected">
        <span id="IS_AC_RESPONSE">
          <section class="is_bb_LinkContainer">
            <a href="#demographic">Demographic Information</a>
          </section>
          <section data-better-albert-region="address-section">
            <h2>Addresses</h2>
            <a href="#addresses">Edit Addresses</a>
          </section>
          <section data-better-albert-region="phone-section">
            <h2>Phone Numbers</h2>
            <a href="#phones">Edit Phone Numbers</a>
          </section>
          <section data-better-albert-region="email-section">
            <h2>Email Addresses</h2>
            <a href="#emails">Edit Email Addresses</a>
          </section>
          <section data-better-albert-region="emergency-section">
            <h2>Emergency Contacts</h2>
            <a href="#emergency">Edit Emergency Contacts</a>
          </section>
        </span>
      </main>
    `;
    const nativeAddressLink = document.querySelector<HTMLAnchorElement>(
      'a[href="#addresses"]',
    );
    const nativeAddressClick = vi.fn((event: Event) => event.preventDefault());
    nativeAddressLink?.addEventListener("click", nativeAddressClick);

    expect(
      getAvailablePageTools(document, "personal").map(({ id, label }) => ({
        id,
        label,
      })),
    ).toEqual([
      {
        id: "demographic-information",
        label: "Review Personal Details",
      },
      { id: "addresses", label: "Update Addresses" },
      { id: "phone-numbers", label: "Update Phone Numbers" },
      { id: "email-addresses", label: "Update Email Addresses" },
      { id: "emergency-contacts", label: "Update Emergency Contacts" },
    ]);
    expect(openNativePageTool(document, "addresses")).toBe(true);
    expect(nativeAddressClick).toHaveBeenCalledOnce();
  });

  it("exposes the exact advisor action from the adapted advising section", () => {
    document.body.innerHTML = `
      <main class="isSSS_Main selected">
        <span id="IS_AC_RESPONSE">
          <section data-better-albert-region="advising-section">
            <h2>My Advising Network</h2>
            <a href="#advisor">Schedule an Advisor Appointment</a>
          </section>
        </span>
      </main>
    `;

    expect(
      getAvailablePageTools(document, "academics").map(({ id }) => id),
    ).toEqual(["advisor-network", "advisor-appointment"]);
  });

  it("focuses a unique advising network without copying advisor details", () => {
    document.body.innerHTML = `
      <main class="isSSS_Main selected">
        <span id="IS_AC_RESPONSE">
          <section
            data-better-albert-region="advising-section"
            tabindex="-1"
          >
            <h2>My Advising Network</h2>
            <p>Private advisor details stay in Albert.</p>
            <a href="#advisor">Schedule an Advisor Appointment</a>
          </section>
        </span>
      </main>
    `;
    const advisingSection = document.querySelector<HTMLElement>(
      '[data-better-albert-region="advising-section"]',
    );

    expect(openNativePageTool(document, "advisor-network")).toBe(true);
    expect(document.activeElement).toBe(advisingSection);
    expect(document.body.textContent).toContain(
      "Private advisor details stay in Albert.",
    );
  });

  it("omits advisor discovery when the advising region is ambiguous", () => {
    document.body.innerHTML = `
      <main class="isSSS_Main selected">
        <span id="IS_AC_RESPONSE">
          <section data-better-albert-region="advising-section"></section>
          <section data-better-albert-region="advising-section"></section>
        </span>
      </main>
    `;

    expect(
      getAvailablePageTools(document, "academics").map(({ id }) => id),
    ).not.toContain("advisor-network");
    expect(openNativePageTool(document, "advisor-network")).toBe(false);
  });

  it("ignores tools hidden by the native page", () => {
    document.querySelector(".is_bb_LinkContainer")?.setAttribute("hidden", "");
    expect(getAvailablePageTools(document, "home")).toEqual([]);
  });

  it("exposes hidden native resource links and delegates to the exact anchor", () => {
    document.body.innerHTML = nativeResourceMenu(`
      <li><a href="#calendar">Academic Calendar</a></li>
      <li><a href="#feedback">Course Feedback Results</a></li>
      <li><a href="#ferpa">FERPA</a></li>
      <li><a href="#replacement">Replacement Diploma</a></li>
      <li><a href="#registrar">University Registrar</a></li>
      <li><a href="#brightspace">NYU Brightspace</a></li>
      <li><a href="#connect">NYU Connect</a></li>
      <li><a href="#summer">NYU Summer</a></li>
      <li><a href="#wasserman">Wasserman</a></li>
      <li><a href="#financial-aid">Financial Aid</a></li>
      <li><a href="#card">NYU Card Center</a></li>
      <li><a href="#ogs">OGS</a></li>
      <li><a href="#global">Office of Global Programs</a></li>
      <li><a href="#law-housing">Law Housing</a></li>
      <li><a href="#safety">Campus Safety</a></li>
      <li><a href="#wellness">Wellness Center</a></li>
      <li><a href="#housing">Housing</a></li>
      <li><a href="#student-services">Student Services</a></li>
      <li><a href="#campus-resources">Campus Resources</a></li>
      <li><a href="#academic-support">Academic Support</a></li>
      <li><a href="#student-life">Student Life</a></li>
    `);
    const wellness = document.querySelector<HTMLAnchorElement>(
      'a[href="#wellness"]',
    );
    const click = vi.fn((event: Event) => event.preventDefault());
    wellness?.addEventListener("click", click);

    expect(getAvailableResourceTools(document).map(({ id }) => id)).toEqual([
      "academic-calendar",
      "course-feedback-results",
      "ferpa",
      "replacement-diploma",
      "university-registrar",
      "nyu-brightspace",
      "nyu-connect",
      "nyu-summer",
      "wasserman",
      "financial-aid-resources",
      "nyu-card-center",
      "ogs",
      "office-global-programs",
      "law-housing",
      "campus-safety",
      "wellness-center",
      "housing",
      "student-services",
      "campus-resources",
      "academic-support",
      "student-life",
    ]);
    const nyuConnect = getAvailableResourceTools(document).find(
      ({ id }) => id === "nyu-connect",
    );
    const studentServices = getAvailableResourceTools(document).find(
      ({ id }) => id === "student-services",
    );
    const housing = getAvailableResourceTools(document).find(
      ({ id }) => id === "housing",
    );
    const campusResources = getAvailableResourceTools(document).find(
      ({ id }) => id === "campus-resources",
    );
    const cardCenter = getAvailableResourceTools(document).find(
      ({ id }) => id === "nyu-card-center",
    );
    const ogs = getAvailableResourceTools(document).find(
      ({ id }) => id === "ogs",
    );
    const wasserman = getAvailableResourceTools(document).find(
      ({ id }) => id === "wasserman",
    );
    expect(nyuConnect?.keywords).toContain("student success");
    expect(nyuConnect?.keywords).toEqual(
      expect.arrayContaining([
        "book an appointment with nyu connect",
        "resources for student success",
      ]),
    );
    expect(studentServices?.keywords).not.toContain("student success");
    expect(studentServices?.keywords).toContain("office of the dean of students");
    expect(housing?.keywords).toContain("on campus living");
    expect(housing?.keywords).toEqual(
      expect.arrayContaining([
        "resident assistant",
        "resident assistant application",
        "nyu meal plan",
        "kosher dining",
        "dietary options",
        "food allergen guide and policy",
        "grubhub mobile ordering",
        "explore the halls",
        "intersession housing",
        "off-campus living resources",
        "find a place to stay",
      ]),
    );
    expect(campusResources?.keywords).toEqual(
      expect.arrayContaining([
        "student centers and spaces",
        "gyms and campus recreation",
        "student tech guide",
        "student tech centers",
        "nyu bookstores",
        "wifi streaming and technology",
        "accessibility specialist",
        "group fitness",
        "public transportation discounts",
        "green workplace",
        "students with disabilities",
      ]),
    );
    expect(cardCenter?.keywords).toEqual(
      expect.arrayContaining([
        "campus cash and nyu card",
        "campus cash and nyucard",
      ]),
    );
    expect(ogs?.keywords).toEqual(
      expect.arrayContaining([
        "student visa and immigration",
        "student visa immigration",
        "office of global services",
        "visa information and programs",
        "employment and tax",
        "visa and academic changes",
        "know your rights",
        "understand your legal requirements",
        "international student hub",
        "troubleshooting submitting an online form",
        "get a us visa",
        "transfer to nyu",
        "plan your trip",
        "pre orientation",
        "journey to nyu email series",
      ]),
    );
    expect(wasserman?.keywords).toEqual(
      expect.arrayContaining([
        "social impact career hub",
        "career coaching",
        "handshake",
        "on-campus employment",
        "experiential learning",
        "career hubs",
        "resume guide and samples",
        "cover letter guide and samples",
        "fraudulent job postings",
      ]),
    );
    expect(openNativeResourceTool(document, "wellness-center")).toBe(true);
    const studentLife = getAvailableResourceTools(document).find(
      ({ id }) => id === "student-life",
    );
    expect(studentLife?.keywords).toEqual(
      expect.arrayContaining([
        "intramural and club sports",
        "service opportunities and civic engagement",
        "clubs and organizations",
        "leadership opportunities",
        "volunteer service",
        "commuter students",
        "graduate students",
        "lgbtq students",
        "military students and vets",
        "students with children",
        "centers for connection and community",
        "mindfulnyu",
        "find my club",
        "music ensembles",
        "center for student life",
        "leadership launch",
        "student leadership week",
        "project outreach",
        "nyu service fair",
        "day of service",
      ]),
    );
    expect(
      getAvailableResourceTools(document).find(
        ({ id }) => id === "academic-support",
      )?.keywords,
    ).toEqual(
      expect.arrayContaining([
        "academic tutoring at nyu",
        "university learning centers",
        "writing center",
      ]),
    );
    expect(
      getAvailableResourceTools(document).find(
        ({ id }) => id === "wellness-center",
      )?.keywords,
    ).toEqual(
      expect.arrayContaining([
        "access clinical care",
        "clinical services",
        "get 24/7 support",
        "student health center",
        "find a pop up flu clinic or make an appointment",
        "wellness workshops",
        "tune in to your wellbeing",
        "infuse wellbeing",
        "land in the nest",
        "safety and respect",
        "holistic care",
      ]),
    );
    expect(
      getAvailableResourceTools(document).find(
        ({ id }) => id === "campus-safety",
      )?.keywords,
    ).toEqual(
      expect.arrayContaining([
        "report an incident",
        "report a concern",
        "incident response team",
      ]),
    );
    expect(click).toHaveBeenCalledOnce();
  });

  it("ignores resource lookalikes outside the exact direct submenu boundary", () => {
    document.body.innerHTML = `
      <a href="#outside">Academic Calendar</a>
      ${nativeResourceMenu(`
        <li><div><a href="#nested">University Registrar</a></div></li>
        <li><a href="#housing">Housing</a></li>
      `)}
    `;

    expect(getAvailableResourceTools(document).map(({ id }) => id)).toEqual([
      "housing",
    ]);
    expect(openNativeResourceTool(document, "academic-calendar")).toBe(false);
    expect(openNativeResourceTool(document, "university-registrar")).toBe(
      false,
    );
  });

  it("omits ambiguous or disabled resource controls", () => {
    document.body.innerHTML = nativeResourceMenu(`
      <li><a href="#calendar-one">Academic Calendar</a></li>
      <li><a href="#calendar-two">Academic Calendar</a></li>
      <li><a href="#wellness" aria-disabled="true">Wellness Center</a></li>
      <li><a href="#housing">Housing</a></li>
    `);

    expect(getAvailableResourceTools(document).map(({ id }) => id)).toEqual([
      "housing",
    ]);
    expect(openNativeResourceTool(document, "academic-calendar")).toBe(false);
    expect(openNativeResourceTool(document, "wellness-center")).toBe(false);
  });

  it("fails open when the exact resource submenu is missing or duplicated", () => {
    document.body.innerHTML = `${nativeResourceMenu(
      '<li><a href="#housing-one">Housing</a></li>',
    )}
      <div id="SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR"><ul><li><a href="#housing-two">Housing</a></li></ul></div>
    `;

    expect(getAvailableResourceTools(document)).toEqual([]);
    expect(openNativeResourceTool(document, "housing")).toBe(false);

    document.body.innerHTML = "<main>Native Albert remains available</main>";
    expect(getAvailableResourceTools(document)).toEqual([]);
  });

  it("rejects a singleton resource submenu outside the verified native menu", () => {
    document.body.innerHTML = `
      <nav id="IS_BB_HEADER_MENU">
        <ul>
          <li
            id="MENU_ID_NYU_OTHER_RESOURCES_FLDR"
            onclick="toggleMegaMenu('MENU_ID_NYU_OTHER_RESOURCES_FLDR', 'SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR', 'megaMenuSelected')"
          >
            <a href="#">Other Resources</a>
          </li>
        </ul>
      </nav>
      <main>
        <div id="SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR">
          <ul><li><a href="#housing-lookalike">Housing</a></li></ul>
        </div>
      </main>
    `;

    expect(getAvailableResourceTools(document)).toEqual([]);
    expect(openNativeResourceTool(document, "housing")).toBe(false);
  });
});
