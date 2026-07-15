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
const HEADER_HOST_SELECTOR = "#better-albert-header-host";
const ENABLED_PREFERENCE_KEY = "betterAlbert.enabled";
const extensionPath = resolve(process.cwd(), "dist");
const fixturePath = resolve(
  process.cwd(),
  "tests/fixtures/albert-shell.html",
);

let context: BrowserContext;
let page: Page;
let userDataDirectory: string;
let fixtureHtml: string;

async function extensionWorker(): Promise<Worker> {
  const existingWorker = context.serviceWorkers()[0];
  return existingWorker ?? context.waitForEvent("serviceworker");
}

async function routeSanitizedFixture({
  removeExtensionHost = false,
}: { removeExtensionHost?: boolean } = {}): Promise<void> {
  const fixture = removeExtensionHost
    ? fixtureHtml.replace(
        "</head>",
        `<script>
          new MutationObserver(() => {
            document.getElementById("better-albert-header-host")?.remove();
          }).observe(document.documentElement, { childList: true, subtree: true });
        </script></head>`,
      )
    : fixtureHtml;

  await context.route(PORTAL_URL, async (route) => {
    await route.fulfill({
      body: fixture,
      contentType: "text/html; charset=utf-8",
      headers: {
        "content-security-policy": removeExtensionHost
          ? "default-src 'none'; script-src 'unsafe-inline'"
          : "default-src 'none'",
      },
      status: 200,
    });
  });
}

test.beforeAll(async () => {
  fixtureHtml = await readFile(fixturePath, "utf8");
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

test("mounts an accessible isolated header without disturbing native content", async () => {
  await routeSanitizedFixture();
  await page.goto(PORTAL_URL);

  const host = page.locator(HEADER_HOST_SELECTOR);
  const banner = page.getByRole("banner", { name: "Better Albert" });
  const disableButton = page.getByRole("button", {
    name: "Disable Better Albert",
  });

  await expect(host).toHaveCount(1);
  await expect(banner).toBeVisible();
  await expect(page.locator("#albert-native-content")).toBeVisible();

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
    .getByRole("button", { name: "Disable Better Albert" })
    .click();
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCount(0);

  await page.reload();
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCount(0);

  const worker = await extensionWorker();
  await worker.evaluate(
    async ({ key }) => chrome.storage.local.set({ [key]: true }),
    { key: ENABLED_PREFERENCE_KEY },
  );
  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCount(1);
});

test("leaves native content usable when the page removes the extension host", async () => {
  await routeSanitizedFixture({ removeExtensionHost: true });
  await page.goto(PORTAL_URL);

  await expect(page.locator(HEADER_HOST_SELECTOR)).toHaveCount(0);
  const nativeButton = page.getByRole("button", {
    name: "Native action placeholder",
  });
  await expect(nativeButton).toBeVisible();
  await nativeButton.click();
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
