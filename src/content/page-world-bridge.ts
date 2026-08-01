const ACTIVATION_ATTRIBUTE = "data-better-albert-native-activation";
const ACTIVATION_MESSAGE = "better-albert:activate-native-control";

function isActivationMessage(
  value: unknown,
): value is {
  token: string;
  allowJavascriptUrl?: boolean;
  preserveJavascriptUrlDefault?: boolean;
} {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      value.type === ACTIVATION_MESSAGE &&
      "token" in value &&
      typeof value.token === "string" &&
      value.token.length > 0 &&
      (!("allowJavascriptUrl" in value) ||
        typeof value.allowJavascriptUrl === "boolean") &&
      (!("preserveJavascriptUrlDefault" in value) ||
        typeof value.preserveJavascriptUrlDefault === "boolean"),
  );
}

function activateNativeControlInPageWorld(
  token: string,
  allowJavascriptUrl: boolean,
  preserveJavascriptUrlDefault: boolean,
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
      if (!preserveJavascriptUrlDefault) {
        // Keep the page-owned script and event path, but discard a string
        // return value so the javascript: URL cannot replace the document.
        const script = href
          .slice(href.indexOf(":") + 1)
          .replace(/;\s*$/, "");
        control.setAttribute("href", `javascript:void (${script})`);
        control.click();
        control.setAttribute("href", href);
        return;
      }

      // Dispatch the native page-world click for the one verified
      // javascript: action. The PeopleSoft Search anchor keeps its behavior
      // in the href (rather than an onclick listener), so canceling the
      // default action would silently swallow the course-search transition.
      // The URL is never evaluated by the extension world; the page remains
      // the authority for this existing, non-transactional control.
      const click = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        composed: true,
      });
      control.dispatchEvent(click);
      return;
    }
    control.click();
    return;
  }

  const click = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    composed: true,
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
      event.data.preserveJavascriptUrlDefault === true,
    );
  }
});

document.addEventListener(ACTIVATION_MESSAGE, (event: Event): void => {
  const detail = (event as CustomEvent).detail;
  if (
    !detail ||
    typeof detail !== "object" ||
    typeof detail.token !== "string" ||
    typeof detail.allowJavascriptUrl !== "boolean" ||
    ("preserveJavascriptUrlDefault" in detail &&
      typeof detail.preserveJavascriptUrlDefault !== "boolean")
  ) {
    return;
  }

  activateNativeControlInPageWorld(
    detail.token,
    detail.allowJavascriptUrl,
    detail.preserveJavascriptUrlDefault === true,
  );
});
