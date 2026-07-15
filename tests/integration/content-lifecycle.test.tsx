import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  startContentScript,
  type HeaderMount,
} from "../../src/content/lifecycle";
import { HEADER_HOST_ID } from "../../src/app/mount-header";
import type { PreferenceStore } from "../../src/storage/preferences";

const fixture = readFileSync(
  resolve(process.cwd(), "tests/fixtures/albert-shell.html"),
  "utf8",
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

describe("content-script lifecycle", () => {
  beforeEach(() => {
    loadFixture();
  });

  it("mounts one isolated header and leaves native Albert content unchanged", async () => {
    const store = new FakePreferenceStore(true);
    const before = nativeMarkup();

    const lifecycle = await startContentScript({
      document,
      location: new URL(
        "https://sis.portal.nyu.edu/psp/ihprod/EMPLOYEE/EMPL/?cmd=start",
      ),
      preferenceStore: store,
      topLevel: true,
    });

    const host = document.getElementById(HEADER_HOST_ID);
    expect(host?.shadowRoot?.querySelector("header")?.textContent).toContain(
      "Better Albert",
    );
    expect(nativeMarkup()).toBe(before);

    store.emit(true);
    expect(document.querySelectorAll(`#${HEADER_HOST_ID}`)).toHaveLength(1);

    lifecycle.stop();
  });

  it("does not mount when disabled and removes the header when disabled later", async () => {
    const disabledStore = new FakePreferenceStore(false);
    const disabledLifecycle = await startContentScript({
      document,
      location: new URL(
        "https://sis.portal.nyu.edu/psp/ihprod/EMPLOYEE/EMPL/?cmd=start",
      ),
      preferenceStore: disabledStore,
      topLevel: true,
    });

    expect(document.getElementById(HEADER_HOST_ID)).toBeNull();
    disabledLifecycle.stop();

    const enabledStore = new FakePreferenceStore(true);
    const enabledLifecycle = await startContentScript({
      document,
      location: new URL(
        "https://sis.portal.nyu.edu/psp/ihprod/EMPLOYEE/EMPL/?cmd=start",
      ),
      preferenceStore: enabledStore,
      topLevel: true,
    });
    const disableButton = document
      .getElementById(HEADER_HOST_ID)
      ?.shadowRoot?.querySelector<HTMLButtonElement>("button");

    await act(async () => {
      disableButton?.click();
    });

    expect(document.getElementById(HEADER_HOST_ID)).toBeNull();
    expect(await enabledStore.getEnabled()).toBe(false);
    enabledLifecycle.stop();
  });

  it("does not mount on the login launcher, an Albert login title, or in a child frame", async () => {
    const store = new FakePreferenceStore(true);
    const unsupportedHostLifecycle = await startContentScript({
      document,
      location: new URL("https://albert.nyu.edu/albert_index.html"),
      preferenceStore: store,
      topLevel: true,
    });

    expect(document.getElementById(HEADER_HOST_ID)).toBeNull();
    expect(store.listeners.size).toBe(0);
    unsupportedHostLifecycle.stop();

    document.title = "Albert Login";
    const unsupportedTitleLifecycle = await startContentScript({
      document,
      location: new URL(
        "https://sis.portal.nyu.edu/psp/ihprod/EMPLOYEE/EMPL/?cmd=start",
      ),
      preferenceStore: store,
      topLevel: true,
    });

    expect(document.getElementById(HEADER_HOST_ID)).toBeNull();
    expect(store.listeners.size).toBe(0);
    unsupportedTitleLifecycle.stop();
    document.title = "Albert";

    const childFrameLifecycle = await startContentScript({
      document,
      location: new URL(
        "https://sis.portal.nyu.edu/psp/ihprod/EMPLOYEE/EMPL/?cmd=start",
      ),
      preferenceStore: store,
      topLevel: false,
    });

    expect(document.getElementById(HEADER_HOST_ID)).toBeNull();
    expect(store.listeners.size).toBe(0);
    childFrameLifecycle.stop();
  });

  it("fails open and removes a partial host when header mounting throws", async () => {
    const before = nativeMarkup();
    const failingMount = vi.fn<HeaderMount>(({ document: targetDocument }) => {
      const partialHost = targetDocument.createElement("div");
      partialHost.id = HEADER_HOST_ID;
      targetDocument.body.prepend(partialHost);
      throw new Error("Synthetic render failure");
    });

    const lifecycle = await startContentScript({
      document,
      location: new URL(
        "https://sis.portal.nyu.edu/psp/ihprod/EMPLOYEE/EMPL/?cmd=start",
      ),
      mountHeader: failingMount,
      preferenceStore: new FakePreferenceStore(true),
      topLevel: true,
    });

    expect(failingMount).toHaveBeenCalledOnce();
    expect(document.getElementById(HEADER_HOST_ID)).toBeNull();
    expect(nativeMarkup()).toBe(before);
    lifecycle.stop();
  });

  it("fails open when the enablement preference cannot be read", async () => {
    const before = nativeMarkup();
    const lifecycle = await startContentScript({
      document,
      location: new URL(
        "https://sis.portal.nyu.edu/psp/ihprod/EMPLOYEE/EMPL/?cmd=start",
      ),
      preferenceStore: new FakePreferenceStore(
        true,
        new Error("Synthetic storage failure"),
      ),
      topLevel: true,
    });

    expect(document.getElementById(HEADER_HOST_ID)).toBeNull();
    expect(nativeMarkup()).toBe(before);
    lifecycle.stop();
  });
});
