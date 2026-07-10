import { getCategoriesRestaurant, getRestaurantBySlug } from "@/lib/db/queries";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import RestaurantPageClient from "@/components/public-page/main";
import { db } from "@/lib/db";
import { type Plat } from "@/lib/db/types";
import { isPlatDisponible } from "@/lib/utils/creneaux";

export async function generateMetadata({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch restaurant data for metadata
  const restaurant = await getRestaurantBySlug(slug);

  if (!restaurant || restaurant.actif === false) {
    return {
      title: "Restaurant introuvable | Restau Platform",
    };
  }

  return {
    title: `${restaurant.nom} - Menu en ligne | Restau Platform`,
    description:
      restaurant.description ||
      `Découvrez la carte et commandez en ligne chez ${restaurant.nom}. Plats frais et savoureux en livraison ou sur place.`,
    // Add image for social sharing if available
    ...(restaurant.logoUrl && {
      openGraph: {
        images: [
          {
            url:
              restaurant.logoUrl ||
              "/assets/images/restaurant_exterior_night_1781800314693.jpg",
            width: 1200,
            height: 630,
            alt: `${restaurant.nom} - Restaurant`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        images: [
          {
            url:
              restaurant.logoUrl ||
              "/assets/images/restaurant_exterior_night_1781800314693.jpg",
            alt: `${restaurant.nom} - Restaurant`,
          },
        ],
      },
    }),
  };
}

// Define the Dish interface as expected by MenuModal
interface Dish {
  id: string;
  name: string;
  description: string;
  price: number; // in centimes (FCFA)
  image: string;
  category: "plats" | "boissons" | "desserts";
  isPopular?: boolean;
}

export default async function RestaurantPage({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch restaurant data
  const restaurant = await getRestaurantBySlug(slug);

  if (!restaurant || restaurant.actif === false) {
    notFound();
  }

  // Fetch categories with their plats (includes plats already populated)
  const categoriesWithPlats = await getCategoriesRestaurant(restaurant.id);

  // Flatten all plats from categories for availability checking
  const platsList: Plat[] = categoriesWithPlats.flatMap(
    (category) => category.plats ?? [],
  );

  // Fetch opening hours for availability checking
  let creneauxList: Awaited<ReturnType<typeof db.query.creneauxHoraires.findMany>> = [];
  try {
    creneauxList = await db.query.creneauxHoraires.findMany({
      where: (c, { eq }) => eq(c.restaurantId, restaurant.id),
    });
  } catch (error) {
    console.error("Failed to fetch creneauxHoraires:", error);
  }

  // Filter plats based on availability (time/day)
  const availablePlats = platsList.filter((plat) => {
    // Find the category for this plat
    const categorie = categoriesWithPlats.find(
      (cat) => cat.id === plat.categorieId,
    );
    return isPlatDisponible(plat, categorie, creneauxList);
  });

  // Convert Plat objects to Dish objects for MenuModal
  const dishes: Dish[] = availablePlats.map((plat) => {
    // Map category nom to one of: "plats", "boissons", "desserts"
    const categorieNom = categoriesWithPlats.find(
      (cat) => cat.id === plat.categorieId,
    )?.nom;

    let category: Dish["category"] = "plats"; // default
    if (categorieNom) {
      const lowerNom = categorieNom.toLowerCase();
      if (lowerNom.includes("dessert") || lowerNom.includes("sweet")) {
        category = "desserts";
      } else if (
        lowerNom.includes("boisson") ||
        lowerNom.includes("drink") ||
        lowerNom.includes("jus")
      ) {
        category = "boissons";
      } else {
        category = "plats"; // default to plats for food categories
      }
    }

    return {
      id: plat.id,
      name: plat.nom,
      description: plat.description || "",
      price: plat.prix, // Price in centimes (FCFA)
      image:
        plat.photoUrl ||
        "/assets/images/dish_poulet_kedjenou_1781800228146.jpg", // Fallback image
      category,
      isPopular: plat.nombreCommandes > 10, // Consider popular if ordered more than 10 times
    };
  });

  // Client component wrapper for interactive state
  return (
    <>
      <RestaurantPageClient
        restaurant={restaurant}
        categoriesWithPlats={categoriesWithPlats}
        dishes={dishes}
        creneauxList={JSON.parse(JSON.stringify(creneauxList))}
      />
    </>
  );
}
