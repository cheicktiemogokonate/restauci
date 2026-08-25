export type QuotaLimit = number | null;

export type ResidencePublicationCandidate = {
  id: string;
  createdAt: Date;
  firstPublishedAt: Date | null;
  publicationIntent: boolean;
};

function compareResidencePublicationOrder(
  first: ResidencePublicationCandidate,
  second: ResidencePublicationCandidate,
) {
  const firstPublished =
    (first.firstPublishedAt?.getTime() ?? Number.POSITIVE_INFINITY) -
    (second.firstPublishedAt?.getTime() ?? Number.POSITIVE_INFINITY);
  if (firstPublished !== 0) return firstPublished;

  const created = first.createdAt.getTime() - second.createdAt.getTime();
  return created !== 0 ? created : first.id.localeCompare(second.id);
}

export function selectResidenceQuotaEligibleResources(
  residences: ResidencePublicationCandidate[],
  maxPublicResidences: QuotaLimit,
) {
  if (
    maxPublicResidences !== null &&
    (!Number.isInteger(maxPublicResidences) || maxPublicResidences < 0)
  ) {
    throw new Error(
      "La limite Résidence doit être un entier non négatif ou null",
    );
  }

  const rankedCandidates = residences
    .filter((residence) => residence.publicationIntent)
    .sort(compareResidencePublicationOrder);
  const eligibleResidences =
    maxPublicResidences === null
      ? rankedCandidates
      : rankedCandidates.slice(0, maxPublicResidences);

  return {
    residenceIds: new Set(eligibleResidences.map((residence) => residence.id)),
    eligibleResidences,
    candidateCount: rankedCandidates.length,
    hiddenByQuotaCount: rankedCandidates.length - eligibleResidences.length,
  };
}
