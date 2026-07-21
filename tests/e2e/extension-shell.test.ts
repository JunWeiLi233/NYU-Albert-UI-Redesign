import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  chromium,
  expect,
  test,
  type BrowserContext,
  type Page,
  type Worker,
} from "@playwright/test";

const PORTAL_URL =
  "https://sis.portal.nyu.edu/psp/ihprod/EMPLOYEE/EMPL/?cmd=start";
const LOGIN_LAUNCHER_URL = "https://albert.nyu.edu/albert_index.html";
const DEEP_PAGE_URL =
  "https://sis.portal.nyu.edu/psp/ihprod_newwin/EMPLOYEE/SA/c/example?cmd=uninav&uninavpath=Root.NYU_SSS_HIDDEN.Academics";
const SAME_ORIGIN_CHILD_URL =
  "https://sis.portal.nyu.edu/psc/ihprod/EMPLOYEE/SA/c/SSR_STUDENT_FL.SSR_MD_SP_FL.GBL";
const CLASS_SEARCH_URL =
  "https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR_FL.NYU_SSENRL_CART_FL.GBL";
const HEADER_HOST_SELECTOR = "#better-albert-header-host";
const ENABLED_PREFERENCE_KEY = "betterAlbert.enabled";
const extensionPath = resolve(process.cwd(), "dist");
const fixturePath = resolve(
  process.cwd(),
  "tests/fixtures/albert-shell.html",
);
const deepFixturePath = resolve(
  process.cwd(),
  "tests/fixtures/albert-deep-page.html",
);
const classSearchFixturePath = resolve(
  process.cwd(),
  "tests/fixtures/albert-class-search.html",
);
const legacyClassSearchFixturePath = resolve(
  process.cwd(),
  "tests/fixtures/albert-class-search-legacy.html",
);

let context: BrowserContext;
let page: Page;
let userDataDirectory: string;
let fixtureHtml: string;
let deepFixtureHtml: string;
let classSearchFixtureHtml: string;
let legacyClassSearchFixtureHtml: string;
let familyFixtureHtml: {
  academics: string;
  finances: string;
  grades: string;
  personal: string;
};

async function extensionWorker(): Promise<Worker> {
  const existingWorker = context.serviceWorkers()[0];
  return existingWorker ?? context.waitForEvent("serviceworker");
}

async function routeSanitizedFixture(): Promise<void> {
  await context.route(PORTAL_URL, async (route) => {
    await route.fulfill({
      body: fixtureHtml,
      contentType: "text/html; charset=utf-8",
      headers: {
        "content-security-policy": "default-src 'none'",
      },
      status: 200,
    });
  });
}

test.beforeAll(async () => {
  fixtureHtml = await readFile(fixturePath, "utf8");
  deepFixtureHtml = await readFile(deepFixturePath, "utf8");
  classSearchFixtureHtml = await readFile(classSearchFixturePath, "utf8");
  legacyClassSearchFixtureHtml = await readFile(
    legacyClassSearchFixturePath,
    "utf8",
  );
  familyFixtureHtml = Object.fromEntries(
    await Promise.all(
      ["academics", "grades", "finances", "personal"].map(
        async (family) => [
          family,
          await readFile(
            resolve(process.cwd(), `tests/fixtures/families/${family}.html`),
            "utf8",
          ),
        ],
      ),
    ),
  ) as typeof familyFixtureHtml;
});

test.beforeEach(async () => {
  userDataDirectory = await mkdtemp(join(tmpdir(), "better-albert-e2e-"));
  context = await chromium.launchPersistentContext(userDataDirectory, {
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
    channel: "chromium",
    headless: true,
    viewport: { height: 800, width: 1280 },
  });
  page = context.pages()[0] ?? (await context.newPage());
});

test.afterEach(async () => {
  await context?.close();
  await rm(userDataDirectory, { force: true, recursive: true });
});

test("mounts an accessible page-aware shell and computed native theme", async () => {
  const unexpectedHttpRequests: string[] = [];
  page.on("request", (request) => {
    if (/^https?:/i.test(request.url()) && request.url() !== PORTAL_URL) {
      unexpectedHttpRequests.push(request.url());
    }
  });
  await routeSanitizedFixture();
  await page.goto(PORTAL_URL);

  const host = page.locator(HEADER_HOST_SELECTOR);
  const banner = page.getByRole("banner", { name: "Better Albert" });
  const disableButton = page.getByRole("button", {
    name: "Disable",
  });

  await expect(host).toHaveCount(1);
  await expect(banner).toBeVisible();
  await expect(page.locator(".ba-shell")).toHaveCSS(
    "background-color",
    "rgb(87, 6, 140)",
  );
  await expect(page.locator(".ba-product-name")).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );
  await expect(page.locator("#albert-native-content")).toBeVisible();
  await expect(
    page.getByRole("button", { exact: true, name: "Home" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("button", { exact: true, name: "Course Search" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { exact: true, name: "Academic Calendar" }),
  ).toBeVisible();
  await expect(page.locator(".ba-primary-label")).toHaveText("Student services");
  await expect(page.locator(".ba-tool-nav .ba-tool-label")).toHaveText(
    "Quick access",
  );
  await expect(page.locator(".ba-resource-nav .ba-tool-label")).toHaveText(
    "NYU resources",
  );
  await expect(
    page.locator(".ba-nav-hint", {
      hasText: "Plan classes and degree progress",
    }),
  ).toBeVisible();
  await expect(
    page.locator(".ba-tool-description", {
      hasText: "Find classes for an upcoming term",
    }),
  ).toBeVisible();
  await expect(page.locator(".is_bb_LinkContainer")).toHaveCSS(
    "display",
    "grid",
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-better-albert-enabled",
    "",
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-better-albert-adapter",
    "family-home",
  );
  await expect(page.locator("#albert-native-content")).toHaveCSS(
    "display",
    "block",
  );
  await expect(page.locator("#IS_BB_HEADER_WRAPPER")).toBeVisible();
  await expect(page.locator("#NYU_ALBERT_LOGO")).toHaveCSS("display", "none");
  await expect(page.locator("#IS_BB_HEADER_MENU")).toHaveCSS(
    "display",
    "block",
  );
  expect(
    await page.locator("#IS_BB_HEADER_MENU").evaluate((menu) =>
      Math.round(menu.getBoundingClientRect().height),
    ),
  ).toBe(0);
  expect(
    await page
      .locator(
        "#IS_BB_HEADER_MENU > :not(#SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR)",
      )
      .evaluateAll((children) =>
        children.every(
          (child) => getComputedStyle(child).display === "none",
        ),
      ),
  ).toBe(true);
  await expect(
    page.locator("#SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR"),
  ).toBeHidden();
  expect(
    await page.locator("#ptbr_header_container, #NYU_DEFAULT_HEADER").evaluateAll(
      (elements) =>
        elements.map((element) =>
          Math.round(element.getBoundingClientRect().height),
        ),
    ),
  ).toEqual([60, 60]);
  expect(
    await page.locator("#Header_Container").evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        height: Math.round(bounds.height),
        left: Math.round(bounds.left),
        right: Math.round(bounds.right),
      };
    }),
  ).toEqual({ height: 60, left: 264, right: 1280 });
  expect(
    await page.locator(HEADER_HOST_SELECTOR).evaluate((element) =>
      Math.round(element.getBoundingClientRect().width),
    ),
  ).toBe(264);
  await expect(page.locator("body")).toHaveCSS("padding-left", "0px");
  expect(
    await page.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor),
  ).toBe("rgb(247, 247, 247)");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Skip to Albert content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#albert-native-content")).toBeFocused();

  const devtoolsSession = await context.newCDPSession(page);
  await devtoolsSession.send("Emulation.setPageScaleFactor", {
    pageScaleFactor: 2,
  });
  await expect
    .poll(() => page.evaluate(() => window.visualViewport?.scale))
    .toBe(2);
  await expect(disableButton).toBeVisible();
  await devtoolsSession.send("Emulation.setPageScaleFactor", {
    pageScaleFactor: 1,
  });

  for (const [width, expectedHostWidth, expectedWorkspaceLeft] of [
    [1440, 264, 264],
    [1200, 264, 264],
    [1199, 264, 264],
    [900, 264, 264],
    [899, 899, 0],
    [768, 768, 0],
  ] as const) {
    await page.setViewportSize({ height: 800, width });
    expect(
      await page.locator(HEADER_HOST_SELECTOR).evaluate((element) =>
        Math.round(element.getBoundingClientRect().width),
      ),
    ).toBe(expectedHostWidth);
    await expect(page.locator("body")).toHaveCSS("padding-left", "0px");
    expect(
      await page.locator("body").evaluate((body) => {
        const bounds = body.getBoundingClientRect();
        return {
          left: Math.round(bounds.left),
          right: Math.round(bounds.right),
        };
      }),
    ).toEqual({ left: 0, right: width });
    expect(
      await page
        .locator('[data-better-albert-layout="portal-workspace"]')
        .evaluate((workspace) => {
          const bounds = workspace.getBoundingClientRect();
          return {
            left: Math.round(bounds.left),
            right: Math.round(bounds.right),
          };
        }),
    ).toEqual({ left: expectedWorkspaceLeft, right: width });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(0);
  }

  await page.setViewportSize({ height: 800, width: 400 });
  await expect(disableButton).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("padding-left", "0px");
  expect(
    await page.locator(HEADER_HOST_SELECTOR).evaluate((element) =>
      Math.round(element.getBoundingClientRect().width),
    ),
  ).toBe(400);
  await expect(
    page.getByRole("button", { exact: true, name: "Academics" }),
  ).toHaveCSS("color", "rgb(11, 11, 11)");
  await expect(
    page.getByRole("button", { exact: true, name: "Course Search" }),
  ).toHaveCSS("color", "rgb(11, 11, 11)");
  await expect(page.locator(".ba-primary-label")).toBeHidden();
  await expect(page.locator(".ba-nav-hint").first()).toBeHidden();
  await expect(page.locator(".ba-tool-description").first()).toBeHidden();
  await expect(
    page.getByText("Unofficial · Local only", { exact: true }),
  ).toBeVisible();
  const extensionTargetHeights = await page
    .locator(".ba-disable-button, .ba-nav-item, .ba-tool-item")
    .evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().height),
    );
  expect(Math.min(...extensionTargetHeights)).toBeGreaterThanOrEqual(44);
  const mobileWorkspaceColumns = await page
    .locator("#albert-native-content")
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  expect(mobileWorkspaceColumns.trim().split(/\s+/)).toHaveLength(1);
  await devtoolsSession.send("Emulation.setPageScaleFactor", {
    pageScaleFactor: 2,
  });
  await expect(disableButton).toBeVisible();
  await devtoolsSession.send("Emulation.setPageScaleFactor", {
    pageScaleFactor: 1,
  });
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(0);
  const worker = await extensionWorker();
  const storedValues = await worker.evaluate(async () => chrome.storage.local.get());
  expect(storedValues).toEqual({ [ENABLED_PREFERENCE_KEY]: true });
  expect(JSON.stringify(storedValues)).not.toMatch(
    /schedule|grade|balance|student name|native_token/i,
  );
  expect(unexpectedHttpRequests).toEqual([]);
  await devtoolsSession.detach();
});

test("exposes mobile task explanations and delegates through native Albert controls", async () => {
  await routeSanitizedFixture();
  await page.goto(PORTAL_URL);

  const taskFinderToggle = page.getByRole("button", { name: "Find a task" });
  const taskFinder = page.getByRole("region", { name: "Find a task" });
  const closeTaskFinder = page.getByRole("button", {
    name: "Close task finder",
  });

  await expect(taskFinderToggle).toBeHidden();
  await expect(taskFinder).toBeHidden();

  for (const width of [899, 768, 400, 200] as const) {
    await page.setViewportSize({ height: 800, width });
    await expect(taskFinderToggle).toBeVisible();
    await expect(taskFinderToggle).toHaveAttribute("aria-expanded", "false");
    expect(
      await taskFinderToggle.evaluate((button) =>
        Math.round(button.getBoundingClientRect().height),
      ),
    ).toBeGreaterThanOrEqual(44);

    await taskFinderToggle.focus();
    await taskFinderToggle.press("Enter");
    await expect(taskFinderToggle).toHaveAttribute("aria-expanded", "true");
    await expect(taskFinder).toBeVisible();
    await expect(closeTaskFinder).toBeFocused();
    await expect(
      taskFinder.getByText("Plan classes and degree progress", {
        exact: true,
      }),
    ).toBeVisible();
    const academicsTask = taskFinder.getByRole("button", {
      exact: true,
      name: "Open Academics — Plan classes and degree progress",
    });
    await expect(academicsTask.locator("strong")).toHaveText(
      "Plan classes and degree progress",
    );
    await expect(
      academicsTask.locator(".ba-task-finder-item-copy > span"),
    ).toHaveText("Academics · Albert area");
    await expect(
      taskFinder.getByText("Find classes for an upcoming term", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(taskFinder.locator(".ba-task-finder-area")).toHaveCount(6);
    await expect(taskFinder.locator(".ba-task-finder-tool")).toHaveCount(2);
    await expect(taskFinder.locator(".ba-task-finder-resource")).toHaveCount(4);
    await expect(
      taskFinder.getByText("Find NYU health and wellness support", {
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await taskFinder
        .locator(".ba-task-finder-item")
        .evaluateAll((items) =>
          Math.min(
            ...items.map((item) => item.getBoundingClientRect().height),
          ),
        ),
    ).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(0);

    await closeTaskFinder.press("Escape");
    await expect(taskFinderToggle).toHaveAttribute("aria-expanded", "false");
    await expect(taskFinder).toBeHidden();
    await expect(taskFinderToggle).toBeFocused();
  }

  await page.setViewportSize({ height: 376, width: 400 });
  const nativeSkipWrapper = page.locator("#skiptocontent");
  const nativeSkip = page.locator('#skiptocontent > a[href="#jumptomaincontent"]');
  const expectNativeSkipClipped = async (): Promise<void> => {
    expect(
      await nativeSkipWrapper.evaluate((wrapper) => {
        const bounds = wrapper.getBoundingClientRect();
        const style = getComputedStyle(wrapper);
        return {
          clipPath: style.clipPath,
          height: Math.round(bounds.height),
          overflow: style.overflow,
          width: Math.round(bounds.width),
        };
      }),
    ).toEqual({
      clipPath: "inset(50%)",
      height: 1,
      overflow: "hidden",
      width: 1,
    });
  };
  await expectNativeSkipClipped();

  await taskFinderToggle.press("Enter");
  const housingTask = taskFinder.getByRole("button", {
    exact: true,
    name: "Open Housing",
  });
  await housingTask.scrollIntoViewIfNeeded();
  await expect(housingTask).toBeVisible();
  await expectNativeSkipClipped();
  await closeTaskFinder.press("Escape");

  await nativeSkip.evaluate((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.dataset.nativeSkipActivated = "true";
    });
  });
  await nativeSkip.focus();
  await expect(nativeSkip).toBeFocused();
  await expect(nativeSkip).toBeVisible();
  expect(
    await nativeSkip.evaluate((link) =>
      Math.round(link.getBoundingClientRect().height),
    ),
  ).toBeGreaterThanOrEqual(44);
  await nativeSkip.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-skip-activated",
    "true",
  );

  await page.setViewportSize({ height: 800, width: 400 });
  await page.locator('a[href="/fixture-academics"]').evaluate((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.dataset.nativeTaskFinderNavigation = "academics";
    });
  });
  await page.locator('a[href="/fixture-course-search"]').evaluate((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.dataset.nativeTaskFinderTool = "course-search";
    });
  });
  await page
    .locator(
      '#SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR > ul > li > a[href="/fixture-wellness"]',
    )
    .evaluate((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        document.body.dataset.nativeTaskFinderResource = "wellness";
      });
    });

  await taskFinderToggle.press("Enter");
  await taskFinder
    .getByRole("button", {
      exact: true,
      name: "Open Academics — Plan classes and degree progress",
    })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-navigation",
    "academics",
  );
  await expect(taskFinder).toBeHidden();

  await taskFinderToggle.press("Enter");
  await taskFinder
    .getByRole("button", { exact: true, name: "Open Wellness Center" })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-resource",
    "wellness",
  );
  await expect(taskFinder).toBeHidden();

  await taskFinderToggle.press("Enter");
  await taskFinder
    .getByRole("button", { exact: true, name: "Open Course Search" })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-tool",
    "course-search",
  );
  await expect(taskFinder).toBeHidden();

  await taskFinderToggle.press("Enter");
  await taskFinder
    .getByRole("button", {
      exact: true,
      name: "Open Academics — Plan classes and degree progress",
    })
    .focus();
  await page.evaluate(() => {
    document
      .querySelector('[aria-current="page"]')
      ?.removeAttribute("aria-current");
    document
      .querySelector('a[href="/fixture-finances"]')
      ?.setAttribute("aria-current", "page");
  });
  await expect(
    page.getByRole("button", { exact: true, name: "Finances" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(taskFinder).toBeHidden();
  await expect(taskFinderToggle).toBeFocused();

  await taskFinderToggle.press("Enter");
  await page.evaluate(() => {
    const dialog = document.querySelector<HTMLElement>("#pt_modals");
    const mask = document.querySelector<HTMLElement>("#pt_modalMaskCover");
    const returnButton = dialog?.querySelector<HTMLButtonElement>("button");
    dialog?.removeAttribute("hidden");
    mask?.removeAttribute("hidden");
    document.body.classList.add("iLightboxOpen");
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        document.body.dataset.nativeModalEscapeDefaultPrevented = String(
          event.defaultPrevented,
        );
      }
    });
    returnButton?.focus();
  });
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-modal-escape-default-prevented",
    "false",
  );
});

test("isolates desktop workspace overflow without obscuring native overlays", async () => {
  await page.setViewportSize({ height: 800, width: 1440 });
  await routeSanitizedFixture();
  await page.goto(PORTAL_URL);

  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCSS("left", "0px");
  await expect(page.locator("body")).toHaveCSS("position", "static");
  await expect(page.locator("body")).toHaveCSS("left", "auto");
  await expect(page.locator("body")).toHaveCSS("padding-left", "0px");
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCSS("z-index", "90");
  const portalWorkspace = page.locator(
    '[data-better-albert-layout="portal-workspace"]',
  );
  await expect(portalWorkspace).toHaveCSS("overflow-x", "auto");
  expect(
    await portalWorkspace.evaluate((workspace) => {
      const bounds = workspace.getBoundingClientRect();
      return { left: Math.round(bounds.left), right: Math.round(bounds.right) };
    }),
  ).toEqual({ left: 264, right: 1440 });

  const overlayGeometry = await page.evaluate(() => {
    const ordinaryNativeLayer = document.createElement("div");
    ordinaryNativeLayer.id = "synthetic-native-layer";
    ordinaryNativeLayer.style.cssText =
      "position:fixed;z-index:5;inset:12px auto auto 18px;width:40px;height:40px;background:#fff;pointer-events:auto";
    document.body.append(ordinaryNativeLayer);
    const ordinaryTopElementId = document.elementFromPoint(30, 30)?.id ?? "";
    const fixedOverlay = document.createElement("div");
    fixedOverlay.id = "synthetic-fixed-overlay";
    fixedOverlay.style.cssText =
      "position:fixed;z-index:100;inset:12px auto auto 18px;width:40px;height:40px;background:#fff;pointer-events:auto";
    const absoluteOverlay = document.createElement("div");
    absoluteOverlay.id = "synthetic-absolute-overlay";
    absoluteOverlay.style.cssText =
      "position:absolute;inset:24px auto auto 32px;width:40px;height:40px";
    const overflowProbe = document.createElement("div");
    overflowProbe.id = "synthetic-overflow-probe";
    overflowProbe.style.cssText =
      "width:calc(100% + 264px);height:1px";
    const workspace = document.querySelector<HTMLElement>(
      '[data-better-albert-layout="portal-workspace"]',
    );
    if (!workspace) {
      throw new Error("Sanitized portal workspace is unavailable");
    }
    document.body.append(fixedOverlay, absoluteOverlay);
    workspace.append(overflowProbe);
    return {
      absoluteLeft: Math.round(absoluteOverlay.getBoundingClientRect().left),
      fixedLeft: Math.round(fixedOverlay.getBoundingClientRect().left),
      ordinaryTopElementId,
      topElementId: document.elementFromPoint(30, 30)?.id ?? "",
    };
  });
  expect(overlayGeometry).toEqual({
    absoluteLeft: 32,
    fixedLeft: 18,
    ordinaryTopElementId: HEADER_HOST_SELECTOR.slice(1),
    topElementId: "synthetic-fixed-overlay",
  });

  const localOverflow = await portalWorkspace.evaluate((workspace) => {
    workspace.scrollLeft = workspace.scrollWidth;
    return {
      clientWidth: workspace.clientWidth,
      documentOverflow:
        document.documentElement.scrollWidth - window.innerWidth,
      scrollLeft: workspace.scrollLeft,
      scrollWidth: workspace.scrollWidth,
    };
  });
  expect(localOverflow.scrollWidth).toBeGreaterThan(localOverflow.clientWidth);
  expect(localOverflow.scrollLeft).toBeGreaterThan(0);
  expect(localOverflow.documentOverflow).toBe(0);

  await page.mouse.move(1100, 600);
  await page.mouse.wheel(0, 500);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
  expect(
    await page.locator(HEADER_HOST_SELECTOR).evaluate((host) =>
      Math.round(host.getBoundingClientRect().top),
    ),
  ).toBe(0);
});

test("applies a distinct full-page adapter to every selected Albert workspace", async () => {
  await routeSanitizedFixture();
  await page.goto(PORTAL_URL);

  const families = [
    ["home", fixtureHtml],
    ["academics", familyFixtureHtml.academics],
    ["grades", familyFixtureHtml.grades],
    ["finances", familyFixtureHtml.finances],
    ["personal", familyFixtureHtml.personal],
  ] as const;
  const expectedRegions = {
    home: [
      "schedule-section",
      "attention-section",
      "enrollment-section",
      "home-tools",
    ],
    academics: [
      "planning-section",
      "degree-section",
      "enrollment-section",
      "graduation-section",
    ],
    grades: [
      "reports-directory",
      "term-selector",
      "term-navigation",
      "record-section",
    ],
    finances: ["account-section", "aid-section"],
    personal: [
      "profile-directory",
      "address-section",
      "phone-section",
      "email-section",
      "emergency-section",
      "missing-person-section",
      "citizenship-section",
      "identifier-section",
    ],
  } as const;

  for (const [family, html] of families) {
    await page.evaluate((fixtureSource) => {
      const parsed = new DOMParser().parseFromString(fixtureSource, "text/html");
      document.title = parsed.title;
      document.body.className = parsed.body.className;
      document.body.innerHTML = parsed.body.innerHTML;
    }, html);

    await expect(page.locator("html")).toHaveAttribute(
      "data-better-albert-adapter",
      `family-${family}`,
    );
    await expect(page.locator('[data-better-albert-region="workspace"]')).toHaveCount(1);
    if (family === "finances") {
      await expect(
        page.locator('[data-better-albert-region="directory"]'),
      ).toHaveCount(0);
    } else {
      await expect(
        page.locator('[data-better-albert-region="directory"]'),
      ).not.toHaveCount(0);
    }
    for (const region of expectedRegions[family]) {
      await expect(
        page.locator(`[data-better-albert-region="${region}"]`),
      ).not.toHaveCount(0);
    }
    await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCount(1);
    await expect(page.locator(".ba-resource-item")).toHaveCount(4);
    const currentArea = page
      .locator(HEADER_HOST_SELECTOR)
      .locator('.ba-primary-nav [aria-current="page"]');
    await expect(currentArea).toHaveCount(1);

    for (const width of [200, 400, 600, 768, 899, 900, 1200, 1440] as const) {
      await page.setViewportSize({ height: 900, width });
      const alignment = await page.evaluate(() => {
        const bodyBounds = document.body.getBoundingClientRect();
        const workspace = document.querySelector<HTMLElement>(
          '[data-better-albert-region="workspace"]',
        );
        const workspaceBounds = workspace?.getBoundingClientRect();
        const content = document.querySelector<HTMLElement>(
          '[data-better-albert-layout="family-content"]',
        );
        const contentBounds = content?.getBoundingClientRect();
        const directRegions = content
          ? Array.from(content.children)
              .filter((element): element is HTMLElement =>
                element instanceof HTMLElement &&
                element.hasAttribute("data-better-albert-region"),
              )
              .map((element) => element.getBoundingClientRect())
              .filter((bounds) => bounds.width > 0 && bounds.height > 0)
          : [];
        const overlappingRegionPairs: number[][] = [];
        directRegions.forEach((first, firstIndex) => {
          directRegions.slice(firstIndex + 1).forEach((second, offset) => {
            const overlapWidth =
              Math.min(first.right, second.right) -
              Math.max(first.left, second.left);
            const overlapHeight =
              Math.min(first.bottom, second.bottom) -
              Math.max(first.top, second.top);
            if (overlapWidth > 1 && overlapHeight > 1) {
              overlappingRegionPairs.push([firstIndex, firstIndex + offset + 1]);
            }
          });
        });

        return {
          bodyLeft: Math.round(bodyBounds.left),
          bodyRight: Math.round(bodyBounds.right),
          columns: content
            ? getComputedStyle(content).gridTemplateColumns.trim().split(/\s+/)
                .length
            : 0,
          contentLeft: Math.round(contentBounds?.left ?? -1),
          contentRight: Math.round(contentBounds?.right ?? -1),
          documentOverflow:
            document.documentElement.scrollWidth - window.innerWidth,
          overflowRegions: directRegions.filter(
            (bounds) =>
              bounds.left < (contentBounds?.left ?? 0) - 1 ||
              bounds.right > (contentBounds?.right ?? window.innerWidth) + 1 ||
              bounds.left < -1 ||
              bounds.right > window.innerWidth + 1,
          ).length,
          overlappingRegionPairs,
          workspaceLeft: Math.round(workspaceBounds?.left ?? -1),
          workspaceRight: Math.round(workspaceBounds?.right ?? -1),
        };
      });
      const expectedColumns =
        width < 900 || family === "grades"
          ? 1
          : family === "personal" && width >= 1200
            ? 3
            : 2;
      expect(alignment.bodyLeft).toBe(0);
      expect(alignment.bodyRight).toBe(width);
      expect(alignment.columns).toBe(expectedColumns);
      expect(
        alignment.documentOverflow,
        `${family} document overflow at ${width}px`,
      ).toBe(0);
      expect(
        alignment.overflowRegions,
        `${family} region overflow at ${width}px`,
      ).toBe(0);
      expect(
        alignment.overlappingRegionPairs,
        `${family} region overlap at ${width}px`,
      ).toEqual([]);
      expect(alignment.workspaceLeft).toBeGreaterThanOrEqual(
        width >= 900 ? 264 : 0,
      );
      expect(alignment.workspaceRight).toBeLessThanOrEqual(width);
      expect(alignment.contentLeft).toBeGreaterThanOrEqual(
        alignment.workspaceLeft,
      );
      expect(alignment.contentRight).toBeLessThanOrEqual(
        alignment.workspaceRight,
      );
      if (width >= 1200) {
        expect(alignment.contentRight - alignment.contentLeft).toBeGreaterThan(
          700,
        );
      }
    }
  }
});

test("keeps the direct legacy family fallback aligned", async () => {
  await page.setViewportSize({ height: 800, width: 1280 });
  await routeSanitizedFixture();
  await page.goto(PORTAL_URL);
  await page.evaluate((fixtureSource) => {
    const parsed = new DOMParser().parseFromString(fixtureSource, "text/html");
    const workspace = parsed.querySelector(".isSSS_Main.selected");
    const content = parsed.querySelector(
      "#IS_AC_RESPONSE > .ptprtlcontainer > .isDS_Section",
    );
    if (!workspace || !content) {
      throw new Error("Sanitized direct-family fixture could not be prepared");
    }
    workspace.replaceChildren(
      ...Array.from(content.children, (child) => child.cloneNode(true)),
    );
    document.title = parsed.title;
    document.body.innerHTML = parsed.body.innerHTML;
  }, familyFixtureHtml.academics);

  const workspace = page.locator('[data-better-albert-region="workspace"]');
  await expect(page.locator("html")).toHaveAttribute(
    "data-better-albert-adapter",
    "family-academics",
  );
  await expect(workspace).toHaveAttribute(
    "data-better-albert-layout",
    "family-content",
  );
  expect(
    await workspace.evaluate((element) => {
      const titleStyle = getComputedStyle(element, "::before");
      return {
        columns: getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/)
          .length,
        documentOverflow:
          document.documentElement.scrollWidth - window.innerWidth,
        titleColumnEnd: titleStyle.gridColumnEnd,
        titleColumnStart: titleStyle.gridColumnStart,
      };
    }),
  ).toEqual({
    columns: 2,
    documentOverflow: 0,
    titleColumnEnd: "-1",
    titleColumnStart: "1",
  });
});

test("keeps every tool-heavy rail control reachable at a short desktop height", async () => {
  await page.setViewportSize({ height: 420, width: 1280 });
  await routeSanitizedFixture();
  await page.goto(PORTAL_URL);
  await page.evaluate((fixtureSource) => {
    const parsed = new DOMParser().parseFromString(fixtureSource, "text/html");
    document.title = parsed.title;
    document.body.className = parsed.body.className;
    document.body.innerHTML = parsed.body.innerHTML;
  }, familyFixtureHtml.personal);

  await expect(page.locator("html")).toHaveAttribute(
    "data-better-albert-adapter",
    "family-personal",
  );
  const shell = page.locator(".ba-shell");
  await expect(shell).toHaveCSS("overflow-y", "auto");
  expect(
    await shell.evaluate((element) => ({
      hostHeight: Math.round(
        (element.getRootNode() as ShadowRoot).host.getBoundingClientRect().height,
      ),
      shellHeight: Math.round(element.getBoundingClientRect().height),
      viewportHeight: window.innerHeight,
    })),
  ).toEqual({ hostHeight: 420, shellHeight: 420, viewportHeight: 420 });

  const controls = page.locator(
    ".ba-disable-button, .ba-nav-item:not(:disabled), .ba-tool-item, .ba-resource-item",
  );
  expect(await controls.count()).toBe(16);
  for (const control of await controls.all()) {
    await control.evaluate((element) =>
      element.scrollIntoView({ block: "center", inline: "nearest" }),
    );
    await control.focus();
    await expect(control).toBeFocused();
    const bounds = await control.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds?.y ?? -1).toBeGreaterThanOrEqual(0);
    expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThanOrEqual(420);
  }
});

test("persists disablement and remounts when the local preference is enabled", async () => {
  await routeSanitizedFixture();
  await page.goto(PORTAL_URL);

  await page
    .getByRole("button", { name: "Disable" })
    .click();
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-better-albert-enabled",
    "",
  );
  await expect(page.locator("body")).toHaveCSS("position", "static");
  await expect(page.locator("body")).toHaveCSS("left", "auto");
  await expect(page.locator("body")).toHaveCSS("padding-left", "0px");
  await expect(page.locator("#NYU_ALBERT_LOGO")).toBeVisible();
  await expect(page.locator("#IS_BB_HEADER_MENU")).toBeVisible();
  await expect(page.locator("#ptbr_header_container")).toHaveAttribute(
    "style",
    /height:\s*361px/i,
  );
  expect(
    await page
      .locator("#ptbr_header_container")
      .evaluate((element) => Math.round(element.getBoundingClientRect().height)),
  ).not.toBe(60);
  const disabledBodyGeometry = await page.locator("body").evaluate((body) => {
    const bounds = body.getBoundingClientRect();
    return {
      clientWidth: document.documentElement.clientWidth,
      left: Math.round(bounds.left),
      right: Math.round(bounds.right),
    };
  });
  expect(disabledBodyGeometry.left).toBeLessThan(264);
  expect(disabledBodyGeometry.right).toBeLessThanOrEqual(
    disabledBodyGeometry.clientWidth,
  );

  await page.reload();
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCount(0);
  await expect(page.locator("body")).toHaveCSS("position", "static");
  await expect(page.locator("body")).toHaveCSS("left", "auto");
  await expect(page.locator("body")).toHaveCSS("padding-left", "0px");

  const worker = await extensionWorker();
  await worker.evaluate(
    async ({ key }) => chrome.storage.local.set({ [key]: true }),
    { key: ENABLED_PREFERENCE_KEY },
  );
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCount(1);
  await expect(page.locator("body")).toHaveCSS("position", "static");
  await expect(page.locator("body")).toHaveCSS("left", "auto");
  await expect(page.locator("body")).toHaveCSS("padding-left", "0px");
  expect(
    await page
      .locator('[data-better-albert-layout="portal-workspace"]')
      .evaluate((workspace) => Math.round(workspace.getBoundingClientRect().left)),
  ).toBe(264);
});

test("remounts after PeopleSoft removes the extension host and keeps native controls usable", async () => {
  await routeSanitizedFixture();
  await page.goto(PORTAL_URL);

  const firstHost = await page.locator(HEADER_HOST_SELECTOR).evaluate(
    (host) => host.dataset.testIdentity = "first",
  );
  expect(firstHost).toBe("first");
  await page.locator(HEADER_HOST_SELECTOR).evaluate((host) => host.remove());
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCount(1);
  await expect(page.locator(HEADER_HOST_SELECTOR)).not.toHaveAttribute(
    "data-test-identity",
    "first",
  );
  const nativeButton = page.getByRole("button", {
    name: "Native action placeholder",
  });
  await expect(nativeButton).toBeVisible();
  await nativeButton.click();
});

test("selects the rendered Albert response when inactive duplicate roots remain", async () => {
  const duplicateResponseFixture = fixtureHtml.replace(
    '<span class="native-response-wrapper">',
    `<span data-sanitized-inactive-response hidden>
      <div id="IS_AC_RESPONSE"><div class="ptprtlcontainer"><section class="isDS_Section">
        <div class="is_bb_LinkContainer"><div class="is_bb_LinkColumn"><div class="is_bb_LinkItem"><a href="#inactive">Inactive tool</a></div></div></div>
      </section></div></div>
    </span><span class="native-response-wrapper">`,
  );
  await context.route(PORTAL_URL, (route) =>
    route.fulfill({
      body: duplicateResponseFixture,
      contentType: "text/html; charset=utf-8",
      headers: { "content-security-policy": "default-src 'none'" },
    }),
  );
  await page.goto(PORTAL_URL);

  await expect(page.locator("html")).toHaveAttribute(
    "data-better-albert-adapter",
    "family-home",
  );
  await expect(
    page.locator(
      '[data-sanitized-inactive-response] [data-better-albert-layout="family-content"]',
    ),
  ).toHaveCount(0);
  await expect(
    page.locator(
      '.native-response-wrapper [data-better-albert-layout="family-content"]',
    ),
  ).toHaveCount(1);
});

test("delegates shell navigation to the native Albert control", async () => {
  const javascriptUrlCspErrors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /running the javascript url|refused to run the javascript url/i.test(
        message.text(),
      )
    ) {
      javascriptUrlCspErrors.push(message.text());
    }
  });
  await routeSanitizedFixture();
  await page.goto(PORTAL_URL);
  await page.locator('a[href="/fixture-finances"]').evaluate((link) => {
    link.setAttribute("href", "javascript:void(0)");
    link.addEventListener("click", (event) => {
      document.body.dataset.nativeNavigation = "finances";
      document.body.dataset.nativeNavigationDefaultPrevented = String(
        event.defaultPrevented,
      );
    });
  });
  await page.evaluate(() => {
    document.body.style.minHeight = "2000px";
    window.scrollTo(0, 500);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  await page.getByRole("button", { exact: true, name: "Finances" }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-navigation",
    "finances",
  );
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-navigation-default-prevented",
    "true",
  );
  expect(javascriptUrlCspErrors).toEqual([]);
});

test("delegates Other Resources to Albert's native overlay trigger", async () => {
  await routeSanitizedFixture();
  await page.goto(PORTAL_URL);
  await page
    .locator("#MENU_ID_NYU_OTHER_RESOURCES_FLDR")
    .evaluate((trigger) => {
      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        const overlay = document.querySelector<HTMLElement>(
          "#SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR",
        );
        const isOpening = overlay?.hasAttribute("hidden") ?? false;
        if (overlay) {
          overlay.toggleAttribute("hidden", !isOpening);
          overlay.classList.toggle("open", isOpening);
        }
        if (isOpening) {
          document.body.dataset.nativeResourceOverlay = "opened";
        } else {
          document.body.dataset.nativeResourceOverlay = "closed";
        }
      });
    });

  await page
    .getByRole("button", { exact: true, name: "Other Resources" })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-resource-overlay",
    "opened",
  );
  const nativeOverlay = page.locator(
    "#SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR",
  );
  await expect(nativeOverlay).toBeVisible();
  await expect(nativeOverlay).toHaveCSS("position", "fixed");
  const nativeDirectory = nativeOverlay.locator(":scope > ul");
  await expect(nativeDirectory).toHaveCSS("display", "grid");
  expect(
    await nativeDirectory.evaluate((directory) =>
      getComputedStyle(directory).gridTemplateColumns.split(" ").length,
    ),
  ).toBeGreaterThan(1);
  expect(
    await nativeDirectory.locator(":scope > li > a").evaluateAll((links) =>
      links.every((link) => link.getBoundingClientRect().height >= 48),
    ),
  ).toBe(true);
  expect(
    await nativeDirectory
      .locator(":scope > li")
      .first()
      .evaluate((item) => {
        const link = item.querySelector(":scope > a");
        if (!link) {
          return false;
        }
        const itemWidth = item.getBoundingClientRect().width;
        const linkWidth = link.getBoundingClientRect().width;
        return itemWidth >= 200 && Math.abs(itemWidth - linkWidth) < 1;
      }),
  ).toBe(true);
  expect(
    await nativeOverlay.evaluate((overlay) => {
      const bounds = overlay.getBoundingClientRect();
      return {
        bottom: Math.round(bounds.bottom),
        left: Math.round(bounds.left),
        right: Math.round(bounds.right),
        top: Math.round(bounds.top),
      };
    }),
  ).toEqual({ bottom: 800, left: 264, right: 1280, top: 60 });
  await page
    .getByRole("button", { exact: true, name: "Other Resources" })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-resource-overlay",
    "closed",
  );
  await expect(nativeOverlay).toBeHidden();

  await page.setViewportSize({ height: 800, width: 400 });
  await page
    .getByRole("button", { exact: true, name: "Other Resources" })
    .click();
  await expect(nativeOverlay).toBeVisible();
  await expect(nativeOverlay).toHaveCSS("position", "absolute");
  expect(
    await nativeDirectory.evaluate((directory) =>
      getComputedStyle(directory).gridTemplateColumns.split(" ").length,
    ),
  ).toBe(1);
  const mobileOverlayBounds = await nativeOverlay.evaluate((overlay) => {
    const bounds = overlay.getBoundingClientRect();
    return {
      bottom: Math.round(bounds.bottom),
      documentOverflow:
        document.documentElement.scrollWidth - window.innerWidth,
      left: Math.round(bounds.left),
      right: Math.round(bounds.right),
      top: Math.round(bounds.top),
    };
  });
  expect(mobileOverlayBounds.documentOverflow).toBe(0);
  expect(mobileOverlayBounds.left).toBe(0);
  expect(mobileOverlayBounds.right).toBe(400);
  expect(mobileOverlayBounds.top).toBeGreaterThanOrEqual(0);
  expect(mobileOverlayBounds.bottom).toBeLessThanOrEqual(800);
  await page
    .getByRole("button", { exact: true, name: "Other Resources" })
    .click();
  await expect(nativeOverlay).toBeHidden();
});

test("delegates the active page tool to its allowlisted native control", async () => {
  await routeSanitizedFixture();
  await page.goto(PORTAL_URL);
  await page.locator('a[href="/fixture-course-search"]').evaluate((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.dataset.nativeTool = "course-search";
    });
  });

  await page
    .getByRole("button", { exact: true, name: "Course Search" })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-tool",
    "course-search",
  );
});

test("themes a sanitized PeopleSoft report modal without replacing its controls", async () => {
  await routeSanitizedFixture();
  await page.goto(PORTAL_URL);
  await page.evaluate(() => {
    const hiddenContainer = document.createElement("div");
    hiddenContainer.hidden = true;
    const hiddenDialog = document.createElement("div");
    hiddenDialog.setAttribute("role", "dialog");
    hiddenContainer.append(hiddenDialog);
    document.body.append(hiddenContainer);
  });
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-better-albert-native-modal-open",
    "",
  );
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCSS(
    "visibility",
    "visible",
  );
  await expect(page.locator("body")).toHaveCSS("position", "static");
  await expect(page.locator("body")).toHaveCSS("left", "auto");
  await expect(page.locator("body")).toHaveCSS("padding-left", "0px");
  await page.locator("#pt_modalMaskCover, #pt_modals").evaluateAll((elements) => {
    for (const element of elements) {
      element.removeAttribute("hidden");
    }
  });

  await expect(
    page.getByRole("dialog", { name: "Sanitized Albert report" }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute(
    "data-better-albert-native-modal-open",
    "",
  );
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCSS(
    "visibility",
    "hidden",
  );
  await expect(page.locator("body")).toHaveCSS("padding-left", "0px");
  await expect(page.locator("body")).toHaveCSS("position", "static");
  await expect(page.locator("body")).toHaveCSS("left", "auto");
  await expect(page.locator(".ptpopuptitlebar")).toHaveCSS(
    "background-color",
    "rgb(87, 6, 140)",
  );
  await expect(page.locator("#pt_modals")).toHaveAttribute(
    "data-better-albert-readonly-modal",
    "",
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-better-albert-readonly-modal-open",
    "",
  );
  await expect(page.locator("#pt_modalMaskCover")).toHaveCSS(
    "background-color",
    "rgba(11, 11, 11, 0.62)",
  );
  const nativeReturn = page.getByRole("button", { exact: true, name: "Return" });
  await expect(nativeReturn).toBeVisible();
  await nativeReturn.focus();
  await expect(nativeReturn).toBeFocused();
  await nativeReturn.click();

  for (const width of [200, 400, 600, 768, 899, 900, 1200, 1440] as const) {
    await page.setViewportSize({ height: 900, width });
    await expect(nativeReturn).toBeVisible();
    const dialogBounds = await page.locator("#pt_modals").evaluate((dialog) => {
      const bounds = dialog.getBoundingClientRect();
      return {
        documentOverflow:
          document.documentElement.scrollWidth - window.innerWidth,
        left: bounds.left,
        right: bounds.right,
      };
    });
    expect(dialogBounds.documentOverflow).toBe(0);
    expect(dialogBounds.left).toBeGreaterThanOrEqual(0);
    expect(dialogBounds.right).toBeLessThanOrEqual(width);
  }

  await page.locator(".PTPOPUP_TITLE").evaluate((title) => {
    title.textContent = "Enrollment Error";
  });
  await expect(page.locator("#pt_modals")).not.toHaveAttribute(
    "data-better-albert-readonly-modal",
    "",
  );
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-better-albert-readonly-modal-open",
    "",
  );
  await expect(page.locator("#pt_modalMaskCover")).not.toHaveCSS(
    "background-color",
    "rgba(11, 11, 11, 0.62)",
  );
  await expect(page.locator(".ptpopuptitlebar")).not.toHaveCSS(
    "background-color",
    "rgb(87, 6, 140)",
  );
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCSS(
    "visibility",
    "hidden",
  );

  await page.locator("#pt_modalMaskCover, #pt_modals").evaluateAll((elements) => {
    for (const element of elements) {
      element.setAttribute("hidden", "");
    }
  });
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-better-albert-native-modal-open",
    "",
  );
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCSS(
    "visibility",
    "visible",
  );
  await expect(page.locator("body")).toHaveCSS("position", "static");
  await expect(page.locator("body")).toHaveCSS("left", "auto");
  await expect(page.locator("body")).toHaveCSS("padding-left", "0px");
});

test("recognizes and redesigns an explicit student-self-service deep page", async () => {
  const shellWithDeepPageLink = fixtureHtml.replace(
    "</main>",
    `<a id="sanitized-deep-page" href="${DEEP_PAGE_URL}" target="_blank" rel="opener">Open sanitized deep page</a></main>`,
  );
  await context.route(PORTAL_URL, (route) =>
    route.fulfill({
      body: shellWithDeepPageLink,
      contentType: "text/html; charset=utf-8",
      headers: { "content-security-policy": "default-src 'none'" },
    }),
  );
  await context.route(DEEP_PAGE_URL, (route) =>
    route.fulfill({
      body: deepFixtureHtml,
      contentType: "text/html; charset=utf-8",
      headers: { "content-security-policy": "default-src 'none'" },
    }),
  );
  await page.goto(PORTAL_URL);
  const deepPagePromise = context.waitForEvent("page");
  await page.locator("#sanitized-deep-page").click();
  const deepPage = await deepPagePromise;
  await deepPage.waitForLoadState("domcontentloaded");

  await expect(deepPage.locator(HEADER_HOST_SELECTOR)).toHaveCount(1);
  await expect(deepPage.locator(".ba-page-title")).toHaveText("Academics");
  await expect(deepPage.locator("html")).toHaveAttribute(
    "data-better-albert-page",
    "academics",
  );
  await expect(deepPage.locator("html")).toHaveAttribute(
    "data-better-albert-adapter",
    "peoplesoft-deep",
  );
  await expect(deepPage.locator(".ps_box-page")).toHaveCSS(
    "display",
    "grid",
  );
  const deepLayout = deepPage.locator(
    '[data-better-albert-layout="peoplesoft-page"]',
  );
  await expect(deepLayout).toHaveCSS("overflow-x", "auto");
  const deepAlignment = await deepPage.evaluate(() => {
    const layout = document.querySelector<HTMLElement>(
      '[data-better-albert-layout="peoplesoft-page"]',
    );
    const layoutBounds = layout?.getBoundingClientRect();
    const visibleRegions = Array.from(
      document.querySelectorAll<HTMLElement>('[data-better-albert-region]'),
    )
      .map((element) => element.getBoundingClientRect())
      .filter((bounds) => bounds.width > 0 && bounds.height > 0);
    return {
      documentOverflow:
        document.documentElement.scrollWidth - window.innerWidth,
      layoutLeft: Math.round(layoutBounds?.left ?? -1),
      layoutRight: Math.round(layoutBounds?.right ?? -1),
      overflowRegions: visibleRegions.filter(
        (bounds) => bounds.left < -1 || bounds.right > window.innerWidth + 1,
      ).length,
      viewportWidth: window.innerWidth,
    };
  });
  expect(deepAlignment.documentOverflow).toBe(0);
  expect(deepAlignment.layoutLeft).toBeGreaterThanOrEqual(264);
  expect(deepAlignment.layoutRight).toBeLessThanOrEqual(
    deepAlignment.viewportWidth,
  );
  expect(deepAlignment.overflowRegions).toBe(0);

  for (const width of [200, 400, 600, 768, 899, 900, 1200, 1440] as const) {
    await deepPage.setViewportSize({ height: 900, width });
    const responsiveAlignment = await deepPage.evaluate(() => {
      const layout = document.querySelector<HTMLElement>(
        '[data-better-albert-layout="peoplesoft-page"]',
      );
      const layoutBounds = layout?.getBoundingClientRect();
      const form = document.querySelector<HTMLElement>(
        '[data-better-albert-region="form"]',
      );
      const visibleRegions = Array.from(
        document.querySelectorAll<HTMLElement>('[data-better-albert-region]'),
      )
        .map((element) => element.getBoundingClientRect())
        .filter((bounds) => bounds.width > 0 && bounds.height > 0);
      return {
        documentOverflow:
          document.documentElement.scrollWidth - window.innerWidth,
        formColumns: form
          ? getComputedStyle(form).gridTemplateColumns.trim().split(/\s+/).length
          : 0,
        layoutLeft: Math.round(layoutBounds?.left ?? -1),
        layoutRight: Math.round(layoutBounds?.right ?? -1),
        overflowRegions: visibleRegions.filter(
          (bounds) => bounds.left < -1 || bounds.right > window.innerWidth + 1,
        ).length,
      };
    });
    expect(
      responsiveAlignment.documentOverflow,
      `deep document overflow at ${width}px`,
    ).toBe(0);
    expect(responsiveAlignment.formColumns).toBe(width < 900 ? 1 : 2);
    expect(responsiveAlignment.layoutLeft).toBeGreaterThanOrEqual(
      width >= 900 ? 264 : 0,
    );
    expect(responsiveAlignment.layoutRight).toBeLessThanOrEqual(width);
    expect(
      responsiveAlignment.overflowRegions,
      `deep region overflow at ${width}px`,
    ).toBe(0);
  }

  await deepPage.setViewportSize({ height: 800, width: 1280 });

  const deepLocalOverflow = await deepLayout.evaluate((layout) => {
    const probe = document.createElement("div");
    probe.id = "synthetic-deep-overflow-probe";
    probe.style.cssText = "grid-column:1/-1;width:1400px;height:1px";
    layout.append(probe);
    layout.scrollLeft = layout.scrollWidth;
    return {
      clientWidth: layout.clientWidth,
      documentOverflow:
        document.documentElement.scrollWidth - window.innerWidth,
      scrollLeft: layout.scrollLeft,
      scrollWidth: layout.scrollWidth,
    };
  });
  expect(deepLocalOverflow.scrollWidth).toBeGreaterThan(
    deepLocalOverflow.clientWidth,
  );
  expect(deepLocalOverflow.scrollLeft).toBeGreaterThan(0);
  expect(deepLocalOverflow.documentOverflow).toBe(0);
  await expect(deepPage.locator(".ps_box-pagetitle")).toHaveCSS("font-weight", "900");
  const nativePlannerForm = deepPage.locator('form[action="/native/planner"]');
  await expect(nativePlannerForm).toHaveAttribute("method", "post");
  await expect(nativePlannerForm.locator('input[name="native_token"]')).toHaveValue(
    "synthetic-token",
  );
  const nativeAction = deepPage.getByRole("button", {
    name: "Native planner action placeholder",
  }).first();
  await expect(nativeAction).toBeVisible();
  await nativeAction.click();
});

test("re-evaluates delayed same-origin parent evidence in a packaged child frame", async () => {
  const delayedParentFixture = fixtureHtml
    .replace("<title>Albert</title>", "<title>Loading</title>")
    .replace(/<nav class="isSSS_Menu"[\s\S]*?<\/nav>/, "")
    .replace(
      "</body>",
      `<iframe title="Sanitized same-origin child" src="${SAME_ORIGIN_CHILD_URL}"></iframe></body>`,
    );
  await context.route(PORTAL_URL, (route) =>
    route.fulfill({
      body: delayedParentFixture,
      contentType: "text/html; charset=utf-8",
      headers: {
        "content-security-policy":
          "default-src 'none'; frame-src https://sis.portal.nyu.edu",
      },
    }),
  );
  await context.route(SAME_ORIGIN_CHILD_URL, (route) =>
    route.fulfill({
      body: deepFixtureHtml,
      contentType: "text/html; charset=utf-8",
      headers: { "content-security-policy": "default-src 'none'" },
    }),
  );
  await page.goto(PORTAL_URL);

  const child = page.frameLocator('iframe[title="Sanitized same-origin child"]');
  await expect(child.locator("html")).not.toHaveAttribute(
    "data-better-albert-enabled",
    "",
  );

  await page.evaluate(() => {
    document.title = "Albert";
  });
  await expect(child.locator("html")).toHaveAttribute(
    "data-better-albert-enabled",
    "",
  );
  await expect(child.locator(HEADER_HOST_SELECTOR)).toHaveCount(0);

  await page.evaluate(() => {
    document.title = "Albert Login";
  });
  await expect(child.locator("html")).not.toHaveAttribute(
    "data-better-albert-enabled",
    "",
  );
});

test("themes the proven cross-origin class-search frame and preserves transaction controls", async () => {
  const shellWithClassSearchFrame = fixtureHtml.replace(
    "</body>",
    `<iframe title="Sanitized Class Search" src="${CLASS_SEARCH_URL}" width="1000" height="720" frameborder="0"></iframe></body>`,
  );
  await context.route(PORTAL_URL, (route) =>
    route.fulfill({
      body: shellWithClassSearchFrame,
      contentType: "text/html; charset=utf-8",
      headers: {
        "content-security-policy":
          "default-src 'none'; frame-src https://sis.nyu.edu",
      },
    }),
  );
  await context.route(CLASS_SEARCH_URL, (route) =>
    route.fulfill({
      body: classSearchFixtureHtml,
      contentType: "text/html; charset=utf-8",
      headers: { "content-security-policy": "default-src 'none'" },
    }),
  );
  await page.goto(PORTAL_URL);

  const classSearch = page.frameLocator(
    'iframe[title="Sanitized Class Search"]',
  );
  await expect(classSearch.locator("html")).toHaveAttribute(
    "data-better-albert-page",
    "academics",
  );
  await expect(classSearch.locator("html")).toHaveAttribute(
    "data-better-albert-adapter",
    "class-search",
  );
  await expect(classSearch.locator(HEADER_HOST_SELECTOR)).toHaveCount(0);
  await expect(classSearch.locator(".ps_box-search")).toHaveCSS(
    "background-color",
    "rgb(247, 247, 247)",
  );
  await expect(classSearch.locator(".ps_grid-header")).toHaveCSS(
    "background-color",
    "rgb(238, 230, 243)",
  );
  await expect(classSearch.locator("html")).not.toHaveAttribute(
    "data-better-albert-top-level",
    "",
  );
  await classSearch.locator("body").evaluate((body) => {
    body.style.paddingLeft = "37px";
    const dialog = document.createElement("div");
    dialog.id = "synthetic-child-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-label", "Synthetic child dialog");
    dialog.textContent = "Sanitized dialog placeholder";
    body.append(dialog);
  });
  await expect(classSearch.locator("html")).toHaveAttribute(
    "data-better-albert-native-modal-open",
    "",
  );
  await expect(classSearch.locator("body")).toHaveCSS("padding-left", "37px");
  expect(
    await classSearch.locator("body").evaluate((body) => {
      const bounds = body.getBoundingClientRect();
      return {
        left: Math.round(bounds.left),
        right: Math.round(bounds.right),
        viewportWidth: window.innerWidth,
      };
    }),
  ).toEqual({ left: 0, right: 1000, viewportWidth: 1000 });
  await classSearch.locator("#synthetic-child-dialog").evaluate((dialog) => {
    dialog.remove();
  });
  await expect(classSearch.locator("html")).not.toHaveAttribute(
    "data-better-albert-native-modal-open",
    "",
  );
  await expect(classSearch.locator("body")).toHaveCSS("padding-left", "37px");

  const addToCart = classSearch.getByRole("button", { name: "Add to Cart" });
  const enroll = classSearch.getByRole("button", { name: "Enroll" });
  await expect(addToCart).toBeVisible();
  await expect(enroll).toBeVisible();
  const transactionForm = classSearch.locator('form[action="/native/enrollment"]');
  await expect(transactionForm).toHaveAttribute("method", "post");
  await expect(transactionForm.locator('input[name="native_token"]')).toHaveValue(
    "synthetic-token",
  );
  await addToCart.evaluate((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.dataset.nativeTransactionClick = "cart";
    });
  });
  await addToCart.click();
  await expect(classSearch.locator("body")).toHaveAttribute(
    "data-native-transaction-click",
    "cart",
  );
  expect(
    await addToCart.evaluate((button) => getComputedStyle(button).backgroundColor),
  ).not.toBe("rgb(87, 6, 140)");

  const desktopColumns = await classSearch
    .locator(".ps_box-page")
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  expect(desktopColumns.trim().split(/\s+/)).toHaveLength(2);
  await page.setViewportSize({ height: 800, width: 768 });
  await page
    .locator('iframe[title="Sanitized Class Search"]')
    .evaluate((frame) => frame.setAttribute("width", "700"));
  const mobileColumns = await classSearch
    .locator(".ps_box-page")
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  expect(mobileColumns.trim().split(/\s+/)).toHaveLength(1);
  const stackedPositions = await classSearch.locator(".ps_box-page").evaluate((root) => {
    const filter = root.querySelector(".ps_box-search")?.getBoundingClientRect();
    const results = root.querySelector(".ps_grid-flex")?.getBoundingClientRect();
    return { filterBottom: filter?.bottom ?? 0, resultsTop: results?.top ?? 0 };
  });
  expect(stackedPositions.resultsTop).toBeGreaterThanOrEqual(
    stackedPositions.filterBottom,
  );

  await page.goto(CLASS_SEARCH_URL);
  await expect(page.locator("html")).toHaveAttribute(
    "data-better-albert-page",
    "academics",
  );
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCount(0);
  await expect(page.locator("body")).toHaveCSS("padding-left", "0px");

  for (const width of [200, 400, 600, 768, 899, 900, 1200, 1440] as const) {
    await page.setViewportSize({ height: 900, width });
    const responsiveAlignment = await page.evaluate(() => {
      const layout = document.querySelector<HTMLElement>(
        '[data-better-albert-layout="class-search"]',
      );
      const layoutBounds = layout?.getBoundingClientRect();
      const visibleRegions = Array.from(
        document.querySelectorAll<HTMLElement>('[data-better-albert-region]'),
      )
        .map((element) => element.getBoundingClientRect())
        .filter((bounds) => bounds.width > 0 && bounds.height > 0);
      return {
        columns: layout
          ? getComputedStyle(layout).gridTemplateColumns.trim().split(/\s+/).length
          : 0,
        documentOverflow:
          document.documentElement.scrollWidth - window.innerWidth,
        layoutLeft: Math.round(layoutBounds?.left ?? -1),
        layoutRight: Math.round(layoutBounds?.right ?? -1),
        overflowRegions: visibleRegions.filter(
          (bounds) => bounds.left < -1 || bounds.right > window.innerWidth + 1,
        ).length,
      };
    });
    expect(responsiveAlignment.columns).toBe(width < 900 ? 1 : 2);
    expect(
      responsiveAlignment.documentOverflow,
      `fluid Class Search document overflow at ${width}px`,
    ).toBe(0);
    expect(responsiveAlignment.layoutLeft).toBeGreaterThanOrEqual(0);
    expect(responsiveAlignment.layoutRight).toBeLessThanOrEqual(width);
    expect(
      responsiveAlignment.overflowRegions,
      `fluid Class Search region overflow at ${width}px`,
    ).toBe(0);
  }
});

test("redesigns the exact legacy Class Search PSForm without owning its transaction", async () => {
  await context.route(CLASS_SEARCH_URL, (route) =>
    route.fulfill({
      body: legacyClassSearchFixtureHtml,
      contentType: "text/html; charset=utf-8",
      headers: { "content-security-policy": "default-src 'none'" },
    }),
  );
  await page.goto(CLASS_SEARCH_URL);

  await expect(page.locator("html")).toHaveAttribute(
    "data-better-albert-adapter",
    "class-search",
  );
  await expect(
    page.locator('[data-better-albert-layout="class-search-legacy"]'),
  ).toHaveCount(1);
  await expect(page.locator('[data-better-albert-region="group"]')).toHaveCount(2);
  await expect(page.locator('[data-better-albert-region="filter"]')).toHaveCount(1);
  await expect(page.locator('[data-better-albert-region="results"]')).toHaveCount(1);
  await expect(
    page.locator('[data-better-albert-layout="class-search-body"]'),
  ).toHaveCount(1);
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCount(0);
  await expect(page.locator("#PT_WRAPPER")).toHaveCSS(
    "border-top-color",
    "rgb(87, 6, 140)",
  );
  await expect(page.locator(".PAPAGETITLE")).toHaveCSS("font-weight", "900");

  const nativeForm = page.locator("form#NYU_SSENRL_CART_FL.PSForm");
  const nativeSearch = page.getByRole("button", { name: "Search" });
  const nativeContinue = page.getByRole("button", { name: "Continue" });
  await expect(nativeForm).toHaveAttribute("action", "/native/class-search");
  await expect(nativeForm).toHaveAttribute("method", "post");
  await expect(nativeForm.locator('[name="native_token"]')).toHaveValue(
    "synthetic-token",
  );
  await expect(page.locator('#subject')).toHaveCSS("min-height", "42px");
  for (const selector of [
    '#open-only',
    '#delivery-in-person',
    '#synthetic-file',
  ]) {
    await expect(page.locator(selector)).not.toHaveCSS("min-height", "42px");
  }
  for (const control of [nativeSearch, nativeContinue]) {
    await expect(control).not.toHaveCSS(
      "background-color",
      "rgb(87, 6, 140)",
    );
  }
  await nativeContinue.evaluate((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.dataset.nativeTransactionClick = "continue";
    });
  });
  await nativeContinue.click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-transaction-click",
    "continue",
  );

  for (const width of [200, 400, 600, 768, 899, 900, 1200, 1440] as const) {
    await page.setViewportSize({ height: 900, width });
    const responsiveAlignment = await page.evaluate((viewportWidth) => {
      const layout = document.querySelector<HTMLElement>(
        '[data-better-albert-layout="class-search-legacy"]',
      );
      const layoutBounds = layout?.getBoundingClientRect();
      const body = document.querySelector<HTMLElement>(
        '[data-better-albert-layout="class-search-body"]',
      );
      const filter = document.querySelector<HTMLElement>(
        '[data-better-albert-region="filter"]',
      );
      const results = document.querySelector<HTMLElement>(
        '[data-better-albert-region="results"]',
      );
      const filterBounds = filter?.getBoundingClientRect();
      const resultsBounds = results?.getBoundingClientRect();
      return {
        bodyColumns: body
          ? getComputedStyle(body).gridTemplateColumns.trim().split(/\s+/).length
          : 0,
        documentOverflow:
          document.documentElement.scrollWidth - window.innerWidth,
        layoutLeft: Math.round(layoutBounds?.left ?? -1),
        layoutRight: Math.round(layoutBounds?.right ?? -1),
        stacked:
          viewportWidth < 900
            ? (resultsBounds?.top ?? 0) >= (filterBounds?.bottom ?? 0)
            : true,
      };
    }, width);
    expect(responsiveAlignment.bodyColumns).toBe(width < 900 ? 1 : 2);
    expect(
      responsiveAlignment.documentOverflow,
      `legacy Class Search document overflow at ${width}px`,
    ).toBe(0);
    expect(responsiveAlignment.layoutLeft).toBeGreaterThanOrEqual(0);
    expect(responsiveAlignment.layoutRight).toBeLessThanOrEqual(width);
    expect(responsiveAlignment.stacked).toBe(true);
  }
});

test("does not run on public or portal-hosted authentication surfaces", async () => {
  const authenticationFixture = fixtureHtml.replace(
    "<title>Albert</title>",
    "<title>Albert Login</title>",
  );
  await context.route(LOGIN_LAUNCHER_URL, async (route) => {
    await route.fulfill({
      body: authenticationFixture,
      contentType: "text/html; charset=utf-8",
      status: 200,
    });
  });

  await page.goto(LOGIN_LAUNCHER_URL);
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCount(0);
  await expect(page.locator("#albert-native-content")).toBeVisible();

  await context.route(PORTAL_URL, async (route) => {
    await route.fulfill({
      body: authenticationFixture,
      contentType: "text/html; charset=utf-8",
      status: 200,
    });
  });
  await page.goto(PORTAL_URL);
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCount(0);
  await expect(page.locator("#albert-native-content")).toBeVisible();
});
