const JAVASCRIPT_URL_PATTERN = /^\s*javascript:/i;

export type NativeControl = HTMLAnchorElement | HTMLButtonElement;

/**
 * Activates an existing Albert control without evaluating javascript: URLs in
 * the extension world. Albert's own click handlers still receive the event;
 * only the anchor's unsafe default navigation is cancelled.
 */
export function activateNativeControl(control: NativeControl): void {
  if (
    !(control instanceof HTMLAnchorElement) ||
    !JAVASCRIPT_URL_PATTERN.test(control.getAttribute("href") ?? "")
  ) {
    control.click();
    return;
  }

  const preventJavascriptUrl = (event: Event): void => {
    event.preventDefault();
  };

  control.addEventListener("click", preventJavascriptUrl, {
    capture: true,
    once: true,
  });

  try {
    control.click();
  } finally {
    control.removeEventListener("click", preventJavascriptUrl, true);
  }
}
