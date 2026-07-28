const JAVASCRIPT_URL_PATTERN = /^\s*javascript:/i;
const ACTIVATION_ATTRIBUTE = "data-better-albert-native-activation";
const ACTIVATION_MESSAGE = "better-albert:activate-native-control";

let activationSequence = 0;

export type NativeControl =
  | HTMLAnchorElement
  | HTMLButtonElement
  | HTMLInputElement
  | HTMLLIElement;

/**
 * Activates an existing Albert control without evaluating javascript: URLs in
 * the extension world. Those anchors are delegated through the page-world
 * bridge so Albert's own handler runs under the page CSP while the
 * javascript: URL default action stays suppressed.
 */
export function activateNativeControl(control: NativeControl): void {
  if (
    control.tagName !== "A" ||
    !JAVASCRIPT_URL_PATTERN.test(control.getAttribute("href") ?? "")
  ) {
    control.click();
    return;
  }

  const ownerWindow = control.ownerDocument.defaultView;
  if (!ownerWindow) {
    return;
  }

  // jsdom has no extension world or page-world bridge. Keep the direct event
  // path for unit tests; packaged content scripts always have `chrome`.
  if (typeof chrome === "undefined") {
    control.dispatchEvent(
      new ownerWindow.MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
    return;
  }

  const token = `ba-native-${Date.now()}-${activationSequence++}`;
  control.setAttribute(ACTIVATION_ATTRIBUTE, token);
  ownerWindow.postMessage(
    { type: ACTIVATION_MESSAGE, token },
    ownerWindow.location.origin,
  );
  ownerWindow.setTimeout(() => {
    if (control.getAttribute(ACTIVATION_ATTRIBUTE) === token) {
      control.removeAttribute(ACTIVATION_ATTRIBUTE);
    }
  }, 1_000);
}
