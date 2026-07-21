import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HEADER_HOST_ID } from "../../src/app/mount-header";
import {
  startContentScript,
  type HeaderMount,
} from "../../src/content/lifecycle";
import {
  COMPACT_HEADER_ATTRIBUTE,
  THEME_ENABLED_ATTRIBUTE,
} from "../../src/content/native-theme";
import type { PreferenceStore } from "../../src/storage/preferences";

const fixture = readFileSync(
  resolve(process.cwd(), "tests/fixtures/albert-shell.html"),
  "utf8",
);

const portalUrl = new URL(
  "https://sis.portal.nyu.edu/psp/ihprod/EMPLOYEE/EMPL/h/?cmd=start",
);

class FakePreferenceStore implements PreferenceStore {
  readonly listeners = new Set<(enabled: boolean) => void>();

  constructor(
    private enabled: boolean,
    private readonly readError?: Error,
  ) {}

  async getEnabled(): Promise<boolean> {
    if (this.readError) {
      throw this.readError;
    }

    return this.enabled;
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;
    this.emit(enabled);
  }

  subscribe(listener: (enabled: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(enabled: boolean): void {
    for (const listener of this.listeners) {
      listener(enabled);
    }
  }
}

function loadFixture(): void {
  const parsed = new DOMParser().parseFromString(fixture, "text/html");
  document.documentElement.innerHTML = parsed.documentElement.innerHTML;
}

function nativeMarkup(): string {
  const nativeContent = document.querySelector("#albert-native-content");
  if (!nativeContent) {
    throw new Error("Fixture is missing native Albert content.");
  }

  return nativeContent.outerHTML;
}

async function settleLifecycle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 75));
  });
}

describe("content-script lifecycle", () => {
  beforeEach(() => {
    loadFixture();
  });

  it("mounts one page-aware shell, themes the document, and preserves native content", async () => {
    const store = new FakePreferenceStore(true);
    const before = nativeMarkup();
    const nativeContent = document.querySelector("#albert-native-content");

    const lifecycle = await startContentScript({
      document,
      location: portalUrl,
      preferenceStore: store,
      topLevel: true,
    });

    const shadowRoot = document.getElementById(HEADER_HOST_ID)?.shadowRoot;
    expect(document.getElementById(HEADER_HOST_ID)?.style.zIndex).toBe("90");
    expect(shadowRoot?.querySelector("header")?.textContent).toContain(
      "Better Albert",
    );
    expect(
      shadowRoot?.querySelector('[aria-current="page"]')?.getAttribute(
        "aria-label",
      ),
    ).toBe("Home");
    expect(
      Array.from(
        shadowRoot?.querySelectorAll<HTMLButtonElement>(".ba-tool-item") ?? [],
      ).map((button) => button.getAttribute("aria-label")),
    ).toEqual(["Course Search", "Weekly Schedule"]);
    expect(
      Array.from(
        shadowRoot?.querySelectorAll<HTMLButtonElement>(".ba-resource-item") ??
          [],
      ).map((button) => button.getAttribute("aria-label")),
    ).toEqual([
      "Academic Calendar",
      "University Registrar",
      "Wellness Center",
      "Housing",
    ]);
    expect(document.documentElement.hasAttribute(THEME_ENABLED_ATTRIBUTE)).toBe(
      true,
    );
    expect(document.documentElement.hasAttribute(COMPACT_HEADER_ATTRIBUTE)).toBe(
      true,
    );
    expect(document.querySelector("#albert-native-content")).toBe(nativeContent);
    expect(document.documentElement.dataset.betterAlbertAdapter).toBe(
      "family-home",
    );
    expect(nativeContent?.getAttribute("data-better-albert-region")).toBe(
      "workspace",
    );

    store.emit(true);
    await settleLifecycle();
    expect(document.querySelectorAll(`#${HEADER_HOST_ID}`)).toHaveLength(1);

    lifecycle.stop();
    expect(nativeMarkup()).toBe(before);
  });

  it("delegates primary navigation to the matching native Albert link", async () => {
    const nativeFinances = document.querySelector<HTMLAnchorElement>(
      'a[href="/fixture-finances"]',
    );
    const nativeClick = vi.fn((event: Event) => event.preventDefault());
    nativeFinances?.addEventListener("click", nativeClick);

    const lifecycle = await startContentScript({
      document,
      location: portalUrl,
      preferenceStore: new FakePreferenceStore(true),
      topLevel: true,
    });
    const financesButton = Array.from(
      document
        .getElementById(HEADER_HOST_ID)
        ?.shadowRoot?.querySelectorAll<HTMLButtonElement>(".ba-nav-item") ?? [],
    ).find((button) => button.getAttribute("aria-label") === "Finances");

    financesButton?.click();
    expect(nativeClick).toHaveBeenCalledOnce();
    lifecycle.stop();
  });

  it("delegates an allowlisted page tool to the matching native Albert link", async () => {
    const nativeCourseSearch = document.querySelector<HTMLAnchorElement>(
      'a[href="/fixture-course-search"]',
    );
    const nativeClick = vi.fn((event: Event) => event.preventDefault());
    nativeCourseSearch?.addEventListener("click", nativeClick);

    const lifecycle = await startContentScript({
      document,
      location: portalUrl,
      preferenceStore: new FakePreferenceStore(true),
      topLevel: true,
    });
    const courseSearchButton = Array.from(
      document
        .getElementById(HEADER_HOST_ID)
        ?.shadowRoot?.querySelectorAll<HTMLButtonElement>(".ba-tool-item") ?? [],
    ).find((button) => button.getAttribute("aria-label") === "Course Search");

    courseSearchButton?.click();
    expect(nativeClick).toHaveBeenCalledOnce();
    lifecycle.stop();
  });

  it("delegates a universal resource shortcut to the original hidden native link", async () => {
    const nativeWellness = document.querySelector<HTMLAnchorElement>(
      'a[href="/fixture-wellness"]',
    );
    const nativeClick = vi.fn((event: Event) => event.preventDefault());
    nativeWellness?.addEventListener("click", nativeClick);

    const lifecycle = await startContentScript({
      document,
      location: portalUrl,
      preferenceStore: new FakePreferenceStore(true),
      topLevel: true,
    });
    const wellnessButton = Array.from(
      document
        .getElementById(HEADER_HOST_ID)
        ?.shadowRoot?.querySelectorAll<HTMLButtonElement>(
          ".ba-resource-item",
        ) ?? [],
    ).find((button) => button.getAttribute("aria-label") === "Wellness Center");

    wellnessButton?.click();
    expect(nativeClick).toHaveBeenCalledOnce();
    lifecycle.stop();
  });

  it("does not mount when disabled and removes all presentation when disabled later", async () => {
    const disabledLifecycle = await startContentScript({
      document,
      location: portalUrl,
      preferenceStore: new FakePreferenceStore(false),
      topLevel: true,
    });

    expect(document.getElementById(HEADER_HOST_ID)).toBeNull();
    expect(document.documentElement.hasAttribute(THEME_ENABLED_ATTRIBUTE)).toBe(
      false,
    );
    expect(document.documentElement.hasAttribute(COMPACT_HEADER_ATTRIBUTE)).toBe(
      false,
    );
    expect(document.documentElement.hasAttribute("data-better-albert-adapter")).toBe(
      false,
    );
    expect(document.querySelector("[data-better-albert-region]")).toBeNull();
    disabledLifecycle.stop();

    const enabledStore = new FakePreferenceStore(true);
    const enabledLifecycle = await startContentScript({
      document,
      location: portalUrl,
      preferenceStore: enabledStore,
      topLevel: true,
    });
    const disableButton = document
      .getElementById(HEADER_HOST_ID)
      ?.shadowRoot?.querySelector<HTMLButtonElement>(".ba-disable-button");

    await act(async () => {
      disableButton?.click();
    });

    expect(document.getElementById(HEADER_HOST_ID)).toBeNull();
    expect(document.documentElement.hasAttribute(THEME_ENABLED_ATTRIBUTE)).toBe(
      false,
    );
    expect(document.documentElement.hasAttribute(COMPACT_HEADER_ATTRIBUTE)).toBe(
      false,
    );
    expect(document.documentElement.hasAttribute("data-better-albert-adapter")).toBe(
      false,
    );
    expect(document.querySelector("[data-better-albert-region]")).toBeNull();
    expect(await enabledStore.getEnabled()).toBe(false);
    enabledLifecycle.stop();
  });

  it.each(["missing", "duplicate"] as const)(
    "keeps the native masthead when compact-header anchors are %s",
    async (variant) => {
      const headerContainer = document.querySelector("#Header_Container");
      if (variant === "missing") {
        document.querySelector("#IS_BB_HEADER_WRAPPER")?.remove();
      } else {
        headerContainer?.parentElement?.append(headerContainer.cloneNode(true));
      }

      const lifecycle = await startContentScript({
        document,
        location: portalUrl,
        preferenceStore: new FakePreferenceStore(true),
        topLevel: true,
      });

      expect(document.documentElement.dataset.betterAlbertAdapter).toBe(
        "family-home",
      );
      expect(document.getElementById(HEADER_HOST_ID)).not.toBeNull();
      expect(
        document.documentElement.hasAttribute(COMPACT_HEADER_ATTRIBUTE),
      ).toBe(false);
      lifecycle.stop();
    },
  );

  it("removes presentation immediately when preference persistence stalls", async () => {
    const preferenceStore: PreferenceStore = {
      getEnabled: async () => true,
      setEnabled: () => new Promise<void>(() => undefined),
      subscribe: () => () => undefined,
    };
    const lifecycle = await startContentScript({
      document,
      location: portalUrl,
      preferenceStore,
      topLevel: true,
    });
    const disableButton = document
      .getElementById(HEADER_HOST_ID)
      ?.shadowRoot?.querySelector<HTMLButtonElement>(".ba-disable-button");

    act(() => disableButton?.click());

    expect(document.getElementById(HEADER_HOST_ID)).toBeNull();
    expect(document.documentElement.hasAttribute(THEME_ENABLED_ATTRIBUTE)).toBe(
      false,
    );
    expect(document.querySelector("[data-better-albert-region]")).toBeNull();
    lifecycle.stop();
  });

  it("themes a recognized child frame without mounting a duplicate shell", async () => {
    const lifecycle = await startContentScript({
      document,
      relatedAlbertContext: true,
      location: new URL(
        "https://sis.portal.nyu.edu/psc/ihprod/EMPLOYEE/SA/c/SSR_STUDENT_FL.SSR_MD_SP_FL.GBL",
      ),
      preferenceStore: new FakePreferenceStore(true),
      topLevel: false,
    });

    expect(document.getElementById(HEADER_HOST_ID)).toBeNull();
    expect(document.documentElement.hasAttribute(THEME_ENABLED_ATTRIBUTE)).toBe(
      true,
    );
    lifecycle.stop();
    expect(document.documentElement.hasAttribute(THEME_ENABLED_ATTRIBUTE)).toBe(
      false,
    );
  });

  it("re-evaluates delayed same-origin parent evidence and authentication", async () => {
    document.title = "Academic Planner";
    document.body.innerHTML = `
      <main class="ps_box-page">
        <h1 class="ps_box-pagetitle">Academic Planner</h1>
      </main>
    `;
    const relatedDocument = document.implementation.createHTMLDocument("Loading");
    const lifecycle = await startContentScript({
      document,
      getRelatedAlbertContext: () => relatedDocument.title === "Albert",
      location: new URL(
        "https://sis.portal.nyu.edu/psc/ihprod/EMPLOYEE/SA/c/SSR_STUDENT_FL.SSR_MD_SP_FL.GBL",
      ),
      preferenceStore: new FakePreferenceStore(true),
      relatedContextDocument: relatedDocument,
      topLevel: false,
    });

    expect(document.documentElement.hasAttribute(THEME_ENABLED_ATTRIBUTE)).toBe(
      false,
    );
    relatedDocument.title = "Albert";
    await settleLifecycle();
    expect(document.documentElement.hasAttribute(THEME_ENABLED_ATTRIBUTE)).toBe(
      true,
    );

    relatedDocument.title = "Albert Login";
    await settleLifecycle();
    expect(document.documentElement.hasAttribute(THEME_ENABLED_ATTRIBUTE)).toBe(
      false,
    );
    lifecycle.stop();
  });

  it("leaves launcher, authentication, and unknown portal documents untouched", async () => {
    const store = new FakePreferenceStore(true);
    const launcherLifecycle = await startContentScript({
      document,
      location: new URL("https://albert.nyu.edu/albert_index.html"),
      preferenceStore: store,
      topLevel: true,
    });
    expect(store.listeners.size).toBe(0);
    launcherLifecycle.stop();

    document.title = "Albert Login";
    const authenticationLifecycle = await startContentScript({
      document,
      location: portalUrl,
      preferenceStore: store,
      topLevel: true,
    });
    expect(store.listeners.size).toBe(0);
    authenticationLifecycle.stop();

    document.title = "Portal";
    const unknownLifecycle = await startContentScript({
      document,
      location: new URL("https://sis.portal.nyu.edu/public/help"),
      preferenceStore: store,
      topLevel: true,
    });
    expect(document.getElementById(HEADER_HOST_ID)).toBeNull();
    expect(document.documentElement.hasAttribute(THEME_ENABLED_ATTRIBUTE)).toBe(
      false,
    );
    unknownLifecycle.stop();
  });

  it.each([
    "<div>Native Albert loading content</div>",
    "<main>First native workspace</main><main>Second native workspace</main>",
  ])("fails open when a recognized document has no unique adapter root", async (markup) => {
    document.title = "Albert";
    document.body.innerHTML = markup;
    const before = document.body.innerHTML;
    const lifecycle = await startContentScript({
      document,
      location: portalUrl,
      preferenceStore: new FakePreferenceStore(true),
      topLevel: true,
    });

    expect(document.getElementById(HEADER_HOST_ID)).toBeNull();
    expect(document.documentElement.hasAttribute(THEME_ENABLED_ATTRIBUTE)).toBe(
      false,
    );
    expect(document.documentElement.hasAttribute("data-better-albert-adapter")).toBe(
      false,
    );
    expect(document.body.innerHTML).toBe(before);
    lifecycle.stop();
  });

  it("mounts on a supported PeopleSoft path even when the title arrives late", async () => {
    document.title = "Loading";
    const lifecycle = await startContentScript({
      document,
      location: portalUrl,
      preferenceStore: new FakePreferenceStore(true),
      topLevel: true,
    });

    expect(document.getElementById(HEADER_HOST_ID)).not.toBeNull();
    lifecycle.stop();
  });

  it("updates page context after native selection changes", async () => {
    const lifecycle = await startContentScript({
      document,
      location: portalUrl,
      preferenceStore: new FakePreferenceStore(true),
      topLevel: true,
    });
    document
      .querySelector('[aria-current="page"]')
      ?.removeAttribute("aria-current");
    document
      .querySelector('a[href="/fixture-finances"]')
      ?.setAttribute("aria-current", "page");
    await settleLifecycle();

    expect(
      document
        .getElementById(HEADER_HOST_ID)
        ?.shadowRoot?.querySelector('[aria-current="page"]')?.getAttribute(
          "aria-label",
        ),
    ).toBe("Finances");
    expect(document.documentElement.dataset.betterAlbertPage).toBe("finances");
    expect(
      Array.from(
        document
          .getElementById(HEADER_HOST_ID)
          ?.shadowRoot?.querySelectorAll<HTMLButtonElement>(".ba-tool-item") ??
          [],
      ).map((button) => button.getAttribute("aria-label")),
    ).toEqual(["Bursar Balance", "Account Statement", "Financial Aid Status"]);
    lifecycle.stop();
  });

  it("adapts current-area tools without duplicating universal resources", async () => {
    const lifecycle = await startContentScript({
      document,
      location: portalUrl,
      preferenceStore: new FakePreferenceStore(true),
      topLevel: true,
    });
    const expectations = [
      ["/fixture-home", "Course Search"],
      ["/fixture-academics", "Academic Planner"],
      ["/fixture-grades", "Enrollment Verification"],
      ["/fixture-finances", "Bursar Balance"],
      ["/fixture-personal", "Demographic Information"],
      ["/fixture-resources", undefined],
    ] as const;

    for (const [href, expectedTool] of expectations) {
      document
        .querySelector('[aria-current="page"]')
        ?.removeAttribute("aria-current");
      document.querySelector(`a[href="${href}"]`)?.setAttribute(
        "aria-current",
        "page",
      );
      await settleLifecycle();

      const toolLabels = Array.from(
        document
          .getElementById(HEADER_HOST_ID)
          ?.shadowRoot?.querySelectorAll<HTMLButtonElement>(".ba-tool-item") ??
          [],
      ).map((button) => button.getAttribute("aria-label"));
      if (expectedTool) {
        expect(toolLabels).toContain(expectedTool);
      } else {
        expect(toolLabels).toEqual([]);
      }
      expect(
        Array.from(
          document
            .getElementById(HEADER_HOST_ID)
            ?.shadowRoot?.querySelectorAll<HTMLButtonElement>(
              ".ba-resource-item",
            ) ?? [],
        ).map((button) => button.getAttribute("aria-label")),
      ).toEqual([
        "Academic Calendar",
        "University Registrar",
        "Wellness Center",
        "Housing",
      ]);
    }

    lifecycle.stop();
  });

  it("reconciles resource shortcuts when the native submenu changes", async () => {
    const lifecycle = await startContentScript({
      document,
      location: portalUrl,
      preferenceStore: new FakePreferenceStore(true),
      topLevel: true,
    });
    const resourceLabels = (): Array<string | null> =>
      Array.from(
        document
          .getElementById(HEADER_HOST_ID)
          ?.shadowRoot?.querySelectorAll<HTMLButtonElement>(
            ".ba-resource-item",
          ) ?? [],
      ).map((button) => button.getAttribute("aria-label"));

    document.querySelector('a[href="/fixture-wellness"]')?.remove();
    await settleLifecycle();
    expect(resourceLabels()).not.toContain("Wellness Center");

    const submenuList = document.querySelector(
      "#SUBMENU_ID_NYU_OTHER_RESOURCES_FLDR > ul",
    );
    const wellnessItem = document.createElement("li");
    wellnessItem.innerHTML = '<a href="/fixture-wellness-replacement">Wellness Center</a>';
    submenuList?.append(wellnessItem);
    await settleLifecycle();
    expect(resourceLabels()).toContain("Wellness Center");

    lifecycle.stop();
  });

  it("remounts once when Albert removes the extension host", async () => {
    const lifecycle = await startContentScript({
      document,
      location: portalUrl,
      preferenceStore: new FakePreferenceStore(true),
      topLevel: true,
    });
    const originalHost = document.getElementById(HEADER_HOST_ID);
    originalHost?.remove();
    await settleLifecycle();

    const replacementHost = document.getElementById(HEADER_HOST_ID);
    expect(replacementHost).not.toBeNull();
    expect(replacementHost).not.toBe(originalHost);
    expect(document.querySelectorAll(`#${HEADER_HOST_ID}`)).toHaveLength(1);
    lifecycle.stop();
  });

  it("reconciles a PeopleSoft workspace replacement without stale adapter markers", async () => {
    const lifecycle = await startContentScript({
      document,
      location: portalUrl,
      preferenceStore: new FakePreferenceStore(true),
      topLevel: true,
    });
    const originalWorkspace = document.querySelector(".isSSS_Main.selected");
    const replacementWorkspace = originalWorkspace?.cloneNode(true) as Element;
    originalWorkspace?.replaceWith(replacementWorkspace);
    await settleLifecycle();

    expect(replacementWorkspace.getAttribute("data-better-albert-region")).toBe(
      "workspace",
    );
    expect(originalWorkspace?.hasAttribute("data-better-albert-region")).toBe(
      false,
    );
    expect(document.documentElement.dataset.betterAlbertAdapter).toBe(
      "family-home",
    );
    lifecycle.stop();
    expect(replacementWorkspace.hasAttribute("data-better-albert-region")).toBe(
      false,
    );
  });

  it("rolls back when navigation reaches an authentication document", async () => {
    const lifecycle = await startContentScript({
      document,
      location: portalUrl,
      preferenceStore: new FakePreferenceStore(true),
      topLevel: true,
    });
    document.title = "Sign in to Albert";
    window.dispatchEvent(new PopStateEvent("popstate"));
    await settleLifecycle();

    expect(document.getElementById(HEADER_HOST_ID)).toBeNull();
    expect(document.documentElement.hasAttribute(THEME_ENABLED_ATTRIBUTE)).toBe(
      false,
    );
    expect(document.documentElement.hasAttribute("data-better-albert-adapter")).toBe(
      false,
    );
    expect(document.querySelector("[data-better-albert-region]")).toBeNull();
    lifecycle.stop();
  });

  it("fails open and removes theme plus a partial host when mounting throws", async () => {
    const before = nativeMarkup();
    const failingMount = vi.fn<HeaderMount>(({ document: targetDocument }) => {
      const partialHost = targetDocument.createElement("div");
      partialHost.id = HEADER_HOST_ID;
      targetDocument.body.prepend(partialHost);
      throw new Error("Synthetic render failure");
    });

    const lifecycle = await startContentScript({
      document,
      location: portalUrl,
      mountHeader: failingMount,
      preferenceStore: new FakePreferenceStore(true),
      topLevel: true,
    });

    expect(failingMount).toHaveBeenCalledOnce();
    await settleLifecycle();
    expect(failingMount).toHaveBeenCalledOnce();
    expect(document.getElementById(HEADER_HOST_ID)).toBeNull();
    expect(document.documentElement.hasAttribute(THEME_ENABLED_ATTRIBUTE)).toBe(
      false,
    );
    expect(nativeMarkup()).toBe(before);
    lifecycle.stop();
  });

  it("keeps a newer preference event when the initial storage read resolves later", async () => {
    let resolveInitialRead: ((enabled: boolean) => void) | undefined;
    let listener: ((enabled: boolean) => void) | undefined;
    const preferenceStore: PreferenceStore = {
      getEnabled: () =>
        new Promise<boolean>((resolve) => {
          resolveInitialRead = resolve;
        }),
      setEnabled: vi.fn().mockResolvedValue(undefined),
      subscribe: (nextListener) => {
        listener = nextListener;
        return () => undefined;
      },
    };

    const lifecyclePromise = startContentScript({
      document,
      location: portalUrl,
      preferenceStore,
      topLevel: true,
    });
    listener?.(true);
    resolveInitialRead?.(false);
    const lifecycle = await lifecyclePromise;
    await settleLifecycle();

    expect(document.getElementById(HEADER_HOST_ID)).not.toBeNull();
    lifecycle.stop();
  });

  it("fails open when the enablement preference cannot be read", async () => {
    const before = nativeMarkup();
    const lifecycle = await startContentScript({
      document,
      location: portalUrl,
      preferenceStore: new FakePreferenceStore(
        true,
        new Error("Synthetic storage failure"),
      ),
      topLevel: true,
    });

    expect(document.getElementById(HEADER_HOST_ID)).toBeNull();
    expect(document.documentElement.hasAttribute(THEME_ENABLED_ATTRIBUTE)).toBe(
      false,
    );
    expect(nativeMarkup()).toBe(before);
    lifecycle.stop();
  });
});
