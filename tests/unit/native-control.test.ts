import { afterEach, describe, expect, it, vi } from "vitest";

import { activateNativeControl } from "../../src/content/native-control";

describe("native control activation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("marks only the verified course-search javascript action for page-world default activation", () => {
    const anchor = document.createElement("a");
    anchor.href = "javascript:submitAction_win0(document.win0,'SMALL_BUTTON')";
    document.body.append(anchor);
    vi.stubGlobal("chrome", {});
    const postMessage = vi
      .spyOn(window, "postMessage")
      .mockImplementation(() => undefined);

    activateNativeControl(anchor, { allowJavascriptUrl: true });

    expect(
      anchor.getAttribute("data-better-albert-native-activation"),
    ).toEqual(expect.any(String));
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "better-albert:activate-native-control",
        allowJavascriptUrl: true,
      }),
      window.location.origin,
    );
  });
});
