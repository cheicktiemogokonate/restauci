import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { categories, creneauxHoraires, plats, restaurants } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { isPlatDisponible } from "@/lib/utils/creneaux";
import MenuClient from "@/components/menu/MenuClient";
import type { Categorie, CreneauHoraire, Plat, Restaurant } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [restaurant] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.slug, slug))
    .limit(1);

  if (!restaurant || restaurant.actif === false) {
    return {
      title: "Restaurant introuvable | Restau Platform",
    };
  }

  return {
    title: `${restaurant.nom} - Menu en ligne | Restau Platform`,
    description: restaurant.description || `Découvrez la carte et commandez en ligne chez ${restaurant.nom}. Plats frais et savoureux en livraison ou sur place.`,
  };
}

interface CategoryWithPlats extends Categorie {
  plats: Plat[];
}

export default async function RestaurantMenuPage({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [restaurant] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.slug, slug))
    .limit(1);

  if (!restaurant || restaurant.actif === false) {
    notFound();
  }

  const [creneauxList, categoriesList, platsList] = await Promise.all([
    db
      .select()
      .from(creneauxHoraires)
      .where(eq(creneauxHoraires.restaurantId, restaurant.id)),
    db
      .select()
      .from(categories)
      .where(eq(categories.restaurantId, restaurant.id))
      .orderBy(asc(categories.ordre)),
    db
      .select()
      .from(plats)
      .where(eq(plats.restaurantId, restaurant.id))
      .orderBy(asc(plats.ordre)),
  ]);

  const availablePlats = platsList.filter((plat) => {
    const categorie = categoriesList.find((item) => item.id === plat.categorieId);
    return isPlatDisponible(plat, categorie, creneauxList as CreneauHoraire[]);
  });

  const categoriesWithPlats: CategoryWithPlats[] = categoriesList
    .map((categorie) => ({
      ...categorie,
      plats: availablePlats.filter((plat) => plat.categorieId === categorie.id),
    }))
    .filter((categorie) => categorie.plats.length > 0);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-sky-200/50 to-transparent blur-3xl" />
        <div className="relative mx-auto max-w-6xl rounded-[40px] border border-slate-200 bg-white/95 p-8 shadow-xl shadow-slate-900/5 sm:p-12">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Restaurant</p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                {restaurant.nom}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-600">
                {restaurant.description || "Découvrez notre carte et choisissez vos plats préférés."}
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                  {restaurant.adresse}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                  {restaurant.telephone}
                </span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[32px] bg-slate-100 p-6">
              <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-sky-300/30 to-transparent" />
              <div className="relative space-y-6">
                {restaurant.logoUrl ? (
                  <img
                    src={restaurant.logoUrl}
                    alt={restaurant.nom}
                    className="h-44 w-full rounded-3xl object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-44 items-center justify-center rounded-3xl bg-slate-200 text-slate-500">
                    Logo indisponible
                  </div>
                )}
                <div className="space-y-3">
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
                    Menu disponible
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl bg-white/90 p-4 text-sm text-slate-700 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Catégories</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">{categoriesWithPlats.length}</p>
                    </div>
                    <div className="rounded-3xl bg-white/90 p-4 text-sm text-slate-700 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Plats disponibles</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">{availablePlats.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <MenuClient
          restaurant={restaurant as Restaurant}
          categories={categoriesWithPlats}
          plats={availablePlats}
        />
      </section>
    </main>
  );
}
