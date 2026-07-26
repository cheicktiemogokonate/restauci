"use client";

import { Button } from "@/components/ui/button";
import { usePanierStore } from "@/lib/client-app/stores/panier-store";
import { formatPrix } from "@/lib/utils/format";
import { ShoppingBag } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

export function PanierFlottant() {
  const items = usePanierStore((state) => state.items);
  const restaurantNom = usePanierStore((state) => state.restaurantNom);
  const sousTotal = usePanierStore((state) => state.sousTotal());
  const nombreItems = usePanierStore((state) => state.nombreItems());
  const reduceMotion = useReducedMotion();

  if (items.length === 0) return null;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: 12 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      className="fixed right-3 bottom-4 left-3 z-20 mx-auto max-w-2xl sm:right-4 sm:left-4"
    >
      <Button asChild size="lg" className="h-auto w-full justify-between rounded-2xl px-4 py-3 shadow-xl shadow-primary/20">
        <Link href="/panier">
          <span className="flex min-w-0 items-center gap-3 text-left">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15">
              <ShoppingBag className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Voir le panier · {nombreItems} article{nombreItems > 1 ? "s" : ""}</span>
              <span className="block truncate text-xs font-normal text-primary-foreground/75">{restaurantNom}</span>
            </span>
          </span>
          <span className="text-sm font-bold">{formatPrix(sousTotal)}</span>
        </Link>
      </Button>
    </motion.div>
  );
}
