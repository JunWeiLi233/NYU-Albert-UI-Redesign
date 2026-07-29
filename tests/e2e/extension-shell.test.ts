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
const COURSE_SEARCH_RELAY_URL = `${SAME_ORIGIN_CHILD_URL}?better-albert-course-search-relay=1`;
const CLASS_SEARCH_URL =
  "https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR_FL.NYU_SSENRL_CART_FL.GBL";
const CLASSIC_CLASS_SEARCH_URL =
  "https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR.NYU_CLS_SRCH.GBL";
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
const classicClassSearchFixturePath = resolve(
  process.cwd(),
  "tests/fixtures/albert-class-search-classic.html",
);
const emptyClassSearchFixturePath = resolve(
  process.cwd(),
  "tests/fixtures/albert-class-search-empty.html",
);
const errorClassSearchFixturePath = resolve(
  process.cwd(),
  "tests/fixtures/albert-class-search-error.html",
);

let context: BrowserContext;
let page: Page;
let userDataDirectory: string;
let fixtureHtml: string;
let deepFixtureHtml: string;
let classSearchFixtureHtml: string;
let classicClassSearchFixtureHtml: string;
let emptyClassSearchFixtureHtml: string;
let errorClassSearchFixtureHtml: string;
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

async function routeSanitizedFixture(
  allowInlineStyles = false,
): Promise<void> {
  await context.route(PORTAL_URL, async (route) => {
    await route.fulfill({
      body: fixtureHtml,
      contentType: "text/html; charset=utf-8",
      headers: {
        "content-security-policy": allowInlineStyles
          ? "default-src 'none'; style-src 'unsafe-inline'"
          : "default-src 'none'",
      },
      status: 200,
    });
  });
}

test.beforeAll(async () => {
  fixtureHtml = await readFile(fixturePath, "utf8");
  deepFixtureHtml = await readFile(deepFixturePath, "utf8");
  classSearchFixtureHtml = await readFile(classSearchFixturePath, "utf8");
  classicClassSearchFixtureHtml = await readFile(
    classicClassSearchFixturePath,
    "utf8",
  );
  emptyClassSearchFixtureHtml = await readFile(
    emptyClassSearchFixturePath,
    "utf8",
  );
  errorClassSearchFixtureHtml = await readFile(
    errorClassSearchFixturePath,
    "utf8",
  );
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
  await routeSanitizedFixture(true);
  await page.goto(PORTAL_URL);

  const host = page.locator(HEADER_HOST_SELECTOR);
  const banner = page.getByRole("banner", { name: "Better Albert" });
  const disableButton = page.getByRole("button", {
    exact: true,
    name: "Use original Albert",
  });

  await expect(host).toHaveCount(1);
  await expect(banner).toBeVisible();
  await expect(disableButton).toHaveAttribute(
    "title",
    "Switches to original Albert now. Use the browser extension icon to turn Better Albert back on.",
  );
  await expect(disableButton).toHaveAttribute(
    "aria-describedby",
    "ba-original-albert-help",
  );
  await expect(disableButton).toHaveText("Original Albert");
  await expect(disableButton).toHaveCSS(
    "border-top-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(page.locator("#ba-original-albert-help")).toHaveText(
    "Switches to original Albert now. Use the browser extension icon to turn Better Albert back on.",
  );
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
    page.getByRole("button", { exact: true, name: "Find Classes" }),
  ).toBeVisible();
  const primaryFindClasses = page.getByRole("button", {
    exact: true,
    name: "Find Classes",
  });
  await expect(primaryFindClasses).toHaveAttribute(
    "data-primary-task",
    "true",
  );
  await expect(primaryFindClasses).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(primaryFindClasses).toHaveCSS("color", "rgb(87, 6, 140)");
  await expect(
    page.getByRole("button", { exact: true, name: "Check Holds" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      exact: true,
      name: "When Can I Register?",
    }),
  ).toBeVisible();
  const searchNyuResources = page.getByRole("button", {
    exact: true,
    name: "Search NYU resources",
  });
  await expect(searchNyuResources).toBeVisible();
  await expect(searchNyuResources).toContainText(
    "Search official calendars, offices, support, and campus services",
  );
  await expect(
    page.getByRole("button", { exact: true, name: "Academic Calendar" }),
  ).toBeVisible();
  await expect(page.locator(".ba-primary-label")).toHaveText("Student services");
  const homeStarter = page.locator(".ba-home-starter-nav");
  await expect(homeStarter.locator(".ba-tool-label")).toHaveText("Start here");
  const homeStarterGeometry = await homeStarter.evaluate((navigation) => {
    const bounds = navigation.getBoundingClientRect();
    const finderBounds = document
      .querySelector<HTMLElement>(".ba-task-finder-toggle")
      ?.getBoundingClientRect();

    return {
      bottom: Math.round(bounds.bottom),
      finderBottom: Math.round(finderBounds?.bottom ?? 0),
      top: Math.round(bounds.top),
      viewportHeight: window.innerHeight,
    };
  });
  expect(homeStarterGeometry.top).toBeGreaterThanOrEqual(
    homeStarterGeometry.finderBottom,
  );
  expect(homeStarterGeometry.bottom).toBeLessThanOrEqual(
    homeStarterGeometry.viewportHeight,
  );
  await expect(page.locator(".ba-resource-nav .ba-tool-label")).toHaveText(
    "NYU resources",
  );
  await expect(
    page.locator(".ba-nav-hint", {
      hasText:
        "Plan courses, manage enrollment, meet your advisor, and track degree progress",
    }),
  ).toBeVisible();
  await expect(
    page.locator(".ba-tool-description", {
      hasText: "Search by subject, course number, title, or instructor",
    }),
  ).toBeVisible();
  await expect(page.locator(".is_bb_LinkContainer")).toHaveCSS(
    "display",
    "grid",
  );
  const homePriorityLayout = await page.evaluate(() => {
    const schedule = document.querySelector<HTMLElement>(
      '[data-better-albert-region="schedule-section"]',
    );
    const attention = document.querySelector<HTMLElement>(
      '[data-better-albert-region="attention-section"]',
    );
    const attentionPanels = attention?.querySelector<HTMLElement>(
      ".NYU_same_height_width",
    );
    const attentionCards = attentionPanels
      ? Array.from(
          attentionPanels.querySelectorAll<HTMLElement>(".nyuSSS_ThirdW"),
        )
      : [];
    const attentionCardHeights = attentionCards.map((card) =>
      Math.round(card.getBoundingClientRect().height),
    );

    return {
      attentionCardCount: attentionCards.length,
      attentionCardHeightSpread:
        attentionCardHeights.length > 0
          ? Math.max(...attentionCardHeights) -
            Math.min(...attentionCardHeights)
          : Number.MAX_SAFE_INTEGER,
      attentionCardBackgrounds: attentionCards.map(
        (card) => getComputedStyle(card).backgroundColor,
      ),
      attentionCardColors: attentionCards.map(
        (card) => getComputedStyle(card).color,
      ),
      attentionCardsStyled: attentionCards.every(
        (card) => getComputedStyle(card).borderTopWidth === "1px",
      ),
      attentionColumns: attentionPanels
        ? getComputedStyle(attentionPanels).gridTemplateColumns
            .trim()
            .split(/\s+/).length
        : 0,
      attentionWidth: Math.round(
        attention?.getBoundingClientRect().width ?? 0,
      ),
      scheduleWidth: Math.round(schedule?.getBoundingClientRect().width ?? 0),
    };
  });
  expect(homePriorityLayout.attentionWidth).toBeGreaterThan(
    homePriorityLayout.scheduleWidth,
  );
  expect(homePriorityLayout.attentionColumns).toBe(3);
  expect(homePriorityLayout.attentionCardCount).toBe(3);
  expect(homePriorityLayout.attentionCardHeightSpread).toBeLessThanOrEqual(1);
  expect(homePriorityLayout.attentionCardsStyled).toBe(true);
  expect(homePriorityLayout.attentionCardBackgrounds).toEqual([
    "rgb(255, 247, 230)",
    "rgb(255, 241, 240)",
    "rgb(234, 244, 255)",
  ]);
  expect(homePriorityLayout.attentionCardColors).toEqual([
    "rgb(138, 75, 8)",
    "rgb(180, 35, 24)",
    "rgb(0, 83, 155)",
  ]);
  await page.setViewportSize({ height: 900, width: 430 });
  const compactAttentionLayout = await page.evaluate(() => {
    const grid = document.querySelector<HTMLElement>(
      '[data-better-albert-region="attention-section"] .NYU_same_height_width',
    );
    const cards = grid
      ? Array.from(grid.querySelectorAll<HTMLElement>(".nyuSSS_ThirdW"))
      : [];
    return {
      columns: grid
        ? getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length
        : 0,
      gridWidth: Math.round(grid?.getBoundingClientRect().width ?? 0),
      lastCardWidth: Math.round(
        cards.at(-1)?.getBoundingClientRect().width ?? 0,
      ),
    };
  });
  expect(compactAttentionLayout.columns).toBe(2);
  expect(compactAttentionLayout.lastCardWidth).toBe(
    compactAttentionLayout.gridWidth,
  );
  await page.setViewportSize({ height: 800, width: 1280 });
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
  await expect(page.locator("#IS_BB_HEADER_WRAPPER")).toHaveAttribute(
    "role",
    "navigation",
  );
  await expect(page.locator("#IS_BB_HEADER_WRAPPER")).toHaveAttribute(
    "aria-label",
    "Official Albert tools",
  );
  expect(
    await page
      .locator("#IS_BB_HEADER_WRAPPER")
      .evaluate((wrapper) => getComputedStyle(wrapper, "::before").content),
  ).toBe("none");
  await expect(
    page.locator('#IS_BB_HEADER_WRAPPER a[href="/fixture-utility"]'),
  ).toHaveText("Albert utility navigation");
  const nativeUtilityBarHeight = await page
    .locator("#IS_BB_HEADER_WRAPPER")
    .evaluate((wrapper) => Math.round(wrapper.getBoundingClientRect().height));
  expect(nativeUtilityBarHeight).toBeGreaterThanOrEqual(48);
  expect(nativeUtilityBarHeight).toBeLessThanOrEqual(49);
  expect(
    await page
      .locator('#IS_BB_HEADER_WRAPPER a[href="/fixture-utility"]')
      .evaluate((link) => Math.round(link.getBoundingClientRect().height)),
  ).toBeGreaterThanOrEqual(44);
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
  const compactFindClasses = page.getByRole("button", {
    exact: true,
    name: "Find Classes",
  });
  await expect(compactFindClasses).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(compactFindClasses).toHaveCSS(
    "border-top-color",
    "rgb(87, 6, 140)",
  );
  await expect(compactFindClasses).toHaveCSS(
    "background-color",
    "rgb(87, 6, 140)",
  );
  await compactFindClasses.focus();
  await expect(compactFindClasses).toHaveCSS(
    "outline-color",
    "rgb(137, 0, 225)",
  );
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

test("exposes task-first discovery at every supported width and delegates through native Albert controls", async () => {
  await routeSanitizedFixture();
  await page.goto(PORTAL_URL);

  const taskFinderToggle = page.locator(".ba-task-finder-toggle");
  const taskFinder = page.locator(".ba-task-finder");
  const closeTaskFinder = page.getByRole("button", {
    name: "Close task finder",
  });
  const taskSearch = taskFinder.getByRole("searchbox", {
    name: "Search classes, tasks, and resources",
  });
  const commonTasks = taskFinder.getByRole("group", {
    name: "Common tasks",
  });
  const otherResourcesToggle = page.getByRole("button", {
    exact: true,
    name: "Other Resources",
  });
  const homeResourceDirectory = page.getByRole("button", {
    exact: true,
    name: "Search NYU resources",
  });
  const homeStarter = page.locator(".ba-home-starter-nav");
  const primaryNavigation = page.locator(".ba-primary-nav");
  const nativeAreaNavigation = page.locator("#albert-native-navigation");
  const nativeHomeDirectory = page.locator("#nyuSSSHomeLinksStatic");

  await expect(taskFinderToggle).toBeVisible();
  await expect(
    page.getByText(
      "Your starting point for classes, first-week help, and time-sensitive tasks",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(taskFinderToggle).toContainText(
    "Find classes, tasks, and NYU resources",
  );
  await expect(taskFinder).toBeHidden();
  await expect(taskFinderToggle).toHaveAttribute("aria-keyshortcuts", "/");
  await expect(
    taskFinderToggle.locator(".ba-task-finder-toggle-shortcut"),
  ).toHaveText("/");

  await page.keyboard.press("/");
  await expect(taskFinder).toBeVisible();
  await expect(taskSearch).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(taskFinder).toBeHidden();

  await page.evaluate(() => {
    const input = document.createElement("input");
    input.id = "native-shortcut-test";
    input.setAttribute("aria-label", "Native Albert test input");
    document.body.append(input);
  });
  const nativeShortcutInput = page.getByRole("textbox", {
    name: "Native Albert test input",
  });
  await nativeShortcutInput.focus();
  await page.keyboard.press("/");
  await expect(nativeShortcutInput).toHaveValue("/");
  await expect(taskFinder).toBeHidden();
  await nativeShortcutInput.evaluate((input) => input.remove());

  await expect(nativeAreaNavigation).toBeHidden();
  await expect(nativeAreaNavigation.locator(":scope > a")).toHaveCount(6);
  expect(
    await nativeAreaNavigation.evaluate((navigation) => navigation.isConnected),
  ).toBe(true);
  await expect(nativeHomeDirectory).toHaveAttribute("inert", "");
  await expect(nativeHomeDirectory.locator("a")).toHaveCount(22);
  const nativeHomeDirectoryGeometry = await nativeHomeDirectory.evaluate(
    (directory) => {
      const bounds = directory.getBoundingClientRect();
      return {
        height: Math.round(bounds.height),
        width: Math.round(bounds.width),
      };
    },
  );
  expect(nativeHomeDirectoryGeometry.height).toBeLessThanOrEqual(1);
  expect(nativeHomeDirectoryGeometry.width).toBeLessThanOrEqual(1);
  expect(
    await nativeHomeDirectory.evaluate((directory) => directory.isConnected),
  ).toBe(true);
  await page
    .getByRole("button", { exact: true, name: "Home" })
    .click();
  await expect(
    page.locator('[data-better-albert-region="workspace"]'),
  ).toBeFocused();
  expect(page.url()).toBe(PORTAL_URL);

  for (const width of [1440, 1200, 900, 899, 768, 400, 200] as const) {
    await page.setViewportSize({ height: 800, width });
    await expect(taskFinderToggle).toBeVisible();
    await expect(taskFinderToggle).toHaveAttribute("aria-expanded", "false");
    await expect(homeStarter).toBeVisible();
    await expect(homeResourceDirectory).toBeVisible();
    await expect(otherResourcesToggle).toBeVisible();
    expect(
      await taskFinderToggle.evaluate((button) =>
        Math.round(button.getBoundingClientRect().height),
      ),
    ).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(() => {
        const root = document.querySelector("#better-albert-header-host")
          ?.shadowRoot;
        const finder = root?.querySelector<HTMLElement>(
          ".ba-task-finder-toggle",
        );
        const starter = root?.querySelector<HTMLElement>(
          ".ba-home-starter-nav",
        );
        const navigation = root?.querySelector<HTMLElement>(
          ".ba-primary-nav",
        );
        if (!finder || !starter || !navigation) {
          return false;
        }

        const finderBounds = finder.getBoundingClientRect();
        const starterBounds = starter.getBoundingClientRect();
        const navigationBounds = navigation.getBoundingClientRect();
        return (
          starterBounds.top >= finderBounds.bottom - 1 &&
          starterBounds.bottom <= navigationBounds.top + 1
        );
      }),
    ).toBe(true);
    if (width < 900) {
      const compactAreaGeometry = await primaryNavigation.evaluate(
        (navigation) => {
          const navigationBounds = navigation.getBoundingClientRect();
          const buttons = Array.from(
            navigation.querySelectorAll<HTMLElement>(".ba-nav-item"),
          );

          return {
            buttonCount: buttons.length,
            minimumHeight: Math.round(
              Math.min(
                ...buttons.map(
                  (button) => button.getBoundingClientRect().height,
                ),
              ),
            ),
            offscreenButtonCount: buttons.filter((button) => {
              const bounds = button.getBoundingClientRect();
              return (
                bounds.left < navigationBounds.left - 1 ||
                bounds.right > navigationBounds.right + 1
              );
            }).length,
            overflow: Math.round(
              navigation.scrollWidth - navigation.clientWidth,
            ),
          };
        },
      );
      expect(compactAreaGeometry.buttonCount).toBe(6);
      expect(compactAreaGeometry.minimumHeight).toBeGreaterThanOrEqual(44);
      expect(compactAreaGeometry.offscreenButtonCount).toBe(0);
      expect(compactAreaGeometry.overflow).toBeLessThanOrEqual(1);
      await expect(
        otherResourcesToggle.locator(".ba-nav-label-full"),
      ).toBeHidden();
      await expect(
        otherResourcesToggle.locator(".ba-nav-label-compact"),
      ).toHaveText("Resources");
    } else {
      await expect(
        otherResourcesToggle.locator(".ba-nav-label-full"),
      ).toBeVisible();
      await expect(
        otherResourcesToggle.locator(".ba-nav-label-compact"),
      ).toBeHidden();
    }
    if (width >= 900) {
      expect(
        await page.evaluate(() => {
          const context = document
            .querySelector("#better-albert-header-host")
            ?.shadowRoot?.querySelector<HTMLElement>(".ba-page-context");
          const finderToggle = document
            .querySelector("#better-albert-header-host")
            ?.shadowRoot?.querySelector<HTMLElement>(
              ".ba-task-finder-toggle",
            );
          const navigation = document
            .querySelector("#better-albert-header-host")
            ?.shadowRoot?.querySelector<HTMLElement>(".ba-primary-nav");
          if (!context || !finderToggle || !navigation) {
            return false;
          }
          const contextBounds = context.getBoundingClientRect();
          const finderBounds = finderToggle.getBoundingClientRect();
          const navigationBounds = navigation.getBoundingClientRect();
          return (
            finderBounds.top >= contextBounds.bottom &&
            finderBounds.bottom <= navigationBounds.top
          );
        }),
      ).toBe(true);
    }
    if (width === 400) {
      expect(
        await page.locator(".ba-identity-row").evaluate((row) =>
          Math.round(row.getBoundingClientRect().height),
        ),
      ).toBeLessThanOrEqual(64);
      expect(
        await page.locator(".ba-product-name").evaluate((name) =>
          Math.round(name.getBoundingClientRect().height),
        ),
      ).toBeLessThanOrEqual(30);
    }
    if (width === 1200) {
      const currentArea = page.getByRole("button", {
        exact: true,
        name: "Home",
      });
      await expect(currentArea).toHaveCSS(
        "background-color",
        "rgb(255, 255, 255)",
      );
      await currentArea.hover();
      await expect(currentArea).toHaveCSS(
        "background-color",
        "rgb(255, 255, 255)",
      );
      await expect(currentArea).toHaveCSS("color", "rgb(87, 6, 140)");
    }

    await taskFinderToggle.focus();
    await taskFinderToggle.press("Enter");
    await expect(taskFinderToggle).toHaveAttribute("aria-expanded", "true");
    await expect(taskFinder).toBeVisible();
    await expect(taskSearch).toBeFocused();
    if (width < 900) {
      await expect(primaryNavigation).toBeHidden();
    } else {
      await expect(primaryNavigation).toBeVisible();
    }
    if (width === 200) {
      await expect(taskFinder.locator(".ba-task-finder-heading")).toBeHidden();
      const zoomReflowGeometry = await taskSearch.evaluate((search) => {
        const finder = search.closest<HTMLElement>(".ba-task-finder");
        const finderBounds = finder?.getBoundingClientRect();
        const searchBounds = search.getBoundingClientRect();
        return {
          finderTop: Math.round(finderBounds?.top ?? -1),
          searchBottom: Math.round(searchBounds.bottom),
          searchLeft: Math.round(searchBounds.left),
          searchRight: Math.round(searchBounds.right),
          searchTop: Math.round(searchBounds.top),
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
        };
      });
      expect(zoomReflowGeometry.searchTop).toBeGreaterThanOrEqual(
        zoomReflowGeometry.finderTop,
      );
      expect(zoomReflowGeometry.searchBottom).toBeLessThanOrEqual(
        zoomReflowGeometry.viewportHeight,
      );
      expect(zoomReflowGeometry.searchLeft).toBeGreaterThanOrEqual(0);
      expect(zoomReflowGeometry.searchRight).toBeLessThanOrEqual(
        zoomReflowGeometry.viewportWidth,
      );
    }
    if (width < 900) {
      await expect(
        commonTasks.getByText("Scroll for more", { exact: true }),
      ).toBeVisible();
      const compactCommonTaskGeometry = await commonTasks.evaluate(
        (group) => {
          const bounds = group.getBoundingClientRect();
          const buttons = Array.from(group.querySelectorAll("button"));
          const firstButtonBounds = buttons[0]?.getBoundingClientRect();
          const list = group.querySelector<HTMLElement>(
            ".ba-task-finder-common-list",
          );
          return {
            firstButtonWithinViewport: Boolean(
              firstButtonBounds &&
                firstButtonBounds.left >= bounds.left - 1 &&
                firstButtonBounds.right <= bounds.right + 1,
            ),
            minimumHeight: Math.min(
              ...buttons.map((button) => button.getBoundingClientRect().height),
            ),
            scrollOverflow: (list?.scrollWidth ?? 0) - (list?.clientWidth ?? 0),
          };
        },
      );
      expect(compactCommonTaskGeometry.firstButtonWithinViewport).toBe(true);
      expect(compactCommonTaskGeometry.minimumHeight).toBeGreaterThanOrEqual(
        44,
      );
      expect(compactCommonTaskGeometry.scrollOverflow).toBeGreaterThan(0);
    }
    await expect(
      taskFinder.getByRole("navigation", {
        name: "Jump to task finder section",
      }),
    ).toBeVisible();
    await expect(taskFinder.locator(".ba-task-finder-jump")).toHaveCount(4);
    for (const jumpName of [
      "Search",
      "Areas",
      "Task shortcuts",
      "NYU resources",
    ]) {
      await expect(
        taskFinder.getByRole("button", {
          exact: true,
          name: jumpName,
        }),
      ).toBeVisible();
    }
    await expect(closeTaskFinder).toBeVisible();
    const jumpNavigationGeometry = await taskFinder
      .getByRole("navigation", {
        name: "Jump to task finder section",
      })
      .evaluate((navigation) => {
        const finder = navigation.closest<HTMLElement>(".ba-task-finder");
        const close = Array.from(
          finder?.querySelectorAll<HTMLElement>(
            ".ba-task-finder-close, .ba-task-finder-heading-close",
          ) ?? [],
        ).find((button) => getComputedStyle(button).display !== "none");
        const jumpLinks = navigation.querySelector<HTMLElement>(
          ".ba-task-finder-jump-links",
        );
        const navigationBounds = navigation.getBoundingClientRect();
        const closeBounds = close?.getBoundingClientRect();
        const jumpLinksBounds = jumpLinks?.getBoundingClientRect();
        const offscreenJumpLinks = jumpLinks
          ? Array.from(
              jumpLinks.querySelectorAll<HTMLElement>(".ba-task-finder-jump"),
            ).filter((jump) => {
              const bounds = jump.getBoundingClientRect();
              return (
                bounds.left < (jumpLinksBounds?.left ?? 0) - 1 ||
                bounds.right > (jumpLinksBounds?.right ?? window.innerWidth) + 1
              );
            }).length
          : -1;
        return {
          closeHeight: Math.round(closeBounds?.height ?? 0),
          closeLeft: Math.round(closeBounds?.left ?? -1),
          closeRight: Math.round(closeBounds?.right ?? -1),
          jumpLinksOverflow: Math.round(
            (jumpLinks?.scrollWidth ?? 0) - (jumpLinks?.clientWidth ?? 0),
          ),
          navigationLeft: Math.round(navigationBounds.left),
          navigationRight: Math.round(navigationBounds.right),
          offscreenJumpLinks,
        };
      });
    expect(jumpNavigationGeometry.closeHeight).toBeGreaterThanOrEqual(44);
    expect(jumpNavigationGeometry.closeLeft).toBeGreaterThanOrEqual(
      jumpNavigationGeometry.navigationLeft,
    );
    expect(jumpNavigationGeometry.closeRight).toBeLessThanOrEqual(
      jumpNavigationGeometry.navigationRight,
    );
    if (width >= 280) {
      expect(jumpNavigationGeometry.jumpLinksOverflow).toBeLessThanOrEqual(1);
      expect(jumpNavigationGeometry.offscreenJumpLinks).toBe(0);
    }
    await expect(taskSearch).toHaveAttribute(
      "placeholder",
      "Try “find a course” for one-step class search, “new student,” or “financial aid”",
    );
    await expect(commonTasks).toBeVisible();
    await expect(commonTasks.getByRole("button")).toHaveCount(15);
    const commonFindClasses = commonTasks.getByRole("button", {
      exact: true,
      name: "Find classes",
    });
    await expect(commonFindClasses).toHaveAttribute(
      "data-primary-task",
      "true",
    );
    await expect(commonFindClasses).toHaveCSS(
      "background-color",
      "rgb(87, 6, 140)",
    );
    await expect(commonFindClasses).toHaveCSS(
      "color",
      "rgb(255, 255, 255)",
    );
    expect(
      await commonTasks
        .getByRole("button")
        .allTextContents(),
    ).toEqual([
      "Find classes",
      "Class schedule",
      "Course materials",
      "Academic dates",
      "Housing",
      "New student help",
      "Student support",
      "Check holds",
      "When can I register?",
      "To-do list",
      "Meet advisor",
      "View grades",
      "Check balance",
      "Pay tuition",
      "Financial aid status",
    ]);
    expect(
      await commonTasks
        .getByRole("button")
        .evaluateAll((buttons) =>
          Math.min(
            ...buttons.map((button) => button.getBoundingClientRect().height),
          ),
        ),
    ).toBeGreaterThanOrEqual(44);
    await expect(
      taskFinder.getByText("48 verified destinations available", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      taskFinder.getByRole("heading", {
        exact: true,
        name: "What you can do",
      }),
    ).toBeVisible();
    await expect(
      taskFinder.getByText("Available on this Albert page", {
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      taskFinder.getByText("Verified in this Albert view", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      taskFinder.getByText("Verified links from Other Resources", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      taskFinder.getByText(
        "Plan courses, manage enrollment, meet your advisor, and track degree progress",
        {
          exact: true,
        },
      ),
    ).toBeVisible();
    const academicsTask = taskFinder.getByRole("button", {
      exact: true,
      name: "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
    });
    await expect(academicsTask.locator("strong")).toHaveText(
      "Plan courses, manage enrollment, meet your advisor, and track degree progress",
    );
    await expect(
      academicsTask.locator(".ba-task-finder-item-copy > span"),
    ).toHaveText("Academics · Albert area");
    await expect(
      taskFinder.getByText(
        "Search by subject, course number, title, or instructor",
        {
          exact: true,
        },
      ),
    ).toBeVisible();
    await expect(taskFinder.locator(".ba-task-finder-area")).toHaveCount(6);
    await expect(taskFinder.locator(".ba-task-finder-task-group")).toHaveCount(
      5,
    );
    await expect(taskFinder.locator(".ba-task-finder-tool")).toHaveCount(21);
    await expect(
      taskFinder.locator(".ba-task-finder-resource-group"),
    ).toHaveCount(5);
    await expect(taskFinder.locator(".ba-task-finder-resource")).toHaveCount(21);
    await expect(
      taskFinder.getByRole("heading", {
        exact: true,
        name: "Academic & records",
      }),
    ).toBeVisible();
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

    if (width >= 900) {
      await expect(taskFinder).toHaveCSS("position", "fixed");
      expect(
        await taskFinder.evaluate((finder) => {
          const bounds = finder.getBoundingClientRect();
          return {
            bottom: Math.round(bounds.bottom),
            left: Math.round(bounds.left),
            right: Math.round(bounds.right),
            top: Math.round(bounds.top),
          };
        }),
      ).toEqual({
        bottom: 800,
        left: 264,
        right: width,
        top: 0,
      });
      expect(
        await taskFinder
          .locator(".ba-task-finder-section:first-child .ba-task-finder-list")
          .evaluate((list) =>
            getComputedStyle(list).gridTemplateColumns.trim().split(/\s+/)
              .length,
          ),
      ).toBe(2);
    } else {
      await expect(taskFinder).toHaveCSS("position", "fixed");
      expect(
        await taskFinder.evaluate((finder) => {
          const bounds = finder.getBoundingClientRect();
          return {
            bottom: Math.round(bounds.bottom),
            left: Math.round(bounds.left),
            right: Math.round(bounds.right),
            top: Math.round(bounds.top),
          };
        }),
      ).toEqual({
        bottom: 800,
        left: 0,
        right: width,
        top: 0,
      });
      await expect(page.locator("html")).toHaveCSS("overflow", "hidden");
      if (width >= 280) {
        await expect(
          taskFinder.locator(".ba-task-finder-heading-close"),
        ).toBeVisible();
        await expect(
          taskFinder.locator(
            ".ba-task-finder-jump-nav > .ba-task-finder-close",
          ),
        ).toBeHidden();
      }
    }

    if (width === 1200) {
      const finalResourceTask = taskFinder.getByRole("button", {
        exact: true,
        name: "Open Student Life",
      });
      await taskSearch.press("Shift+Tab");
      await expect(finalResourceTask).toBeFocused();
      await finalResourceTask.press("Tab");
      await expect(taskSearch).toBeFocused();

      await taskFinder
        .getByRole("button", {
          exact: true,
          name: "NYU resources",
        })
        .click();
      await expect(
        taskFinder.getByRole("heading", {
          exact: true,
          name: "NYU resources",
        }),
      ).toBeFocused();
      await expect(closeTaskFinder).toBeVisible();

      await taskFinder
        .getByRole("button", { exact: true, name: "Search" })
        .click();
      await expect(taskSearch).toBeFocused();
    }

    if (width === 400) {
      await taskFinder.evaluate((finder) => {
        finder.scrollTop = finder.scrollHeight;
      });
      await expect
        .poll(() => taskFinder.evaluate((finder) => finder.scrollTop))
        .toBeGreaterThan(0);
      await closeTaskFinder.press("Escape");
      await expect(taskFinder).toBeHidden();
      await taskFinderToggle.press("Enter");
      await expect(taskFinder).toBeVisible();
      await expect(taskSearch).toBeFocused();
      await expect
        .poll(() => taskFinder.evaluate((finder) => finder.scrollTop))
        .toBe(0);
      await expect(taskFinder.locator(".ba-task-finder-heading")).toBeVisible();
    }

    await closeTaskFinder.press("Escape");
    await expect(taskFinderToggle).toHaveAttribute("aria-expanded", "false");
    await expect(taskFinder).toBeHidden();
    await expect(taskFinderToggle).toBeFocused();
    await expect(primaryNavigation).toBeVisible();
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
  await expect(closeTaskFinder).toBeVisible();
  const shortHeightCloseGeometry = await closeTaskFinder.evaluate((close) => {
    const finder = close.closest<HTMLElement>(".ba-task-finder");
    const closeBounds = close.getBoundingClientRect();
    const finderBounds = finder?.getBoundingClientRect();
    return {
      closeBottom: Math.round(closeBounds.bottom),
      closeRight: Math.round(closeBounds.right),
      finderBottom: Math.round(finderBounds?.bottom ?? -1),
      finderRight: Math.round(finderBounds?.right ?? -1),
      finderTop: Math.round(finderBounds?.top ?? -1),
      closeTop: Math.round(closeBounds.top),
    };
  });
  expect(shortHeightCloseGeometry.closeTop).toBeGreaterThanOrEqual(
    shortHeightCloseGeometry.finderTop,
  );
  expect(shortHeightCloseGeometry.closeBottom).toBeLessThanOrEqual(
    shortHeightCloseGeometry.finderBottom,
  );
  expect(shortHeightCloseGeometry.closeRight).toBeLessThanOrEqual(
    shortHeightCloseGeometry.finderRight,
  );
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
  await page.locator('a[href="/fixture-finances"]').evaluate((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.dataset.nativeTaskFinderNavigation = "finances";
    });
  });
  await page.locator("#MENU_ID_NYU_OTHER_RESOURCES_FLDR").evaluate((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      document.body.dataset.nativeTaskFinderNavigation = "resources";
    }, { capture: true });
  });
  await page.locator('a[href="/fixture-grades"]').evaluate((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.dataset.nativeTaskFinderNavigation = "grades";
    });
  });
  await page.locator('a[href="/fixture-course-search"]').evaluate((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.dataset.nativeTaskFinderTool = "course-search";
    });
  });
  await page
    .locator('a[href="/fixture-weekly-schedule"]')
    .evaluate((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        document.body.dataset.nativeTaskFinderTool = "weekly-schedule";
      });
    });
  await page.locator('a[href="/fixture-bursar-balance"]').evaluate((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.dataset.nativeTaskFinderTool = "bursar-balance";
    });
  });
  await page.locator('a[href="/fixture-addresses"]').evaluate((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.dataset.nativeTaskFinderTool = "addresses";
    });
  });
  await page.locator('a[href="/fixture-financial-aid"]').evaluate((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.dataset.nativeCrossFamilyTask = "financial-aid";
    });
  });
  await page
    .locator(
      '#SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR > ul > li > a[href="/fixture-calendar"]',
    )
    .evaluate((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        document.body.dataset.nativeTaskFinderResource = "calendar";
      });
    });
  await page
    .locator(
      '#SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR > ul > li > a[href="/fixture-brightspace"]',
    )
    .evaluate((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        document.body.dataset.nativeTaskFinderResource = "brightspace";
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
  await page
    .locator(
      '#SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR > ul > li > a[href="/fixture-financial-aid-resources"]',
    )
    .evaluate((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        document.body.dataset.nativeTaskFinderResource = "financial-aid";
      });
    });

  await taskFinderToggle.press("Enter");
  await commonTasks
    .getByRole("button", { exact: true, name: "Find classes" })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-tool",
    "course-search",
  );
  await expect(taskFinder).toBeHidden();

  await taskFinderToggle.press("Enter");
  await commonTasks
    .getByRole("button", { exact: true, name: "Course materials" })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-resource",
    "brightspace",
  );
  await expect(taskFinder).toBeHidden();

  await taskFinderToggle.press("Enter");
  await commonTasks
    .getByRole("button", { exact: true, name: "New student help" })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-navigation",
    "resources",
  );
  await expect(taskFinder).toBeHidden();

  await taskFinderToggle.press("Enter");
  await commonTasks
    .getByRole("button", { exact: true, name: "Check holds" })
    .click();
  await expect(taskFinder).toBeHidden();
  await expect(
    page.locator('[data-better-albert-region="holds-status"]'),
  ).toBeFocused();

  await taskFinderToggle.press("Enter");
  await commonTasks
    .getByRole("button", { exact: true, name: "When can I register?" })
    .click();
  await expect(taskFinder).toBeHidden();
  await expect(
    page.locator('[data-better-albert-region="registration-time"]'),
  ).toBeFocused();

  await taskFinderToggle.press("Enter");
  await commonTasks
    .getByRole("button", { exact: true, name: "To-do list" })
    .click();
  await expect(taskFinder).toBeHidden();
  await expect(
    page.locator('[data-better-albert-region="todo-status"]'),
  ).toBeFocused();

  await taskFinderToggle.press("Enter");
  await commonTasks
    .getByRole("button", { exact: true, name: "Academic dates" })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-resource",
    "calendar",
  );
  await expect(taskFinder).toBeHidden();

  await taskFinderToggle.press("Enter");
  await commonTasks
    .getByRole("button", { exact: true, name: "Meet advisor" })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-navigation",
    "academics",
  );
  await expect(taskFinder).toBeHidden();

  await taskFinderToggle.press("Enter");
  await commonTasks
    .getByRole("button", { exact: true, name: "View grades" })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-navigation",
    "grades",
  );
  await expect(taskFinder).toBeHidden();

  await taskFinderToggle.press("Enter");
  await commonTasks
    .getByRole("button", { exact: true, name: "Check balance" })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-tool",
    "bursar-balance",
  );
  await expect(taskFinder).toBeHidden();

  await taskFinderToggle.press("Enter");
  await commonTasks
    .getByRole("button", { exact: true, name: "Financial aid status" })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-cross-family-task",
    "financial-aid",
  );
  await expect(taskFinder).toBeHidden();

  await taskFinderToggle.press("Enter");
  await taskFinder
    .getByRole("button", {
      exact: true,
      name: "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
    })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-navigation",
    "academics",
  );
  await expect(taskFinder).toBeHidden();

  await taskFinderToggle.press("Enter");
  await taskSearch.fill("not a verified destination");
  await expect(
    taskFinder.getByText('0 results for “not a verified destination”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByText(
      "No verified destination matches “not a verified destination”",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(taskFinder.locator(".ba-task-finder-item")).toHaveCount(0);
  await taskFinder
    .getByRole("button", {
      exact: true,
      name: "Show all tasks and resources",
    })
    .click();
  await expect(taskSearch).toBeFocused();
  await expect(taskSearch).toHaveValue("");
  await expect(taskFinder.locator(".ba-task-finder-item")).toHaveCount(48);

  await taskSearch.fill("transcript");
  await expect(
    taskFinder.getByText('2 results for “transcript”', { exact: true }),
  ).toBeVisible();
  await expect(taskFinder.locator(".ba-task-finder-area")).toHaveCount(0);
  await expect(taskFinder.locator(".ba-task-finder-tool")).toHaveCount(1);
  await expect(taskFinder.locator(".ba-task-finder-resource")).toHaveCount(1);
  await expect(
    taskFinder.getByRole("button", { exact: true, name: /Test Scores/ }),
  ).toHaveCount(0);
  await expect(
    taskFinder.getByRole("button", { exact: true, name: /Transfer Credit/ }),
  ).toHaveCount(0);
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Get Unofficial Transcript — View an unofficial academic record",
    }),
  ).toBeVisible();
  await taskSearch.press("Enter");
  await expect(taskFinder).toBeVisible();
  await expect(taskSearch).toBeFocused();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await page.setViewportSize({ height: 800, width: 1200 });
  await taskSearch.fill("register for classes");
  await expect(
    taskFinder.getByText('1 result for “register for classes”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(taskFinder).toHaveAttribute("data-single-result", "true");
  await expect(taskFinder.locator(".ba-task-finder-area")).toHaveCount(0);
  await expect(taskFinder.locator(".ba-task-finder-tool")).toHaveCount(0);
  await expect(taskFinder.locator(".ba-task-finder-resource")).toHaveCount(0);
  const courseSearchExactResult = taskFinder.getByRole("button", {
    exact: true,
    name: "Open Find Classes — Search by subject, course number, title, or instructor",
  });
  await expect(courseSearchExactResult).toBeVisible();
  const measureExactResult = async () =>
    courseSearchExactResult.evaluate((result) => {
      const finder = result.closest<HTMLElement>(".ba-task-finder");
      const searchRow = finder?.querySelector<HTMLElement>(
        ".ba-task-finder-search-row",
      );
      const resultBounds = result.getBoundingClientRect();
      const searchBounds = searchRow?.getBoundingClientRect();
      return {
        backgroundColor: getComputedStyle(result).backgroundColor,
        resultLeft: Math.round(resultBounds.left),
        resultRight: Math.round(resultBounds.right),
        resultWidth: Math.round(resultBounds.width),
        searchWidth: Math.round(searchBounds?.width ?? 0),
        viewportWidth: window.innerWidth,
      };
    });
  const desktopExactResultGeometry = await measureExactResult();
  expect(desktopExactResultGeometry.backgroundColor).toBe(
    "rgb(238, 230, 243)",
  );
  expect(
    Math.abs(
      desktopExactResultGeometry.resultWidth -
        desktopExactResultGeometry.searchWidth,
    ),
  ).toBeLessThanOrEqual(1);
  expect(desktopExactResultGeometry.resultWidth).toBeGreaterThanOrEqual(600);

  await page.setViewportSize({ height: 800, width: 400 });
  const compactExactResultGeometry = await measureExactResult();
  expect(compactExactResultGeometry.backgroundColor).toBe(
    "rgb(238, 230, 243)",
  );
  expect(
    Math.abs(
      compactExactResultGeometry.resultWidth -
        compactExactResultGeometry.searchWidth,
    ),
  ).toBeLessThanOrEqual(1);
  expect(compactExactResultGeometry.resultLeft).toBeGreaterThanOrEqual(0);
  expect(compactExactResultGeometry.resultRight).toBeLessThanOrEqual(
    compactExactResultGeometry.viewportWidth,
  );
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();
  await expect(taskFinder).not.toHaveAttribute("data-single-result");

  await taskSearch.fill("how do I register");
  await expect(
    taskFinder.getByText('1 result for “how do I register”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(taskFinder).toHaveAttribute("data-single-result", "true");
  await expect(taskFinder.locator(".ba-task-finder-tool")).toHaveCount(0);
  await expect(taskFinder.locator(".ba-task-finder-resource")).toHaveCount(0);
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Find Classes — Search by subject, course number, title, or instructor",
    }),
  ).toBeVisible();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();
  await expect(taskFinder).not.toHaveAttribute("data-single-result");

  await taskSearch.fill("meet my advisor");
  await expect(
    taskFinder.getByText('1 result for “meet my advisor”', { exact: true }),
  ).toBeVisible();
  await expect(taskFinder.locator(".ba-task-finder-area")).toHaveCount(1);
  await expect(taskFinder.locator(".ba-task-finder-tool")).toHaveCount(0);
  await expect(taskFinder.locator(".ba-task-finder-resource")).toHaveCount(0);
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
    }),
  ).toBeVisible();
  await page.locator("body").evaluate((body) => {
    delete body.dataset.nativeTaskFinderNavigation;
  });
  await taskSearch.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-navigation",
    "academics",
  );
  await expect(taskFinder).toBeHidden();
  await taskFinderToggle.press("Enter");

  await taskSearch.fill("when can I register");
  await expect(
    taskFinder.getByText('1 result for “when can I register”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(taskFinder.locator(".ba-task-finder-area")).toHaveCount(0);
  await expect(taskFinder.locator(".ba-task-finder-tool")).toHaveCount(1);
  await expect(taskFinder.locator(".ba-task-finder-resource")).toHaveCount(0);
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open When Can I Register? — Check when you can register",
    }),
  ).toBeVisible();
  await taskSearch.press("Enter");
  await expect(taskFinder).toBeHidden();
  await expect(
    page.locator('[data-better-albert-region="registration-time"]'),
  ).toBeFocused();
  await taskFinderToggle.press("Enter");

  await taskSearch.fill("I have a hold");
  await expect(
    taskFinder.getByText('1 result for “I have a hold”', { exact: true }),
  ).toBeVisible();
  await expect(taskFinder.locator(".ba-task-finder-area")).toHaveCount(0);
  await expect(taskFinder.locator(".ba-task-finder-tool")).toHaveCount(1);
  await expect(taskFinder.locator(".ba-task-finder-resource")).toHaveCount(0);
  await taskFinder
    .getByRole("button", {
      exact: true,
      name: "Open Check Holds — Review current registration holds",
    })
    .click();
  await expect(taskFinder).toBeHidden();
  await expect(
    page.locator('[data-better-albert-region="holds-status"]'),
  ).toBeFocused();

  await taskFinderToggle.click();
  await taskSearch.fill("pay tuition");
  await expect(
    taskFinder.getByText('1 result for “pay tuition”', { exact: true }),
  ).toBeVisible();
  await expect(taskFinder.locator(".ba-task-finder-area")).toHaveCount(1);
  await expect(taskFinder.locator(".ba-task-finder-tool")).toHaveCount(0);
  await expect(taskFinder.locator(".ba-task-finder-resource")).toHaveCount(0);
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Finances — Check balances, pay tuition, view bills, and manage financial aid",
    }),
  ).toBeVisible();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await taskSearch.fill("I want to pay tuition");
  await expect(
    taskFinder.getByText('1 result for “I want to pay tuition”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Finances — Check balances, pay tuition, view bills, and manage financial aid",
    }),
  ).toBeVisible();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await taskSearch.fill("I need to pay my tuition");
  await expect(
    taskFinder.getByText('1 result for “I need to pay my tuition”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Finances — Check balances, pay tuition, view bills, and manage financial aid",
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByText("Press Enter to open this verified destination.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(taskFinder.locator(".ba-task-finder-search-result")).toContainText(
    "Verified destination: Finances — Check balances, pay tuition, view bills, and manage financial aid",
  );
  await page.locator("body").evaluate((body) => {
    delete body.dataset.nativeTaskFinderNavigation;
  });
  await taskSearch.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-navigation",
    "finances",
  );
  await expect(taskFinder).toBeHidden();
  await taskFinderToggle.press("Enter");

  for (const query of [
    "tuition and fees",
    "bills payments and refunds",
    "manage your personal finances",
  ]) {
    await taskSearch.fill(query);
    await expect(
      taskFinder.getByText(`1 result for “${query}”`, { exact: true }),
    ).toBeVisible();
    await expect(
      taskFinder.getByRole("button", {
        exact: true,
        name: "Open Finances — Check balances, pay tuition, view bills, and manage financial aid",
      }),
    ).toBeVisible();
  }

  for (const [query, destinationName] of [
    [
      "How can I drop a class",
      "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
    ],
    [
      "I want to swap a class",
      "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
    ],
    [
      "I need to see my grades",
      "Open Grades & Transcripts — View grades, get transcripts, and prove enrollment",
    ],
    [
      "I want to change my name",
      "Open Personal Info — Review official personal details or update contact information",
    ],
    [
      "I need an enrollment verification letter",
      "Open Proof of Enrollment — Request proof through National Student Clearinghouse",
    ],
    ["I lost my NYU ID card", "Open NYU Card Center"],
    ["student id", "Open NYU Card Center"],
    [
      "studentlink",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "financial aid and registration",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "student activities board",
      "Open Student Life",
    ],
    [
      "student guides",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "key links",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "student information and resources",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "getting around campus",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "academic services",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "communities and groups",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "how we engage",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "trainings and workshops",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "inclusive dialogue institute",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "community standards",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "office of the dean of students",
      "Open Student Services",
    ],
    ["report a concern", "Open Campus Safety"],
    ["wellness workshops", "Open Wellness Center"],
    ["mindfulnyu", "Open Student Life"],
    [
      "centers for connection and community",
      "Open Student Life",
    ],
    ["find my club", "Open Student Life"],
    ["music ensembles", "Open Student Life"],
    ["center for student life", "Open Student Life"],
    ["leadership launch", "Open Student Life"],
    ["student leadership week", "Open Student Life"],
    ["project outreach", "Open Student Life"],
    ["nyu service fair", "Open Student Life"],
    [
      "voting info for students",
      "Open Other Resources — NYU services, offices, and support",
    ],
    ["resident assistant application", "Open Housing"],
    ["NYU Meal Plan", "Open Housing"],
    ["Kosher Dining", "Open Housing"],
    ["Food Allergen Guide and Policy", "Open Housing"],
    ["Grubhub Mobile Ordering", "Open Housing"],
    ["Explore the Halls", "Open Housing"],
    ["Residential Life Policies", "Open Housing"],
    ["Off-Campus Living Resources", "Open Housing"],
    ["Find a Place to Stay", "Open Housing"],
    ["Incident Response Team", "Open Campus Safety"],
    ["Wifi, Streaming, and Technology", "Open Campus Resources"],
    ["social impact career hub", "Open Wasserman"],
    ["Wasserman Career Portal", "Open Wasserman"],
    ["career coaching", "Open Wasserman"],
    ["Handshake", "Open Wasserman"],
    ["On-Campus Employment", "Open Wasserman"],
    ["Experiential Learning", "Open Wasserman"],
    ["Career Hubs", "Open Wasserman"],
    ["Resume Guide and Samples", "Open Wasserman"],
    ["Fraudulent Job Postings", "Open Wasserman"],
    ["green workplace", "Open Campus Resources"],
    [
      "housing and dining",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "wellbeing resources",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "Health and Wellness",
      "Open Wellness Center",
    ],
    [
      "Career Development",
      "Open Wasserman",
    ],
    ["browse the course catalog", "Open Find Classes — Search by subject, course number, title, or instructor"],
    [
      "new student",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "orientation",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "new student orientation",
      "Open Other Resources — NYU services, offices, and support",
    ],
    ["pre orientation events", "Open OGS"],
    ["student support", "Open Student Services"],
    [
      "your academic advisor",
      "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
    ],
    [
      "Choosing a major",
      "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
    ],
    [
      "Course selection and sequencing",
      "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
    ],
    [
      "Tracking and maintaining progress",
      "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
    ],
    [
      "Developing skills and time management",
      "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
    ],
    ["Securing tutorial and other academic support", "Open Academic Support"],
    [
      "Preparing for graduation",
      "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
    ],
    [
      "Majors, Minors and Academic Planning",
      "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
    ],
    ["Defining educational and career goals", "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress"],
    ["Understanding school and University policies and procedures", "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress"],
    ["Adjusting to the college environment", "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress"],
    ["Combined joint degree accelerated and other specialized programs", "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress"],
    ["Planning for study abroad", "Open Office of Global Programs"],
    ["Involvement in co-curricular educational opportunities and activities", "Open Student Life"],
    ["Solving personal problems that impede academic work", "Open Student Services"],
    ["Liaison linkage with academic departments", "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress"],
    ["Finding Your Advisor", "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress"],
    ["Academic Resource Center", "Open Academic Support"],
    [
      "Prepare for Your Meeting",
      "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
    ],
    [
      "Professional Edge",
      "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
    ],
    [
      "Unique Academic Opportunities",
      "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
    ],
    [
      "NYU Academic Advising Framework",
      "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
    ],
    ["Bobst Library", "Open Campus Resources"],
    ["Studying Away", "Open Office of Global Programs"],
    [
      "NYU Engage: Find Clubs, Organizations, and Events",
      "Open Student Life",
    ],
    [
      "undergraduate advisement",
      "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
    ],
    ["accelerated studies", "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress"],
    ["academic tutoring at nyu", "Open Academic Support"],
    ["The Writing Center hosted by CAS", "Open Academic Support"],
    [
      "student complaint information",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "Kaplan All Access",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "Speaking Freely",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "Resources and Support for Students",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "Financial Education",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "Opportunity Programs",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "MLK, Jr. Scholars Program",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "Wellbeing Across NYU",
      "Open Other Resources — NYU services, offices, and support",
    ],
    ["Clinical Services", "Open Wellness Center"],
    ["Tune In To Your Wellbeing", "Open Wellness Center"],
    ["Infuse Wellbeing", "Open Wellness Center"],
    [
      "Find a Pop-Up Flu Clinic or Make an Appointment",
      "Open Wellness Center",
    ],
    ["Commuter Students", "Open Student Life"],
    ["Graduate Students", "Open Student Life"],
    ["LGBTQ+ Students", "Open Student Life"],
    ["Military Students and Vets", "Open Student Life"],
    ["Students with Children", "Open Student Life"],
    ["Students with Disabilities", "Open Campus Resources"],
    ["Class Registration", "Open Find Classes — Search by subject, course number, title, or instructor"],
    ["Student Visa & Immigration", "Open OGS"],
    ["Office of Global Services", "Open OGS"],
    ["Visa Information & Programs", "Open OGS"],
    ["Employment & Tax", "Open OGS"],
    ["Visa & Academic Changes", "Open OGS"],
    ["Know Your Rights", "Open OGS"],
    ["Understand Your Legal Requirements", "Open OGS"],
    ["International Student Hub", "Open OGS"],
    ["Troubleshooting Submitting an Online Form", "Open OGS"],
    ["Get a US Visa", "Open OGS"],
    ["International Student Services", "Open OGS"],
    ["Transfer to NYU", "Open OGS"],
    ["Plan Your Trip", "Open OGS"],
    ["Pre-Orientation Events", "Open OGS"],
    ["Journey to NYU Email Series", "Open OGS"],
    ["Campus Cash & NYUCard", "Open NYU Card Center"],
    ["NYU Bookstores", "Open Campus Resources"],
    ["Find More Student Guides", "Open Other Resources — NYU services, offices, and support"],
    ["More about StudentLink", "Open Other Resources — NYU services, offices, and support"],
    ["access clinical care", "Open Wellness Center"],
    ["book an appointment with nyu connect", "Open NYU Connect"],
    ["leadership opportunities", "Open Student Life"],
    ["food accessibility assistance", "Open Housing"],
    ["report an incident", "Open Campus Safety"],
    ["public transportation discounts", "Open Campus Resources"],
    [
      "first-year student",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "first semester advice",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "Advice for Your First Semester",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "Advice for Transfer Students",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "Time Management Guide",
      "Open Other Resources — NYU services, offices, and support",
    ],
    [
      "Where do I see my tuition bill",
      "Open Finances — Check balances, pay tuition, view bills, and manage financial aid",
    ],
    ["When do classes start", "Open Academic Calendar"],
    ["When is spring break", "Open Academic Calendar"],
    ["When are finals?", "Open Academic Calendar"],
    ["When is the withdrawal deadline?", "Open Academic Calendar"],
  ] as const) {
    await taskSearch.fill(query);
    await expect(
      taskFinder.getByText(`1 result for “${query}”`, { exact: true }),
    ).toBeVisible();
    await expect(
      taskFinder.getByRole("button", {
        exact: true,
        name: destinationName,
      }),
    ).toBeVisible();
  }

  await taskSearch.fill("When is the add/drop deadline?");
  await expect(
    taskFinder.getByText('1 result for “When is the add/drop deadline?”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Academic Calendar",
    }),
  ).toBeVisible();
  await page.locator("body").evaluate((body) => {
    delete body.dataset.nativeTaskFinderResource;
  });
  await taskSearch.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-resource",
    "calendar",
  );
  await expect(taskFinder).toBeHidden();
  await taskFinderToggle.press("Enter");

  for (const [query, destinationName] of [
    ["acadmic calendar", "Open Academic Calendar"],
    [
      "regster classes",
      "Open Find Classes — Search by subject, course number, title, or instructor",
    ],
    [
      "tution bill",
      "Open Finances — Check balances, pay tuition, view bills, and manage financial aid",
    ],
    ["housng", "Open Housing"],
  ] as const) {
    await taskSearch.fill(query);
    await expect(
      taskFinder.getByText(`1 result for “${query}”`, { exact: true }),
    ).toBeVisible();
    await expect(
      taskFinder.getByRole("button", {
        exact: true,
        name: destinationName,
      }),
    ).toBeVisible();
  }

  await taskSearch.fill("transcipt");
  await expect(
    taskFinder.getByText('2 results for “transcipt”', { exact: true }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Get Unofficial Transcript — View an unofficial academic record",
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open University Registrar",
    }),
  ).toBeVisible();
  await expect(
    taskFinder
      .getByRole("button", {
        exact: true,
        name: "Open University Registrar",
      })
      .locator(".ba-task-finder-item-copy > span"),
  ).toHaveText(
    "Open NYU Registrar instructions for ordering an official transcript",
  );
  await taskSearch.press("Enter");
  await expect(taskFinder).toBeVisible();
  await expect(taskSearch).toBeFocused();

  await taskSearch.fill("adress");
  await expect(
    taskFinder.getByText('2 results for “adress”', { exact: true }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Update Addresses — Change or review a saved address in Albert",
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Update Email Addresses — Change or review a saved email in Albert",
    }),
  ).toBeVisible();
  await taskSearch.press("Enter");
  await expect(taskFinder).toBeVisible();
  await expect(taskSearch).toBeFocused();

  await taskSearch.fill("new address");
  await expect(
    taskFinder.getByText('1 result for “new address”', { exact: true }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Update Addresses — Change or review a saved address in Albert",
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Update Email Addresses — Change or review a saved email in Albert",
    }),
  ).toHaveCount(0);
  await taskSearch.press("Enter");
  await expect(taskFinder).toBeHidden();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-tool",
    "addresses",
  );
  await taskFinderToggle.press("Enter");
  await expect(taskSearch).toBeFocused();

  await taskSearch.fill("finacial aid");
  await expect(
    taskFinder.getByText('2 results for “finacial aid”', { exact: true }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Check Financial Aid Status — Review aid status and requirements",
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Financial Aid",
    }),
  ).toBeVisible();

  await taskSearch.fill("How can I drop a class");
  await page.locator("body").evaluate((body) => {
    delete body.dataset.nativeTaskFinderNavigation;
  });
  await taskSearch.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-navigation",
    "academics",
  );
  await expect(taskFinder).toBeHidden();
  await taskFinderToggle.press("Enter");

  await taskSearch.fill("I need to change my phone number");
  await expect(
    taskFinder.getByText('1 result for “I need to change my phone number”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Update Phone Numbers — Change or review a saved phone number in Albert",
    }),
  ).toBeVisible();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await taskSearch.fill("preferred name");
  await expect(
    taskFinder.getByText('1 result for “preferred name”', { exact: true }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Review Personal Details — Review official demographic information, including legal name, gender, and date of birth",
    }),
  ).toBeVisible();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await taskSearch.fill("how do I contact my advisor");
  await expect(
    taskFinder.getByText('1 result for “how do I contact my advisor”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
    }),
  ).toBeVisible();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await taskSearch.fill("who is my advisor");
  await expect(
    taskFinder.getByText('1 result for “who is my advisor”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
    }),
  ).toBeVisible();
  await page.locator("body").evaluate((body) => {
    delete body.dataset.nativeTaskFinderNavigation;
  });
  await taskSearch.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-navigation",
    "academics",
  );
  await expect(taskFinder).toBeHidden();
  await taskFinderToggle.press("Enter");

  await taskSearch.fill("what can my advisor help with");
  await expect(
    taskFinder.getByText('1 result for “what can my advisor help with”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
    }),
  ).toBeVisible();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await taskSearch.fill("looking for academic calendar");
  await expect(
    taskFinder.getByText('1 result for “looking for academic calendar”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Academic Calendar",
    }),
  ).toBeVisible();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await taskSearch.fill("where can I find housing");
  await expect(
    taskFinder.getByText('1 result for “where can I find housing”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Housing",
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Law Housing",
    }),
  ).toHaveCount(0);
  await expect(
    taskFinder.getByText("Press Enter to open this verified destination.", {
      exact: true,
    }),
  ).toBeVisible();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await taskSearch.fill("where is my class schedule");
  await expect(
    taskFinder.getByText('1 result for “where is my class schedule”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(taskFinder.locator(".ba-task-finder-area")).toHaveCount(0);
  await expect(taskFinder.locator(".ba-task-finder-tool")).toHaveCount(1);
  await expect(taskFinder.locator(".ba-task-finder-resource")).toHaveCount(0);
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Weekly Schedule — Review your class week",
    }),
  ).toBeVisible();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await taskSearch.fill("what classes am I taking");
  await expect(
    taskFinder.getByText('1 result for “what classes am I taking”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Weekly Schedule — Review your class week",
    }),
  ).toBeVisible();
  await page.locator("body").evaluate((body) => {
    delete body.dataset.nativeTaskFinderTool;
  });
  await taskSearch.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-tool",
    "weekly-schedule",
  );
  await expect(taskFinder).toBeHidden();
  await taskFinderToggle.press("Enter");

  await taskSearch.fill("where is my classroom");
  await expect(
    taskFinder.getByText('1 result for “where is my classroom”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Find Classes — Search by subject, course number, title, or instructor",
    }),
  ).toBeVisible();
  await page.locator("body").evaluate((body) => {
    delete body.dataset.nativeTaskFinderTool;
  });
  await taskSearch.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-tool",
    "course-search",
  );
  await expect(taskFinder).toBeHidden();
  await taskFinderToggle.press("Enter");

  await taskSearch.fill("what classes do I need");
  await expect(
    taskFinder.getByText('1 result for “what classes do I need”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(taskFinder.locator(".ba-task-finder-area")).toHaveCount(0);
  await expect(taskFinder.locator(".ba-task-finder-tool")).toHaveCount(1);
  await expect(taskFinder.locator(".ba-task-finder-resource")).toHaveCount(0);
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Check Degree Progress — Review remaining degree requirements",
    }),
  ).toBeVisible();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await taskSearch.fill("prove I am enrolled");
  await expect(
    taskFinder.getByText('1 result for “prove I am enrolled”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(taskFinder.locator(".ba-task-finder-area")).toHaveCount(0);
  await expect(taskFinder.locator(".ba-task-finder-tool")).toHaveCount(1);
  await expect(taskFinder.locator(".ba-task-finder-resource")).toHaveCount(0);
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Proof of Enrollment — Request proof through National Student Clearinghouse",
    }),
  ).toBeVisible();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await taskSearch.fill("find a course");
  await expect(
    taskFinder.getByText('1 result for “find a course”', { exact: true }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Find Classes — Search by subject, course number, title, or instructor",
    }),
  ).toBeVisible();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await taskSearch.fill("how do I get my transcript");
  await expect(
    taskFinder.getByText('2 results for “how do I get my transcript”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Get Unofficial Transcript — View an unofficial academic record",
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open University Registrar",
    }),
  ).toBeVisible();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await taskSearch.fill("official transcript");
  await expect(
    taskFinder.getByText('1 result for “official transcript”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open University Registrar",
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: /Get Unofficial Transcript/,
    }),
  ).toHaveCount(0);
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await taskSearch.fill("unofficial transcript");
  await expect(
    taskFinder.getByText('1 result for “unofficial transcript”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Get Unofficial Transcript — View an unofficial academic record",
    }),
  ).toBeVisible();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await taskSearch.fill("where are my grades");
  await expect(
    taskFinder.getByText('1 result for “where are my grades”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Grades & Transcripts — View grades, get transcripts, and prove enrollment",
    }),
  ).toBeVisible();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await taskSearch.fill("where can I get my grades");
  await expect(
    taskFinder.getByText('1 result for “where can I get my grades”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Grades & Transcripts — View grades, get transcripts, and prove enrollment",
    }),
  ).toBeVisible();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await taskSearch.fill("I lost my NYU card");
  await expect(
    taskFinder.getByText('1 result for “I lost my NYU card”', { exact: true }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open NYU Card Center",
    }),
  ).toBeVisible();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await taskSearch.fill("I need counseling");
  await expect(
    taskFinder.getByText('1 result for “I need counseling”', { exact: true }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Wellness Center",
    }),
  ).toBeVisible();
  await taskSearch.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-resource",
    "wellness",
  );
  await expect(taskFinder).toBeHidden();
  await taskFinderToggle.press("Enter");

  await taskSearch.fill("international student visa");
  await expect(
    taskFinder.getByText('1 result for “international student visa”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open OGS",
    }),
  ).toBeVisible();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await page
    .locator(
      'a[href="/fixture-degree-progress"], a[href="/fixture-enrollment-verification"]',
    )
    .evaluateAll((links) => {
      for (const link of links) {
        link.remove();
      }
    });
  await expect(taskFinder).toBeHidden();
  await taskFinderToggle.click();
  await taskSearch.fill("what classes do I need");
  await expect(
    taskFinder.getByText('1 result for “what classes do I need”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
    }),
  ).toBeVisible();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();
  await taskSearch.fill("prove I am enrolled");
  await expect(
    taskFinder.getByText('1 result for “prove I am enrolled”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Grades & Transcripts — View grades, get transcripts, and prove enrollment",
    }),
  ).toBeVisible();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await taskSearch.fill("change my address");
  await expect(
    taskFinder.getByText('1 result for “change my address”', { exact: true }),
  ).toBeVisible();
  await expect(taskFinder.locator(".ba-task-finder-area")).toHaveCount(0);
  await expect(taskFinder.locator(".ba-task-finder-tool")).toHaveCount(1);
  await expect(taskFinder.locator(".ba-task-finder-resource")).toHaveCount(0);
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Update Addresses — Change or review a saved address in Albert",
    }),
  ).toBeVisible();
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await taskSearch.fill("internships");
  await expect(
    taskFinder.getByText('1 result for “internships”', { exact: true }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("heading", {
      exact: true,
      name: "Learning & career",
    }),
  ).toBeVisible();
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Wasserman",
    }),
  ).toBeVisible();
  await expect(taskFinder.locator(".ba-task-finder-jump")).toHaveCount(2);
  await taskFinder
    .getByRole("button", { exact: true, name: "Clear task search" })
    .click();

  await taskSearch.fill("wellness");
  await expect(
    taskFinder.getByText('1 result for “wellness”', { exact: true }),
  ).toBeVisible();
  await expect(taskFinder.locator(".ba-task-finder-area")).toHaveCount(0);
  await expect(taskFinder.locator(".ba-task-finder-tool")).toHaveCount(0);
  await expect(taskFinder.locator(".ba-task-finder-resource")).toHaveCount(1);
  await taskFinder
    .getByRole("button", { exact: true, name: "Open Wellness Center" })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-resource",
    "wellness",
  );
  await expect(taskFinder).toBeHidden();

  await taskFinderToggle.press("Enter");
  await expect(taskSearch).toHaveValue("");
  await expect(taskSearch).toBeFocused();
  await taskFinder
    .getByRole("button", {
      exact: true,
      name: "Open Find Classes — Search by subject, course number, title, or instructor",
    })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-tool",
    "course-search",
  );
  await expect(taskFinder).toBeHidden();

  await taskFinderToggle.press("Enter");
  await taskSearch.fill("financial aid");
  await expect(
    taskFinder.getByText('1 result for “financial aid”', { exact: true }),
  ).toBeVisible();
  await expect(taskFinder.locator(".ba-task-finder-area")).toHaveCount(0);
  await expect(taskFinder.locator(".ba-task-finder-tool")).toHaveCount(0);
  await expect(taskFinder.locator(".ba-task-finder-resource")).toHaveCount(1);
  await expect(
    taskFinder.getByRole("button", {
      exact: true,
      name: "Open Financial Aid",
    }),
  ).toBeVisible();
  await page.locator("body").evaluate((body) => {
    delete body.dataset.nativeTaskFinderResource;
  });
  await taskSearch.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-task-finder-resource",
    "financial-aid",
  );
  await expect(taskFinder).toBeHidden();

  await taskFinderToggle.press("Enter");
  await taskFinder
    .getByRole("button", {
      exact: true,
      name: "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
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

  const taskFinderToggle = page
    .locator(HEADER_HOST_SELECTOR)
    .getByRole("button", { name: "Find a task" });
  await page.evaluate(() => {
    const nativeCarousel = document.createElement("div");
    nativeCarousel.id = "synthetic-native-carousel";
    nativeCarousel.style.cssText =
      "position:fixed;z-index:2147483000;inset:260px auto auto 420px;width:240px;height:180px;background:#fff;pointer-events:auto";
    document.body.append(nativeCarousel);
  });
  await expect
    .poll(() => page.evaluate(() => document.elementFromPoint(500, 320)?.id))
    .toBe("synthetic-native-carousel");

  await taskFinderToggle.click();
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCSS(
    "z-index",
    "2147483647",
  );
  await expect
    .poll(() => page.evaluate(() => document.elementFromPoint(500, 320)?.id))
    .toBe(HEADER_HOST_SELECTOR.slice(1));

  await page
    .locator(HEADER_HOST_SELECTOR)
    .getByRole("button", { name: "Close task finder" })
    .click();
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCSS("z-index", "90");
  await expect
    .poll(() => page.evaluate(() => document.elementFromPoint(500, 320)?.id))
    .toBe("synthetic-native-carousel");

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

  await page.evaluate(() => {
    const verticalScrollProbe = document.createElement("div");
    verticalScrollProbe.id = "synthetic-vertical-scroll-probe";
    verticalScrollProbe.style.height = "1200px";
    document.body.append(verticalScrollProbe);
  });
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
  await routeSanitizedFixture(true);
  await page.goto(PORTAL_URL);
  await page.addStyleTag({
    content: `
      .native-account-notice {
        color: rgb(0, 107, 84);
        background: rgb(231, 246, 242);
      }
      .native-validation-error {
        color: rgb(180, 35, 24);
        background: rgb(255, 241, 240);
      }
    `,
  });

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
      "advising-section",
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
    if (family === "grades") {
      const careerSelect = page.locator(
        '[data-better-albert-region="term-selector"] select',
      );
      const termSelect = page.locator(
        '[data-better-albert-region="term-navigation"] select',
      );
      await expect(careerSelect).toHaveCount(1);
      await expect(termSelect).toHaveCount(1);
      await expect(
        page.locator("[data-better-albert-records-guidance]"),
      ).toHaveAttribute(
        "aria-description",
        /Quick access shows the transcript and enrollment-record options/,
      );
      await expect(
        page.locator("[data-better-albert-records-guidance]"),
      ).toHaveCSS("color", "rgb(11, 11, 11)");
      await expect(
        page.getByRole("navigation", {
          name: "Grades & Transcripts tools",
        }),
      ).toBeVisible();
      await expect(
        page
          .getByRole("navigation", {
            name: "Grades & Transcripts tools",
          })
          .getByRole("button")
          .first(),
      ).toHaveText(/View Grades/);
      const nativeCareerValue = await careerSelect.inputValue();
      await page
        .getByRole("button", {
          exact: true,
          name: "View Grades",
        })
        .click();
      await expect(careerSelect).toBeFocused();
      await expect(careerSelect).toHaveCSS(
        "outline-color",
        "rgb(87, 6, 140)",
      );
      await expect(careerSelect).not.toHaveAttribute("tabindex");
      await expect(careerSelect).toHaveValue(nativeCareerValue);
      await expect(
        page.getByRole("button", {
          exact: true,
          name: "Proof of Enrollment",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          exact: true,
          name: "Share Enrollment in MyHub",
        }),
      ).toBeVisible();
      const nativeRegistrar = page.locator('a[href="#registrar"]');
      await nativeRegistrar.evaluate((link) => {
        link.addEventListener("click", (event) => {
          event.preventDefault();
          document.body.dataset.nativeRegistrarOpened = "true";
        });
      });
      const officialTranscriptInfo = page.getByRole("button", {
        exact: true,
        name: "Official Transcript Guidance",
      });
      await expect(officialTranscriptInfo).toBeVisible();
      await officialTranscriptInfo.click();
      await expect(page.locator("body")).toHaveAttribute(
        "data-native-registrar-opened",
        "true",
      );
      await page.setViewportSize({ height: 900, width: 430 });
      const selectorGeometry = await page
        .locator(
          '[data-better-albert-region="term-selector"], [data-better-albert-region="term-navigation"]',
        )
        .evaluateAll((sections) =>
          sections.map((section) => {
            const bounds = section.getBoundingClientRect();
            return {
              bottom: bounds.bottom,
              top: bounds.top,
            };
          }),
        );
      expect(selectorGeometry).toHaveLength(2);
      const careerGeometry = selectorGeometry[0];
      const termGeometry = selectorGeometry[1];
      expect(careerGeometry).toBeDefined();
      expect(termGeometry).toBeDefined();
      if (careerGeometry && termGeometry) {
        expect(termGeometry.top - careerGeometry.bottom).toBeLessThanOrEqual(1);
      }
      await expect(careerSelect).toHaveCSS("min-height", "44px");
      await expect(termSelect).toHaveCSS("min-height", "44px");
      await page.setViewportSize({ height: 900, width: 1280 });
    } else if (family === "finances") {
      await expect(page.locator(".ba-page-description")).toHaveText(
        "Check balances, pay tuition, view bills, and manage financial aid",
      );
      const nativeAccountNotice = page.locator(".native-account-notice");
      await expect(nativeAccountNotice).toHaveCSS(
        "color",
        "rgb(0, 107, 84)",
      );
      await expect(nativeAccountNotice).toHaveCSS(
        "background-color",
        "rgb(231, 246, 242)",
      );
      await expect(nativeAccountNotice).toHaveCSS(
        "border-left-color",
        "rgb(0, 107, 84)",
      );
      await expect(
        page.locator('[data-better-albert-region="directory"]'),
      ).toHaveCount(1);
    } else if (family === "personal") {
      const nativeValidationError = page.locator(
        ".native-validation-error",
      );
      await expect(nativeValidationError).toHaveCSS(
        "color",
        "rgb(180, 35, 24)",
      );
      await expect(nativeValidationError).toHaveCSS(
        "background-color",
        "rgb(255, 241, 240)",
      );
      await expect(nativeValidationError).toHaveCSS(
        "border-left-color",
        "rgb(180, 35, 24)",
      );
      await expect(
        page.locator('[data-better-albert-region="directory"]'),
      ).not.toHaveCount(0);
    } else {
      await expect(
        page.locator('[data-better-albert-region="directory"]'),
      ).not.toHaveCount(0);
    }
    const nativeDirectories = page.locator(
      '[data-better-albert-region="directory"]',
    );
    if (
      family === "academics" ||
      family === "grades" ||
      family === "finances" ||
      family === "personal"
    ) {
      const directoryStates = await nativeDirectories.evaluateAll(
        (directories) =>
          directories.map((directory) => {
            const bounds = directory.getBoundingClientRect();
            return {
              height: bounds.height,
              inert: directory.hasAttribute("inert"),
              width: bounds.width,
            };
          }),
      );
      for (const state of directoryStates) {
        expect(state.inert, `${family} mirrored directory stays inert`).toBe(
          true,
        );
        expect(
          state.width,
          `${family} mirrored directory width`,
        ).toBeLessThanOrEqual(1);
        expect(
          state.height,
          `${family} mirrored directory height`,
        ).toBeLessThanOrEqual(1);
      }
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
    if (family !== "home") {
      const courseSearchShortcut = page.getByRole("button", {
        exact: true,
        name: "Find classes",
      });
      await expect(courseSearchShortcut).toBeVisible();
      await expect(courseSearchShortcut).toHaveAttribute(
        "data-course-search-mode",
        "home",
      );
      await expect(courseSearchShortcut).toContainText(
      "Open Course Search",
      );
      expect(
        await courseSearchShortcut.evaluate((button) =>
          Math.round(button.getBoundingClientRect().height),
        ),
      ).toBeGreaterThanOrEqual(44);
    }
    if (family === "academics") {
      const academicTools = page.getByRole("navigation", {
        name: "Academics tools",
      });
      await expect(page.locator(".ba-page-description")).toHaveText(
        "Course planning, advising, enrollment, and degree progress",
      );
      const academicJourney = page.locator(
        "[data-better-albert-academic-step]",
      );
      await expect(academicJourney).toHaveCount(5);
      await expect(
        page.getByRole("region", {
          exact: true,
          name: "Step 1 of 5 · Plan your path",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("region", {
          exact: true,
          name: "Step 5 of 5 · Track completion",
        }),
      ).toBeVisible();
      expect(
        await academicJourney.first().evaluate(
          (section) => getComputedStyle(section, "::before").content,
        ),
      ).toBe('"Step 1 of 5 · Plan your path"');
      const taskFirstPlacement = await academicTools.evaluate((navigation) => {
        const workspaceRow = navigation.parentElement;
        const primaryNavigation =
          workspaceRow?.querySelector(".ba-primary-nav");
        return {
          beforePrimaryNavigation: Boolean(
            primaryNavigation &&
              navigation.compareDocumentPosition(primaryNavigation) &
                Node.DOCUMENT_POSITION_FOLLOWING,
          ),
          startsInViewport:
            navigation.getBoundingClientRect().top < window.innerHeight,
          withinWorkspaceRow:
            workspaceRow?.classList.contains("ba-workspace-row") ?? false,
        };
      });
      expect(taskFirstPlacement).toEqual({
        beforePrimaryNavigation: true,
        startsInViewport: true,
        withinWorkspaceRow: true,
      });
      await page.evaluate(() => {
        document
          .querySelector<HTMLAnchorElement>('a[href="#planner"]')
          ?.addEventListener("click", (event) => {
            event.preventDefault();
            document.body.dataset.nativeAcademicPlannerActivated = "true";
          });
      });
      await expect(
        page.getByRole("button", {
          exact: true,
          name: "Schedule Advisor Meeting",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          exact: true,
          name: "Find My Advisor",
        }),
      ).toBeVisible();
      await page.evaluate(() => {
        document
          .querySelector<HTMLAnchorElement>('a[href="#home"]')
          ?.addEventListener("click", (event) => {
            event.preventDefault();
            document.body.dataset.nativeHomeForCourseSearchActivated = "true";
          });
      });
      await page
        .getByRole("button", { exact: true, name: "Find a task" })
        .click();
      const academicTaskFinder = page.getByRole("dialog", {
        exact: true,
        name: "Find a task",
      });
      const academicTaskSearch = academicTaskFinder.getByRole("searchbox", {
        exact: true,
        name: "Search classes, tasks, and resources",
      });
      await academicTaskSearch.fill("who is my advisor");
      await expect(
        academicTaskFinder.getByText('1 result for “who is my advisor”', {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        academicTaskFinder.getByRole("button", {
          exact: true,
          name: "Open Find My Advisor — Review your native advising network",
        }),
      ).toBeVisible();
      await academicTaskSearch.press("Enter");
      await expect(academicTaskFinder).toBeHidden();
      await expect(
        page.locator('[data-better-albert-region="advising-section"]'),
      ).toBeFocused();
      await page
        .getByRole("button", { exact: true, name: "Find a task" })
        .click();
      await academicTaskSearch.fill("class schedule");
      await expect(
        academicTaskFinder.getByText('1 result for “class schedule”', {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        academicTaskFinder.getByRole("button", {
          exact: true,
          name: "Open Find classes — Open Course Search",
        }),
      ).toBeVisible();
      await academicTaskSearch.fill("where is my classroom");
      await expect(
        academicTaskFinder.getByText('1 result for “where is my classroom”', {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        academicTaskFinder.getByRole("button", {
          exact: true,
          name: "Open Find classes — Open Course Search",
        }),
      ).toBeVisible();
      await academicTaskSearch.fill("financial aid status");
      await expect(
        academicTaskFinder.getByText('1 result for “financial aid status”', {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        academicTaskFinder.getByRole("button", {
          exact: true,
          name: "Open Finances — Check balances, pay tuition, view bills, and manage financial aid",
        }),
      ).toBeVisible();
      await academicTaskSearch.fill("find a course");
      await expect(
        academicTaskFinder.getByText('1 result for “find a course”', {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        academicTaskFinder.getByRole("button", {
          exact: true,
          name: "Open Find classes — Open Course Search",
        }),
      ).toBeVisible();
      await academicTaskSearch.press("Enter");
      await expect(page.locator("body")).toHaveAttribute(
        "data-native-home-for-course-search-activated",
        "true",
      );
      await page
        .getByRole("button", {
          exact: true,
          name: "Plan Future Courses",
        })
        .click();
      await expect(page.locator("body")).toHaveAttribute(
        "data-native-academic-planner-activated",
        "true",
      );
      const nativeEnrollButton = page.getByRole("button", {
        exact: true,
        name: "Enroll",
      });
      const nativeEnrollmentForm = page.locator(
        'form[action="/native/enrollment"]',
      );
      await expect(nativeEnrollmentForm).toHaveAttribute(
        "data-better-albert-region",
        "enrollment-action",
      );
      await expect(nativeEnrollmentForm).toHaveAttribute(
        "aria-label",
        "Official Albert enrollment step",
      );
      await expect(nativeEnrollmentForm).toHaveAttribute(
        "aria-description",
        "Review your selections in Albert before submitting.",
      );
      expect(
        await nativeEnrollmentForm.evaluate(
          (form) => getComputedStyle(form, "::before").content,
        ),
      ).toBe('"Official Albert enrollment step"');
      expect(
        await nativeEnrollmentForm.evaluate(
          (form) => getComputedStyle(form, "::after").content,
        ),
      ).toBe('"Review your selections in Albert before submitting."');
      await expect(nativeEnrollButton).toHaveAttribute("type", "submit");
      await expect(nativeEnrollButton).toHaveCSS("min-height", "44px");
      await expect(nativeEnrollmentForm).toContainText("Enroll");
      await page.evaluate(() => {
        document
          .querySelector<HTMLFormElement>('form[action="/native/enrollment"]')
          ?.addEventListener("submit", (event) => {
            event.preventDefault();
            document.body.dataset.nativeEnrollmentSubmitted = "true";
          });
      });
      await nativeEnrollButton.click();
      await expect(page.locator("body")).toHaveAttribute(
        "data-native-enrollment-submitted",
        "true",
      );
    } else if (family === "finances") {
      await expect(
        page.getByRole("navigation", { name: "Finances tools" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          exact: true,
          name: "Check Account Balance",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          exact: true,
          name: "Pay Tuition & View Bills",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          exact: true,
          name: "Get Account Statement",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          exact: true,
          name: "Check Financial Aid Status",
        }),
      ).toBeVisible();
      await page.evaluate(() => {
        document
          .querySelector<HTMLAnchorElement>('a[href="#account"]')
          ?.addEventListener("click", (event) => {
            event.preventDefault();
            document.body.dataset.nativeBursarAccountActivated = "true";
          });
      });
      await page
        .getByRole("button", { exact: true, name: "Find a task" })
        .click();
      const financeTaskFinder = page.getByRole("dialog", {
        exact: true,
        name: "Find a task",
      });
      const financeTaskSearch = financeTaskFinder.getByRole("searchbox", {
        exact: true,
        name: "Search classes, tasks, and resources",
      });
      await financeTaskSearch.fill("review my charges");
      await expect(
        financeTaskFinder.getByText('1 result for “review my charges”', {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        financeTaskFinder.getByRole("button", {
          exact: true,
          name: "Open Pay Tuition & View Bills — Pay tuition or review charges in NYU eSuite",
        }),
      ).toBeVisible();
      await financeTaskSearch.press("Enter");
      await expect(page.locator("body")).toHaveAttribute(
        "data-native-bursar-account-activated",
        "true",
      );
      await expect(financeTaskFinder).toBeHidden();
      const nativeAidSection = page.locator(
        '[data-better-albert-region="aid-section"]',
      );
      await expect(nativeAidSection).toHaveAttribute(
        "data-better-albert-focus-target",
        "",
      );
      await expect(nativeAidSection).toHaveAttribute("tabindex", "-1");
      await page
        .getByRole("button", {
          exact: true,
          name: "Check Financial Aid Status",
        })
        .click();
      await expect(nativeAidSection).toBeFocused();
      await expect(nativeAidSection).toHaveCSS(
        "outline-color",
        "rgb(87, 6, 140)",
      );
      const nativeBursarDirectory = page.locator("#NYUBursarLinks");
      await expect(nativeBursarDirectory).toHaveAttribute("inert", "");
      expect(
        await nativeBursarDirectory.evaluate((directory) => {
          const bounds = directory.getBoundingClientRect();
          return {
            connected: directory.isConnected,
            height: Math.round(bounds.height),
            width: Math.round(bounds.width),
          };
        }),
      ).toEqual({ connected: true, height: 1, width: 1 });
      await page.evaluate(() => {
        document
          .querySelector<HTMLAnchorElement>('a[href="#balance"]')
          ?.addEventListener("click", (event) => {
            event.preventDefault();
            document.body.dataset.nativeBursarBalanceActivated = "true";
          });
      });
      await page
        .getByRole("button", {
          exact: true,
          name: "Check Account Balance",
        })
        .click();
      await expect(page.locator("body")).toHaveAttribute(
        "data-native-bursar-balance-activated",
        "true",
      );
      const nativePaymentButton = page.getByRole("button", {
        exact: true,
        name: "Make a Payment",
      });
      const nativePaymentForm = page.locator(
        'form[action="/native/payment-provider"]',
      );
      await expect(nativePaymentForm).toHaveAttribute(
        "data-better-albert-region",
        "payment-action",
      );
      await expect(nativePaymentForm).toHaveAttribute(
        "aria-label",
        "Official Albert payment step",
      );
      await expect(nativePaymentForm).toHaveAttribute(
        "aria-description",
        "Payment processing remains outside Better Albert.",
      );
      expect(
        await nativePaymentForm.evaluate(
          (form) => getComputedStyle(form, "::before").content,
        ),
      ).toBe('"Official Albert payment step"');
      expect(
        await nativePaymentForm.evaluate(
          (form) => getComputedStyle(form, "::after").content,
        ),
      ).toBe('"Payment processing remains outside Better Albert."');
      await expect(nativePaymentButton).toHaveAttribute("type", "submit");
      await expect(nativePaymentButton).toHaveCSS("min-height", "44px");
      await expect(nativePaymentForm).toContainText("Make a Payment");
      await page.evaluate(() => {
        document
          .querySelector<HTMLFormElement>(
            'form[action="/native/payment-provider"]',
          )
          ?.addEventListener("submit", (event) => {
            event.preventDefault();
            document.body.dataset.nativePaymentSubmitted = "true";
          });
      });
      await nativePaymentButton.click();
      await expect(page.locator("body")).toHaveAttribute(
        "data-native-payment-submitted",
        "true",
      );
    } else if (family === "personal") {
      await expect(page.locator(".ba-page-description")).toHaveText(
        "Review official details and update contact information",
      );
      await expect(
        page.getByRole("navigation", { name: "Personal Info tools" }),
      ).toBeVisible();
      for (const tool of [
        "Review Personal Details",
        "Update Addresses",
        "Update Phone Numbers",
        "Update Email Addresses",
        "Update Emergency Contacts",
      ] as const) {
        await expect(
          page.getByRole("button", { exact: true, name: tool }),
        ).toBeVisible();
      }
      await expect(
        page.locator("[data-better-albert-personal-group]"),
      ).toHaveCount(4);
      expect(
        await page
          .locator('[data-better-albert-region="address-section"]')
          .evaluate((section) => getComputedStyle(section, "::before").content),
      ).toBe('"Contact information"');
      await page.evaluate(() => {
        document
          .querySelector<HTMLAnchorElement>('a[href="#phone"]')
          ?.addEventListener("click", (event) => {
            event.preventDefault();
            document.body.dataset.nativePhoneEditorActivated = "true";
          });
      });
      await page
        .getByRole("button", { exact: true, name: "Find a task" })
        .click();
      const personalContactFinder = page.getByRole("dialog", {
        exact: true,
        name: "Find a task",
      });
      const personalContactSearch = personalContactFinder.getByRole(
        "searchbox",
        {
          exact: true,
          name: "Search classes, tasks, and resources",
        },
      );
      await personalContactSearch.fill("new phone number");
      await expect(
        personalContactFinder.getByText(
          '1 result for “new phone number”',
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        personalContactFinder.getByRole("button", {
          exact: true,
          name: "Open Update Phone Numbers — Change or review a saved phone number in Albert",
        }),
      ).toBeVisible();
      await personalContactSearch.press("Enter");
      await expect(page.locator("body")).toHaveAttribute(
        "data-native-phone-editor-activated",
        "true",
      );
      await expect(personalContactFinder).toBeHidden();
      for (const [query, destinationName, region] of [
        [
          "missing person contact",
          "Open Review Missing Person Contact — Review your saved missing person contact",
          "missing-person-section",
        ],
        [
          "citizenship",
          "Open Review Citizenship Information — Review citizenship information in Albert",
          "citizenship-section",
        ],
        [
          "identification",
          "Open Review Identification Information — Review identification information in Albert",
          "identifier-section",
        ],
      ] as const) {
        await page
          .getByRole("button", { exact: true, name: "Find a task" })
          .click();
        const personalTaskFinder = page.getByRole("dialog", {
          exact: true,
          name: "Find a task",
        });
        const personalTaskSearch = personalTaskFinder.getByRole("searchbox", {
          exact: true,
          name: "Search classes, tasks, and resources",
        });
        await personalTaskSearch.fill(query);
        await expect(
          personalTaskFinder.getByText(`1 result for “${query}”`, {
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          personalTaskFinder.getByRole("button", {
            exact: true,
            name: destinationName,
          }),
        ).toBeVisible();
        await personalTaskSearch.press("Enter");
        await expect(personalTaskFinder).toBeHidden();
        await expect(
          page.locator(`[data-better-albert-region="${region}"]`),
        ).toBeFocused();
      }
      const nativeProfileForm = page.locator(
        'form[action="/native/profile"]',
      );
      const nativeSaveButton = nativeProfileForm.getByRole("button", {
        exact: true,
        name: "Save",
      });
      const nativeCancelButton = nativeProfileForm.getByRole("button", {
        exact: true,
        name: "Cancel",
      });
      const nativeProfileInput = nativeProfileForm.locator(
        'input[name="preferred_name"]',
      );
      await expect(nativeProfileForm).toHaveAttribute(
        "aria-label",
        "Official Albert personal information form",
      );
      await expect(nativeProfileForm).toHaveAttribute(
        "aria-description",
        "Albert saves these changes. Better Albert does not store this information.",
      );
      expect(
        await nativeProfileForm.evaluate(
          (form) => getComputedStyle(form, "::before").content,
        ),
      ).toBe('"Official Albert edit form"');
      expect(
        await nativeProfileForm.evaluate(
          (form) => getComputedStyle(form, "::after").content,
        ),
      ).toBe(
        '"Albert saves these changes. Better Albert does not store this information."',
      );
      await expect(nativeSaveButton).toHaveAttribute("type", "submit");
      await expect(nativeCancelButton).toHaveAttribute("type", "button");
      await expect(nativeSaveButton).toHaveCSS("min-height", "44px");
      await expect(nativeCancelButton).toHaveCSS("min-height", "44px");
      await expect(nativeProfileInput).toHaveValue("[value removed]");
      const personalFormGeometry = await nativeProfileForm.evaluate((form) => {
        const section = form.parentElement?.closest(
          "[data-better-albert-region]",
        );
        const formBounds = form.getBoundingClientRect();
        const inputBounds = form
          .querySelector("input")
          ?.getBoundingClientRect();
        const sectionBounds = section?.getBoundingClientRect();
        const sectionStyle = section ? getComputedStyle(section) : undefined;
        return {
          formRight: formBounds.right,
          gridColumnEnd: sectionStyle?.gridColumnEnd,
          gridColumnStart: sectionStyle?.gridColumnStart,
          inputRight: inputBounds?.right,
          sectionRight: sectionBounds?.right,
        };
      });
      expect(personalFormGeometry.inputRight).toBeLessThanOrEqual(
        personalFormGeometry.formRight,
      );
      expect(personalFormGeometry.sectionRight).toBeDefined();
      expect(personalFormGeometry.gridColumnStart).toBe("1");
      expect(personalFormGeometry.gridColumnEnd).toBe("-1");
      await page.evaluate(() => {
        document
          .querySelector<HTMLFormElement>('form[action="/native/profile"]')
          ?.addEventListener("submit", (event) => {
            event.preventDefault();
            document.body.dataset.nativeProfileSubmitted = "true";
          });
      });
      await nativeSaveButton.click();
      await expect(page.locator("body")).toHaveAttribute(
        "data-native-profile-submitted",
        "true",
      );
    }

    for (const width of [200, 400, 600, 768, 899, 900, 1200, 1440] as const) {
      await page.setViewportSize({ height: 900, width });
      const alignment = await page.evaluate(() => {
        const bodyBounds = document.body.getBoundingClientRect();
        const quickAccessNavigation = document
          .querySelector("#better-albert-header-host")
          ?.shadowRoot?.querySelector<HTMLElement>(".ba-tool-nav");
        const quickAccessNavigationBounds =
          quickAccessNavigation?.getBoundingClientRect();
        const quickAccessItems = quickAccessNavigation
          ? Array.from(
              quickAccessNavigation.querySelectorAll<HTMLElement>(
                ".ba-tool-item",
              ),
            ).map((item) => item.getBoundingClientRect())
          : [];
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
          homeAttentionColumns: document.querySelector<HTMLElement>(
            '[data-better-albert-region="attention-section"] .NYU_same_height_width',
          )
            ? getComputedStyle(
                document.querySelector<HTMLElement>(
                  '[data-better-albert-region="attention-section"] .NYU_same_height_width',
                )!,
              ).gridTemplateColumns.trim().split(/\s+/).length
            : 0,
          homeAttentionWidth: Math.round(
            document
              .querySelector<HTMLElement>(
                '[data-better-albert-region="attention-section"]',
              )
              ?.getBoundingClientRect().width ?? 0,
          ),
          homeScheduleWidth: Math.round(
            document
              .querySelector<HTMLElement>(
                '[data-better-albert-region="schedule-section"]',
              )
              ?.getBoundingClientRect().width ?? 0,
          ),
          enrollmentActionMinHeight: Math.round(
            Math.min(
              ...Array.from(
                document.querySelectorAll<HTMLElement>(
                  '[data-better-albert-region="enrollment-section"] button, [data-better-albert-region="enrollment-section"] input[type="button"], [data-better-albert-region="enrollment-section"] input[type="submit"]',
                ),
              ).map((control) => control.getBoundingClientRect().height),
              Number.MAX_SAFE_INTEGER,
            ),
          ),
          nativePaymentButtonHeight: Math.round(
            document
              .querySelector<HTMLElement>(
                '[data-better-albert-region="account-section"] form button[type="submit"]',
              )
              ?.getBoundingClientRect().height ?? 0,
          ),
          gradesNativeSelectorMinHeight: Math.round(
            Math.min(
              ...Array.from(
                document.querySelectorAll<HTMLElement>(
                  '[data-better-albert-region="term-selector"] select, [data-better-albert-region="term-navigation"] select',
                ),
              ).map((control) => control.getBoundingClientRect().height),
              Number.MAX_SAFE_INTEGER,
            ),
          ),
          personalNativeActionMinHeight: Math.round(
            Math.min(
              ...Array.from(
                document.querySelectorAll<HTMLElement>(
                  '[data-better-albert-layout="family-content"] [data-better-albert-region] a, [data-better-albert-layout="family-content"] form button, [data-better-albert-layout="family-content"] form input[type="button"], [data-better-albert-layout="family-content"] form input[type="submit"]',
                ),
              )
                .filter((control) => !control.closest("[inert]"))
                .map((control) => control.getBoundingClientRect())
                .filter((bounds) => bounds.width > 1 && bounds.height > 1)
                .map((bounds) => bounds.height),
              Number.MAX_SAFE_INTEGER,
            ),
          ),
          quickAccessOverflow: quickAccessItems.filter(
            (bounds) =>
              bounds.left <
                Math.max(0, quickAccessNavigationBounds?.left ?? 0) - 1 ||
              bounds.right >
                Math.min(
                  window.innerWidth,
                  quickAccessNavigationBounds?.right ?? window.innerWidth,
                ) +
                  1,
          ).length,
          quickAccessRows: new Set(
            quickAccessItems.map((bounds) => Math.round(bounds.top)),
          ).size,
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
        width < 900
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
      expect(
        alignment.quickAccessOverflow,
        `${family} Quick access overflow at ${width}px`,
      ).toBe(0);
      if (width < 900) {
        const compactDescriptionTools =
          family === "academics"
            ? (["what-if-report"] as const)
            : family === "grades"
              ? ([
                  "enrollment-verification",
                  "myhub-enrollment-verification",
                ] as const)
              : family === "finances"
                ? ([
                    "bursar-balance",
                    "bursar-account",
                    "account-statement",
                  ] as const)
                : [];
        for (const toolId of compactDescriptionTools) {
          const compactExplanation = page.locator(
            `.ba-tool-item[data-tool-id="${toolId}"] .ba-tool-description`,
          );
          await expect(compactExplanation).toBeVisible();
          await expect(compactExplanation).toHaveCSS(
            "color",
            "rgb(92, 92, 92)",
          );
        }
        if (family === "grades") {
          const officialTranscriptExplanation = page.locator(
            '.ba-context-resource-item[data-resource-id="university-registrar"] .ba-tool-description',
          );
          await expect(officialTranscriptExplanation).toBeVisible();
          await expect(officialTranscriptExplanation).toHaveText(
            "Open NYU Registrar instructions for ordering an official transcript",
          );
          await expect(officialTranscriptExplanation).toHaveCSS(
            "color",
            "rgb(92, 92, 92)",
          );
        }
      }
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
      if (family === "home") {
        expect(
          alignment.enrollmentActionMinHeight,
          `home native enrollment target at ${width}px`,
        ).toBeGreaterThanOrEqual(44);
        if (width >= 900) {
          expect(alignment.homeAttentionWidth).toBeGreaterThan(
            alignment.homeScheduleWidth,
          );
        } else {
          expect(alignment.homeAttentionWidth).toBe(
            alignment.homeScheduleWidth,
          );
        }
        if (width <= 400) {
          expect(alignment.homeAttentionColumns).toBe(1);
        }
        if (width >= 1200) {
          expect(alignment.homeAttentionColumns).toBeGreaterThanOrEqual(2);
        }
      } else if (family === "academics") {
        expect(
          alignment.enrollmentActionMinHeight,
          `academics native enrollment target at ${width}px`,
        ).toBeGreaterThanOrEqual(44);
      }
      if (family === "academics" && width === 400) {
        expect(alignment.quickAccessRows).toBeGreaterThan(1);
      }
      if (family === "finances") {
        expect(
          alignment.nativePaymentButtonHeight,
          `finances native payment target at ${width}px`,
        ).toBeGreaterThanOrEqual(44);
      }
      if (family === "grades") {
        expect(
          alignment.gradesNativeSelectorMinHeight,
          `grades native selector target at ${width}px`,
        ).toBeGreaterThanOrEqual(44);
      }
      if (family === "personal") {
        expect(
          alignment.personalNativeActionMinHeight,
          `personal native action target at ${width}px`,
        ).toBeGreaterThanOrEqual(44);
      }
    }
  }

  const personalNativeDirectory = page.locator(".is_bb_LinkContainer").first();
  await expect(personalNativeDirectory).toHaveAttribute("inert", "");
  await page
    .getByRole("button", { exact: true, name: "Use original Albert" })
    .click();
  await expect(personalNativeDirectory).not.toHaveAttribute("inert", "");
  await expect(personalNativeDirectory).toBeVisible();
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
    ".ba-disable-button, .ba-nav-item:not(:disabled), .ba-task-finder-toggle, .ba-tool-item, .ba-resource-item",
  );
  expect(await controls.count()).toBeGreaterThanOrEqual(17);
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

  const nativeAreaNavigation = page.locator("#albert-native-navigation");
  const nativeHomeDirectory = page.locator("#nyuSSSHomeLinksStatic");
  const worker = await extensionWorker();
  await expect
    .poll(() => worker.evaluate(async () => chrome.action.getTitle({})))
    .toBe("Better Albert is on — click to turn it off");
  await expect
    .poll(() => worker.evaluate(async () => chrome.action.getBadgeText({})))
    .toBe("ON");
  await expect(nativeAreaNavigation).toBeHidden();
  await expect(nativeHomeDirectory).toHaveAttribute("inert", "");

  await page
    .getByRole("button", { exact: true, name: "Use original Albert" })
    .click();
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCount(0);
  await expect
    .poll(() => worker.evaluate(async () => chrome.action.getTitle({})))
    .toBe("Better Albert is off — click to turn it on");
  await expect
    .poll(() => worker.evaluate(async () => chrome.action.getBadgeText({})))
    .toBe("OFF");
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-better-albert-enabled",
    "",
  );
  await expect(page.locator("body")).toHaveCSS("position", "static");
  await expect(page.locator("body")).toHaveCSS("left", "auto");
  await expect(page.locator("body")).toHaveCSS("padding-left", "0px");
  await expect(page.locator("#NYU_ALBERT_LOGO")).toBeVisible();
  await expect(page.locator("#IS_BB_HEADER_MENU")).toBeVisible();
  await expect(page.locator("#IS_BB_HEADER_WRAPPER")).not.toHaveAttribute(
    "role",
    "navigation",
  );
  await expect(page.locator("#IS_BB_HEADER_WRAPPER")).not.toHaveAttribute(
    "aria-label",
    "Official Albert tools",
  );
  await expect(nativeAreaNavigation).toBeVisible();
  await expect(nativeAreaNavigation.locator(":scope > a")).toHaveCount(6);
  await expect(nativeHomeDirectory).not.toHaveAttribute("inert", "");
  await expect(nativeHomeDirectory).toBeVisible();
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

  await worker.evaluate(
    async ({ key }) => chrome.storage.local.set({ [key]: true }),
    { key: ENABLED_PREFERENCE_KEY },
  );
  await expect
    .poll(() => worker.evaluate(async () => chrome.action.getTitle({})))
    .toBe("Better Albert is on — click to turn it off");
  await expect
    .poll(() => worker.evaluate(async () => chrome.action.getBadgeText({})))
    .toBe("ON");
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCount(1);
  await expect(nativeAreaNavigation).toBeHidden();
  await expect(nativeHomeDirectory).toHaveAttribute("inert", "");
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
        }
        trigger.classList.toggle("megaMenuSelected", isOpening);
        if (isOpening) {
          document.body.dataset.nativeResourceOverlay = "opened";
        } else {
          document.body.dataset.nativeResourceOverlay = "closed";
        }
      });
    });

  const taskFinderToggle = page.locator(".ba-task-finder-toggle");
  const taskFinder = page.locator(".ba-task-finder");
  const pageTools = page.getByRole("navigation", { name: "Home tools" });
  const featuredResources = page.getByRole("navigation", {
    name: "NYU resources",
  });
  const otherResourcesToggle = page.getByRole("button", {
    exact: true,
    name: "Other Resources",
  });
  const homeResourceDirectory = page.getByRole("button", {
    exact: true,
    name: "Search NYU resources",
  });
  await expect(otherResourcesToggle).toHaveAttribute("aria-expanded", "false");
  await expect(homeResourceDirectory).toBeVisible();
  await expect(pageTools).toBeVisible();
  await expect(featuredResources).toBeVisible();
  await taskFinderToggle.click();
  await expect(taskFinder).toBeVisible();

  await homeResourceDirectory.click();
  const resourceSearch = page.getByRole("dialog", {
    exact: true,
    name: "Search NYU resources",
  });
  const resourceSearchInput = resourceSearch.getByRole("searchbox", {
    exact: true,
    name: "Search by service or need",
  });
  await expect(taskFinder).toBeVisible();
  await expect(resourceSearch).toBeVisible();
  await expect(resourceSearchInput).toBeFocused();
  await expect(taskFinderToggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-resource-overlay",
    "opened",
  );
  const nativeOverlay = page.locator(
    "#SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR",
  );
  await expect(nativeOverlay).toBeVisible();
  await expect(nativeOverlay).toHaveCSS("overflow", "hidden");
  const nativeDirectory = nativeOverlay.locator(":scope > ul");
  await expect(nativeDirectory).toHaveCSS("visibility", "hidden");
  await expect(nativeDirectory).toHaveCSS("pointer-events", "none");
  const closeOtherResources = page.getByRole("button", {
    exact: true,
    name: "Close Other Resources",
  });
  await expect(closeOtherResources).toHaveAttribute("aria-expanded", "true");
  await expect(
    closeOtherResources.locator(".ba-nav-label-compact"),
  ).toHaveText("Close");
  await expect(pageTools).toHaveCount(0);
  await expect(featuredResources).toHaveCount(0);
  await resourceSearch
    .getByRole("button", { name: "View Albert resource directory" })
    .click();
  await expect(resourceSearch).toBeHidden();
  await expect(taskFinderToggle).toHaveAttribute("aria-expanded", "false");
  await expect(nativeDirectory).toHaveCSS("visibility", "visible");
  await expect(nativeDirectory).toHaveCSS("pointer-events", "auto");
  await expect(nativeOverlay).toHaveCSS("position", "fixed");
  await expect(nativeOverlay).toHaveCSS("z-index", "2147483646");
  await page.evaluate(() => {
    const nativeCarousel = document.createElement("div");
    nativeCarousel.id = "synthetic-resource-carousel";
    nativeCarousel.style.cssText =
      "position:fixed;z-index:2147483000;inset:260px auto auto 420px;width:240px;height:180px;background:#fff;pointer-events:auto";
    document.body.append(nativeCarousel);
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .elementFromPoint(500, 320)
            ?.closest("#SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR")?.id,
      ),
    )
    .toBe("SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR");
  await expect(nativeDirectory).toHaveCSS("display", "grid");
  await expect(nativeOverlay).toHaveAttribute(
    "data-better-albert-resource-directory",
    "",
  );
  expect(
    await nativeOverlay.evaluate(
      (overlay) => getComputedStyle(overlay, "::before").content,
    ),
  ).toBe('"NYU Resources"');
  expect(
    await nativeDirectory.evaluate(
      (directory) => getComputedStyle(directory, "::before").content,
    ),
  ).toContain("use Search NYU resources above");
  await expect(
    nativeDirectory.locator(
      ":scope > li[data-better-albert-resource-category]",
    ),
  ).toHaveCount(21);
  await expect(
    nativeDirectory.locator(
      ":scope > li[data-better-albert-resource-category-start]",
    ),
  ).toHaveCount(5);
  expect(
    await nativeDirectory
      .locator(
        ":scope > li[data-better-albert-resource-category-start] > a",
      )
      .evaluateAll((anchors) =>
        anchors.map((anchor) =>
          anchor.getAttribute(
            "data-better-albert-resource-category-label",
          ),
        ),
      ),
  ).toEqual([
    "Academic & records",
    "Learning & career",
    "Money & campus services",
    "Global opportunities",
    "Wellbeing & campus life",
  ]);
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
  const nativeDirectoryWidth = await nativeDirectory.evaluate(
    (directory) => directory.getBoundingClientRect().width,
  );
  expect(
    await nativeDirectory
      .locator(":scope > li[data-better-albert-resource-category-start]")
      .evaluateAll((items, directoryWidth) =>
        items.every((item) => {
          const link = item.querySelector(":scope > a");
          if (!link) {
            return false;
          }
          const itemWidth = item.getBoundingClientRect().width;
          const linkWidth = link.getBoundingClientRect().width;
          return (
            itemWidth >= directoryWidth - 4 &&
            Math.abs(itemWidth - linkWidth) < 1
          );
        }),
      nativeDirectoryWidth,
    ),
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
    .locator('a[href="/fixture-card-center"]')
    .evaluate((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        document.body.dataset.nativeResourceSearchActivated =
          "nyu-card-center";
      });
    });
  await page
    .locator('a[href="/fixture-campus-safety"]')
    .evaluate((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        document.body.dataset.nativeResourceSearchActivated =
          "campus-safety";
      });
    });
  await page
    .locator('a[href="/fixture-student-services"]')
    .evaluate((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        document.body.dataset.nativeResourceSearchActivated =
          "student-services";
      });
    });
  await page
    .locator('a[href="/fixture-connect"]')
    .evaluate((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        document.body.dataset.nativeResourceSearchActivated = "nyu-connect";
      });
    });
  await page
    .locator('a[href="/fixture-academic-support"]')
    .evaluate((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        document.body.dataset.nativeResourceSearchActivated =
          "academic-support";
      });
    });
  await page
    .locator(
      '#SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR > ul > li > a[href="/fixture-wellness"]',
    )
    .evaluate((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        document.body.dataset.nativeResourceSearchActivated =
          "wellness-center";
      });
    });
  await page
    .locator(
      '#SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR > ul > li > a[href="/fixture-housing"]',
    )
    .evaluate((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        document.body.dataset.nativeResourceSearchActivated = "housing";
      });
    });
  await page
    .locator(
      '#SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR > ul > li > a[href="/fixture-campus-resources"]',
    )
    .evaluate((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        document.body.dataset.nativeResourceSearchActivated =
          "campus-resources";
      });
    });
  await page
    .locator(
      '#SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR > ul > li > a[href="/fixture-student-life"]',
    )
    .evaluate((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        document.body.dataset.nativeResourceSearchActivated = "student-life";
      });
    });
  await page
    .locator(
      '#SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR > ul > li > a[href="/fixture-wasserman"]',
    )
    .evaluate((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        document.body.dataset.nativeResourceSearchActivated = "wasserman";
      });
    });
  await page
    .locator(
      '#SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR > ul > li > a[href="/fixture-ogs"]',
    )
    .evaluate((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        document.body.dataset.nativeResourceSearchActivated = "ogs";
      });
    });
  const resourceSearchToggle = page.getByRole("button", {
    exact: true,
    name: "Search NYU resources",
  });
  await expect(resourceSearchToggle).toBeVisible();
  await expect(resourceSearchToggle).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await resourceSearchToggle.click();
  await expect(resourceSearch).toBeVisible();
  await expect(resourceSearchInput).toBeFocused();
  await expect(page.locator("html")).toHaveAttribute(
    "data-better-albert-task-finder-open",
    "",
  );
  await expect(nativeOverlay).toHaveCSS("overflow", "hidden");
  await expect(nativeDirectory).toHaveCSS("visibility", "hidden");
  await expect(nativeDirectory).toHaveCSS("pointer-events", "none");
  await expect(resourceSearch.locator(".ba-task-finder-area")).toHaveCount(0);
  await expect(resourceSearch.locator(".ba-task-finder-tool")).toHaveCount(0);
  await expect(resourceSearch.locator(".ba-task-finder-resource")).toHaveCount(
    21,
  );
  const popularResources = resourceSearch.getByRole("group", {
    name: "Popular resources",
  });
  await expect(popularResources.getByRole("button")).toHaveCount(14);
  expect(
    await popularResources.getByRole("button").allTextContents(),
  ).toEqual([
    "Academic dates",
    "Course materials",
    "Academic support",
    "Student life",
    "Career help",
    "Financial aid",
    "ID card",
    "Health & counseling",
    "Housing",
    "Tech & Wi-Fi",
    "International students",
    "Student success",
    "Student support",
    "Campus safety",
  ]);
  await popularResources
    .getByRole("button", { exact: true, name: "Campus safety" })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-resource-search-activated",
    "campus-safety",
  );
  await expect(resourceSearch).toBeHidden();
  await expect(nativeOverlay).toBeVisible();
  await resourceSearchToggle.click();
  await expect(resourceSearch).toBeVisible();
  await expect(resourceSearchInput).toBeFocused();
  await popularResources
    .getByRole("button", { exact: true, name: "ID card" })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-resource-search-activated",
    "nyu-card-center",
  );
  await expect(resourceSearch).toBeHidden();
  await expect(nativeOverlay).toBeVisible();
  await resourceSearchToggle.click();
  await expect(resourceSearch).toBeVisible();
  await expect(resourceSearchInput).toBeFocused();
  await popularResources
    .getByRole("button", { exact: true, name: "Student support" })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-resource-search-activated",
    "student-services",
  );
  await expect(resourceSearch).toBeHidden();
  await expect(nativeOverlay).toBeVisible();
  await resourceSearchToggle.click();
  await expect(resourceSearch).toBeVisible();
  await expect(resourceSearchInput).toBeFocused();
  await popularResources
    .getByRole("button", {
      exact: true,
      name: "International students",
    })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-resource-search-activated",
    "ogs",
  );
  await expect(resourceSearch).toBeHidden();
  await expect(nativeOverlay).toBeVisible();
  await resourceSearchToggle.click();
  await expect(resourceSearch).toBeVisible();
  await expect(resourceSearchInput).toBeFocused();
  await popularResources
    .getByRole("button", { exact: true, name: "Student success" })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-resource-search-activated",
    "nyu-connect",
  );
  await expect(resourceSearch).toBeHidden();
  await expect(nativeOverlay).toBeVisible();
  await resourceSearchToggle.click();
  await expect(resourceSearch).toBeVisible();
  await expect(resourceSearchInput).toBeFocused();

  for (const [label, resourceId] of [
    ["Academic support", "academic-support"],
    ["Student life", "student-life"],
    ["Career help", "wasserman"],
  ] as const) {
    await popularResources
      .getByRole("button", { exact: true, name: label })
      .click();
    await expect(page.locator("body")).toHaveAttribute(
      "data-native-resource-search-activated",
      resourceId,
    );
    await expect(resourceSearch).toBeHidden();
    await expect(nativeOverlay).toBeVisible();
    await resourceSearchToggle.click();
    await expect(resourceSearch).toBeVisible();
    await expect(resourceSearchInput).toBeFocused();
  }

  for (const query of [
    "NYU Engage",
    "NYU Engage: Find Clubs, Organizations, and Events",
    "student government",
    "service opportunities",
    "service opportunities and civic engagement",
    "multicultural education and programs",
    "veteran services",
    "global spiritual life",
    "MindfulNYU",
    "Centers for Connection and Community",
    "Find My Club",
    "Music Ensembles",
    "Center for Student Life",
    "Leadership Launch",
    "Student Leadership Week",
    "Project Outreach",
    "NYU Service Fair",
    "Day of Service",
  ]) {
    await resourceSearchInput.fill(query);
    await expect(
      resourceSearch.getByText(`1 result for “${query}”`, { exact: true }),
    ).toBeVisible();
    await expect(
      resourceSearch.getByRole("button", {
        exact: true,
        name: "Open Student Life",
      }),
    ).toBeVisible();
  }

  for (const query of [
    "student success",
    "student success specialist",
    "success network",
    "request assistance",
    "academic coaching",
    "schedule support appointment",
  ]) {
    await resourceSearchInput.fill(query);
    await expect(
      resourceSearch.getByText(`1 result for “${query}”`, { exact: true }),
    ).toBeVisible();
    await expect(
      resourceSearch.getByRole("button", {
        exact: true,
        name: "Open NYU Connect",
      }),
    ).toBeVisible();
  }
  await resourceSearchInput.fill("student success specialist");
  await resourceSearchInput.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-resource-search-activated",
    "nyu-connect",
  );
  await expect(resourceSearch).toBeHidden();
  await expect(nativeOverlay).toBeVisible();
  await resourceSearchToggle.click();
  await expect(resourceSearch).toBeVisible();
  await expect(resourceSearchInput).toBeFocused();

  for (const query of [
    "I need an I-20",
    "DS-2019",
    "travel signature",
    "maintain F-1 status",
    "CPT",
    "OPT",
    "work authorization",
    "international student check-in",
    "Office of Global Services",
    "Visa Information & Programs",
    "Employment & Tax",
    "Visa & Academic Changes",
    "Know Your Rights",
    "Understand Your Legal Requirements",
    "International Student Hub",
    "Troubleshooting Submitting an Online Form",
    "Get a US Visa",
    "Transfer to NYU",
    "Plan Your Trip",
    "Pre-Orientation Events",
    "Journey to NYU Email Series",
  ]) {
    await resourceSearchInput.fill(query);
    await expect(
      resourceSearch.getByText(`1 result for “${query}”`, { exact: true }),
    ).toBeVisible();
    await expect(
      resourceSearch.getByRole("button", {
        exact: true,
        name: "Open OGS",
      }),
    ).toBeVisible();
  }
  await resourceSearchInput.fill("I need an I-20");
  await resourceSearchInput.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-resource-search-activated",
    "ogs",
  );
  await expect(resourceSearch).toBeHidden();
  await expect(nativeOverlay).toBeVisible();
  await resourceSearchToggle.click();
  await expect(resourceSearch).toBeVisible();
  await expect(resourceSearchInput).toBeFocused();

  for (const query of ["campus cash", "campus cash refund"]) {
    await resourceSearchInput.fill(query);
    await expect(
      resourceSearch.getByText(`1 result for “${query}”`, { exact: true }),
    ).toBeVisible();
    await expect(
      resourceSearch.getByRole("button", {
        exact: true,
        name: "Open NYU Card Center",
      }),
    ).toBeVisible();
    await expect(
      resourceSearch.getByRole("button", {
        exact: true,
        name: "Open Campus Resources",
      }),
    ).toHaveCount(0);
  }

  for (const query of [
    "Where can I buy textbooks?",
    "mail services",
    "pick up a package",
    "locker",
    "fix it",
    "gym",
  ]) {
    await resourceSearchInput.fill(query);
    await expect(
      resourceSearch.getByText(`1 result for “${query}”`, { exact: true }),
    ).toBeVisible();
    await expect(
      resourceSearch.getByRole("button", {
        exact: true,
        name: "Open Campus Resources",
      }),
    ).toBeVisible();
  }
  await resourceSearchInput.fill("Where can I buy textbooks?");
  await resourceSearchInput.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-resource-search-activated",
    "campus-resources",
  );
  await expect(resourceSearch).toBeHidden();
  await expect(nativeOverlay).toBeVisible();
  await resourceSearchToggle.click();
  await expect(resourceSearch).toBeVisible();
  await expect(resourceSearchInput).toBeFocused();

  await resourceSearchInput.fill("housing maintenance");
  await expect(
    resourceSearch.getByText('1 result for “housing maintenance”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    resourceSearch.getByRole("button", {
      exact: true,
      name: "Open Housing",
    }),
  ).toBeVisible();
  await expect(
    resourceSearch.getByRole("button", {
      exact: true,
      name: "Open Campus Resources",
    }),
  ).toHaveCount(0);

  for (const query of [
    "testing accommodations",
    "Moses Center",
    "disability services",
  ]) {
    await resourceSearchInput.fill(query);
    await expect(
      resourceSearch.getByText(`1 result for “${query}”`, { exact: true }),
    ).toBeVisible();
    await expect(
      resourceSearch.getByRole("button", {
        exact: true,
        name: "Open Campus Resources",
      }),
    ).toBeVisible();
  }
  await resourceSearchInput.fill("testing accommodations");
  await resourceSearchInput.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-resource-search-activated",
    "campus-resources",
  );
  await expect(resourceSearch).toBeHidden();
  await expect(nativeOverlay).toBeVisible();
  await resourceSearchToggle.click();
  await expect(resourceSearch).toBeVisible();
  await expect(resourceSearchInput).toBeFocused();

  await resourceSearchInput.fill("accessible housing");
  await expect(
    resourceSearch.getByText('1 result for “accessible housing”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    resourceSearch.getByRole("button", {
      exact: true,
      name: "Open Housing",
    }),
  ).toBeVisible();
  await expect(
    resourceSearch.getByRole("button", {
      exact: true,
      name: "Open Campus Resources",
    }),
  ).toHaveCount(0);

  for (const query of [
    "intramural and club sports",
    "commuter student",
    "LGBTQ center",
    "spiritual life",
    "student activities board",
    "student parent",
    "veteran student",
  ]) {
    await resourceSearchInput.fill(query);
    await expect(
      resourceSearch.getByText(`1 result for “${query}”`, { exact: true }),
    ).toBeVisible();
    await expect(
      resourceSearch.getByRole("button", {
        exact: true,
        name: "Open Student Life",
      }),
    ).toBeVisible();
  }
  await resourceSearchInput.fill("commuter student");
  await resourceSearchInput.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-resource-search-activated",
    "student-life",
  );
  await expect(resourceSearch).toBeHidden();
  await expect(nativeOverlay).toBeVisible();
  await resourceSearchToggle.click();
  await expect(resourceSearch).toBeVisible();
  await expect(resourceSearchInput).toBeFocused();

  for (const query of [
    "career development",
    "career center",
    "internships",
    "find a job or internship",
    "connect with alumni",
    "entrepreneurship resources",
    "social impact career hub",
    "Wasserman Career Portal",
    "career coaching",
    "Handshake",
    "On-Campus Employment",
    "Experiential Learning",
    "Career Hubs",
    "Resume Guide and Samples",
    "Fraudulent Job Postings",
  ]) {
    await resourceSearchInput.fill(query);
    await expect(
      resourceSearch.getByText(`1 result for “${query}”`, { exact: true }),
    ).toBeVisible();
    await expect(
      resourceSearch.getByRole("button", {
        exact: true,
        name: "Open Wasserman",
      }),
    ).toBeVisible();
  }
  await resourceSearchInput.fill("career development");
  await resourceSearchInput.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-resource-search-activated",
    "wasserman",
  );
  await expect(resourceSearch).toBeHidden();
  await expect(nativeOverlay).toBeVisible();
  await resourceSearchToggle.click();
  await expect(resourceSearch).toBeVisible();
  await expect(resourceSearchInput).toBeFocused();

  await popularResources
    .getByRole("button", { exact: true, name: "Tech & Wi-Fi" })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-resource-search-activated",
    "campus-resources",
  );
  await expect(resourceSearch).toBeHidden();
  await expect(nativeOverlay).toBeVisible();
  await resourceSearchToggle.click();
  await expect(resourceSearch).toBeVisible();
  await expect(resourceSearchInput).toBeFocused();

  for (const query of [
    "How do I get on Wi-Fi?",
    "Where can I print?",
    "library",
    "campus map",
    "student centers and spaces",
    "gyms and campus recreation",
    "student tech guide",
    "Printing on Campus",
    "student tech centers",
    "shuttle",
    "accessibility",
    "accessibility and accommodations",
    "athletics and fitness",
    "sustainability",
    "green workplace",
    "Wifi, Streaming, and Technology",
  ]) {
    await resourceSearchInput.fill(query);
    await expect(
      resourceSearch.getByText(`1 result for “${query}”`, { exact: true }),
    ).toBeVisible();
    await expect(
      resourceSearch.getByRole("button", {
        exact: true,
        name: "Open Campus Resources",
      }),
    ).toBeVisible();
  }
  await resourceSearchInput.fill("How do I get on Wi-Fi?");
  await resourceSearchInput.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-resource-search-activated",
    "campus-resources",
  );
  await expect(resourceSearch).toBeHidden();
  await expect(nativeOverlay).toBeVisible();
  await resourceSearchToggle.click();
  await expect(resourceSearch).toBeVisible();
  await expect(resourceSearchInput).toBeFocused();

  for (const query of [
    "on campus living",
    "off campus living",
    "summer housing",
    "dining on campus",
    "Dining on Campus and Meal Plans",
    "basic needs assistance",
    "resident assistant application",
    "NYU Meal Plan",
    "Kosher Dining",
    "Food Allergen Guide and Policy",
    "Grubhub Mobile Ordering",
    "Explore the Halls",
    "Residential Life Policies",
    "Off-Campus Living Resources",
    "Find a Place to Stay",
  ]) {
    await resourceSearchInput.fill(query);
    await expect(
      resourceSearch.getByText(`1 result for “${query}”`, { exact: true }),
    ).toBeVisible();
    await expect(
      resourceSearch.getByRole("button", {
        exact: true,
        name: "Open Housing",
      }),
    ).toBeVisible();
  }

  await resourceSearchInput.fill("meal plan");
  await expect(
    resourceSearch.getByText('1 result for “meal plan”', { exact: true }),
  ).toBeVisible();
  await expect(
    resourceSearch.getByRole("button", {
      exact: true,
      name: "Open Housing",
    }),
  ).toBeVisible();
  await expect(
    resourceSearch.getByText("Press Enter to open this verified destination.", {
      exact: true,
    }),
  ).toBeVisible();
  await resourceSearchInput.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-resource-search-activated",
    "housing",
  );
  await expect(resourceSearch).toBeHidden();
  await expect(nativeOverlay).toBeVisible();
  await resourceSearchToggle.click();
  await expect(resourceSearch).toBeVisible();
  await expect(resourceSearchInput).toBeFocused();

  await resourceSearchInput.fill("parking permit");
  await expect(
    resourceSearch.getByText('0 results for “parking permit”', { exact: true }),
  ).toBeVisible();
  await expect(resourceSearch.locator(".ba-task-finder-resource")).toHaveCount(
    0,
  );
  const showAllResources = resourceSearch.getByRole("button", {
    exact: true,
    name: "Show all NYU resources",
  });
  await expect(showAllResources).toHaveText("Show all");
  await showAllResources.click();
  await expect(resourceSearchInput).toBeFocused();
  await expect(resourceSearchInput).toHaveValue("");
  await expect(resourceSearch.locator(".ba-task-finder-resource")).toHaveCount(
    21,
  );
  await expect(popularResources).toBeVisible();

  for (const query of [
    "course materials",
    "Access course materials and collaborate with your class",
  ]) {
    await resourceSearchInput.fill(query);
    await expect(
      resourceSearch.getByText(`1 result for “${query}”`, { exact: true }),
    ).toBeVisible();
    await expect(
      resourceSearch.getByRole("button", {
        exact: true,
        name: "Open NYU Brightspace",
      }),
    ).toBeVisible();
  }

  await resourceSearchInput.fill("Browse important dates and deadlines");
  await expect(
    resourceSearch.getByText(
      '1 result for “Browse important dates and deadlines”',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    resourceSearch.getByRole("button", {
      exact: true,
      name: "Open Academic Calendar",
    }),
  ).toBeVisible();

  for (const query of [
    "Tutoring and Help with Classes",
    "help with classes",
  ]) {
    await resourceSearchInput.fill(query);
    await expect(
      resourceSearch.getByText(`1 result for “${query}”`, { exact: true }),
    ).toBeVisible();
    await expect(
      resourceSearch.getByRole("button", {
        exact: true,
        name: "Open Academic Support",
      }),
    ).toBeVisible();
  }

  await resourceSearchInput.fill("Where can I get tutoring?");
  await expect(
    resourceSearch.getByText('1 result for “Where can I get tutoring?”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    resourceSearch.getByRole("button", {
      exact: true,
      name: "Open Academic Support",
    }),
  ).toBeVisible();
  await resourceSearchInput.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-resource-search-activated",
    "academic-support",
  );
  await expect(resourceSearch).toBeHidden();
  await expect(nativeOverlay).toBeVisible();
  await resourceSearchToggle.click();
  await expect(resourceSearch).toBeVisible();
  await expect(resourceSearchInput).toBeFocused();

  await resourceSearchInput.fill("I want to get involved");
  await expect(
    resourceSearch.getByText('1 result for “I want to get involved”', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    resourceSearch.getByRole("button", {
      exact: true,
      name: "Open Student Life",
    }),
  ).toBeVisible();
  await resourceSearchInput.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-resource-search-activated",
    "student-life",
  );
  await expect(resourceSearch).toBeHidden();
  await expect(nativeOverlay).toBeVisible();
  await resourceSearchToggle.click();
  await expect(resourceSearch).toBeVisible();
  await expect(resourceSearchInput).toBeFocused();

  for (const query of [
    "wellness exchange",
    "counseling services",
    "health education",
    "Wellness Workshops",
  ]) {
    await resourceSearchInput.fill(query);
    await expect(
      resourceSearch.getByText(`1 result for “${query}”`, { exact: true }),
    ).toBeVisible();
    await expect(
      resourceSearch.getByRole("button", {
        exact: true,
        name: "Open Wellness Center",
      }),
    ).toBeVisible();
  }

  await resourceSearchInput.fill("I need help");
  await expect(
    resourceSearch.getByText('1 result for “I need help”', { exact: true }),
  ).toBeVisible();

  await resourceSearchInput.fill("Office of the Dean of Students");
  await expect(
    resourceSearch.getByText(
      '1 result for “Office of the Dean of Students”',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    resourceSearch.getByRole("button", {
      exact: true,
      name: "Open Student Services",
    }),
  ).toBeVisible();
  await expect(
    resourceSearch.getByRole("button", {
      exact: true,
      name: "Open Student Services",
    }),
  ).toBeVisible();

  await resourceSearchInput.fill("I need a doctor");
  await expect(
    resourceSearch.getByText('1 result for “I need a doctor”', { exact: true }),
  ).toBeVisible();
  await expect(
    resourceSearch.getByRole("button", {
      exact: true,
      name: "Open Wellness Center",
    }),
  ).toBeVisible();

  for (const query of [
    "I need health insurance help",
    "health and counseling",
    "I need mental health counseling",
    "Where do I submit immunization records?",
    "I need a medical appointment",
    "Where is the pharmacy?",
  ] as const) {
    await resourceSearchInput.fill(query);
    await expect(
      resourceSearch.getByText(`1 result for “${query}”`, { exact: true }),
    ).toBeVisible();
    await expect(
      resourceSearch.getByRole("button", {
        exact: true,
        name: "Open Wellness Center",
      }),
    ).toBeVisible();
  }
  await resourceSearchInput.fill("I need mental health counseling");
  await page.locator("body").evaluate((body) => {
    delete body.dataset.nativeResourceSearchActivated;
  });
  await resourceSearchInput.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-resource-search-activated",
    "wellness-center",
  );
  await expect(resourceSearch).toBeHidden();
  await expect(nativeOverlay).toBeVisible();
  await resourceSearchToggle.click();
  await expect(resourceSearch).toBeVisible();
  await expect(resourceSearchInput).toBeFocused();

  for (const [query, destinationName] of [
    ["counselor", "Open Wellness Center"],
    ["career center", "Open Wasserman"],
    ["I feel unsafe", "Open Campus Safety"],
    ["Report a Concern", "Open Campus Safety"],
    ["Incident Response Team", "Open Campus Safety"],
  ] as const) {
    await resourceSearchInput.fill(query);
    await expect(
      resourceSearch.getByText(`1 result for “${query}”`, { exact: true }),
    ).toBeVisible();
    await expect(
      resourceSearch.getByRole("button", {
        exact: true,
        name: destinationName,
      }),
    ).toBeVisible();
  }
  await resourceSearchInput.fill("id card");
  await expect(
    resourceSearch.getByText('1 result for “id card”', { exact: true }),
  ).toBeVisible();
  await expect(
    resourceSearch.getByRole("button", {
      exact: true,
      name: "Open NYU Card Center",
    }),
  ).toBeVisible();
  await resourceSearchInput.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-resource-search-activated",
    "nyu-card-center",
  );
  await expect(resourceSearch).toBeHidden();
  await expect(nativeOverlay).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-better-albert-task-finder-open",
  );
  await expect(nativeDirectory).toHaveCSS("visibility", "visible");
  await expect(nativeDirectory).toHaveCSS("pointer-events", "auto");

  await closeOtherResources.click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-resource-overlay",
    "closed",
  );
  await expect(nativeOverlay).toBeHidden();
  await expect(otherResourcesToggle).toHaveAttribute("aria-expanded", "false");
  await expect(homeResourceDirectory).toBeFocused();
  await expect(
    page.getByRole("button", { exact: true, name: "Find a task" }),
  ).toBeVisible();
  await expect(pageTools).toBeVisible();
  await expect(featuredResources).toBeVisible();

  await page.setViewportSize({ height: 800, width: 400 });
  await otherResourcesToggle.click();
  await expect(resourceSearch).toBeVisible();
  await expect(resourceSearchInput).toBeFocused();
  await resourceSearch
    .getByRole("button", { name: "View Albert resource directory" })
    .click();
  await expect(resourceSearch).toBeHidden();
  await expect(nativeOverlay).toBeVisible();
  await expect(closeOtherResources).toHaveAttribute("aria-expanded", "true");
  await expect(closeOtherResources).toHaveCSS(
    "background-color",
    "rgb(87, 6, 140)",
  );
  await expect(closeOtherResources).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(pageTools).toHaveCount(0);
  await expect(featuredResources).toHaveCount(0);
  await expect(nativeOverlay).toHaveCSS("position", "fixed");
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
  expect(mobileOverlayBounds.bottom).toBe(800);
  expect(mobileOverlayBounds.top).toBe(
    await page.locator(HEADER_HOST_SELECTOR).evaluate((host) =>
      Math.round(host.getBoundingClientRect().bottom),
    ),
  );
  const mobileCloseBounds = await closeOtherResources.evaluate((button) => {
    const bounds = button.getBoundingClientRect();
    return {
      height: Math.round(bounds.height),
      left: Math.round(bounds.left),
      right: Math.round(bounds.right),
    };
  });
  expect(mobileCloseBounds.height).toBeGreaterThanOrEqual(44);
  expect(mobileCloseBounds.left).toBeGreaterThanOrEqual(0);
  expect(mobileCloseBounds.right).toBeLessThanOrEqual(400);
  await resourceSearchToggle.click();
  await expect(resourceSearch).toBeVisible();
  const mobilePopularResources = resourceSearch.getByRole("group", {
    name: "Popular resources",
  });
  await expect(mobilePopularResources.getByRole("button")).toHaveCount(14);
  const mobilePopularGeometry = await mobilePopularResources.evaluate(
    (group) => {
      const bounds = group.getBoundingClientRect();
      const buttons = Array.from(group.querySelectorAll("button"));
      const firstButtonBounds = buttons[0]?.getBoundingClientRect();
      const list = group.querySelector<HTMLElement>(
        ".ba-task-finder-common-list",
      );
      return {
        documentOverflow:
          document.documentElement.scrollWidth - window.innerWidth,
        firstButtonWithinViewport: Boolean(
          firstButtonBounds &&
            firstButtonBounds.left >= bounds.left - 1 &&
            firstButtonBounds.right <= bounds.right + 1,
        ),
        minimumHeight: Math.min(
          ...buttons.map((button) => button.getBoundingClientRect().height),
        ),
        scrollOverflow: (list?.scrollWidth ?? 0) - (list?.clientWidth ?? 0),
      };
    },
  );
  expect(mobilePopularGeometry.documentOverflow).toBe(0);
  expect(mobilePopularGeometry.firstButtonWithinViewport).toBe(true);
  expect(mobilePopularGeometry.minimumHeight).toBeGreaterThanOrEqual(44);
  expect(mobilePopularGeometry.scrollOverflow).toBeGreaterThan(0);
  await expect(
    resourceSearch.getByText("Scroll for more", { exact: true }),
  ).toBeVisible();

  await page.setViewportSize({ height: 800, width: 664 });
  const zoomedPopularGeometry = await mobilePopularResources.evaluate(
    (group) => {
      const buttons = Array.from(group.querySelectorAll("button"));
      const list = group.querySelector<HTMLElement>(
        ".ba-task-finder-common-list",
      );
      const buttonTops = new Set(
        buttons.map((button) => Math.round(button.getBoundingClientRect().top)),
      );
      return {
        rowCount: buttonTops.size,
        scrollOverflow: (list?.scrollWidth ?? 0) - (list?.clientWidth ?? 0),
      };
    },
  );
  expect(zoomedPopularGeometry.rowCount).toBe(1);
  expect(zoomedPopularGeometry.scrollOverflow).toBeGreaterThan(0);
  await expect(
    resourceSearch.getByText("Scroll for more", { exact: true }),
  ).toBeVisible();
  await expect(
    resourceSearch.getByRole("button", {
      exact: true,
      name: "NYU resource results",
    }),
  ).toBeVisible();
  await expect(
    resourceSearch.locator(".ba-task-finder-jump-resource-category:visible"),
  ).toHaveCount(0);
  const firstMobileResource = resourceSearch
    .locator(".ba-task-finder-resource")
    .first();
  const mobileResourceGeometry = await firstMobileResource.evaluate(
    (resource) => {
      const bounds = resource.getBoundingClientRect();
      return {
        bottom: Math.round(bounds.bottom),
        top: Math.round(bounds.top),
        viewportHeight: window.innerHeight,
      };
    },
  );
  expect(mobileResourceGeometry.top).toBeGreaterThanOrEqual(0);
  expect(mobileResourceGeometry.bottom).toBeLessThanOrEqual(
    mobileResourceGeometry.viewportHeight,
  );
  const mobileBrowseAllTop = await resourceSearch
    .locator(".ba-task-finder-browse-all")
    .evaluate((button) => Math.round(button.getBoundingClientRect().top));
  expect(mobileBrowseAllTop).toBeGreaterThan(
    mobileResourceGeometry.bottom,
  );
  await resourceSearchInput.fill("Where can I get tutoring?");
  await expect(
    resourceSearch.getByRole("button", {
      exact: true,
      name: "Open Academic Support",
    }),
  ).toBeVisible();
  await resourceSearch
    .getByRole("button", { name: "Close resources" })
    .click();
  await expect(nativeOverlay).toBeHidden();
  await expect(otherResourcesToggle).toHaveAttribute("aria-expanded", "false");
  await expect(pageTools).toBeVisible();
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
    .getByRole("button", { exact: true, name: "Find Classes" })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-tool",
    "course-search",
  );
});

test("advances Find Classes through nested portal frames after delayed native controls render", async () => {
  await context.route(PORTAL_URL, (route) =>
    route.fulfill({
      body: fixtureHtml,
      contentType: "text/html; charset=utf-8",
      headers: {
        "content-security-policy":
          "default-src 'none'; frame-src https://sis.portal.nyu.edu",
      },
    }),
  );
  await context.route(COURSE_SEARCH_RELAY_URL, (route) =>
    route.fulfill({
      body: `<!doctype html>
        <html lang="en">
          <head><title>Sanitized portal modal layer</title></head>
          <body>
            <iframe
              title="Sanitized enrollment cart"
              src="${CLASS_SEARCH_URL}"
            ></iframe>
          </body>
        </html>`,
      contentType: "text/html; charset=utf-8",
      headers: {
        "content-security-policy":
          "default-src 'none'; frame-src https://sis.nyu.edu",
      },
    }),
  );
  await context.route(CLASS_SEARCH_URL, (route) =>
    route.fulfill({
      body: `<!doctype html>
        <html lang="en">
          <head><title>Sanitized Enrollment Shopping Cart</title></head>
          <body>
            <h3>Find Classes to add to your Enrollment cart using the options below</h3>
          </body>
        </html>`,
      contentType: "text/html; charset=utf-8",
    }),
  );
  await page.goto(PORTAL_URL);
  await page
    .locator('a[href="/fixture-course-search"]')
    .evaluate((link, relayUrl) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const frame = document.createElement("iframe");
        frame.title = "Sanitized course-search portal layer";
        frame.src = relayUrl;
        document.body.append(frame);
      });
    }, COURSE_SEARCH_RELAY_URL);

  await page
    .getByRole("button", { exact: true, name: "Find Classes" })
    .click();

  const portalLayer = page.frameLocator(
    'iframe[title="Sanitized course-search portal layer"]',
  );
  const cart = portalLayer.frameLocator(
    'iframe[title="Sanitized enrollment cart"]',
  );
  await cart.locator("body").evaluate((body) => {
    window.setTimeout(() => {
      body.insertAdjacentHTML(
        "beforeend",
        `<span><input type="radio" checked>Class Search</span>
         <a href="javascript:document.body.dataset.nativeSearchActivated='true'">Search</a>`,
      );
    }, 600);
  });

  await expect(cart.locator("body")).toHaveAttribute(
    "data-native-search-activated",
    "true",
    { timeout: 10_000 },
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
  await expect(nativeReturn).toHaveCSS("min-height", "44px");
  await nativeReturn.focus();
  await expect(nativeReturn).toBeFocused();
  await nativeReturn.click();

  for (const width of [200, 400, 600, 768, 899, 900, 1200, 1440] as const) {
    await page.setViewportSize({ height: 900, width });
    await expect(nativeReturn).toBeVisible();
    const dialogBounds = await page.locator("#pt_modals").evaluate((dialog) => {
      const bounds = dialog.getBoundingClientRect();
      return {
        bottom: bounds.bottom,
        documentOverflow:
          document.documentElement.scrollWidth - window.innerWidth,
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
      };
    });
    expect(dialogBounds.documentOverflow).toBe(0);
    expect(dialogBounds.left).toBeGreaterThanOrEqual(0);
    expect(dialogBounds.right).toBeLessThanOrEqual(width);
    expect(dialogBounds.top).toBeGreaterThanOrEqual(0);
    expect(dialogBounds.bottom).toBeLessThanOrEqual(900);
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
  await page.locator('a[href="/fixture-grades"]').evaluate((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.dataset.deepPageDelegatedArea = "grades";
    });
  });
  await page.locator('a[href="/fixture-academics"]').evaluate((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.dataset.deepPageDelegatedArea = "academics";
    });
  });
  await page
    .locator(
      '#SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR > ul > li > a[href="/fixture-calendar"]',
    )
    .evaluate((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        document.body.dataset.deepPageDelegatedResource = "calendar";
      });
    });
  const deepPagePromise = context.waitForEvent("page");
  await page.locator("#sanitized-deep-page").click();
  const deepPage = await deepPagePromise;
  await deepPage.waitForLoadState("domcontentloaded");

  await expect(deepPage.locator(HEADER_HOST_SELECTOR)).toHaveCount(1);
  await expect(deepPage.locator(".ba-page-title")).toHaveText("Academics");
  const deepTaskFinderToggle = deepPage.getByRole("button", {
    name: "Find a task",
  });
  await expect(deepTaskFinderToggle).toBeVisible();
  await expect(
    deepPage.getByRole("button", {
      exact: true,
      name: "Plan Future Courses",
    }),
  ).toHaveCount(0);
  await expect(
    deepPage.getByRole("button", {
      exact: true,
      name: "Check Degree Progress",
    }),
  ).toBeVisible();
  await expect(
    deepPage.getByRole("button", {
      exact: true,
      name: "Academic Calendar",
    }),
  ).toBeVisible();
  const deepAcademicsNavigation = deepPage.getByRole("button", {
    exact: true,
    name: "Academics",
  });
  await expect(deepAcademicsNavigation).toHaveAttribute(
    "aria-current",
    "page",
  );
  await deepAcademicsNavigation.click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-deep-page-delegated-area",
    "academics",
  );
  await deepTaskFinderToggle.click();
  const deepCurrentAreaSearch = deepPage.getByRole("searchbox", {
    name: "Search classes, tasks, and resources",
  });
  await deepCurrentAreaSearch.fill("plan courses");
  await expect(
    deepPage.getByText('1 result for “plan courses”', { exact: true }),
  ).toBeVisible();
  await expect(
    deepPage.getByRole("button", {
      exact: true,
      name: "Open Academics — Plan courses, manage enrollment, meet your advisor, and track degree progress",
    }),
  ).toBeVisible();
  await deepCurrentAreaSearch.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-deep-page-delegated-area",
    "academics",
  );
  await expect(deepPage.locator(".ba-task-finder")).toBeHidden();
  const deepGradesNavigation = deepPage.getByRole("button", {
    exact: true,
    name: "Grades & Transcripts",
  });
  await expect(deepGradesNavigation).toBeEnabled();
  await deepGradesNavigation.click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-deep-page-delegated-area",
    "grades",
  );

  await deepTaskFinderToggle.click();
  const deepTaskSearch = deepPage.getByRole("searchbox", {
    name: "Search classes, tasks, and resources",
  });
  await deepTaskSearch.fill("acadmic calendar");
  await expect(
    deepPage.getByText('1 result for “acadmic calendar”', { exact: true }),
  ).toBeVisible();
  await deepTaskSearch.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-deep-page-delegated-resource",
    "calendar",
  );
  await expect(deepPage.locator(".ba-task-finder")).toBeHidden();
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
        nativeControlMinHeight: Math.round(
          Math.min(
            ...Array.from(
              document.querySelectorAll<HTMLElement>(
                '[data-better-albert-layout="peoplesoft-page"] button, [data-better-albert-layout="peoplesoft-page"] input[type="button"], [data-better-albert-layout="peoplesoft-page"] input[type="submit"], [data-better-albert-layout="peoplesoft-page"] select, [data-better-albert-region="breadcrumbs"] a',
              ),
            )
              .map((control) => control.getBoundingClientRect())
              .filter((bounds) => bounds.width > 1 && bounds.height > 1)
              .map((bounds) => bounds.height),
            Number.MAX_SAFE_INTEGER,
          ),
        ),
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
    expect(
      responsiveAlignment.nativeControlMinHeight,
      `deep native control target at ${width}px`,
    ).toBeGreaterThanOrEqual(44);
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
  const delayedParentFixture = `<!doctype html>
    <html lang="en">
      <head><meta charset="utf-8" /><title>Loading</title></head>
      <body>
        <iframe title="Sanitized same-origin child" src="${SAME_ORIGIN_CHILD_URL}"></iframe>
      </body>
    </html>`;
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
      headers: {
        "content-security-policy":
          "default-src 'none'; style-src 'unsafe-inline'",
      },
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
  await expect(classSearch.locator(".ps_box-page")).toHaveAttribute(
    "data-better-albert-search-mode",
    "subject",
  );
  await expect(classSearch.locator("#subject")).toHaveAttribute(
    "placeholder",
    "Enter a subject",
  );
  await expect(classSearch.locator("#subject")).toHaveAttribute(
    "aria-description",
    "Enter a department or subject, then use Search.",
  );
  await expect(classSearch.locator("#subject")).toBeFocused();
  const primarySearchGeometry = await classSearch
    .locator(".ps_box-search")
    .evaluate((filter) => {
      const action = filter.querySelector<HTMLElement>(
        '[data-better-albert-region="primary-search-action"]',
      );
      const wrapper = action?.parentElement;
      if (!action || !wrapper) {
        return undefined;
      }
      const filterStyle = getComputedStyle(filter);
      const expectedWrapperWidth =
        filter.clientWidth -
        Number.parseFloat(filterStyle.paddingLeft) -
        Number.parseFloat(filterStyle.paddingRight);
      return {
        actionWidth: Math.round(action.getBoundingClientRect().width),
        wrapperWidth: Math.round(wrapper.getBoundingClientRect().width),
        expectedWrapperWidth: Math.round(expectedWrapperWidth),
      };
    });
  expect(primarySearchGeometry).toBeDefined();
  if (!primarySearchGeometry) {
    throw new Error("The native primary Class Search action wrapper is missing");
  }
  expect(primarySearchGeometry.wrapperWidth).toBe(
    primarySearchGeometry.expectedWrapperWidth,
  );
  expect(primarySearchGeometry.actionWidth).toBe(
    primarySearchGeometry.wrapperWidth,
  );
  await classSearch.locator("#career").focus();
  await classSearch.locator("body").evaluate((body) => {
    body.append(document.createElement("span"));
  });
  await expect(classSearch.locator("#career")).toBeFocused();
  await expect(classSearch.locator(".ps_box-search")).toHaveCSS(
    "display",
    "grid",
  );
  for (const selector of ["#term", "#career"]) {
    await expect(classSearch.locator(selector)).toHaveCSS(
      "min-height",
      "48px",
    );
  }
  expect(
    await classSearch
      .locator('label[for="subject"]')
      .evaluate((label) => getComputedStyle(label, "::before").content),
  ).toBe('"Search by subject"');
  await expect(classSearch.locator(".ps_grid-header")).toHaveCSS(
    "background-color",
    "rgb(238, 230, 243)",
  );
  const nativeStatuses = [
    {
      background: "rgb(231, 246, 242)",
      color: "rgb(0, 107, 84)",
      name: "Open",
    },
    {
      background: "rgb(255, 241, 240)",
      color: "rgb(180, 35, 24)",
      name: "Closed",
    },
    {
      background: "rgb(255, 247, 230)",
      color: "rgb(138, 75, 8)",
      name: "Waitlist",
    },
  ] as const;
  for (const status of nativeStatuses) {
    const statusCell = classSearch.getByRole("cell", {
      exact: true,
      name: status.name,
    });
    await expect(statusCell).toHaveCSS("color", status.color);
    await expect(statusCell).toHaveCSS(
      "background-color",
      status.background,
    );
    await expect(statusCell).toHaveCSS("border-color", status.color);
    await expect(statusCell).toHaveText(status.name);
  }
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
  for (const action of [addToCart, enroll]) {
    await expect(action).toHaveCSS("min-height", "44px");
  }
  const transactionForm = classSearch.locator('form[action="/native/enrollment"]');
  await expect(transactionForm).toHaveAttribute(
    "data-better-albert-region",
    "result-actions",
  );
  await expect(transactionForm).toHaveAttribute(
    "aria-label",
    "Official Albert next step",
  );
  expect(
    await transactionForm.evaluate(
      (form) => getComputedStyle(form, "::before").content,
    ),
  ).toBe('"Official Albert next step"');
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
  const desktopTaskFlow = await classSearch.locator(".ps_box-page").evaluate(
    (root) => {
      const filter = root.querySelector(".ps_box-search")?.getBoundingClientRect();
      const results = root.querySelector(".ps_grid-flex")?.getBoundingClientRect();
      const actions = root.querySelector(".ps_box-actions")?.getBoundingClientRect();
      return {
        actionGap: (actions?.top ?? 0) - (results?.bottom ?? 0),
        actionsBeforeFilterEnd: (actions?.top ?? 0) < (filter?.bottom ?? 0),
      };
    },
  );
  expect(desktopTaskFlow.actionGap).toBeGreaterThanOrEqual(0);
  expect(desktopTaskFlow.actionGap).toBeLessThanOrEqual(32);
  expect(desktopTaskFlow.actionsBeforeFilterEnd).toBe(true);
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

  await page.setViewportSize({ height: 900, width: 200 });
  await page.goto(CLASS_SEARCH_URL);
  await expect(page.locator("html")).toHaveAttribute(
    "data-better-albert-page",
    "academics",
  );
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCount(0);
  await expect(page.locator("body")).toHaveCSS("padding-left", "0px");
  const initialSearchVisibility = await page
    .locator('[data-better-albert-region="primary-search-input"]')
    .evaluate((input) => {
      const bounds = input.getBoundingClientRect();
      return {
        bottom: Math.round(bounds.bottom),
        top: Math.round(bounds.top),
        viewportHeight: window.innerHeight,
      };
    });
  expect(initialSearchVisibility.top).toBeGreaterThanOrEqual(0);
  expect(initialSearchVisibility.bottom).toBeLessThanOrEqual(
    initialSearchVisibility.viewportHeight,
  );

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

test("turns the exact classic Class Search selectors into a clear native search path", async () => {
  await context.route(CLASSIC_CLASS_SEARCH_URL, (route) =>
    route.fulfill({
      body: classicClassSearchFixtureHtml,
      contentType: "text/html; charset=utf-8",
      headers: { "content-security-policy": "default-src 'none'" },
    }),
  );
  await page.goto(CLASSIC_CLASS_SEARCH_URL);

  await expect(page.locator("html")).toHaveAttribute(
    "data-better-albert-adapter",
    "class-search",
  );
  const layout = page.locator(
    '[data-better-albert-layout="class-search-legacy"]',
  );
  const body = page.locator('[data-better-albert-layout="class-search-body"]');
  const filter = page.locator('[data-better-albert-region="filter"]');
  const nativeForm = page.locator("form#NYU_CLS_SRCH.PSForm");
  const selectorControls = page.locator(
    '[data-better-albert-region="selector-search-control"]',
  );
  const nativeSearch = page.getByRole("button", {
    exact: true,
    name: "Search",
  });

  await expect(layout).toHaveAttribute(
    "data-better-albert-search-mode",
    "selectors",
  );
  await expect(body).toHaveCount(1);
  await expect(nativeForm).toHaveAttribute("action", "/native/class-search");
  await expect(nativeForm).toHaveAttribute("method", "post");
  await expect(selectorControls).toHaveCount(2);
  await expect(page.locator("#NYU_CLS_WRK2_DESCR50")).toBeFocused();
  await page.locator("#NYU_CLS_WRK_ACAD_CAREER\\$0").focus();
  await page.locator("body").evaluate((body) => {
    body.append(document.createElement("span"));
  });
  await expect(page.locator("#NYU_CLS_WRK_ACAD_CAREER\\$0")).toBeFocused();
  await expect(nativeSearch).toHaveAttribute(
    "data-better-albert-region",
    "primary-search-action",
  );
  expect(
    await filter.evaluate(
      (element) => getComputedStyle(element, "::before").content,
    ),
  ).toBe('"Choose a subject"');
  for (const control of await selectorControls.all()) {
    await expect(control).toHaveCSS("min-height", "48px");
  }
  await expect(nativeSearch).toHaveCSS(
    "background-color",
    "rgb(87, 6, 140)",
  );
  await nativeSearch.evaluate((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.dataset.nativeClassicSearchActivated = "true";
    });
  });
  await nativeSearch.click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-classic-search-activated",
    "true",
  );
  await page
    .locator('[data-better-albert-region="result-row"] td')
    .first()
    .evaluate((cell) => {
      const description = document.createElement("span");
      description.textContent =
        " — A long synthetic course description with an uninterrupted identifier " +
        "FIRSTYEARSEMINARCOURSEDESCRIPTIONTHATMUSTREMAININSIDETHERESULTCARD";
      cell.append(description);
    });

  for (const width of [200, 400, 768, 900, 1280] as const) {
    await page.setViewportSize({ height: 900, width });
    const geometry = await page.evaluate((viewportWidth) => {
      const documentLayout = document.querySelector<HTMLElement>(
        '[data-better-albert-layout="class-search-legacy"]',
      );
      const workspace = document.querySelector<HTMLElement>(
        '[data-better-albert-layout="class-search-body"]',
      );
      const filterRegion = document.querySelector<HTMLElement>(
        '[data-better-albert-region="filter"]',
      );
      const resultsRegion = document.querySelector<HTMLElement>(
        '[data-better-albert-region="results"]',
      );
      const searchAction = document.querySelector<HTMLElement>(
        '[data-better-albert-region="primary-search-action"]',
      );
      const selectorWidths = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-better-albert-region="selector-search-control"]',
        ),
      ).map((control) => Math.round(control.getBoundingClientRect().width));
      const layoutBounds = documentLayout?.getBoundingClientRect();
      const filterBounds = filterRegion?.getBoundingClientRect();
      const resultsBounds = resultsRegion?.getBoundingClientRect();
      const overflowingResultText = resultsRegion
        ? Array.from(
            resultsRegion.querySelectorAll<HTMLElement>(
              '[data-better-albert-region="result-row"] *',
            ),
          ).filter((element) => {
            const bounds = element.getBoundingClientRect();
            return (
              bounds.left < (resultsBounds?.left ?? 0) - 1 ||
              bounds.right > (resultsBounds?.right ?? viewportWidth) + 1
            );
          }).length
        : -1;
      return {
        columns: workspace
          ? getComputedStyle(workspace).gridTemplateColumns.trim().split(/\s+/)
              .length
          : 0,
        documentOverflow:
          document.documentElement.scrollWidth - window.innerWidth,
        layoutLeft: Math.round(layoutBounds?.left ?? -1),
        layoutRight: Math.round(layoutBounds?.right ?? -1),
        overflowingResultText,
        resultsOverflow: Math.round(
          (resultsRegion?.scrollWidth ?? 0) -
            (resultsRegion?.clientWidth ?? 0),
        ),
        searchWidth: Math.round(
          searchAction?.getBoundingClientRect().width ?? 0,
        ),
        selectorWidths,
        stacked:
          viewportWidth < 900
            ? (resultsBounds?.top ?? 0) >= (filterBounds?.bottom ?? 0)
            : true,
      };
    }, width);
    expect(geometry.columns).toBe(width < 900 ? 1 : 2);
    expect(
      geometry.documentOverflow,
      `classic Class Search document overflow at ${width}px`,
    ).toBe(0);
    expect(geometry.layoutLeft).toBeGreaterThanOrEqual(0);
    expect(geometry.layoutRight).toBeLessThanOrEqual(width);
    expect(geometry.overflowingResultText).toBe(0);
    expect(geometry.resultsOverflow).toBeLessThanOrEqual(1);
    expect(geometry.stacked).toBe(true);
    for (const selectorWidth of geometry.selectorWidths) {
      expect(selectorWidth).toBe(geometry.searchWidth);
    }
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
  await expect(page.locator('[data-better-albert-region="group"]')).toHaveCount(0);
  await expect(
    page.locator('[data-better-albert-region="result-actions"]'),
  ).toHaveCount(1);
  await expect(page.locator('[data-better-albert-region="filter"]')).toHaveCount(1);
  await expect(page.locator('[data-better-albert-region="results"]')).toHaveCount(1);
  await expect(
    page.locator('[data-better-albert-layout="class-search-legacy"]'),
  ).toHaveAttribute("data-better-albert-search-mode", "combined");
  await expect(
    page.locator('[data-better-albert-layout="class-search-body"]'),
  ).toHaveCount(1);
  await expect(page.locator("#subject")).toBeFocused();
  await page.locator("#description").focus();
  await page.locator("body").evaluate((body) => {
    body.append(document.createElement("span"));
  });
  await expect(page.locator("#description")).toBeFocused();
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCount(0);
  await expect(page.locator("#PT_WRAPPER")).toHaveCSS(
    "border-top-color",
    "rgb(87, 6, 140)",
  );
  await expect(page.locator(".PAPAGETITLE")).toHaveCSS("font-weight", "900");

  const nativeSkipAnchors = page.locator("a.ps-anchor");
  await expect(nativeSkipAnchors).toHaveCount(2);
  for (const nativeSkipAnchor of await nativeSkipAnchors.all()) {
    await expect(nativeSkipAnchor).toHaveCSS("position", "fixed");
    await expect(nativeSkipAnchor).toHaveCSS("opacity", "0");
    await expect(nativeSkipAnchor).toHaveCSS("pointer-events", "none");
  }
  const nativeFirstSkip = nativeSkipAnchors.first();
  await expect(nativeFirstSkip).toHaveAttribute("href", "#legacy-main");
  await nativeFirstSkip.evaluate((anchor) => {
    anchor.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.dataset.nativeClassSearchSkipActivated = "true";
    });
  });
  await nativeFirstSkip.focus();
  await expect(nativeFirstSkip).toBeVisible();
  await expect(nativeFirstSkip).toHaveCSS("min-height", "44px");
  await expect(nativeFirstSkip).toHaveCSS("opacity", "1");
  await expect(nativeFirstSkip).toHaveCSS("pointer-events", "auto");
  await nativeFirstSkip.press("Enter");
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-class-search-skip-activated",
    "true",
  );

  const nativeForm = page.locator("form#NYU_SSENRL_CART_FL.PSForm");
  const nativeSearches = page.getByRole("button", { name: "Search" });
  const nativePrimarySearch = nativeSearches.first();
  const nativeDescriptionSearch = nativeSearches.last();
  const nativeContinue = page.getByRole("button", { name: "Continue" });
  const nativeResultActions = page.locator("#sanitized-actions");
  await expect(nativeResultActions).toHaveAttribute(
    "aria-label",
    "Official Albert next step",
  );
  expect(
    await nativeResultActions.evaluate(
      (actions) => getComputedStyle(actions, "::before").content,
    ),
  ).toBe('"Official Albert next step"');
  await expect(nativeForm).toHaveAttribute("action", "/native/class-search");
  await expect(nativeForm).toHaveAttribute("method", "post");
  await expect(nativeForm.locator('[name="native_token"]')).toHaveValue(
    "synthetic-token",
  );
  await expect(page.locator('#subject')).toHaveCSS("min-height", "52px");
  for (const selector of ['#open-only', '#delivery-in-person']) {
    await expect(page.locator(selector)).toHaveCSS("width", "20px");
    await expect(page.locator(selector)).toHaveCSS("height", "20px");
  }
  await expect(page.locator("#synthetic-file")).toHaveCSS(
    "min-height",
    "44px",
  );
  const secondarySearchRow = page
    .locator(".ps_box-row")
    .filter({ has: page.locator("#description") });
  expect(
    await secondarySearchRow.evaluate(
      (element) => getComputedStyle(element, "::before").content,
    ),
  ).toBe('"More search options"');
  await expect(page.locator("#subject")).toHaveAttribute(
    "data-better-albert-region",
    "primary-search-input",
  );
  expect(
    await page
      .locator('[data-better-albert-region="primary-search-label"]')
      .evaluate((label) => getComputedStyle(label, "::after").content),
  ).toBe('"Use one field for subject, course number, title, or instructor."');
  await page.locator("#subject").focus();
  await expect(nativeFirstSkip).toHaveCSS("opacity", "0");
  await expect(
    page.getByRole("textbox", {
      exact: true,
      name: "Find a class by subject, course number, title, or instructor",
    }),
  ).toHaveAttribute(
    "placeholder",
    "Subject, course, title, or instructor",
  );
  await expect(page.locator("#subject")).toHaveAttribute(
    "aria-description",
    "Use one field for subject, course number, title, or instructor.",
  );
  await expect(nativePrimarySearch).toHaveAttribute(
    "data-better-albert-region",
    "primary-search-action",
  );
  await expect(nativePrimarySearch).toHaveCSS(
    "background-color",
    "rgb(87, 6, 140)",
  );
  for (const control of [nativeDescriptionSearch, nativeContinue]) {
    await expect(control).toHaveCSS("min-height", "44px");
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
      const primaryInput = document.querySelector<HTMLElement>(
        '[data-better-albert-region="primary-search-input"]',
      );
      const primaryAction = document.querySelector<HTMLElement>(
        '[data-better-albert-region="primary-search-action"]',
      );
      return {
        bodyColumns: body
          ? getComputedStyle(body).gridTemplateColumns.trim().split(/\s+/).length
          : 0,
        documentOverflow:
          document.documentElement.scrollWidth - window.innerWidth,
        layoutLeft: Math.round(layoutBounds?.left ?? -1),
        layoutRight: Math.round(layoutBounds?.right ?? -1),
        primaryActionWidth: Math.round(
          primaryAction?.getBoundingClientRect().width ?? 0,
        ),
        primaryInputWidth: Math.round(
          primaryInput?.getBoundingClientRect().width ?? 0,
        ),
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
    expect(responsiveAlignment.primaryActionWidth).toBe(
      responsiveAlignment.primaryInputWidth,
    );
  }
});

test("keeps exact Class Search empty and validation states clear and recoverable", async () => {
  const states = [
    {
      focusSelector: "#empty-subject",
      html: emptyClassSearchFixtureHtml,
      status: "No courses matched the sanitized criteria.",
      type: "empty",
    },
    {
      focusSelector: "#error-term",
      html: errorClassSearchFixtureHtml,
      status: "Results are available after valid criteria.",
      type: "error",
    },
  ] as const;

  for (const state of states) {
    await context.route(CLASS_SEARCH_URL, (route) =>
      route.fulfill({
        body: state.html,
        contentType: "text/html; charset=utf-8",
        headers: { "content-security-policy": "default-src 'none'" },
      }),
    );
    await page.goto(CLASS_SEARCH_URL);

    await expect(page.locator("html")).toHaveAttribute(
      "data-better-albert-adapter",
      "class-search",
    );
    await expect(page.locator(".ps_box-pagetitle")).toBeVisible();
    await expect(page.locator(state.focusSelector)).toBeFocused();
    await expect(page.getByRole("status")).toHaveText(state.status);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    if (state.type === "error") {
      const alert = page.getByRole("alert");
      const invalidControl = page.locator(state.focusSelector);
      await expect(alert).toHaveText(
        "Select a sanitized term before searching.",
      );
      await expect(alert).toHaveAttribute(
        "data-better-albert-region",
        "validation-alert",
      );
      await expect(alert).toHaveCSS(
        "background-color",
        "rgb(255, 241, 240)",
      );
      await expect(alert).toHaveCSS(
        "border-left-color",
        "rgb(180, 35, 24)",
      );
      await expect(invalidControl).toHaveAttribute(
        "data-better-albert-region",
        "validation-control",
      );
      await expect(invalidControl).toHaveAttribute("aria-invalid", "true");
      await expect(invalidControl).toHaveAttribute(
        "aria-describedby",
        "search-error",
      );
      await expect(invalidControl).not.toHaveAttribute("aria-description", /.+/);
      await expect(invalidControl).toHaveCSS(
        "border-top-color",
        "rgb(180, 35, 24)",
      );
      await expect(invalidControl).toHaveCSS(
        "outline-color",
        "rgb(137, 0, 225)",
      );
    } else {
      await expect(
        page.locator('[data-better-albert-region="validation-alert"]'),
      ).toHaveCount(0);
      const emptyStatus = page.getByRole("status");
      await expect(emptyStatus).toHaveAttribute(
        "data-better-albert-region",
        "empty-status",
      );
      await expect(emptyStatus).toHaveAttribute(
        "aria-description",
        "Adjust your search, then use Search again.",
      );
      expect(
        await emptyStatus.evaluate(
          (status) => getComputedStyle(status, "::after").content,
        ),
      ).toBe(
        '"Adjust your search, then use Search again."',
      );
    }

    for (const width of [430, 1280] as const) {
      await page.setViewportSize({ height: 900, width });
      const geometry = await page.evaluate(() => {
        const layout = document.querySelector<HTMLElement>(
          '[data-better-albert-layout="class-search"]',
        );
        const title = document.querySelector<HTMLElement>(
          '[data-better-albert-region="page-title"]',
        );
        const layoutBounds = layout?.getBoundingClientRect();
        const titleBounds = title?.getBoundingClientRect();
        return {
          documentOverflow:
            document.documentElement.scrollWidth - window.innerWidth,
          layoutLeft: Math.round(layoutBounds?.left ?? -1),
          layoutRight: Math.round(layoutBounds?.right ?? -1),
          titleTop: Math.round(titleBounds?.top ?? -1),
        };
      });
      expect(geometry.documentOverflow).toBe(0);
      expect(geometry.layoutLeft).toBeGreaterThanOrEqual(0);
      expect(geometry.layoutRight).toBeLessThanOrEqual(width);
      expect(geometry.titleTop).toBeGreaterThanOrEqual(0);
    }

    await context.unroute(CLASS_SEARCH_URL);
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
