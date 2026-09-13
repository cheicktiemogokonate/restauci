/**
 * Cadrage initial de certains sélecteurs d'adresse administratifs.
 * Ne doit jamais servir de position client ou d'autorité géographique.
 */
export const ABIDJAN_CENTER: [number, number] = [-4.0083, 5.3599]; // [lng, lat] — ordre MapLibre

export const DEFAULT_ZOOM = 13;
export const RESTAURANT_DETAIL_ZOOM = 15;

/**
 * Style de carte OpenFreeMap (gratuit, open source, sans cle API).
 * "Liberty" est un style complet adapte a un usage produit.
 */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
