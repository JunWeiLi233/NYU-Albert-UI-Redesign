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

let context: BrowserContext;
let page: Page;
let userDataDirectory: string;
let fixtureHtml: string;
let deepFixtureHtml: string;
let classSearchFixtureHtml: string;

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
    "rgb(255, 255, 255)",
  );
  await expect(page.locator(".ba-product-name")).toHaveCSS(
    "color",
    "rgb(11, 11, 11)",
  );
  await expect(page.locator("#albert-native-content")).toBeVisible();
  await expect(
    page.getByRole("button", { exact: true, name: "Home" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("button", { exact: true, name: "Course Search" }),
  ).toBeVisible();
  await expect(page.locator(".is_bb_LinkContainer")).toHaveCSS(
    "display",
    "grid",
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-better-albert-enabled",
    "",
  );
  expect(
    await page.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor),
  ).toBe("rgb(245, 243, 246)");

  await page.keyboard.press("Tab");
  await expect(disableButton).toBeFocused();

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
  await devtoolsSession.detach();

  await page.setViewportSize({ height: 800, width: 400 });
  await expect(disableButton).toBeVisible();
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(0);
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

  await page.reload();
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCount(0);

  const worker = await extensionWorker();
  await worker.evaluate(
    async ({ key }) => chrome.storage.local.set({ [key]: true }),
    { key: ENABLED_PREFERENCE_KEY },
  );
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCount(1);
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

test("delegates shell navigation to the native Albert control", async () => {
  await routeSanitizedFixture();
  await page.goto(PORTAL_URL);
  await page.locator('a[href="/fixture-finances"]').evaluate((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.dataset.nativeNavigation = "finances";
    });
  });

  await page.getByRole("button", { exact: true, name: "Finances" }).click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-native-navigation",
    "finances",
  );
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
  await page.locator("#pt_modalMaskCover, #pt_modals").evaluateAll((elements) => {
    for (const element of elements) {
      element.removeAttribute("hidden");
    }
  });

  await expect(
    page.getByRole("dialog", { name: "Sanitized Albert report" }),
  ).toBeVisible();
  await expect(page.locator(".ptpopuptitlebar")).toHaveCSS(
    "background-color",
    "rgb(87, 6, 140)",
  );
  await expect(page.locator("#pt_modals")).toHaveAttribute(
    "data-better-albert-readonly-modal",
    "",
  );
  const nativeReturn = page.getByRole("button", { exact: true, name: "Return" });
  await expect(nativeReturn).toBeVisible();
  await nativeReturn.click();

  await page.locator(".PTPOPUP_TITLE").evaluate((title) => {
    title.textContent = "Enrollment Error";
  });
  await expect(page.locator("#pt_modals")).not.toHaveAttribute(
    "data-better-albert-readonly-modal",
    "",
  );
  await expect(page.locator(".ptpopuptitlebar")).not.toHaveCSS(
    "background-color",
    "rgb(87, 6, 140)",
  );
});

test("recognizes and redesigns an explicit student-self-service deep page", async () => {
  const shellWithDeepPageLink = fixtureHtml.replace(
    "</body>",
    `<a id="sanitized-deep-page" href="${DEEP_PAGE_URL}" target="_blank" rel="opener">Open sanitized deep page</a></body>`,
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
  await expect(deepPage.locator(".ps_box-pagetitle")).toHaveCSS(
    "border-bottom-color",
    "rgb(87, 6, 140)",
  );
  const nativeAction = deepPage.getByRole("button", {
    name: "Native planner action placeholder",
  });
  await expect(nativeAction).toBeVisible();
  await nativeAction.click();
});

test("re-evaluates delayed same-origin parent evidence in a packaged child frame", async () => {
  const delayedParentFixture = fixtureHtml
    .replace("<title>Albert</title>", "<title>Loading</title>")
    .replace(/<nav[\s\S]*?<\/nav>/, "")
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
    `<iframe title="Sanitized Class Search" src="${CLASS_SEARCH_URL}"></iframe></body>`,
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
  await expect(classSearch.locator(HEADER_HOST_SELECTOR)).toHaveCount(0);
  await expect(classSearch.locator(".ps_box-search")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(classSearch.locator(".ps_grid-header")).toHaveCSS(
    "background-color",
    "rgb(238, 230, 243)",
  );
  const addToCart = classSearch.getByRole("button", { name: "Add to Cart" });
  const enroll = classSearch.getByRole("button", { name: "Enroll" });
  await expect(addToCart).toBeVisible();
  await expect(enroll).toBeVisible();
  expect(
    await addToCart.evaluate((button) => getComputedStyle(button).backgroundColor),
  ).not.toBe("rgb(87, 6, 140)");

  await page.goto(CLASS_SEARCH_URL);
  await expect(page.locator("html")).toHaveAttribute(
    "data-better-albert-page",
    "academics",
  );
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCount(0);
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
