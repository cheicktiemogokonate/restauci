import { describe, expect, it } from "vitest";
import { selectResidenceQuotaEligibleResources } from "./model";

const previouslyPublishedAt = new Date("2026-01-01T00:00:00.000Z");
const createdAt = new Date("2025-01-01T00:00:00.000Z");
const residence = (
  id: string,
  options: {
    publicationIntent?: boolean;
    firstPublishedAt?: Date | null;
  } = {},
) => ({
  id,
  createdAt,
  publicationIntent: options.publicationIntent ?? true,
  firstPublishedAt:
    options.firstPublishedAt === undefined
      ? previouslyPublishedAt
      : options.firstPublishedAt,
});

describe("sélection du quota Résidence", () => {
  it("ne compte pas les brouillons et libère la place quand la publication est désactivée", () => {
    const result = selectResidenceQuotaEligibleResources(
      [
        residence("ancienne", { publicationIntent: false }),
        residence("nouvelle", { firstPublishedAt: null }),
        residence("brouillon", { publicationIntent: false, firstPublishedAt: null }),
      ],
      1,
    );

    expect([...result.residenceIds]).toEqual(["nouvelle"]);
    expect(result.candidateCount).toBe(1);
    expect(result.hiddenByQuotaCount).toBe(0);
  });

  it("réagit aux baisses et remontées de forfait sans supprimer ni réordonner les données", () => {
    const residences = [residence("a"), residence("b"), residence("c")];
    const initialIds = residences.map(({ id }) => id);

    const growth = selectResidenceQuotaEligibleResources(residences, 5);
    const discovery = selectResidenceQuotaEligibleResources(residences, 1);
    const restored = selectResidenceQuotaEligibleResources(residences, 5);

    expect([...growth.residenceIds]).toEqual(["a", "b", "c"]);
    expect([...discovery.residenceIds]).toEqual(["a"]);
    expect(discovery.hiddenByQuotaCount).toBe(2);
    expect([...restored.residenceIds]).toEqual(["a", "b", "c"]);
    expect(residences.map(({ id }) => id)).toEqual(initialIds);
  });

  it("rend toutes les résidences candidates éligibles avec un quota illimité", () => {
    const result = selectResidenceQuotaEligibleResources(
      [residence("b"), residence("a"), residence("premiere", { firstPublishedAt: null })],
      null,
    );

    expect([...result.residenceIds]).toEqual(["a", "b", "premiere"]);
    expect(result.hiddenByQuotaCount).toBe(0);
  });
});
