import { describe, expect, it } from "vitest";

import { PAGE_FAMILY_DEFINITIONS } from "../../src/content/page-families";

describe("page-family task vocabulary", () => {
  it("recognizes outcome language that should lead students to Finances", () => {
    expect(PAGE_FAMILY_DEFINITIONS.finances.keywords).toEqual(
      expect.arrayContaining([
        "amount due",
        "how much owe",
        "review charges",
        "what owe",
      ]),
    );
  });
});
