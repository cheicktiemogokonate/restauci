import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import RestaurantPageClient from "@/modules/restaurants/presentation/public-page/main";
import {
  getPublicRestaurantBySlug,
  getRestaurantSchedules,
} from "@/modules/restaurants/server";
import { getPublicRestaurantMenu } from "@/modules/menu/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const getPublicRestaurant = cache(getPublicRestaurantBySlug);

type RestaurantPageProps = {
  params: Promise<{ slug: string }>;
};

function getRestaurantDescription(name: string, description: string | null) {
  const source =
    description?.replace(/\s+/g, " ").trim() ||
    `Découvrez le menu et les services de ${name} sur Toutci.`;
  return source.length > 155 ? `${source.slice(0, 152).trimEnd()}…` : source;
}

export async function generateMetadata({
  params,
}: RestaurantPageProps): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getPublicRestaurant(slug);
  if (!restaurant) return { title: "Restaurant introuvable" };

  const title = `${restaurant.nom} — Menu et commande en ligne`;
  const description = getRestaurantDescription(
    restaurant.nom,
    restaurant.description,
  );
  const image =
    restaurant.banniereUrl ||
    restaurant.logoUrl;
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
      ...(image
        ? {
            images: [
              {
                url: image,
                width: 1200,
                height: 630,
                alt: `Menu et informations de ${restaurant.nom}`,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image
        ? {
            images: [
              { url: image, alt: `Menu et informations de ${restaurant.nom}` },
            ],
          }
        : {}),
    },
  };
}

export default async function RestaurantPage({ params }: RestaurantPageProps) {
  const { slug } = await params;
  const restaurant = await getPublicRestaurant(slug);
  if (!restaurant) notFound();

  const [categories, schedules] = await Promise.all([
    getPublicRestaurantMenu(restaurant.id),
    getRestaurantSchedules(restaurant.id),
  ]);
  const dishes = categories.flatMap((category) =>
    category.plats.map((dish) => ({
      id: dish.id,
      name: dish.nom,
      description: dish.description || "",
      price: dish.prix,
      image: dish.photoUrl,
      categoryId: dish.categorieId,
      categoryName: category.nom,
      isPopular: dish.nombreCommandes > 10,
    })),
  );
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
      addressCountry: restaurant.pays || "CI",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
    },
    servesCuisine: restaurant.cuisines,
  };

  return (
    <>
      <script
        type="application/ld+json"
        nonce={(await headers()).get("x-nonce") ?? undefined}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <RestaurantPageClient
        restaurant={restaurant}
        dishes={dishes}
        creneauxList={schedules}
      />
    </>
  );
}
