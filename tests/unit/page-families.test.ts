import { describe, expect, it } from "vitest";

import { PAGE_FAMILY_DEFINITIONS } from "../../src/content/page-families";

describe("page-family task vocabulary", () => {
  it("orients new students from the Home workspace context", () => {
    expect(PAGE_FAMILY_DEFINITIONS.home.description).toBe(
      "Your starting point for classes, first-week help, and time-sensitive tasks",
    );
  });

  it("keeps course discovery and schedule language on the Home destination", () => {
    expect(PAGE_FAMILY_DEFINITIONS.home.keywords).toEqual(
      expect.arrayContaining([
        "class schedule",
        "course registration",
        "class registration",
        "enroll in class",
        "register for classes",
      ]),
    );
  });

  it("recognizes public advisor language on the Academics destination", () => {
    expect(PAGE_FAMILY_DEFINITIONS.academics.keywords).toEqual(
      expect.arrayContaining([
        "academic advisor",
        "academic planning",
        "academic planning and support",
        "accelerated studies",
        "undergraduate advisement",
        "your academic advisor",
      ]),
    );
  });

  it("recognizes outcome language that should lead students to Finances", () => {
    expect(PAGE_FAMILY_DEFINITIONS.finances.keywords).toEqual(
      expect.arrayContaining([
        "amount due",
        "bills payments and refunds",
        "how much owe",
        "manage your personal finances",
        "review charges",
        "tuition and fees",
        "what owe",
        "payment plan",
      ]),
    );
  });

  it("keeps enrollment-letter requests on records", () => {
    expect(PAGE_FAMILY_DEFINITIONS.grades.keywords).toEqual(
      expect.arrayContaining([
        "enrollment letter",
        "graduation",
        "graduation requirements",
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
        "date of birth",
        "gender",
        "legal name",
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
        "advice for your first semester",
        "advice for transfer students",
        "time management guide",
        "printing",
        "printing on campus",
        "libraries",
        "maps",
        "transportation",
        "orientation",
        "new student orientation",
        "new student",
        "first year student",
        "newly admitted student",
        "welcome week",
        "first semester",
        "first semester advice",
        "time management",
        "transfer student",
        "student tech guide",
        "health and wellness",
        "career development",
        "parking",
        "disability services",
        "accessibility",
        "bookstore",
        "campus map",
        "transit",
        "shuttle",
      ]),
    );
  });

  it("keeps student ID requests aligned with the native Card Center resource", () => {
    expect(PAGE_FAMILY_DEFINITIONS.resources.keywords).toEqual(
      expect.arrayContaining([
        "student id",
        "student id card",
        "school id",
        "student link",
        "studentlink",
        "academic services",
        "communities and groups",
        "how we engage",
        "trainings and workshops",
        "how we engage modules",
        "constructive dialogue institute",
        "inclusive dialogue institute",
        "programs and events",
        "berkley institute for civil discourse",
        "centers for connection and community",
        "community standards",
        "ndah policy training",
        "university student conduct policy",
        "additional support resources",
        "housing and dining",
        "student guides",
        "resources for students",
        "key links",
        "student information and resources",
        "academic and campus resources",
        "getting around campus",
        "get support",
        "wellbeing",
        "wellbeing resources",
        "academic tutoring at nyu",
        "access clinical care",
        "book an appointment with nyu connect",
        "clubs and organizations",
        "food accessibility assistance",
        "leadership opportunities",
        "public transportation discounts",
        "report an incident",
        "writing center",
        "student complaint information",
        "speaking freely",
        "find more student guides",
        "more about studentlink",
        "student visa and immigration",
        "nyu bookstores",
        "campus cash and nyu card",
        "financial education",
        "opportunity programs",
        "mlk jr scholars program",
        "resources and support for students",
        "programs to inspire success",
        "surveys for success",
        "about student success",
        "center for student success insights",
        "wellbeing across nyu",
        "get inspired",
        "watch a video",
        "commuter students",
        "graduate students",
        "lgbtq students",
        "military students and vets",
        "students with disabilities",
        "students with children",
        "students of color",
      ]),
    );
  });
});
