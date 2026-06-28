"use client";

import DeletePlatDialog from "@/components/dashboard/menu/delete-plat-dialog";
import MenuInfoPanel from "@/components/dashboard/menu/menu-info-panel";
import PlatEditDialog from "@/components/dashboard/menu/plat-edit-dialog";
import PlatStatsPanel from "@/components/dashboard/menu/plat-stats-panel";
import SimilarDishes from "@/components/dashboard/menu/similar-dishes";
import type { PlatAvecCategorie } from "@/lib/db/types";
import { formatPrix } from "@/lib/utils/format";
import { ImageIcon, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface CategorieOption {
  id: string;
  nom: string;
}

interface NutritionItem {
  label: string;
  value: string;
  unit: string;
}

interface MenuDetailClientProps {
  plat: PlatAvecCategorie;
  categories: CategorieOption[];
  similarPlats: PlatAvecCategorie[];
  tags: string[];
  allergenes: string[];
  nutrition: NutritionItem[];
}

export default function MenuDetailClient({
  plat,
  categories,
  similarPlats,
  tags,
  allergenes,
  nutrition,
}: MenuDetailClientProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="flex min-h-screen bg-gray-50 font-sans">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 px-6 py-6 flex flex-col gap-0">
            {/* <div className="mb-4">
              <Link
                href="/restaurateur/menu"
                className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
              >
                ← Retour à la carte
              </Link>
            </div> */}

            <div className="flex gap-5 items-center flex-col md:flex-row">
              <div className="flex-1 min-w-0 flex flex-col gap-5">
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

                    <button
                      type="button"
                      onClick={() => setEditOpen(true)}
                      className="absolute top-4 right-4 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                      title="Modifier le plat"
                    >
                      <Pencil className="w-4 h-4 text-gray-700" />
                    </button>
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
                      {!plat.disponible && (
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

                    {allergenes.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800 mb-3">
                          Allergènes
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {allergenes.map((a) => (
                            <span
                              key={a}
                              className="flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-100 px-2.5 py-1.5 rounded-lg"
                            >
                              ⚠️ {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {nutrition.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800 mb-3">
                          Valeurs nutritionnelles
                        </h3>
                        <div className="grid grid-cols-4 gap-3">
                          {nutrition.map((n) => (
                            <div
                              key={n.label}
                              className="bg-gray-50 rounded-xl p-3 text-center"
                            >
                              <p className="text-xs text-gray-500 mb-1">
                                {n.label}
                              </p>
                              <p className="text-lg font-bold text-gray-900">
                                {n.value}
                              </p>
                              <p className="text-xs text-gray-400">{n.unit}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setEditOpen(true)}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold transition-colors shadow-sm"
                    >
                      <Pencil className="w-4 h-4" />
                      Modifier le plat
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteOpen(true)}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer le plat
                    </button>
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

              <div className="w-80 shrink-0 flex flex-col gap-5">
                <PlatStatsPanel
                  nombreCommandes={plat.nombreCommandes ?? 0}
                  noteMoyenne={plat.noteMoyenne ?? 0}
                  nombreAvis={plat.nombreAvis ?? 0}
                />
                <SimilarDishes plats={similarPlats} />
                <MenuInfoPanel
                  disponible={plat.disponible}
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
