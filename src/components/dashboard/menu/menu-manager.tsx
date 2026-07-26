import { Pagination } from "@/components/dashboard/pagination";
import { Button } from "@/components/ui/button";
import type { Categorie } from "@/types";
import type { PlatAvecCategorie } from "@/types/dashboard";
import { Eye, EyeOff, Plus, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import CategoryOrganizerDialog, { type MenuCategory } from "./category-organizer-dialog";
import MenuCard from "./menu-card";
import MenuFilters from "./menu-filters";

interface MenuManagerProps {
  categories: (Categorie & { platCount: number })[];
  initialPlats: PlatAvecCategorie[];
  menuStats: { total: number; disponibles: number; indisponibles: number };
  totalPlats: number;
  currentPage: number;
  limit: number;
  currentQ?: string;
  currentCategorie?: string;
  currentDispo?: string;
}

export default function MenuManager({
  categories,
  initialPlats,
  menuStats,
  totalPlats,
  currentPage,
  limit,
  currentQ,
  currentCategorie,
  currentDispo,
}: MenuManagerProps) {
  return (
    <div className="flex flex-1 flex-col min-h-full overflow-hidden bg-background">
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mb-8 overflow-hidden rounded-3xl border border-brand-green/10 bg-gradient-to-br from-brand-green/[0.08] via-background to-background p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-green">Service & carte</p>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Ma carte</h1>
              <p className="mt-1 text-sm text-muted-foreground">Gardez les plats commandables, sans ralentir le service.</p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
              <CategoryOrganizerDialog categories={categories as MenuCategory[]} />
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/restaurateur/menu/new">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Ajouter un plat</span>
                  <span className="sm:hidden">Ajouter</span>
                </Link>
              </Button>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 divide-x divide-border/70 rounded-2xl border border-border/70 bg-background/75">
            <div className="px-3 py-3 sm:px-5"><p className="text-lg font-bold">{menuStats.total}</p><p className="text-xs text-muted-foreground">Au menu</p></div>
            <div className="px-3 py-3 sm:px-5"><p className="flex items-center gap-1.5 text-lg font-bold text-brand-green"><Eye className="h-4 w-4" />{menuStats.disponibles}</p><p className="text-xs text-muted-foreground">Disponibles</p></div>
            <div className="px-3 py-3 sm:px-5"><p className="flex items-center gap-1.5 text-lg font-bold text-muted-foreground"><EyeOff className="h-4 w-4" />{menuStats.indisponibles}</p><p className="text-xs text-muted-foreground">Masqués</p></div>
          </div>
        </div>

        <MenuFilters
          categories={categories}
          currentQ={currentQ}
          currentCategorie={currentCategorie}
          currentDispo={currentDispo}
        />

        {initialPlats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <UtensilsCrossed className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {currentQ || currentCategorie || currentDispo !== "all"
                ? "Aucun plat trouvé"
                : "Aucun plat pour le moment"}
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm">
              {currentQ || currentCategorie || currentDispo !== "all"
                ? "Essayez de modifier vos filtres ou votre recherche."
                : "Commencez par ajouter votre premier plat à la carte."}
            </p>
            {!currentQ && !currentCategorie && currentDispo === "all" && (
              <Button asChild size="lg">
                <Link href="/restaurateur/menu/new">
                  <Plus className="h-4 w-4" />
                  Ajouter un plat
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {initialPlats.map((plat) => (
                <MenuCard key={plat.id} plat={plat} />
              ))}
            </div>

            <Pagination total={totalPlats} page={currentPage} limit={limit} />
          </>
        )}
      </main>
    </div>
  );
}
