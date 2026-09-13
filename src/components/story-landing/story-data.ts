/**
 * Source unique de toutes les données narratives de la landing (spec §21).
 *
 * Aucun montant, identifiant ou compteur ne doit être dupliqué ailleurs :
 * les composants lisent exclusivement ces valeurs (les valeurs finales du
 * dashboard sont dérivées, jamais réécrites à la main).
 */

export const request = {
  id: "D-2048",
  amount: 12_500,
  createdAt: "11:42",
  currency: "FCFA",
  option: "Option standard",
  day: "Aujourd'hui",
  location: "Horizon",
  locationDistance: "À 1,2 km",
  locationAvailability: "Disponible maintenant",
  locationRating: "4,8",
} as const;

export const dashboard = {
  initialRequests: 18,
  initialCompleted: 14,
  initialRevenue: 248_500,
  /** Dérivé : jamais écrit à la main. */
  finalRevenue: 248_500 + request.amount,
  finalRequests: 19,
  finalCompleted: 15,
} as const;

export const formatAmount = (value: number) =>
  `${value.toLocaleString("fr-FR")} ${request.currency}`;

/**
 * Série hebdomadaire du graphique Animata (progress 0-100).
 * La version finale réagit légèrement à la demande traitée (spec §20).
 */
export const chart = {
  title: "Activité cette semaine",
  days: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
  initial: [42, 55, 38, 64, 50, 72, 58],
  final: [42, 55, 38, 64, 50, 72, 66],
} as const;

/** Marqueurs de la carte mobile. `selected` = celui qui déclenche la story. */
export const mapMarkers = [
  { id: "m1", x: 26, y: 30, name: "Point d'intérêt" },
  { id: "m2", x: 58, y: 44, name: request.location, selected: true },
  { id: "m3", x: 74, y: 26, name: "Point d'intérêt" },
  { id: "m4", x: 38, y: 68, name: "Point d'intérêt" },
] as const;

/** Demandes affichées dans la vue « Demandes » du mockup Safari (spec §16). */
export const requestHistory = [
  {
    id: "D-2048",
    amount: request.amount,
    status: "nouvelle" as const,
    isStoryRequest: true,
  },
  { id: "D-2047", amount: 8_000, status: "traitement" as const },
  { id: "D-2046", amount: 21_500, status: "terminee" as const },
];
