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

  it("recognizes student-language contact-update requests for Personal Info", () => {
    expect(PAGE_FAMILY_DEFINITIONS.personal.keywords).toEqual(
      expect.arrayContaining([
        "new address",
        "new email address",
        "new emergency contact",
        "new phone number",
        "update address",
        "update email",
        "update emergency contact",
        "update phone",
      ]),
    );
  });
});
