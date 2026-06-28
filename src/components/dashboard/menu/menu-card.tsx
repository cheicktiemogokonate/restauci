"use client";

import DeletePlatDialog from "@/components/dashboard/menu/delete-plat-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toggleDisponibilitePlatAction } from "@/lib/actions/menu";
import { formatPrix } from "@/lib/utils/format";
import type { PlatAvecCategorie } from "@/types/dashboard";
import {
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";

interface MenuCardProps {
  plat: PlatAvecCategorie;
}

export default function MenuCard({ plat }: MenuCardProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticDispo, setOptimisticDispo] = useOptimistic(plat.disponible);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleToggleDispo = () => {
    const newDispo = !optimisticDispo;

    startTransition(async () => {
      setOptimisticDispo(newDispo);
      await toggleDisponibilitePlatAction(plat.id, newDispo);
    });
  };

  return (
    <>
      <div
        className={`bg-white border border-border/60 rounded-[24px] overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col relative ${
          !optimisticDispo ? "opacity-70" : ""
        }`}
      >
        <Link
          href={`/restaurateur/menu/${plat.id}`}
          className="flex-1 flex flex-col"
        >
          <div className="relative h-50 w-full overflow-hidden bg-muted">
            {plat.photoUrl ? (
              <Image
                src={plat.photoUrl}
                alt={plat.nom}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm bg-gray-100">
                Sans image
              </div>
            )}

            {!optimisticDispo && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="flex items-center gap-1.5 text-white text-sm font-semibold bg-black/60 px-3 py-1.5 rounded-lg">
                  <EyeOff className="h-3.5 w-3.5" />
                  Indisponible
                </span>
              </div>
            )}
          </div>

          <div className="p-5 flex flex-col flex-1">
            <h3 className="font-bold text-[17px] text-foreground leading-tight line-clamp-2 mb-1">
              {plat.nom}
            </h3>
            <p className="text-[13px] text-muted-foreground mb-6 font-medium">
              {plat.categorie?.nom || "Non catégorisé"}
            </p>
            <div className="mt-auto flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="flex text-[#facc15]">
                  <Star className="h-4 w-4 fill-current" />
                </div>
                <div className="flex items-center gap-1 text-[13px]">
                  <span className="font-bold text-foreground">
                    {(plat.noteMoyenne ?? 0).toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">
                    ({plat.nombreAvis ?? 0})
                  </span>
                </div>
              </div>
              <span className="font-bold text-[16px] text-foreground">
                {formatPrix(plat.prix)}
              </span>
            </div>
          </div>
        </Link>

        <div className="absolute top-3 right-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm"
                disabled={isPending}
                onClick={(e) => e.stopPropagation()}
              >
                {isPending ? (
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href={`/restaurateur/menu/${plat.id}`}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Voir / Modifier
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleDispo}>
                {optimisticDispo ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Rendre indisponible
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Rendre disponible
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DeletePlatDialog
        platId={plat.id}
        platNom={plat.nom}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
