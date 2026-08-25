import { discoveryRankingContextSchema } from "./contracts";
import type {
  DiscoveryCandidate,
  DiscoveryPlanBenefits,
  DiscoveryPolicy,
  DiscoveryRankingContext,
  DiscoveryRankingPage,
  RankedDiscoveryCandidate,
} from "./model";

const UINT32_RANGE = 4_294_967_296;

/** FNV-1a 32 bits : stable entre processus et indépendant de la plateforme. */
function stableHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function weightedPriority(seed: string, resourceId: string, weight: number) {
  const uniform = (stableHash(`${seed}:${resourceId}`) + 1) / (UINT32_RANGE + 1);
  return -Math.log(uniform) / weight;
}

function ensureUniqueCandidates(candidates: DiscoveryCandidate[]) {
  const ids = new Set<string>();
  for (const candidate of candidates) {
    if (ids.has(candidate.resourceId)) {
      throw new Error(`Candidat discovery dupliqué : ${candidate.resourceId}`);
    }
    ids.add(candidate.resourceId);
  }
}

/**
 * Compose une page complète à partir de candidats déjà éligibles.
 * L’éligibilité métier et géographique doit impérativement être résolue avant cet appel.
 */
export function rankDiscoveryPage(input: {
  candidates: DiscoveryCandidate[];
  policy: DiscoveryPolicy;
  benefitsByPlan: DiscoveryPlanBenefits;
  context: DiscoveryRankingContext;
}): DiscoveryRankingPage {
  const context = discoveryRankingContextSchema.parse(input.context);
  ensureUniqueCandidates(input.candidates);

  const organic = [...input.candidates].sort(
    (first, second) =>
      first.organicRank - second.organicRank || first.resourceId.localeCompare(second.resourceId),
  );
  const rotationWindow = Math.floor(
    context.at.getTime() / (input.policy.rotationWindowMinutes * 60_000),
  );
  const seed = `${context.contextKey}:${rotationWindow}`;
  const promotedPool = input.policy.enabled
    ? input.candidates
        .filter((candidate) => input.benefitsByPlan[candidate.planCode].searchPromotedEligible)
        .sort((first, second) => {
          const firstPriority = weightedPriority(
            seed,
            first.resourceId,
            input.benefitsByPlan[first.planCode].exposureWeight,
          );
          const secondPriority = weightedPriority(
            seed,
            second.resourceId,
            input.benefitsByPlan[second.planCode].exposureWeight,
          );
          return firstPriority - secondPriority || first.resourceId.localeCompare(second.resourceId);
        })
    : [];

  const used = new Set<string>();
  const promotedSlots = input.policy.enabled
    ? Math.floor((context.pageSize * input.policy.sponsoredShareBps) / 10_000)
    : 0;
  let requestedItems: RankedDiscoveryCandidate[] = [];

  for (let page = 1; page <= context.page; page += 1) {
    const pageItems: RankedDiscoveryCandidate[] = [];
    const partnerCounts = new Map<string, number>();

    for (const candidate of promotedPool) {
      if (pageItems.length >= promotedSlots) break;
      if (used.has(candidate.resourceId)) continue;
      const partnerCount = partnerCounts.get(candidate.partnerAccountId) ?? 0;
      if (partnerCount >= input.policy.maxPromotedPerPartner) continue;
      pageItems.push({ ...candidate, placement: "promoted" });
      used.add(candidate.resourceId);
      partnerCounts.set(candidate.partnerAccountId, partnerCount + 1);
    }

    for (const candidate of organic) {
      if (pageItems.length >= context.pageSize) break;
      if (used.has(candidate.resourceId)) continue;
      pageItems.push({ ...candidate, placement: "organic" });
      used.add(candidate.resourceId);
    }

    if (page === context.page) requestedItems = pageItems;
    if (pageItems.length === 0) break;
  }

  return {
    items: requestedItems,
    page: context.page,
    pageSize: context.pageSize,
    total: input.candidates.length,
    totalPages: Math.ceil(input.candidates.length / context.pageSize),
    promotedCount: requestedItems.filter((candidate) => candidate.placement === "promoted").length,
  };
}
