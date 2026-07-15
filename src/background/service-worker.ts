import {
  chromePreferenceStore,
  initializeEnabledPreference,
} from "../storage/preferences";
import { toggleEnabledPreference } from "./toggle-preference";

function runWithoutLogging(task: () => Promise<void>): void {
  void task().catch(() => undefined);
}

chrome.runtime.onInstalled.addListener(() => {
  runWithoutLogging(initializeEnabledPreference);
});

chrome.action.onClicked.addListener(() => {
  runWithoutLogging(() => toggleEnabledPreference(chromePreferenceStore));
});
