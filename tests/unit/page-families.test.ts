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

  it("keeps missing resource destinations discoverable through native Other Resources", () => {
    expect(PAGE_FAMILY_DEFINITIONS.resources.keywords).toEqual(
      expect.arrayContaining([
        "student support",
        "technology help",
        "wifi",
        "printing",
        "libraries",
        "maps",
        "transportation",
        "orientation",
        "new student orientation",
      ]),
    );
  });

  it("keeps student ID requests aligned with the native Card Center resource", () => {
    expect(PAGE_FAMILY_DEFINITIONS.resources.keywords).toEqual(
      expect.arrayContaining(["student id", "student id card", "school id"]),
    );
  });
});
