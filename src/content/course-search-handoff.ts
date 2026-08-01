import { activateNativeControl, type NativeControl } from "./native-control";

const COURSE_SEARCH_INTENT_TTL_MS = 10_000;
const ENROLLMENT_CART_PATH =
  /^\/psc\/csprod\/EMPLOYEE\/SA\/c\/NYU_SR_FL\.NYU_SSENRL_CART_FL\.GBL\/?$/i;
const CLASS_SEARCH_PATH =
  /^\/psc\/csprod\/EMPLOYEE\/SA\/c\/NYU_SR\.NYU_CLS_SRCH\.GBL\/?$/i;
const PORTAL_PATH = /^\/(?:psp|psc)\//i;
const SEARCH_MODE_HEADING =
  "find classes to add to your enrollment cart using the options below";
const COURSE_SEARCH_FRAME_READY_MESSAGE =
  "better-albert:course-search-frame-ready";
const COURSE_SEARCH_FRAME_OPEN_MESSAGE =
  "better-albert:open-native-course-search";
const COURSE_SEARCH_SCROLL_MESSAGE = "better-albert:course-search-scroll";
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
    control.parentElement?.parentElement?.textContent,
  ];
  return labels.some((label) => normalizeText(label) === "class search");
}

function isSelectedRadio(control: HTMLInputElement): boolean {
  return control.checked || control.getAttribute("aria-checked") === "true";
}

function findNativeSearchModeControl(
  document: Document,
): NativeControl | undefined {
  const headings = Array.from(
    document.querySelectorAll(
      "h1, h2, h3, h4, h5, h6, [role='heading']",
    ),
  ).filter(
    (heading) =>
      normalizeText(heading.textContent).includes(SEARCH_MODE_HEADING) &&
      isVisibleNativeControl(heading, document),
  );
  if (headings.length !== 1) {
    return undefined;
  }

  const radios = Array.from(
    document.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
  ).filter(
    (radio) =>
      isCourseSearchRadio(radio) &&
      isSelectedRadio(radio) &&
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

  activateNativeControl(control, {
    allowJavascriptUrl: true,
    preserveJavascriptUrlDefault: true,
  });
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

/**
 * The cart navigates the same cross-origin iframe to this classic Class
 * Search route after the student chooses "Search". Keep it in the same
 * allowlist so the parent modal remains a verified scroll owner after that
 * navigation rather than rejecting wheel messages once the cart URL changes.
 */
export function isClassSearchUrl(url: string): boolean {
  const location = parseLocation(url);
  return Boolean(
    location &&
      location.protocol === "https:" &&
      location.hostname === "sis.nyu.edu" &&
      CLASS_SEARCH_PATH.test(location.pathname),
  );
}

function isCourseSearchComponentUrl(url: string): boolean {
  return isEnrollmentCartUrl(url) || isClassSearchUrl(url);
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
  let current: HTMLElement | null = frame;
  while (current) {
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

    const root = current.getRootNode();
    current =
      root instanceof ShadowRoot && root.host instanceof HTMLElement
        ? root.host
        : current.parentElement;
  }
  return true;
}

/**
 * Detect the native Class Search overlay from the top-level portal document.
 * The relay is cross-origin and may not expose its dialog markup to the
 * parent, but its exact allowlisted frame routes are visible and reversible.
 */
export function hasOpenCourseSearchFrame(document: Document): boolean {
  return getChildFrames(document).some((frame) => {
    if (!isVisibleFrame(frame)) {
      return false;
    }
    if (
      isCourseSearchRelayUrl(frame.src) ||
      isCourseSearchComponentUrl(frame.src)
    ) {
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
  const frames: HTMLIFrameElement[] = [];
  const visitedRoots = new Set<Document | ShadowRoot>();
  const pendingRoots: Array<Document | ShadowRoot> = [document];

  while (pendingRoots.length > 0) {
    const root = pendingRoots.pop();
    if (!root || visitedRoots.has(root)) {
      continue;
    }
    visitedRoots.add(root);

    frames.push(...root.querySelectorAll<HTMLIFrameElement>("iframe"));
    for (const element of root.querySelectorAll<HTMLElement>("*")) {
      if (element.shadowRoot && !visitedRoots.has(element.shadowRoot)) {
        pendingRoots.push(element.shadowRoot);
      }
    }
  }

  return frames;
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

function scrollCourseSearchModal(document: Document, deltaY: number): void {
  if (!Number.isFinite(deltaY) || deltaY === 0) {
    return;
  }

  const markedModal = document.querySelector<HTMLElement>(
    "#pt_modals[data-better-albert-course-search-modal]",
  );
  const modal =
    markedModal ??
    (document.querySelectorAll<HTMLElement>("#pt_modals").length === 1
      ? document.querySelector<HTMLElement>("#pt_modals")
      : undefined);
  if (!modal) {
    return;
  }

  // Keep a wheel gesture over the cross-origin iframe in the same scroll
  // context as the native modal. Browser scrolling clamps scrollTop to the
  // modal's available range, so no synthetic geometry or layout state is kept.
  modal.scrollTop += Math.max(-2_000, Math.min(2_000, deltaY));
}

function postCourseSearchScroll(window: Window, deltaY: number): void {
  if (!Number.isFinite(deltaY) || deltaY === 0) {
    return;
  }

  try {
    const topWindow = window.top;
    if (!topWindow) {
      return;
    }
    topWindow.postMessage(
      { type: COURSE_SEARCH_SCROLL_MESSAGE, deltaY },
      PORTAL_ORIGIN,
    );
  } catch {
    // A navigation can detach the top window while a wheel event is in
    // flight; native scrolling remains the fallback in that transition.
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
    const fallbackFrame =
      !frame && event.origin === COMPONENT_ORIGIN
        ? getChildFrames(document).find(
            (candidate) =>
              parseLocation(candidate.src)?.origin === COMPONENT_ORIGIN &&
              isVisibleFrame(candidate),
          )
        : undefined;
    const sourceWindow = event.source as Window | null;
    const targetWindow = sourceWindow ?? (frame ?? fallbackFrame)?.contentWindow;
    if (
      Date.now() >= expiresAt ||
      event.origin !== COMPONENT_ORIGIN ||
      !isMessageType(event.data, COURSE_SEARCH_FRAME_READY_MESSAGE) ||
      !targetWindow
    ) {
      return;
    }

    try {
      targetWindow.postMessage(
        { type: COURSE_SEARCH_FRAME_OPEN_MESSAGE },
        COMPONENT_ORIGIN,
      );
    } catch {
      // The frame can be navigating between the ready event and delivery.
    }
    expiresAt = 0;
  };

  const handleFrameScroll = (event: MessageEvent): void => {
    if (
      event.source === null ||
      !isAllowlistedOrigin(event.origin) ||
      !isMessageType(event.data, COURSE_SEARCH_SCROLL_MESSAGE) ||
      !hasOpenCourseSearchFrame(document)
    ) {
      return;
    }

    const deltaY =
      event.data && typeof event.data === "object" && "deltaY" in event.data
        ? event.data.deltaY
        : undefined;
    if (typeof deltaY === "number") {
      scrollCourseSearchModal(document, deltaY);
    }
  };

  window?.addEventListener("message", handleFrameReady);
  window?.addEventListener("message", handleFrameScroll);

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
      window?.removeEventListener("message", handleFrameScroll);
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

  const handleWheel = (event: WheelEvent): void => {
    postCourseSearchScroll(window, event.deltaY);
  };

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

  // Capture before PeopleSoft's legacy handlers can stop propagation. The
  // listener only forwards a data-free delta; it never cancels native input.
  window.addEventListener("wheel", handleWheel, {
    capture: true,
    passive: true,
  });
  window.addEventListener("message", handleOpenRequest);
  return () => {
    window.removeEventListener("wheel", handleWheel, true);
    window.removeEventListener("message", handleOpenRequest);
  };
}

export function startCourseSearchFrameReceiver(
  document: Document,
): () => void {
  const window = document.defaultView;
  if (
    !window ||
    window.top === window ||
    !isCourseSearchComponentUrl(window.location.href)
  ) {
    return () => undefined;
  }

  let handled = false;
  let retryObserver: MutationObserver | undefined;
  let retryTimer: number | undefined;

  const handleWheel = (event: WheelEvent): void => {
    postCourseSearchScroll(window, event.deltaY);
  };
  // Capture before PeopleSoft's legacy handlers can stop propagation. The
  // listener only forwards a data-free delta; it never cancels native input.
  window.addEventListener("wheel", handleWheel, {
    capture: true,
    passive: true,
  });

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
    const sourceIsParent =
      event.source === window.parent || event.source === window.top;
    const allowlistedPortalSource =
      event.origin === PORTAL_ORIGIN && event.source !== null;
    if (
      handled ||
      (!sourceIsParent && !allowlistedPortalSource) ||
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
    window.removeEventListener("wheel", handleWheel, true);
    window.removeEventListener("message", handleOpenRequest);
  };
}
