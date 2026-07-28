const ACTIVATION_ATTRIBUTE = "data-better-albert-native-activation";
const ACTIVATION_MESSAGE = "better-albert:activate-native-control";

function isActivationMessage(value: unknown): value is { token: string } {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      value.type === ACTIVATION_MESSAGE &&
      "token" in value &&
      typeof value.token === "string" &&
      value.token.length > 0,
  );
}

function activateNativeControlInPageWorld(token: string): void {
  const control = Array.from(
    document.querySelectorAll<HTMLElement>(
      `[${ACTIVATION_ATTRIBUTE}]`,
    ),
  ).find((candidate) => candidate.getAttribute(ACTIVATION_ATTRIBUTE) === token);

  if (!control) {
    return;
  }

  control.removeAttribute(ACTIVATION_ATTRIBUTE);
  control.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
    }),
  );
}

window.addEventListener("message", (event: MessageEvent): void => {
  if (event.source !== window || event.origin !== window.location.origin) {
    return;
  }

  if (isActivationMessage(event.data)) {
    activateNativeControlInPageWorld(event.data.token);
  }
});
