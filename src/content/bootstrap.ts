import { removeMountedHeader } from "../app/mount-header";
import { chromePreferenceStore } from "../storage/preferences";
import { startContentScript } from "./lifecycle";

void startContentScript({
  document,
  location,
  preferenceStore: chromePreferenceStore,
  topLevel: window.top === window,
}).catch(() => {
  removeMountedHeader(document);
});
