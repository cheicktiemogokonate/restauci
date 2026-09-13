import { describe, expect, it } from "vitest";

import {
  rankDiscoveryPage,
  type DiscoveryCandidate,
  type DiscoveryPlanBenefits,
  type DiscoveryPolicy,
} from "@/modules/discovery/model";

const policy: DiscoveryPolicy = {
  enabled: true,
  sponsoredShareBps: 2_500,
  rotationWindowMinutes: 1_440,
  maxPromotedPerPartner: 1,
};

const benefits: DiscoveryPlanBenefits = {
  decouverte: { exposureWeight: 1, searchPromotedEligible: false, partnerBadgeEnabled: false },
  croissance: { exposureWeight: 3, searchPromotedEligible: true, partnerBadgeEnabled: false },
  partenaire_fier: { exposureWeight: 6, searchPromotedEligible: true, partnerBadgeEnabled: true },
};

const candidates: DiscoveryCandidate[] = Array.from({ length: 24 }, (_, index) => ({
  resourceId: `resource-${String(index).padStart(2, "0")}`,
  partnerAccountId: index < 2 ? "shared-partner" : `partner-${index}`,
  planCode: index % 3 === 0 ? "partenaire_fier" : index % 3 === 1 ? "croissance" : "decouverte",
  organicRank: index,
}));

const context = {
  contextKey: "restaurant:abidjan:pizza",
  page: 1,
  pageSize: 8,
  at: new Date("2026-08-25T08:00:00.000Z"),
};

describe("ranking discovery", () => {
  it("borne les emplacements promus et conserve une part organique", () => {
    const result = rankDiscoveryPage({ candidates, policy, benefitsByPlan: benefits, context });
    expect(result.items).toHaveLength(8);
    expect(result.promotedCount).toBe(2);
    expect(result.items.filter((item) => item.placement === "organic")).toHaveLength(6);
  });

  it("ne promeut jamais Découverte et limite un partenaire par page", () => {
    const result = rankDiscoveryPage({ candidates, policy, benefitsByPlan: benefits, context });
    const promoted = result.items.filter((item) => item.placement === "promoted");
    expect(promoted.every((item) => item.planCode !== "decouverte")).toBe(true);
    expect(new Set(promoted.map((item) => item.partnerAccountId)).size).toBe(promoted.length);
  });

  it("reste déterministe dans une même fenêtre", () => {
    const first = rankDiscoveryPage({ candidates, policy, benefitsByPlan: benefits, context });
    const second = rankDiscoveryPage({
      candidates,
      policy,
      benefitsByPlan: benefits,
      context: { ...context, at: new Date("2026-08-25T20:00:00.000Z") },
    });
    expect(second.items).toEqual(first.items);
  });

  it("produit des pages sans doublon", () => {
    const first = rankDiscoveryPage({ candidates, policy, benefitsByPlan: benefits, context });
    const second = rankDiscoveryPage({
      candidates,
      policy,
      benefitsByPlan: benefits,
      context: { ...context, page: 2 },
    });
    const ids = [...first.items, ...second.items].map((item) => item.resourceId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("désactive totalement la promotion sans modifier l’ordre organique", () => {
    const result = rankDiscoveryPage({
      candidates,
      policy: { ...policy, enabled: false },
      benefitsByPlan: benefits,
      context,
    });
    expect(result.promotedCount).toBe(0);
    expect(result.items.map((item) => item.resourceId)).toEqual(
      candidates.slice(0, 8).map((item) => item.resourceId),
    );
  });

  it("applique un changement de plan au classement suivant", () => {
    const baseCandidates: DiscoveryCandidate[] = [
      {
        resourceId: "upgraded",
        partnerAccountId: "upgraded-partner",
        planCode: "decouverte",
        organicRank: 0,
      },
      ...candidates.slice(2, 6).map((candidate, index) => ({
        ...candidate,
        planCode: "decouverte" as const,
        organicRank: index + 1,
      })),
    ];
    const before = rankDiscoveryPage({
      candidates: baseCandidates,
      policy,
      benefitsByPlan: benefits,
      context: { ...context, pageSize: 4 },
    });
    const after = rankDiscoveryPage({
      candidates: baseCandidates.map((candidate) =>
        candidate.resourceId === "upgraded"
          ? { ...candidate, planCode: "croissance" as const }
          : candidate,
      ),
      policy,
      benefitsByPlan: benefits,
      context: { ...context, pageSize: 4 },
    });
    expect(before.promotedCount).toBe(0);
    expect(after.items[0]).toMatchObject({
      resourceId: "upgraded",
      placement: "promoted",
    });
  });

  it("refuse les identifiants de ressource dupliqués", () => {
    expect(() =>
      rankDiscoveryPage({
        candidates: [...candidates, candidates[0]],
        policy,
        benefitsByPlan: benefits,
        context,
      }),
    ).toThrow("dupliqué");
  });

  it("accorde sur la durée plus de rotations aux poids supérieurs", () => {
    const rotationCandidates: DiscoveryCandidate[] = [
      { resourceId: "growth", partnerAccountId: "growth-partner", planCode: "croissance", organicRank: 1 },
      { resourceId: "proud", partnerAccountId: "proud-partner", planCode: "partenaire_fier", organicRank: 2 },
      { resourceId: "organic-a", partnerAccountId: "organic-a", planCode: "decouverte", organicRank: 3 },
      { resourceId: "organic-b", partnerAccountId: "organic-b", planCode: "decouverte", organicRank: 4 },
    ];
    const selections = { croissance: 0, partenaire_fier: 0 };
    for (let window = 0; window < 240; window += 1) {
      const result = rankDiscoveryPage({
        candidates: rotationCandidates,
        policy: { ...policy, rotationWindowMinutes: 60 },
        benefitsByPlan: benefits,
        context: {
          ...context,
          pageSize: 4,
          at: new Date(window * 60 * 60_000),
        },
      });
      const promoted = result.items.find((candidate) => candidate.placement === "promoted");
      if (promoted?.planCode === "croissance" || promoted?.planCode === "partenaire_fier") {
        selections[promoted.planCode] += 1;
      }
    }
    expect(selections.partenaire_fier).toBeGreaterThan(selections.croissance);
  });
});
