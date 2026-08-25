import type { Restaurant } from "@/lib/db/types";

export interface PublicRestaurantDTO {
  id: string;
  slug: string;
  nom: string;
  description: string | null;
  telephone: string;
  email: string | null;
  siteWeb: string | null;
  adresse: string;
  ville: string | null;
  pays: string | null;
  latitude: number;
  longitude: number;
  logoUrl: string | null;
  banniereUrl: string | null;
  fraisLivraison: number;
  commandeMinimum: number;
  modesCommande: string[];
  cuisines: string[] | null;
  enLigne: boolean;
  accepteCommandes: boolean;
  tempsPreparationMoyen: number | null;
  noteMoyenne: number | null;
  nombreAvis: number;
  facebook: string | null;
  instagram: string | null;
  whatsapp: string | null;
}

/** Whitelist contractuelle : aucun spread de row DB dans une réponse publique. */
export function toPublicRestaurantDTO(
  restaurant: Restaurant,
): PublicRestaurantDTO {
  return {
    id: restaurant.id,
    slug: restaurant.slug,
    nom: restaurant.nom,
    description: restaurant.description,
    telephone: restaurant.telephone,
    email: restaurant.email,
    siteWeb: restaurant.siteWeb,
    adresse: restaurant.adresse,
    ville: restaurant.ville,
    pays: restaurant.pays,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    logoUrl: restaurant.logoUrl,
    banniereUrl: restaurant.banniereUrl,
    fraisLivraison: restaurant.fraisLivraison,
    commandeMinimum: restaurant.commandeMinimum,
    modesCommande: restaurant.modesCommande,
    cuisines: restaurant.cuisines,
    enLigne: restaurant.enLigne,
    accepteCommandes: restaurant.accepteCommandes,
    tempsPreparationMoyen: restaurant.tempsPreparationMoyen,
    noteMoyenne: restaurant.noteMoyenne,
    nombreAvis: restaurant.nombreAvis,
    facebook: restaurant.facebook,
    instagram: restaurant.instagram,
    whatsapp: restaurant.whatsapp,
  };
}
