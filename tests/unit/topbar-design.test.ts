import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const NATIVE_THEME_CSS = readFileSync(
  resolve(__dirname, "../../src/design-system/native-theme.css"),
  "utf8",
).replace(/\s+/g, " ");

describe("native Albert masthead contract", () => {
  it("keeps the compact masthead as one full-width violet row", () => {
    const wrapper = NATIVE_THEME_CSS.indexOf(
      "#IS_BB_HEADER_WRAPPER { display: block !important;",
    );

    expect(wrapper).toBeGreaterThan(-1);
    expect(NATIVE_THEME_CSS.slice(wrapper, wrapper + 620)).toContain(
      "height: 60px !important",
    );
    expect(NATIVE_THEME_CSS.slice(wrapper, wrapper + 620)).toContain(
      "padding: 0 !important",
    );
    expect(NATIVE_THEME_CSS.slice(wrapper, wrapper + 620)).toContain(
      "background: var(--ba-native-violet) !important",
    );
  });

  it("does not turn the native NYU logo link into a white orphan block", () => {
    const logo = NATIVE_THEME_CSS.indexOf(
      "#IS_BB_HEADER_LOGO_CONTAINER > a {",
    );

    expect(logo).toBeGreaterThan(-1);
    const logoBlock = NATIVE_THEME_CSS.slice(logo, logo + 520);
    expect(logoBlock).toContain("background: transparent !important");
    expect(logoBlock).toContain("border: 0 !important");
    expect(logoBlock).toContain("width: 100% !important");
  });

  it("styles the native alert as a compact, centered status pill", () => {
    const alert = NATIVE_THEME_CSS.indexOf(
      "#IS_CL_ALERTS .is_alertHeader {",
    );

    expect(alert).toBeGreaterThan(-1);
    const alertBlock = NATIVE_THEME_CSS.slice(alert, alert + 780);
    expect(alertBlock).toContain("margin: 0 auto !important");
    expect(alertBlock).toContain("height: 32px !important");
    expect(alertBlock).toContain("background: #2ea154 !important");
  });

  it("centers the native logout action inside its masthead grid cell", () => {
    const logout = NATIVE_THEME_CSS.indexOf(
      ".IS_BB_RSPV_HEADER_LINK {",
    );

    expect(logout).toBeGreaterThan(-1);
    const logoutBlock = NATIVE_THEME_CSS.slice(logout, logout + 520);
    expect(logoutBlock).toContain("justify-content: center !important");
    expect(logoutBlock).toContain("padding: 0 !important");
  });
});
