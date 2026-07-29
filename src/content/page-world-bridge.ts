const ACTIVATION_ATTRIBUTE = "data-better-albert-native-activation";
const ACTIVATION_MESSAGE = "better-albert:activate-native-control";

function isActivationMessage(
  value: unknown,
): value is { token: string; allowJavascriptUrl?: boolean } {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      value.type === ACTIVATION_MESSAGE &&
      "token" in value &&
      typeof value.token === "string" &&
      value.token.length > 0 &&
      (!("allowJavascriptUrl" in value) ||
        typeof value.allowJavascriptUrl === "boolean"),
  );
}

function activateNativeControlInPageWorld(
  token: string,
  allowJavascriptUrl: boolean,
): void {
  const control = Array.from(
    document.querySelectorAll<HTMLElement>(
      `[${ACTIVATION_ATTRIBUTE}]`,
    ),
  ).find((candidate) => candidate.getAttribute(ACTIVATION_ATTRIBUTE) === token);

  if (!control) {
    return;
  }

  control.removeAttribute(ACTIVATION_ATTRIBUTE);
  if (allowJavascriptUrl) {
    const href = control.getAttribute("href");
    if (href?.match(/^\s*javascript:/i)) {
      // Keep the page-owned script and event path, but discard a string return
      // value. Without this wrapper, a harmless assignment such as
      // `document.body.dataset.nativeSearchActivated = 'true'` replaces the
      // whole document with the returned string in Chromium.
      const script = href
        .slice(href.indexOf(":") + 1)
        .replace(/;\s*$/, "");
      control.setAttribute("href", `javascript:void (${script})`);
      control.click();
      control.setAttribute("href", href);
      return;
    }
    control.click();
    return;
  }

  const click = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
  });
  click.preventDefault();
  control.dispatchEvent(click);
}

window.addEventListener("message", (event: MessageEvent): void => {
  // Chromium can expose an isolated-world WindowProxy wrapper to the
  // page-world listener. The origin check remains exact and the token is
  // still required before any native control is activated.
  if (event.source === null || event.origin !== window.location.origin) {
    return;
  }

  if (isActivationMessage(event.data)) {
    activateNativeControlInPageWorld(
      event.data.token,
      event.data.allowJavascriptUrl === true,
    );
  }
});

document.addEventListener(ACTIVATION_MESSAGE, (event: Event): void => {
  const detail = (event as CustomEvent).detail;
  if (
    !detail ||
    typeof detail !== "object" ||
    typeof detail.token !== "string" ||
    typeof detail.allowJavascriptUrl !== "boolean"
  ) {
    return;
  }

  activateNativeControlInPageWorld(
    detail.token,
    detail.allowJavascriptUrl,
  );
});
