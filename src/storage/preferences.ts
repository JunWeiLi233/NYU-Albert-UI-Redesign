export const ENABLED_PREFERENCE_KEY = "betterAlbert.enabled";

export interface PreferenceStore {
  getEnabled(): Promise<boolean>;
  setEnabled(enabled: boolean): Promise<void>;
  subscribe(listener: (enabled: boolean) => void): () => void;
}

function parseEnabledPreference(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  return value === true;
}

export async function getEnabledPreference(): Promise<boolean> {
  const values = await chrome.storage.local.get(ENABLED_PREFERENCE_KEY);
  return parseEnabledPreference(values[ENABLED_PREFERENCE_KEY]);
}

export async function setEnabledPreference(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [ENABLED_PREFERENCE_KEY]: enabled });
}

export async function initializeEnabledPreference(): Promise<void> {
  const values = await chrome.storage.local.get(ENABLED_PREFERENCE_KEY);
  if (typeof values[ENABLED_PREFERENCE_KEY] !== "boolean") {
    await setEnabledPreference(true);
  }
}

export const chromePreferenceStore: PreferenceStore = {
  getEnabled: getEnabledPreference,
  setEnabled: setEnabledPreference,
  subscribe(listener) {
    const handleChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: chrome.storage.AreaName,
    ): void => {
      if (areaName !== "local") {
        return;
      }

      const changedPreference = changes[ENABLED_PREFERENCE_KEY];
      if (!changedPreference) {
        return;
      }

      listener(parseEnabledPreference(changedPreference.newValue));
    };

    chrome.storage.onChanged.addListener(handleChange);
    return () => chrome.storage.onChanged.removeListener(handleChange);
  },
};
