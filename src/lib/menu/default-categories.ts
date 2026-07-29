export const DEFAULT_MENU_CATEGORIES = [
  "Entrées",
  "Plats principaux",
  "Accompagnements",
  "Desserts",
  "Boissons",
] as const;

export function getInitialMenuCategories(maxCategories: number | null) {
  if (maxCategories === null) return [...DEFAULT_MENU_CATEGORIES];
  return DEFAULT_MENU_CATEGORIES.slice(0, Math.max(0, maxCategories));
}
