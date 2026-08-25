import { describe, expect, it } from "vitest";
import { isPlatDisponible } from "./creneaux";

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
      isPlatDisponible(dish, undefined, [schedule], {
        now: new Date(date),
      }),
    ).toBe(expected);
  });

  it("supports legacy full French day names", () => {
    expect(
      isPlatDisponible(dish, undefined, [
        { ...schedule, joursActifs: ["jeudi"] },
      ], { now: new Date("2026-08-13T14:00:00Z") }),
    ).toBe(true);
  });
});
