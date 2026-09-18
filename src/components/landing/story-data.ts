export const brand = {
  name: "ToutCi",
  context: "Côte d’Ivoire",
  proBaseUrl: "espace.toutci",
  downloadUrls: {
    ios: "",
    android: "",
  },
} as const;

export const request = {
  id: "D-2048",
  venue: "Établissement partenaire",
  distance: "1,2 km",
  rating: "4,8",
  option: "Option standard",
  amount: 12_500,
  createdAt: "11:42",
} as const;

export const dashboard = {
  receivedBefore: 0,
  receivedAfter: 1,
  completedBefore: 0,
  completedAfter: 1,
  balanceBefore: 0,
  balanceAfter: 12_500,
  weeklyDays: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
  weeklyValues: [38, 52, 34, 64, 72, 82, 96],
} as const;

/**
 * Scroll checkpoints. Odd/even pairs intentionally separate an installed UI
 * state from the copy or notification that explains it.
 */
export type StoryStep =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
  | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export function formatFcfa(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
}
