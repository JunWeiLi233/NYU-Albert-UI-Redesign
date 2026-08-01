import { afterEach, describe, expect, it } from "vitest";

import "../../src/content/page-world-bridge";

describe("page-world native activation bridge", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("dispatches the verified javascript URL action through the page click", () => {
    const anchor = document.createElement("a");
    const href = "javascript:void(0)";
    let clickCount = 0;
    anchor.setAttribute("href", href);
    anchor.setAttribute(
      "data-better-albert-native-activation",
      "bridge-test",
    );
    anchor.addEventListener("click", (event) => {
      clickCount += 1;
      expect(event.defaultPrevented).toBe(false);
    });
    document.body.append(anchor);

    document.dispatchEvent(
      new CustomEvent("better-albert:activate-native-control", {
        detail: {
          token: "bridge-test",
          allowJavascriptUrl: true,
          preserveJavascriptUrlDefault: true,
        },
      }),
    );

    expect(clickCount).toBe(1);
    expect(anchor.getAttribute("href")).toBe(href);
    expect(
      anchor.hasAttribute("data-better-albert-native-activation"),
    ).toBe(false);
  });
});
