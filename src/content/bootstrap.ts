import { removeMountedHeader } from "../app/mount-header";
import { chromePreferenceStore } from "../storage/preferences";
import { startContentScript } from "./lifecycle";
import { removeNativeTheme } from "./native-theme";
import {
  hasPositiveAlbertEvidence,
  isAlbertSelfServiceRoute,
  isAuthenticationDocument,
  isPotentialAlbertLocation,
} from "./page-detector";

const topLevel = window.top === window;
let relatedContextDocument: Document | undefined;

function isPositiveAlbertWindow(candidate: Window): boolean {
  return (
    isPotentialAlbertLocation(candidate.location) &&
    !isAuthenticationDocument(candidate.document) &&
    (hasPositiveAlbertEvidence(candidate.document) ||
      isAlbertSelfServiceRoute(candidate.location))
  );
}

function getRelatedAlbertContext(): boolean {
  if (!relatedContextDocument?.defaultView) {
    return false;
  }

  try {
    return isPositiveAlbertWindow(relatedContextDocument.defaultView);
  } catch {
    return false;
  }
}

if (!topLevel) {
  try {
    const topWindow = window.top;
    if (topWindow && topWindow !== window) {
      relatedContextDocument = topWindow.document;
    }
  } catch {
    // Cross-origin or inaccessible parents do not receive inferred trust.
  }
}

if (topLevel && window.opener) {
  try {
    relatedContextDocument = window.opener.document;
  } catch {
    // Cross-origin or inaccessible openers do not receive inferred trust.
  }
}

void startContentScript({
  document,
  getRelatedAlbertContext,
  location,
  preferenceStore: chromePreferenceStore,
  ...(relatedContextDocument ? { relatedContextDocument } : {}),
  topLevel,
}).catch(() => {
  removeMountedHeader(document);
  removeNativeTheme(document);
});
