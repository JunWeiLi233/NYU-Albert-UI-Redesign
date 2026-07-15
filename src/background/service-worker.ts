import {
  ENABLED_PREFERENCE_KEY,
  chromePreferenceStore,
  getEnabledPreference,
  initializeEnabledPreference,
} from "../storage/preferences";
import { toggleEnabledPreference } from "./toggle-preference";

async function syncActionState(enabled: boolean): Promise<void> {
  await Promise.all([
    chrome.action.setBadgeText({ text: enabled ? "ON" : "OFF" }),
    chrome.action.setBadgeBackgroundColor({
      color: enabled ? "#57068C" : "#5C5C5C",
    }),
    chrome.action.setTitle({
      title: enabled
        ? "Better Albert is on — click to disable"
        : "Better Albert is off — click to enable",
    }),
  ]);
}

function runWithoutLogging(task: () => Promise<void>): void {
  void task().catch(() => undefined);
}

chrome.runtime.onInstalled.addListener(() => {
  runWithoutLogging(async () => {
    await initializeEnabledPreference();
    await syncActionState(await getEnabledPreference());
  });
});

chrome.runtime.onStartup.addListener(() => {
  runWithoutLogging(async () => syncActionState(await getEnabledPreference()));
});

chrome.action.onClicked.addListener(() => {
  runWithoutLogging(async () => {
    const enabled = await toggleEnabledPreference(chromePreferenceStore);
    await syncActionState(enabled);
  });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  const enabledChange = changes[ENABLED_PREFERENCE_KEY];
  if (areaName !== "local" || typeof enabledChange?.newValue !== "boolean") {
    return;
  }

  runWithoutLogging(() => syncActionState(enabledChange.newValue as boolean));
});
