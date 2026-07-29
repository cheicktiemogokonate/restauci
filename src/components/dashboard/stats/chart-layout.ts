/**
 * Recharts initialise les conteneurs responsifs à -1 avant le premier passage
 * du ResizeObserver. Une petite dimension positive évite ce rendu invalide
 * pendant l'hydratation, puis la mesure réelle prend immédiatement le relais.
 */
export const DASHBOARD_CHART_CONTAINER_PROPS = {
  width: "100%",
  height: "100%",
  minWidth: 0,
  initialDimension: { width: 1, height: 1 },
} as const;
