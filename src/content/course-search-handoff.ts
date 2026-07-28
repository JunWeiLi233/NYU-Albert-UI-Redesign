import { activateNativeControl, type NativeControl } from "./native-control";

const COURSE_SEARCH_INTENT_TTL_MS = 10_000;
const ENROLLMENT_CART_PATH =
  /^\/psc\/csprod\/EMPLOYEE\/SA\/c\/NYU_SR_FL\.NYU_SSENRL_CART_FL\.GBL\/?$/i;
const PORTAL_PATH = /^\/(?:psp|psc)\//i;
const SEARCH_MODE_HEADING =
  "find classes to add to your enrollment cart using the options below";
const COURSE_SEARCH_FRAME_READY_MESSAGE =
  "better-albert:course-search-frame-ready";
const COURSE_SEARCH_FRAME_OPEN_MESSAGE =
  "better-albert:open-native-course-search";
const COMPONENT_ORIGIN = "https://sis.nyu.edu";
const PORTAL_ORIGIN = "https://sis.portal.nyu.edu";
const UNVERIFIED_FRAME_TARGET_ORIGIN = "*";
const COURSE_SEARCH_RELAY_PATH =
  /^\/psp\/[^/]+\/EMPLOYEE\/SA\/s\/WEBLIB_NYU_NCOA\.ISCRIPT1\.FieldFormula\.IScript_Open\/?$/i;

function normalizeText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim().toLocaleLowerCase() ?? "";
}

function isVisibleNativeControl(
  control: Element,
  document: Document,
): boolean {
  if (
    !control.isConnected ||
    control.ownerDocument !== document ||
    control.matches(":disabled, [disabled], [aria-disabled='true']")
  ) {
    return false;
  }

  for (
    let current: Element | null = control;
    current;
    current = current.parentElement
  ) {
    if (
      current.hasAttribute("hidden") ||
      current.getAttribute("aria-hidden") === "true"
    ) {
      return false;
    }

    const style = document.defaultView?.getComputedStyle(current);
    if (style?.display === "none" || style?.visibility === "hidden") {
      return false;
    }
  }

  return true;
}

function getControlLabel(control: Element): string {
  if (control instanceof HTMLInputElement) {
    return normalizeText(
      control.getAttribute("aria-label") ||
        control.labels?.[0]?.textContent ||
        control.getAttribute("alt") ||
        control.getAttribute("title") ||
        control.value,
    );
  }

  const directLabel = normalizeText(
    control.getAttribute("aria-label") ?? control.textContent,
  );
  if (directLabel) {
    return directLabel;
  }

  const images = control.querySelectorAll("img");
  if (images.length !== 1) {
    return "";
  }

  const image = images[0];
  return normalizeText(
    image?.getAttribute("aria-label") ||
      image?.getAttribute("alt") ||
      image?.getAttribute("title"),
  );
}

function isCourseSearchRadio(control: HTMLInputElement): boolean {
  if (control.type !== "radio") {
    return false;
  }

  const labels = [
    control.getAttribute("aria-label"),
    control.labels?.[0]?.textContent,
    control.labels?.[1]?.textContent,
    control.parentElement?.textContent,
  ];
  return labels.some((label) => normalizeText(label) === "class search");
}

function findNativeSearchModeControl(
  document: Document,
): NativeControl | undefined {
  const headings = Array.from(
    document.querySelectorAll(
      "h1, h2, h3, h4, h5, h6, [role='heading']",
    ),
  ).filter(
    (heading) => normalizeText(heading.textContent) === SEARCH_MODE_HEADING,
  );
  if (headings.length !== 1) {
    return undefined;
  }

  const radios = Array.from(
    document.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
  ).filter(
    (radio) =>
      isCourseSearchRadio(radio) &&
      radio.checked &&
      isVisibleNativeControl(radio, document),
  );
  if (radios.length !== 1) {
    return undefined;
  }

  const controls = Array.from(
    document.querySelectorAll<
      HTMLAnchorElement | HTMLButtonElement | HTMLInputElement
    >(
      "a, button, input[type='button'], input[type='submit'], input[type='image']",
    ),
  ).filter(
    (control) =>
      getControlLabel(control) === "search" &&
      isVisibleNativeControl(control, document),
  );
  return controls.length === 1 ? controls[0] : undefined;
}

export function advanceToNativeClassSearch(document: Document): boolean {
  const control = findNativeSearchModeControl(document);
  if (!control) {
    return false;
  }

  activateNativeControl(control);
  return true;
}

function parseLocation(url: string): URL | undefined {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
}

export function isTrustedCourseSearchIntentSource(url: string): boolean {
  const location = parseLocation(url);
  return Boolean(
    location &&
      location.protocol === "https:" &&
      location.hostname === "sis.portal.nyu.edu" &&
      PORTAL_PATH.test(location.pathname),
  );
}

export function isEnrollmentCartUrl(url: string): boolean {
  const location = parseLocation(url);
  return Boolean(
    location &&
      location.protocol === "https:" &&
      location.hostname === "sis.nyu.edu" &&
      ENROLLMENT_CART_PATH.test(location.pathname),
  );
}

export function isCourseSearchRelayUrl(url: string): boolean {
  const location = parseLocation(url);
  return Boolean(
    location &&
      location.protocol === "https:" &&
      location.hostname === "sis.portal.nyu.edu" &&
      COURSE_SEARCH_RELAY_PATH.test(location.pathname),
  );
}

function isVisibleFrame(frame: HTMLIFrameElement): boolean {
  for (let current: HTMLElement | null = frame; current; current = current.parentElement) {
    if (
      current.hidden ||
      current.getAttribute("aria-hidden") === "true" ||
      current.ownerDocument.defaultView?.getComputedStyle(current).display ===
        "none" ||
      current.ownerDocument.defaultView?.getComputedStyle(current).visibility ===
        "hidden"
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Detect the native Class Search overlay from the top-level portal document.
 * The relay is cross-origin and may not expose its dialog markup to the
 * parent, but its exact allowlisted frame routes are visible and reversible.
 */
export function hasOpenCourseSearchFrame(document: Document): boolean {
  return Array.from(
    document.querySelectorAll<HTMLIFrameElement>("iframe"),
  ).some((frame) => {
    if (!isVisibleFrame(frame)) {
      return false;
    }
    if (isCourseSearchRelayUrl(frame.src) || isEnrollmentCartUrl(frame.src)) {
      return true;
    }

    // A portal relay can host the allowlisted cart one level deeper. Same-
    // origin frames expose contentDocument; cross-origin frames safely return
    // null and remain covered by their own content-script lifecycle.
    try {
      return frame.contentDocument
        ? hasOpenCourseSearchFrame(frame.contentDocument)
        : false;
    } catch {
      return false;
    }
  });
}

function isMessageType(value: unknown, type: string): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      value.type === type,
  );
}

function getChildFrames(document: Document): HTMLIFrameElement[] {
  return Array.from(document.querySelectorAll<HTMLIFrameElement>("iframe"));
}

function isAllowlistedOrigin(origin: string | undefined): boolean {
  return origin === COMPONENT_ORIGIN || origin === PORTAL_ORIGIN;
}

interface FrameTarget {
  origin: string;
}

function getFrameTarget(frame: HTMLIFrameElement): FrameTarget | undefined {
  const source = parseLocation(frame.src);

  // The enrollment-cart component can redirect between the two allowlisted
  // SIS hosts while retaining its original iframe source. Do not trust a
  // stale component origin here; the payload is a data-free handshake and
  // every receiver still requires the exact portal origin.
  if (source?.origin === COMPONENT_ORIGIN) {
    return { origin: UNVERIFIED_FRAME_TARGET_ORIGIN };
  }

  try {
    const currentOrigin = frame.contentWindow?.location.origin;
    if (typeof currentOrigin === "string" && isAllowlistedOrigin(currentOrigin)) {
      return { origin: currentOrigin };
    }
  } catch {
    // Cross-origin frames do not expose their settled location to the parent.
  }

  if (source?.origin === PORTAL_ORIGIN) {
    return {
      // PeopleSoft can redirect an allowlisted iframe between the two hosts
      // while the request is in flight. The payload contains no student data;
      // child receivers still require an exact allowlisted event.origin.
      origin: UNVERIFIED_FRAME_TARGET_ORIGIN,
    };
  }

  return undefined;
}

function postOpenRequestToChildFrames(document: Document): void {
  for (const frame of getChildFrames(document)) {
    const target = getFrameTarget(frame);
    if (!target || !frame.contentWindow) {
      continue;
    }

    try {
      frame.contentWindow.postMessage(
        { type: COURSE_SEARCH_FRAME_OPEN_MESSAGE },
        target.origin,
      );
    } catch {
      // PeopleSoft may navigate a modal frame between origin detection and
      // delivery. The bounded retry loop will send again once it settles.
    }
  }
}

export interface CourseSearchFrameHandoff {
  request(): void;
  stop(): void;
}

export function createCourseSearchFrameHandoff(
  document: Document,
): CourseSearchFrameHandoff {
  const window = document.defaultView;
  let expiresAt = 0;
  const timers = new Set<number>();

  const postOpenRequest = (): void => {
    if (!window || Date.now() >= expiresAt) {
      return;
    }

    postOpenRequestToChildFrames(document);
  };

  const handleFrameReady = (event: MessageEvent): void => {
    const frame = getChildFrames(document).find(
      (candidate) => candidate.contentWindow === event.source,
    );
    if (
      Date.now() >= expiresAt ||
      event.origin !== COMPONENT_ORIGIN ||
      !isMessageType(event.data, COURSE_SEARCH_FRAME_READY_MESSAGE) ||
      !frame?.contentWindow
    ) {
      return;
    }

    try {
      frame.contentWindow.postMessage(
        { type: COURSE_SEARCH_FRAME_OPEN_MESSAGE },
        COMPONENT_ORIGIN,
      );
    } catch {
      // The frame can be navigating between the ready event and delivery.
    }
    expiresAt = 0;
  };

  window?.addEventListener("message", handleFrameReady);

  return {
    request(): void {
      if (!window) {
        return;
      }

      expiresAt = Date.now() + COURSE_SEARCH_INTENT_TTL_MS;
      postOpenRequest();
      for (const delay of [100, 400, 1_000, 2_500, 5_000, 8_000]) {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          postOpenRequest();
        }, delay);
        timers.add(timer);
      }
    },
    stop(): void {
      expiresAt = 0;
      for (const timer of timers) {
        window?.clearTimeout(timer);
      }
      timers.clear();
      window?.removeEventListener("message", handleFrameReady);
    },
  };
}

export function startCourseSearchFrameRelay(
  document: Document,
): () => void {
  const window = document.defaultView;
  if (
    !window ||
    window.top === window ||
    !isTrustedCourseSearchIntentSource(window.location.href)
  ) {
    return () => undefined;
  }

  const handleOpenRequest = (event: MessageEvent): void => {
    if (
      event.source !== window.parent ||
      event.origin !== PORTAL_ORIGIN ||
      !isMessageType(event.data, COURSE_SEARCH_FRAME_OPEN_MESSAGE)
    ) {
      return;
    }

    postOpenRequestToChildFrames(document);
  };

  window.addEventListener("message", handleOpenRequest);
  return () => window.removeEventListener("message", handleOpenRequest);
}

export function startCourseSearchFrameReceiver(
  document: Document,
): () => void {
  const window = document.defaultView;
  if (
    !window ||
    window.top === window ||
    !isEnrollmentCartUrl(window.location.href)
  ) {
    return () => undefined;
  }

  let handled = false;
  let retryObserver: MutationObserver | undefined;
  let retryTimer: number | undefined;

  const stopRetry = (): void => {
    retryObserver?.disconnect();
    retryObserver = undefined;
    if (retryTimer !== undefined) {
      window.clearTimeout(retryTimer);
      retryTimer = undefined;
    }
  };

  const tryAdvance = (): void => {
    if (handled) {
      stopRetry();
      return;
    }

    if (advanceToNativeClassSearch(document)) {
      handled = true;
      stopRetry();
      return;
    }

    if (!retryObserver && document.documentElement && window.MutationObserver) {
      retryObserver = new window.MutationObserver(() => tryAdvance());
      retryObserver.observe(document.documentElement, {
        attributeFilter: [
          "aria-checked",
          "aria-hidden",
          "aria-selected",
          "checked",
          "class",
          "disabled",
          "hidden",
          "style",
        ],
        attributes: true,
        childList: true,
        subtree: true,
      });
    }

    if (retryTimer === undefined) {
      retryTimer = window.setTimeout(stopRetry, COURSE_SEARCH_INTENT_TTL_MS);
    }
  };

  const handleOpenRequest = (event: MessageEvent): void => {
    if (
      handled ||
      (event.source !== window.parent && event.source !== window.top) ||
      !isAllowlistedOrigin(event.origin) ||
      !isMessageType(event.data, COURSE_SEARCH_FRAME_OPEN_MESSAGE)
    ) {
      return;
    }

    tryAdvance();
  };

  window.addEventListener("message", handleOpenRequest);
  window.parent.postMessage(
    { type: COURSE_SEARCH_FRAME_READY_MESSAGE },
    PORTAL_ORIGIN,
  );

  return () => {
    stopRetry();
    window.removeEventListener("message", handleOpenRequest);
  };
}
