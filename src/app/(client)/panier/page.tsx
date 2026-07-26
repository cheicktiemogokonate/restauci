"use client";

import { AdresseLivraisonPicker } from "@/components/client-app/adresse-livraison-picker";
import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { usePanierRestaurant } from "@/lib/client-app/hooks/use-panier-restaurant";
import { useRequireAuth } from "@/lib/client-app/hooks/use-require-auth";
import { usePanierStore } from "@/lib/client-app/stores/panier-store";
import { formatPrix } from "@/lib/utils/format";
import { ArrowLeft, Bike, ChefHat, ClipboardList, Minus, Plus, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

type ModeCommande = "sur_place" | "livraison" | "emporter";

const modeLabels: Record<ModeCommande, string> = {
  livraison: "Livraison",
  emporter: "À emporter",
  sur_place: "Sur place",
};

const modeIcons = {
  livraison: Bike,
  emporter: ShoppingBag,
  sur_place: UtensilsCrossed,
};

function parseAddress(value: string | null) {
  if (!value) return null;

  try {
    const address = JSON.parse(value) as { adresse?: string; lat?: number; lng?: number };
    return typeof address.adresse === "string" && typeof address.lat === "number" && typeof address.lng === "number"
      ? { adresse: address.adresse, lat: address.lat, lng: address.lng }
      : null;
  } catch {
    return null;
  }
}

function getModeCommande(value: string | null): ModeCommande {
  return value === "sur_place" || value === "livraison" || value === "emporter" ? value : "livraison";
}

function PanierContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requireAuth = useRequireAuth();
  const reduceMotion = useReducedMotion();
  const items = usePanierStore((state) => state.items);
  const sousTotal = usePanierStore((state) => state.sousTotal());
  const changerQuantite = usePanierStore((state) => state.changerQuantite);
  const restaurantNom = usePanierStore((state) => state.restaurantNom);
  const restaurantSlug = usePanierStore((state) => state.restaurantSlug);
  const { restaurant, isLoading } = usePanierRestaurant();
  const checkoutMode = getModeCommande(searchParams.get("mode"));
  const checkoutTable = searchParams.get("table") ?? "";
  const checkoutAddressParam = searchParams.get("adresse");
  const checkoutAddress = useMemo(() => parseAddress(checkoutAddressParam), [checkoutAddressParam]);
  const checkoutNote = searchParams.get("note") ?? "";
  const [modeCommande, setModeCommande] = useState<ModeCommande>(checkoutMode);
  const [numeroTable, setNumeroTable] = useState(checkoutTable);
  const [adresse, setAdresse] = useState<{ adresse: string; lat: number; lng: number } | null>(checkoutAddress);
  const [noteClient, setNoteClient] = useState(checkoutNote);

  const modesDisponibles = (["livraison", "emporter", "sur_place"] as ModeCommande[]).filter(
    (mode) => !restaurant || restaurant.modesCommande.includes(mode),
  );
  const modeCommandeEffectif = modesDisponibles.includes(modeCommande)
    ? modeCommande
    : (modesDisponibles[0] ?? "emporter");

  if (items.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShoppingBag className="size-6" /></span>
        <h1 className="mt-4 text-xl font-bold tracking-tight">Votre panier est vide</h1>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">Parcourez les restaurants pour composer votre prochaine commande.</p>
        <Button className="mt-6" onClick={() => router.push("/client")}>Découvrir les restaurants</Button>
      </main>
    );
  }

  const fraisLivraison = modeCommandeEffectif === "livraison" ? (restaurant?.fraisLivraison ?? 0) : 0;
  const total = sousTotal + fraisLivraison;
  const commandeMinimumNonAtteinte = Boolean(restaurant?.commandeMinimum && sousTotal < restaurant.commandeMinimum);
  const peutValider = !commandeMinimumNonAtteinte && (modeCommandeEffectif !== "livraison" || adresse !== null);

  const handleValider = () => {
    requireAuth(() => {
      router.push(
        `/panier/confirmer?mode=${modeCommandeEffectif}` +
          (adresse ? `&adresse=${encodeURIComponent(JSON.stringify(adresse))}` : "") +
          (numeroTable ? `&table=${encodeURIComponent(numeroTable)}` : "") +
          (noteClient ? `&note=${encodeURIComponent(noteClient)}` : ""),
      );
    });
  };

  return (
    <main className="min-h-screen bg-muted/30 pb-32">
      <header className="sticky top-0 z-20 border-b bg-background/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Button asChild variant="ghost" size="icon"><Link href={restaurantSlug ? `/client/restaurant/${restaurantSlug}` : "/client"} aria-label="Retour au restaurant"><ArrowLeft /></Link></Button>
          <div className="min-w-0">
            <h1 className="text-base font-bold">Votre panier</h1>
            <p className="truncate text-xs text-muted-foreground">{restaurantNom}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-1">
        <section aria-labelledby="order-mode-heading" className="border-b py-5">
          <h2 id="order-mode-heading" className="mb-3 text-base font-semibold">Comment souhaitez-vous commander ?</h2>
            <Tabs value={modeCommandeEffectif} onValueChange={(value) => setModeCommande(value as ModeCommande)} variant="segment" className="w-full">
              <TabsList className={`grid h-11 w-full ${modesDisponibles.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                {modesDisponibles.map((mode) => {
                  const Icon = modeIcons[mode];
                  return <TabsTrigger key={mode} value={mode} className="gap-1.5 px-2 text-xs sm:text-sm"><Icon className="size-3.5" />{modeLabels[mode]}</TabsTrigger>;
                })}
              </TabsList>
            </Tabs>
        </section>

        <AnimatePresence initial={false} mode="wait">
          {modeCommandeEffectif === "livraison" ? (
            <motion.div key="delivery" initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}>
              <AdresseLivraisonPicker value={adresse} onChange={setAdresse} />
            </motion.div>
          ) : modeCommandeEffectif === "sur_place" ? (
            <motion.div key="table" initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}>
              <section className="border-b py-5"><Label htmlFor="table-number">Numéro de table</Label><Input id="table-number" value={numeroTable} onChange={(event) => setNumeroTable(event.target.value)} placeholder="Ex. 12" className="mt-2 h-10" /></section>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <section aria-labelledby="cart-items-heading" className="border-b py-5">
          <h2 id="cart-items-heading" className="mb-4 flex items-center gap-2 text-base font-semibold"><ChefHat className="size-4 text-primary" />Votre sélection</h2>
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {items.map((item, index) => (
                <motion.div key={item.platId} layout initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: -16 }} className={index < items.length - 1 ? "border-b pb-3" : ""}>
                  <div className="flex items-center gap-3">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {item.photoUrl ? <Image src={item.photoUrl} alt={item.nom} fill sizes="56px" className="object-cover" /> : <span className="flex size-full items-center justify-center text-lg">🍽️</span>}
                    </div>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.nom}</p><p className="mt-0.5 text-xs text-muted-foreground">{formatPrix(item.prix)} l’unité</p></div>
                    <div className="flex items-center gap-1.5">
                      <Button type="button" variant="outline" size="icon-sm" onClick={() => changerQuantite(item.platId, item.quantite - 1)} aria-label={`Retirer un ${item.nom}`}><Minus /></Button>
                      <span className="w-5 text-center text-sm font-semibold">{item.quantite}</span>
                      <Button type="button" variant="outline" size="icon-sm" onClick={() => changerQuantite(item.platId, item.quantite + 1)} aria-label={`Ajouter un ${item.nom}`}><Plus /></Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        <section className="border-b py-5"><Label htmlFor="restaurant-note">Note pour le restaurant <span className="font-normal text-muted-foreground">(facultatif)</span></Label><Textarea id="restaurant-note" value={noteClient} onChange={(event) => setNoteClient(event.target.value)} placeholder="Ex. Pas trop épicé, merci." className="mt-2 min-h-20 resize-none" /></section>

        <section aria-label="Récapitulatif du total" className="space-y-2 border-b py-5 text-sm"><div className="flex justify-between text-muted-foreground"><span>Sous-total</span><span>{formatPrix(sousTotal)}</span></div>{modeCommandeEffectif === "livraison" ? <div className="flex justify-between text-muted-foreground"><span>Frais de livraison</span><span>{formatPrix(fraisLivraison)}</span></div> : null}<Separator className="my-3" /><div className="flex items-end justify-between"><span className="font-semibold">Total</span><span className="text-lg font-bold text-primary">{formatPrix(total)}</span></div></section>

        {commandeMinimumNonAtteinte ? <Alert className="my-5"><ClipboardList /><AlertDescription>Commande minimum : {formatPrix(restaurant?.commandeMinimum ?? 0)}</AlertDescription></Alert> : null}
      </div>

      <footer className="fixed right-0 bottom-0 left-0 z-20 border-t bg-background/95 p-4 backdrop-blur-md">
        <div className="mx-auto max-w-2xl"><Button type="button" size="lg" disabled={!peutValider || isLoading} onClick={handleValider} className="h-12 w-full rounded-xl">Continuer · {formatPrix(total)}</Button></div>
      </footer>
    </main>
  );
}

export default function PanierPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-muted/30" />}>
      <PanierContent />
    </Suspense>
  );
}
