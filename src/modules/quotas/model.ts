export type QuotaLimit = number | null;

export type RestaurantPublishableResource = {
  id: string;
  createdAt: Date;
  firstPublishedAt: Date | null;
};

export type RestaurantPublishableDish = RestaurantPublishableResource & {
  categoryId: string;
};

function compareRestaurantPublicationOrder(
  first: RestaurantPublishableResource,
  second: RestaurantPublishableResource,
) {
  const firstPublished =
    (first.firstPublishedAt?.getTime() ?? Number.POSITIVE_INFINITY) -
    (second.firstPublishedAt?.getTime() ?? Number.POSITIVE_INFINITY);
  if (firstPublished !== 0) return firstPublished;

  const created = first.createdAt.getTime() - second.createdAt.getTime();
  return created !== 0 ? created : first.id.localeCompare(second.id);
}

export function selectRestaurantQuotaEligibleResources(
  categories: RestaurantPublishableResource[],
  dishes: RestaurantPublishableDish[],
  limits: { category: QuotaLimit; dish: QuotaLimit },
) {
  for (const [resource, limit] of Object.entries(limits)) {
    if (limit !== null && (!Number.isInteger(limit) || limit < 0)) {
      throw new Error(
        `La limite ${resource} doit être un entier non négatif ou null`,
      );
    }
  }

  const rankedCategories = categories
    .filter((category) => category.firstPublishedAt !== null)
    .sort(compareRestaurantPublicationOrder);
  const eligibleCategories =
    limits.category === null
      ? rankedCategories
      : rankedCategories.slice(0, limits.category);
  const categoryIds = new Set(
    eligibleCategories.map((category) => category.id),
  );

  const rankedDishes = dishes
    .filter(
      (dish) =>
        dish.firstPublishedAt !== null && categoryIds.has(dish.categoryId),
    )
    .sort(compareRestaurantPublicationOrder);
  const eligibleDishes =
    limits.dish === null
      ? rankedDishes
      : rankedDishes.slice(0, limits.dish);

  return {
    categoryIds,
    dishIds: new Set(eligibleDishes.map((dish) => dish.id)),
    eligibleCategories,
    eligibleDishes,
  };
}

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
