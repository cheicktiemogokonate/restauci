"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs";
import { usePanierStore } from "@/lib/client-app/stores/panier-store";
import { formatPrix } from "@/lib/utils/format";
import type { Restaurant } from "@/types";
import { Check, Minus, Plus, Search, UtensilsCrossed, X } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Dish } from "../types";

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  dishes: Dish[];
  restaurant: Restaurant;
}

export default function MenuModal({ isOpen, onClose, dishes, restaurant }: MenuModalProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const ajouterItem = usePanierStore((state) => state.ajouterItem);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    return dishes.filter((dish) => {
      if (seen.has(dish.categoryId)) return false;
      seen.add(dish.categoryId);
      return true;
    }).map((dish) => ({ id: dish.categoryId, name: dish.categoryName }));
  }, [dishes]);

  const filteredDishes = dishes.filter((dish) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesCategory = selectedCategory === "all" || dish.categoryId === selectedCategory;
    const matchesSearch = !query || dish.name.toLowerCase().includes(query) || dish.description.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const handleAdd = (dish: Dish) => {
    if (!restaurant.accepteCommandes) return;

    ajouterItem(
      { id: restaurant.id, nom: restaurant.nom, slug: restaurant.slug },
      { platId: dish.id, nom: dish.name, prix: dish.price, photoUrl: dish.image },
    );
    toast.success(`${dish.name} ajouté au panier`, { icon: <Check className="size-4" /> });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="flex h-[min(46rem,calc(100dvh-2rem))] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b bg-primary px-5 py-4 text-primary-foreground sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-lg font-bold text-primary-foreground">Menu de {restaurant.nom}</DialogTitle>
              <DialogDescription className="mt-1 text-primary-foreground/75">Choisissez vos plats puis ajoutez-les au panier.</DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon-sm" className="shrink-0 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" aria-label="Fermer le menu">
                <X />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="border-b bg-background px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} variant="underline" className="min-w-0 overflow-x-auto scrollbar-hide">
              <TabsList className="w-max">
                <TabsTrigger value="all">Tout ({dishes.length})</TabsTrigger>
                {categories.map((category) => (
                  <TabsTrigger key={category.id} value={category.id}>{category.name}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="relative w-full shrink-0 sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Rechercher un plat" className="h-10 pl-9" />
            </div>
          </div>
          {!restaurant.accepteCommandes ? <p className="mt-3 text-sm font-medium text-amber-700">Les commandes sont momentanément suspendues. Vous pouvez tout de même consulter la carte.</p> : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/25 px-5 py-5 sm:px-6">
          {filteredDishes.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredDishes.map((dish) => (
                <article key={dish.id} className="flex min-w-0 gap-3 border-b border-border/70 pb-3 sm:border sm:bg-background sm:p-3 sm:shadow-xs">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                    <Image src={dish.image} alt={dish.name} fill sizes="80px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-semibold leading-5">{dish.name}</h3>
                      <span className="shrink-0 text-sm font-bold text-primary">{formatPrix(dish.price)}</span>
                    </div>
                    {dish.description ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{dish.description}</p> : null}
                    <Button type="button" size="sm" className="mt-3 h-8" disabled={!restaurant.accepteCommandes} onClick={() => handleAdd(dish)}>
                      <Plus /> Ajouter
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><UtensilsCrossed className="size-5" /></span>
              <h3 className="mt-4 font-semibold">Aucun plat trouvé</h3>
              <p className="mt-1 text-sm text-muted-foreground">Essayez une autre recherche ou une autre catégorie.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}><Minus /> Réinitialiser</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
