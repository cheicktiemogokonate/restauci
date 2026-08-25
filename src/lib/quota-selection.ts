export type PublishableResource = {
  id: string;
  createdAt: Date;
  firstPublishedAt: Date | null;
};

export type PublishableDish = PublishableResource & { categorieId: string };

function compareQuotaOrder(a: PublishableResource, b: PublishableResource) {
  const first = (a.firstPublishedAt?.getTime() ?? Number.POSITIVE_INFINITY)
    - (b.firstPublishedAt?.getTime() ?? Number.POSITIVE_INFINITY);
  if (first !== 0) return first;
  const created = a.createdAt.getTime() - b.createdAt.getTime();
  return created !== 0 ? created : a.id.localeCompare(b.id);
}

export function selectQuotaEligibleResources(
  categories: PublishableResource[],
  dishes: PublishableDish[],
  limits: { category: number | null; dish: number | null },
) {
  const rankedCategories = categories
    .filter((category) => category.firstPublishedAt !== null)
    .sort(compareQuotaOrder);
  const eligibleCategories = limits.category === null
    ? rankedCategories
    : rankedCategories.slice(0, limits.category);
  const categoryIds = new Set(eligibleCategories.map(({ id }) => id));

  const rankedDishes = dishes
    .filter(
      (dish) => dish.firstPublishedAt !== null && categoryIds.has(dish.categorieId),
    )
    .sort(compareQuotaOrder);
  const eligibleDishes = limits.dish === null
    ? rankedDishes
    : rankedDishes.slice(0, limits.dish);

  return {
    categoryIds,
    dishIds: new Set(eligibleDishes.map(({ id }) => id)),
    eligibleCategories,
    eligibleDishes,
  };
}
