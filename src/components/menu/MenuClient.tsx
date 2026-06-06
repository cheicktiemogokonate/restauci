"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CartePlat from "@/components/menu/CartePlat";
import Panier from "@/components/menu/Panier";
import FormulaireCommande from "@/components/commande/FormulaireCommande";
import { usePanier } from "@/hooks/usePanier";
import type { Categorie, Plat, Restaurant } from "@/types";

interface CategoryWithPlats extends Categorie {
  plats: Plat[];
}

interface MenuClientProps {
  restaurant: Restaurant;
  categories: CategoryWithPlats[];
  plats: Plat[];
}

export default function MenuClient({ restaurant, categories, plats }: MenuClientProps) {
  const panier = usePanier(restaurant.id);

  const totalCategories = categories.length;
  const totalPlats = plats.length;

  const displayPlats = useMemo(() => plats, [plats]);

  return (
    <div className="space-y-10">
      <div className="rounded-[32px] border border-slate-200 bg-white/80 p-8 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Menu de {restaurant.nom}</p>
            <h2 className="text-3xl font-semibold text-slate-900">Découvrez nos plats</h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              Parcourez les catégories disponibles et ajoutez facilement vos plats préférés au panier.
            </p>
          </div>

          <div className="flex flex-col items-end gap-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Panier</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{panier.nombreArticles}</p>
              <p className="text-sm text-slate-500">article{panier.nombreArticles > 1 ? "s" : ""}</p>
            </div>
            <Panier
              items={panier.items}
              nombreArticles={panier.nombreArticles}
              sousTotal={panier.sousTotal}
              onDecrementer={panier.decrementerPlat}
              onIncrementer={panier.incrementerPlat}
              onSupprimer={panier.supprimerPlat}
              onVider={panier.viderPanier}
            >
              <FormulaireCommande
                restaurantId={restaurant.id}
                restaurantLatitude={restaurant.latitude}
                restaurantLongitude={restaurant.longitude}
                items={panier.items}
                sousTotal={panier.sousTotal}
                onSuccess={panier.viderPanier}
              />
            </Panier>
          </div>

        </div>
      </div>

      <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Filtres par catégorie</h3>
            <p className="text-sm text-slate-600">Afficher uniquement les plats de la catégorie choisie.</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-slate-500">
            <span>{totalCategories} catégories</span>
            <span>{totalPlats} plats</span>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="flex flex-wrap gap-2">
            <TabsTrigger value="all" className="flex items-center gap-2">
              Tout
              <Badge variant="outline">{plats.length}</Badge>
            </TabsTrigger>
            {categories.map((categorie) => (
              <TabsTrigger key={categorie.id} value={categorie.id} className="flex items-center gap-2">
                {categorie.nom}
                <Badge variant="outline">{categorie.plats.length}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all">
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {displayPlats.map((plat) => {
                const categorie = categories.find((item) => item.id === plat.categorieId);
                return (
                  <CartePlat
                    key={plat.id}
                    plat={plat}
                    categorieNom={categorie?.nom ?? "Général"}
                    onAjouter={panier.ajouterPlat}
                  />
                );
              })}
            </div>
          </TabsContent>

          {categories.map((categorie) => (
            <TabsContent key={categorie.id} value={categorie.id}>
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {categorie.plats.map((plat) => (
                  <CartePlat
                    key={plat.id}
                    plat={plat}
                    categorieNom={categorie.nom}
                    onAjouter={panier.ajouterPlat}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
