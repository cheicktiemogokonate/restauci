"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CardHoverEffect } from "@/components/ui/card-hover-effect";
import type { Plat } from "@/types";

interface CartePlatProps {
  plat: Plat;
  categorieNom: string;
  onAjouter: (plat: Plat) => void;
}

export default function CartePlat({ plat, categorieNom, onAjouter }: CartePlatProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const prixFormate = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(plat.prix)
    .replace("€", "")
    .trim();

  return (
    <CardHoverEffect className="overflow-hidden">
      <div className="flex h-full flex-col">
        <div className="relative overflow-hidden bg-slate-100">
          {!imageLoaded && <Skeleton className="absolute inset-0" />}
          {plat.photoUrl ? (
            <img
              src={plat.photoUrl}
              alt={plat.nom}
              className="h-56 w-full object-cover transition duration-300 group-hover:scale-105"
              onLoad={() => setImageLoaded(true)}
            />
          ) : (
            <div className="flex h-56 items-center justify-center bg-slate-200 text-sm text-slate-500">
              Image non disponible
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-slate-900">{plat.nom}</h3>
              <Badge variant="outline">{categorieNom}</Badge>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              {plat.description || "Aucune description disponible."}
            </p>
          </div>

          <div className="mt-auto flex items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-lg font-semibold text-slate-900">{prixFormate} FCFA</p>
            </div>
            <Button
              type="button"
              className="whitespace-nowrap"
              onClick={() => onAjouter(plat)}
            >
              Ajouter au panier
            </Button>
          </div>
        </div>
      </div>
    </CardHoverEffect>
  );
}
