import { beforeEach, describe, expect, it } from "vitest";

import {
  classifyAlbertDocument,
  detectPageFamily,
} from "../../src/content/page-detector";

const portalLocation = new URL(
  "https://sis.portal.nyu.edu/psp/ihprod/EMPLOYEE/EMPL/h/",
);

describe("Albert page detection", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = `
      <head><title>Albert</title></head>
      <body>
        <nav>
          <a href="#home">Home</a>
          <a href="#academics">Academics</a>
          <a href="#grades">Grades &amp; Transcripts</a>
          <a href="#finances">Finances</a>
          <a href="#personal">Personal Info</a>
          <a href="#resources">OTHER RESOURCES</a>
        </nav>
        <main><h1>Student Center</h1></main>
      </body>
    `;
  });

  it.each([
    ["Home", "home"],
    ["Academics", "academics"],
    ["Grades & Transcripts", "grades"],
    ["Finances", "finances"],
    ["Personal Info", "personal"],
    ["OTHER RESOURCES", "resources"],
  ] as const)("maps selected %s navigation to %s", (label, expected) => {
    const link = Array.from(document.querySelectorAll("a")).find(
      (candidate) => candidate.textContent === label,
    );
    link?.setAttribute("aria-current", "page");

    expect(detectPageFamily(document)).toBe(expected);
  });

  it("recognizes both /psp and /psc documents on only the exact portal host", () => {
    expect(
      classifyAlbertDocument({
        document,
        location: portalLocation,
        topLevel: true,
      }),
    ).toMatchObject({ kind: "albert", topLevel: true });
    expect(
      classifyAlbertDocument({
        document,
        relatedAlbertContext: true,
        location: new URL(
          "https://sis.portal.nyu.edu/psc/ihprod/EMPLOYEE/SA/c/example",
        ),
        topLevel: false,
      }),
    ).toMatchObject({ kind: "albert", topLevel: false });
    expect(
      classifyAlbertDocument({
        document,
        location: new URL("https://example.nyu.edu/psp/example"),
        topLevel: true,
      }),
    ).toEqual({ kind: "unsupported" });
  });

  it("gives authentication evidence priority over the portal path", () => {
    document.title = "Albert Login";
    expect(
      classifyAlbertDocument({
        document,
        location: portalLocation,
        topLevel: true,
      }),
    ).toEqual({ kind: "authentication" });
  });

  it("does not treat a bare SIS PeopleSoft path as positive Albert evidence", () => {
    document.title = "Loading";
    document.body.replaceChildren(document.createElement("main"));

    expect(
      classifyAlbertDocument({
        document,
        location: portalLocation,
        topLevel: true,
      }),
    ).toEqual({ kind: "unsupported" });
  });

  it("recognizes an explicit NYU student-self-service uninav deep route", () => {
    document.title = "Academic Planner";
    document.body.replaceChildren(document.createElement("main"));

    expect(
      classifyAlbertDocument({
        document,
        relatedAlbertContext: true,
        location: new URL(
          "https://sis.portal.nyu.edu/psp/ihprod_newwin/EMPLOYEE/SA/c/example?cmd=uninav&uninavpath=Root.NYU_SSS_HIDDEN.Academics",
        ),
        topLevel: true,
      }),
    ).toMatchObject({
      kind: "albert",
      pageFamily: "academics",
      topLevel: true,
    });
  });

  it("rejects a self-service route without verified portal context", () => {
    document.title = "Academic Planner";
    document.body.replaceChildren(document.createElement("main"));

    expect(
      classifyAlbertDocument({
        document,
        location: new URL(
          "https://sis.portal.nyu.edu/psp/ihprod_newwin/EMPLOYEE/SA/c/example?cmd=uninav&uninavpath=Root.NYU_SSS_HIDDEN.Academics",
        ),
        topLevel: true,
      }),
    ).toEqual({ kind: "unsupported" });
  });

  it("rejects an unrelated SIS new-window route without Albert context", () => {
    document.title = "Employee Administration";
    document.body.replaceChildren(document.createElement("main"));

    expect(
      classifyAlbertDocument({
        document,
        location: new URL(
          "https://sis.portal.nyu.edu/psp/ihprod_newwin/EMPLOYEE/SA/c/example",
        ),
        topLevel: true,
      }),
    ).toEqual({ kind: "unsupported" });
  });

  it("recognizes only the proven class-search component on sis.nyu.edu", () => {
    document.title = "Class Search";
    document.body.replaceChildren(document.createElement("main"));

    expect(
      classifyAlbertDocument({
        document,
        location: new URL(
          "https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/NYU_SR_FL.NYU_SSENRL_CART_FL.GBL",
        ),
        topLevel: false,
      }),
    ).toMatchObject({
      kind: "albert",
      pageFamily: "academics",
      topLevel: false,
    });
    expect(
      classifyAlbertDocument({
        document,
        location: new URL(
          "https://sis.nyu.edu/psc/csprod/EMPLOYEE/SA/c/UNRELATED.COMPONENT.GBL",
        ),
        topLevel: false,
      }),
    ).toEqual({ kind: "unsupported" });
  });
});
