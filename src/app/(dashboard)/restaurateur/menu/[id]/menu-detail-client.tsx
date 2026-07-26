"use client";

import DeletePlatDialog from "@/components/dashboard/menu/delete-plat-dialog";
import MenuInfoPanel from "@/components/dashboard/menu/menu-info-panel";
import PlatEditDialog from "@/components/dashboard/menu/plat-edit-dialog";
import PlatStatsPanel from "@/components/dashboard/menu/plat-stats-panel";
import SimilarDishes from "@/components/dashboard/menu/similar-dishes";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toggleDisponibilitePlatAction } from "@/lib/actions/menu";
import type { PlatAvecCategorie } from "@/lib/db/types";
import { formatPrix } from "@/lib/utils/format";
import { ArrowLeft, ImageIcon, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";

interface CategorieOption {
  id: string;
  nom: string;
}

interface MenuDetailClientProps {
  plat: PlatAvecCategorie;
  categories: CategorieOption[];
  similarPlats: PlatAvecCategorie[];
  tags: string[];
}

export default function MenuDetailClient({
  plat,
  categories,
  similarPlats,
  tags,
}: MenuDetailClientProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isAvailabilityPending, startAvailabilityTransition] = useTransition();
  const [optimisticDisponibilite, setOptimisticDisponibilite] = useOptimistic(
    plat.disponible,
  );

  const handleDisponibiliteChange = (disponible: boolean) => {
    startAvailabilityTransition(async () => {
      setOptimisticDisponibilite(disponible);
      const result = await toggleDisponibilitePlatAction(plat.id, disponible);

      if (result.error) {
        setOptimisticDisponibilite(!disponible);
        toast.error(result.error);
        return;
      }

      toast.success(disponible ? "Plat rendu disponible." : "Plat masqué du menu.");
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
                      <div className="flex items-center gap-1.5">
                        <svg
                          className="w-4 h-4 text-amber-400"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <span className="text-sm font-bold text-gray-700">
                          {(plat.noteMoyenne ?? 0).toFixed(1)}/5
                        </span>
                        <span className="text-sm text-gray-400">
                          ({plat.nombreAvis ?? 0} avis)
                        </span>
                      </div>
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
                        aria-label={`Rendre ${plat.nom} ${optimisticDisponibilite ? "indisponible" : "disponible"}`}
                        className="data-checked:bg-brand-green"
                      />
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
                  noteMoyenne={plat.noteMoyenne ?? 0}
                  nombreAvis={plat.nombreAvis ?? 0}
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
      />

      <DeletePlatDialog
        platId={plat.id}
        platNom={plat.nom}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        redirectTo="/restaurateur/menu"
      />
    </>
  );
}
