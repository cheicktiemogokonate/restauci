import { describe, expect, it } from "vitest";
import {
  isDishAvailable,
  isDishOrderable,
  isDishPubliclyVisible,
} from "./model";

const schedule = {
  id: "lunch",
  actif: true,
  joursActifs: ["jeu"],
  heureOuverture: "12:00:00",
  heureFermeture: "15:00:00",
};
const dish = { disponible: true, creneauId: "lunch" };

describe("dish sale schedule", () => {
  it.each([
    ["2026-08-13T11:59:00Z", false],
    ["2026-08-13T12:00:00Z", true],
    ["2026-08-13T14:00:00Z", true],
    ["2026-08-13T15:00:00Z", false],
    ["2026-08-13T18:00:00Z", false],
  ])("uses a [start, end) interval at %s", (date, expected) => {
    expect(
      isDishAvailable(dish, undefined, [schedule], {
        now: new Date(date),
      }),
    ).toBe(expected);
  });

  it("supports legacy full French day names", () => {
    expect(
      isDishAvailable(dish, undefined, [
        { ...schedule, joursActifs: ["jeudi"] },
      ], { now: new Date("2026-08-13T14:00:00Z") }),
    ).toBe(true);
  });

  it("carries an overnight slot into the following day", () => {
    const overnight = {
      ...schedule,
      joursActifs: ["ven"],
      heureOuverture: "18:00:00",
      heureFermeture: "02:00:00",
    };
    expect(
      isDishAvailable(dish, undefined, [overnight], {
        now: new Date("2026-08-15T01:00:00Z"),
      }),
    ).toBe(true);
    expect(
      isDishAvailable(dish, undefined, [overnight], {
        now: new Date("2026-08-15T02:00:00Z"),
      }),
    ).toBe(false);
  });

  it("blocks a dish whose referenced schedule no longer exists", () => {
    expect(
      isDishAvailable(dish, undefined, [], { now: new Date() }),
    ).toBe(false);
  });
});

describe("dish publication and orderability", () => {
  it("requires both publication intents and both quota slots", () => {
    expect(
      isDishPubliclyVisible({
        dishPublicationIntent: true,
        categoryPublicationIntent: true,
        dishQuotaEligible: true,
        categoryQuotaEligible: true,
      }),
    ).toBe(true);
    expect(
      isDishPubliclyVisible({
        dishPublicationIntent: true,
        categoryPublicationIntent: true,
        dishQuotaEligible: false,
        categoryQuotaEligible: true,
      }),
    ).toBe(false);
  });

  it("keeps publication distinct from immediate availability", () => {
    expect(
      isDishOrderable(
        {
          dishPublicationIntent: true,
          categoryPublicationIntent: true,
          dishQuotaEligible: true,
          categoryQuotaEligible: true,
        },
        { disponible: false },
        undefined,
        [],
      ),
    ).toBe(false);
  });
});
