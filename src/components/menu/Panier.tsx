"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import type { CommandeItem } from "@/types";

interface PanierProps {
  items: CommandeItem[];
  nombreArticles: number;
  sousTotal: number;
  onDecrementer: (platId: string) => void;
  onIncrementer: (platId: string) => void;
  onSupprimer: (platId: string) => void;
  onVider: () => void;
  children: ReactNode;
}

export default function Panier({
  items,
  nombreArticles,
  sousTotal,
  onDecrementer,
  onIncrementer,
  onSupprimer,
  onVider,
  children,
}: PanierProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary" className="relative rounded-full px-4 py-2 gap-2">
          <ShoppingCart className="h-4 w-4" />
          Panier
          {nombreArticles > 0 && (
            <Badge className="rounded-full" variant="destructive">
              {nombreArticles}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full max-w-md flex-col">
        <SheetHeader className="shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <SheetTitle>Mon panier</SheetTitle>
              <p className="text-sm text-slate-500">
                {nombreArticles} article{nombreArticles > 1 ? "s" : ""}
              </p>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0">
                ✕
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        {/* Articles */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <ShoppingCart className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">Votre panier est vide</p>
              <p className="text-xs text-slate-400">Ajoutez des plats depuis le menu ci-dessus.</p>
            </div>
          ) : (
            items.map((item, index) => (
              <div key={item.platId} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{item.nom}</p>
                    <p className="text-sm text-slate-500">
                      {item.prix.toLocaleString("fr-FR")} FCFA / unité
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {(item.prix * item.quantite).toLocaleString("fr-FR")} FCFA
                    </p>
                    {/* Contrôles quantité */}
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 rounded-full p-0"
                        onClick={() => onDecrementer(item.platId)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold text-slate-800">
                        {item.quantite}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 rounded-full p-0"
                        onClick={() => onIncrementer(item.platId)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 rounded-full p-0 text-red-400 hover:text-red-600"
                        onClick={() => onSupprimer(item.platId)}
                        title="Supprimer cet article"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                {index < items.length - 1 && <Separator />}
              </div>
            ))
          )}
        </div>

        {/* Footer panier */}
        <div className="shrink-0 space-y-3 border-t border-slate-200 pt-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Sous-total</span>
              <span className="font-semibold text-slate-900">
                {sousTotal.toLocaleString("fr-FR")} FCFA
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Les frais de livraison seront calculés à la commande.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onVider}
              disabled={items.length === 0}
            >
              Vider
            </Button>
          </div>

          {/* Formulaire de commande (rendu inline dans le Sheet) */}
          <div className="mt-2">{children}</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
