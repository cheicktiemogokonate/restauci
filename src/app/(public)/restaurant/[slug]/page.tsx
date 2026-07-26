import { getCategoriesRestaurant, getCreneauxRestaurant, getRestaurantBySlug } from "@/lib/db/queries";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import RestaurantPageClient from "@/components/public-page/main";
import { type Plat } from "@/lib/db/types";
import { isPlatDisponible } from "@/lib/utils/creneaux";

const getPublicRestaurant = cache(async (slug: string) => getRestaurantBySlug(slug));

type RestaurantPageProps = {
  params: Promise<{ slug: string }>;
};

function getRestaurantDescription(name: string, description: string | null) {
  const source = description?.replace(/\s+/g, " ").trim() || `Découvrez le menu et les services de ${name} sur Toutci.`;
  return source.length > 155 ? `${source.slice(0, 152).trimEnd()}…` : source;
}

export async function generateMetadata({ params }: RestaurantPageProps): Promise<Metadata> {
  const { slug } = await params;

  // Fetch restaurant data for metadata
  const restaurant = await getPublicRestaurant(slug);

  if (!restaurant || restaurant.actif === false) {
    return {
      title: "Restaurant introuvable",
    };
  }

  const title = `${restaurant.nom} — Menu et commande en ligne`;
  const description = getRestaurantDescription(restaurant.nom, restaurant.description);
  const image = restaurant.banniereUrl || restaurant.logoUrl || "/assets/images/restaurant_exterior_night_1781800314693.jpg";
  const canonicalUrl = `/restaurant/${restaurant.slug}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "website",
      locale: "fr_CI",
      url: canonicalUrl,
      siteName: "Toutci",
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: `Menu et informations de ${restaurant.nom}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: image, alt: `Menu et informations de ${restaurant.nom}` }],
    },
  };
}

// Forme légère et sérialisable utilisée par le menu interactif.
interface Dish {
  id: string;
  name: string;
  description: string;
  price: number; // in centimes (FCFA)
  image: string;
  categoryId: string;
  categoryName: string;
  isPopular?: boolean;
}

export default async function RestaurantPage({ params }: RestaurantPageProps) {
  const { slug } = await params;

  // Fetch restaurant data
  const restaurant = await getPublicRestaurant(slug);

  if (!restaurant || restaurant.actif === false) {
    notFound();
  }

  // Les deux sources sont indépendantes : les charger en parallèle raccourcit
  // le temps d'affichage de la vitrine publique.
  const [categoriesWithPlats, creneauxList] = await Promise.all([
    getCategoriesRestaurant(restaurant.id),
    getCreneauxRestaurant(restaurant.id).catch((error) => {
      console.error("Failed to fetch creneauxHoraires:", error);
      return [];
    }),
  ]);
  const publicCategories = categoriesWithPlats
    .filter((category) => category.visible)
    .map((category) => ({
      ...category,
      plats: (category.plats ?? []).filter((plat) => plat.disponible),
    }));

  // Flatten all plats from categories for availability checking
  const platsList: Plat[] = publicCategories.flatMap(
    (category) => category.plats ?? [],
  );

  // Filter plats based on availability (time/day)
  const availablePlats = platsList.filter((plat) => {
    // Find the category for this plat
    const categorie = publicCategories.find(
      (cat) => cat.id === plat.categorieId,
    );
    return isPlatDisponible(plat, categorie, creneauxList);
  });

  // Convert Plat objects to Dish objects for MenuModal
  const dishes: Dish[] = availablePlats.map((plat) => {
    const category = publicCategories.find(
      (cat) => cat.id === plat.categorieId,
    );

    return {
      id: plat.id,
      name: plat.nom,
      description: plat.description || "",
      price: plat.prix, // Price in centimes (FCFA)
      image:
        plat.photoUrl ||
        "/assets/images/dish_poulet_kedjenou_1781800228146.jpg", // Fallback image
      categoryId: plat.categorieId,
      categoryName: category?.nom ?? "Autres",
      isPopular: plat.nombreCommandes > 10, // Consider popular if ordered more than 10 times
    };
  });
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurant.nom,
    description: getRestaurantDescription(
      restaurant.nom,
      restaurant.description,
    ),
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/restaurant/${restaurant.slug}`,
    telephone: restaurant.telephone,
    image: restaurant.banniereUrl || restaurant.logoUrl || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: restaurant.adresse,
      addressLocality: restaurant.ville || undefined,
      addressCountry: "CI",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
    },
    servesCuisine: restaurant.cuisines ?? undefined,
  };

  // Client component wrapper for interactive state
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <RestaurantPageClient
        restaurant={restaurant}
        categoriesWithPlats={publicCategories}
        dishes={dishes}
        creneauxList={JSON.parse(JSON.stringify(creneauxList))}
      />
    </>
  );
}
