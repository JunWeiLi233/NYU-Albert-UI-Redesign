import {
  mountHeader as defaultMountHeader,
  removeMountedHeader,
  type MountedHeader,
  type MountHeaderOptions,
} from "../app/mount-header";
import type { PreferenceStore } from "../storage/preferences";
import {
  isSupportedAlbertPage,
  type PageDetectionContext,
} from "./page-detector";

export type HeaderMount = (options: MountHeaderOptions) => MountedHeader;

export interface ContentScriptOptions extends PageDetectionContext {
  preferenceStore: PreferenceStore;
  mountHeader?: HeaderMount;
}

export interface ContentScriptLifecycle {
  stop(): void;
}

export async function startContentScript({
  document,
  location,
  mountHeader = defaultMountHeader,
  preferenceStore,
  topLevel,
}: ContentScriptOptions): Promise<ContentScriptLifecycle> {
  let mountedHeader: MountedHeader | undefined;
  let stopped = false;
  let preferenceChangedDuringRead = false;

  const safeUnmount = (): void => {
    try {
      mountedHeader?.unmount();
    } catch {
      // Native Albert must remain usable even when extension cleanup fails.
    }
    mountedHeader = undefined;
    removeMountedHeader(document);
  };

  const stop = (): void => {
    stopped = true;
    unsubscribe();
    safeUnmount();
  };

  if (!isSupportedAlbertPage({ document, location, topLevel })) {
    return { stop: safeUnmount };
  }

  const reconcile = (enabled: boolean): void => {
    if (stopped || !enabled) {
      safeUnmount();
      return;
    }

    if (mountedHeader) {
      return;
    }

    try {
      mountedHeader = mountHeader({
        document,
        onDisable: async () => {
          try {
            await preferenceStore.setEnabled(false);
          } catch {
            // A storage failure must still restore the native page immediately.
          }
          reconcile(false);
        },
      });
    } catch {
      safeUnmount();
    }
  };

  let unsubscribe = (): void => undefined;
  try {
    unsubscribe = preferenceStore.subscribe((enabled) => {
      preferenceChangedDuringRead = true;
      reconcile(enabled);
    });
  } catch {
    safeUnmount();
    return { stop: safeUnmount };
  }

  try {
    const initiallyEnabled = await preferenceStore.getEnabled();
    if (!preferenceChangedDuringRead) {
      reconcile(initiallyEnabled);
    }
  } catch {
    safeUnmount();
  }

  return { stop };
}
