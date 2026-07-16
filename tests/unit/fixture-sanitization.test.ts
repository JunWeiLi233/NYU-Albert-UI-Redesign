import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const fixtureFiles = [
  "tests/fixtures/albert-shell.html",
  "tests/fixtures/albert-deep-page.html",
  "tests/fixtures/albert-class-search.html",
  "tests/fixtures/albert-class-search-empty.html",
  "tests/fixtures/albert-class-search-error.html",
  "tests/fixtures/families/academics.html",
  "tests/fixtures/families/grades.html",
  "tests/fixtures/families/finances.html",
  "tests/fixtures/families/personal.html",
];

describe("sanitized fixture contract", () => {
  it.each(fixtureFiles)("contains no likely live NYU identity in %s", (path) => {
    const html = readFileSync(resolve(process.cwd(), path), "utf8");
    expect(html).not.toMatch(/[a-z0-9._%+-]+@nyu\.edu/i);
    expect(html).not.toMatch(/\bN\d{8}\b/i);
    expect(html).not.toMatch(/\b\d{9}\b/);
  });
});
