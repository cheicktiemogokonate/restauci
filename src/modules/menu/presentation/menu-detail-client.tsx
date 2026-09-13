"use client";

import DeletePlatDialog from "./delete-plat-dialog";
import MenuInfoPanel from "./menu-info-panel";
import PlatEditDialog from "./plat-edit-dialog";
import PlatStatsPanel from "./plat-stats-panel";
import SimilarDishes from "./similar-dishes";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/motion/switch";
import type { MenuCategoryOptionDTO, MenuDishDTO } from "../contracts";
import { formatPrix } from "@/shared/format";
import { ArrowLeft, ImageIcon, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import type { MenuDishActions } from "./action-types";

interface MenuDetailClientProps {
  plat: MenuDishDTO;
  categories: MenuCategoryOptionDTO[];
  similarPlats: MenuDishDTO[];
  tags: string[];
  actions: MenuDishActions;
}

export default function MenuDetailClient({
  plat,
  categories,
  similarPlats,
  tags,
  actions,
}: MenuDetailClientProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isAvailabilityPending, startAvailabilityTransition] = useTransition();
  const [optimisticDisponibilite, setOptimisticDisponibilite] = useOptimistic(
    plat.disponible,
  );
  const [publicationIntent, setPublicationIntent] = useState(plat.publicationIntent);

  const handleDisponibiliteChange = (disponible: boolean) => {
    startAvailabilityTransition(async () => {
      setOptimisticDisponibilite(disponible);
      const result = await actions.setAvailability(plat.id, disponible);

      if (result.error) {
        setOptimisticDisponibilite(!disponible);
        toast.error(result.error);
        return;
      }

      toast.success(disponible ? "Plat rendu disponible." : "Plat masqué du menu.");
    });
  };

  const handlePublicationChange = (published: boolean) => {
    const previous = publicationIntent;
    setPublicationIntent(published);
    startAvailabilityTransition(async () => {
      const result = await actions.setPublication(plat.id, published);
      if (result.error) {
        setPublicationIntent(previous);
        toast.error(result.error);
      } else toast.success(published ? "Plat marqué comme publié." : "Plat dépublié.");
    });
  };

  return (
    <>
      <div className="flex min-h-screen bg-muted/20 font-sans">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6">
            <Button asChild variant="ghost" className="w-fit text-muted-foreground hover:text-foreground">
              <Link href="/restaurateur/menu">
                <ArrowLeft className="h-4 w-4" />
                Retour à la carte
              </Link>
            </Button>

            <div className="flex flex-col items-stretch gap-5 xl:flex-row">
              <div className="flex min-w-0 flex-1 flex-col gap-5">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="relative h-72 bg-gray-100">
                    {plat.photoUrl ? (
                      <Image
                        src={plat.photoUrl}
                        alt={plat.nom}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1200px) 100vw, 800px"
                        priority
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                        <ImageIcon className="w-10 h-10" />
                        <span className="text-sm">Aucune photo</span>
                      </div>
                    )}

                    {tags.includes("Personnalisable") && (
                      <div className="absolute top-4 left-4">
                        <span className="flex items-center gap-1.5 text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 rounded-lg backdrop-blur-sm">
                          ✦ Personnalisable
                        </span>
                      </div>
                    )}

                  </div>

                  <div className="px-6 pt-5 pb-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          {plat.nom}
                        </h2>
                        {tags.length > 0 && (
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {tags.map((tag) => (
                              <span
                                key={tag}
                                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                  tag === "Personnalisable"
                                    ? "bg-green-100 text-green-700"
                                    : "text-gray-600 bg-gray-100"
                                }`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-2xl font-extrabold text-green-700 shrink-0">
                        {formatPrix(plat.prix)}
                      </span>
                    </div>

                    <div className="flex items-center gap-5 flex-wrap">
                      <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <span className="font-semibold text-gray-700">
                          {plat.nombreCommandes ?? 0}
                        </span>{" "}
                        commandes
                      </div>
                      {!optimisticDisponibilite && (
                        <span className="text-xs font-semibold text-zinc-600 bg-zinc-100 px-2.5 py-1 rounded-full">
                          Indisponible
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-5">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 flex flex-col gap-5">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 mb-2">
                        Description
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {plat.description || "Aucune description disponible."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/30 px-3.5 py-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Visible à la commande</p>
                        <p className="text-xs text-muted-foreground">
                          {optimisticDisponibilite
                            ? "Les clients peuvent commander ce plat."
                            : "Ce plat est masqué pour les clients."}
                        </p>
                      </div>
                      <Switch
                        checked={optimisticDisponibilite}
                        onCheckedChange={handleDisponibiliteChange}
                        disabled={isAvailabilityPending}
                        ariaLabel={`Rendre ${plat.nom} ${optimisticDisponibilite ? "indisponible" : "disponible"}`}
                        className="data-checked:bg-brand-green"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/30 px-3.5 py-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Publication publique</p>
                        <p className="text-xs text-muted-foreground">
                          {!publicationIntent ? "Non publié" : !plat.categoryQuotaEligible ? "Catégorie hors quota" : !plat.quotaEligible ? "Hors quota de l’offre" : optimisticDisponibilite ? "Visible publiquement" : "Publié mais temporairement indisponible"}
                        </p>
                      </div>
                      <Switch checked={publicationIntent} onCheckedChange={handlePublicationChange} disabled={isAvailabilityPending} ariaLabel={`Publication de ${plat.nom}`} />
                    </div>

                    <Button
                      type="button"
                      onClick={() => setEditOpen(true)}
                      className="h-11 w-full rounded-xl bg-brand-green text-white hover:bg-brand-green/90"
                    >
                      <Pencil className="h-4 w-4" />
                      Modifier le plat
                    </Button>

                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setDeleteOpen(true)}
                      className="h-11 w-full rounded-xl"
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer le plat
                    </Button>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
                    <h3 className="text-sm font-semibold text-gray-800 mb-4">
                      Catégorie
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                      <p className="text-sm text-gray-700">
                        {plat.categorie?.nom || "Non catégorisé"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex w-full shrink-0 flex-col gap-5 xl:w-80">
                <PlatStatsPanel
                  nombreCommandes={plat.nombreCommandes ?? 0}
                />
                <SimilarDishes plats={similarPlats} />
                <MenuInfoPanel
                  disponible={optimisticDisponibilite}
                  createdAt={plat.createdAt}
                  updatedAt={plat.updatedAt}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <PlatEditDialog
        plat={plat}
        categories={categories}
        open={editOpen}
        onOpenChange={setEditOpen}
        action={actions.update}
      />

      <DeletePlatDialog
        platId={plat.id}
        platNom={plat.nom}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        redirectTo="/restaurateur/menu"
        action={actions.remove}
      />
    </>
  );
}
