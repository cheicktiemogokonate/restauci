"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { usePanierRestaurant } from "@/lib/client-app/hooks/use-panier-restaurant";
import { clientApi } from "@/lib/client-app/api-client";
import { usePanierStore } from "@/lib/client-app/stores/panier-store";
import { useAuthStore } from "@/lib/client-app/stores/auth-store";
import { formatPrix } from "@/lib/utils/format";
import { AlertCircle, ArrowLeft, Banknote, MapPin } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState, useTransition } from "react";

type ModeCommande = "sur_place" | "livraison" | "emporter";

function parseAddress(value: string | null) {
  if (!value) return null;
  try {
    const result = JSON.parse(value) as { adresse?: string; lat?: number; lng?: number };
    return typeof result.adresse === "string" && typeof result.lat === "number" && typeof result.lng === "number" ? result : null;
  } catch {
    return null;
  }
}

function ConfirmerCommandeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const items = usePanierStore((state) => state.items);
  const sousTotal = usePanierStore((state) => state.sousTotal());
  const restaurantSlug = usePanierStore((state) => state.restaurantSlug);
  const restaurantNom = usePanierStore((state) => state.restaurantNom);
  const vider = usePanierStore((state) => state.vider);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { restaurant, isLoading: isRestaurantLoading } = usePanierRestaurant();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const mode = (searchParams.get("mode") as ModeCommande | null) ?? "livraison";
  const table = searchParams.get("table");
  const note = searchParams.get("note");
  const adresseData = useMemo(() => parseAddress(searchParams.get("adresse")), [searchParams]);
  const fraisLivraison = mode === "livraison" ? (restaurant?.fraisLivraison ?? 0) : 0;
  const total = sousTotal + fraisLivraison;
  const modeLabel = mode === "livraison" ? "Livraison" : mode === "emporter" ? "À emporter" : "Sur place";
  const retourPanierHref = searchParams.size > 0 ? `/panier?${searchParams.toString()}` : "/panier";

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/client/login?redirect=%2Fpanier");
    }
  }, [isAuthenticated, router]);

  const handleConfirmer = () => {
    if (!restaurantSlug || items.length === 0) return;
    setError(null);

    startTransition(async () => {
      const result = await clientApi.post<{ commande: { id: string; numero: string } }>("/commandes", {
        restaurantSlug,
        modeCommande: mode,
        items: items.map((item) => ({ platId: item.platId, quantite: item.quantite })),
        ...(adresseData && { adresseLivraison: adresseData.adresse, latitudeLivraison: adresseData.lat, longitudeLivraison: adresseData.lng }),
        ...(table && { numeroTable: table }),
        ...(note && { noteClient: note }),
        idempotencyKey,
      });

      if (!result.success || !result.data) {
        setError(result.error ?? "Impossible de passer la commande");
        return;
      }
      vider();
      router.push(`/commandes/${result.data.commande.id}`);
    });
  };

  if (!isAuthenticated) return null;

  if (items.length === 0) {
    return <main className="flex min-h-screen items-center justify-center px-4"><p className="text-center text-sm text-muted-foreground">Votre panier est vide.</p></main>;
  }

  return (
    <main className="min-h-screen bg-muted/30 pb-32">
      <header className="sticky top-0 z-20 border-b bg-background/95 px-4 py-3 backdrop-blur-md"><div className="mx-auto flex max-w-2xl items-center gap-3"><Button asChild variant="ghost" size="icon"><Link href={retourPanierHref} aria-label="Retour au panier"><ArrowLeft /></Link></Button><div><h1 className="text-base font-bold">Vérifier la commande</h1><p className="text-xs text-muted-foreground">Une dernière vérification avant l’envoi</p></div></div></header>
      <div className="mx-auto max-w-2xl px-4 py-1">
        <section className="border-b py-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold">{restaurantNom}</p><p className="mt-0.5 text-xs text-muted-foreground">{modeLabel}{table ? ` · Table ${table}` : ""}</p></div><Badge variant="secondary">{modeLabel}</Badge></div>{adresseData ? <div className="mt-3 flex gap-2 border-t pt-3 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" />{adresseData.adresse}</div> : null}</section>

        <section aria-labelledby="confirmation-items-heading" className="border-b py-5"><h2 id="confirmation-items-heading" className="mb-4 text-base font-semibold">Votre commande</h2><div className="space-y-2.5">{items.map((item) => <div key={item.platId} className="flex justify-between gap-4 text-sm"><span className="min-w-0 text-muted-foreground"><span className="font-semibold text-foreground">{item.quantite}×</span> {item.nom}</span><span className="shrink-0 font-medium">{formatPrix(item.prix * item.quantite)}</span></div>)}<Separator className="my-3" />{isRestaurantLoading ? <Skeleton className="h-5 w-full" /> : <><div className="flex justify-between text-sm text-muted-foreground"><span>Sous-total</span><span>{formatPrix(sousTotal)}</span></div>{mode === "livraison" ? <div className="mt-2 flex justify-between text-sm text-muted-foreground"><span>Livraison</span><span>{formatPrix(fraisLivraison)}</span></div> : null}<div className="mt-3 flex justify-between"><span className="font-semibold">Total</span><span className="text-lg font-bold text-primary">{formatPrix(total)}</span></div></>}</div></section>

        <Alert className="my-5 border-amber-200 bg-amber-50 text-amber-900"><Banknote /><AlertTitle>Paiement sur place</AlertTitle><AlertDescription className="text-amber-800">Vous réglerez directement au livreur ou au restaurant.</AlertDescription></Alert>
        {error ? <Alert variant="destructive" className="mb-5"><AlertCircle /><AlertTitle>Commande non envoyée</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      </div>
      <footer className="fixed right-0 bottom-0 left-0 z-20 border-t bg-background/95 p-4 backdrop-blur-md"><div className="mx-auto max-w-2xl"><Button type="button" size="lg" disabled={isPending || isRestaurantLoading} onClick={handleConfirmer} className="h-12 w-full rounded-xl">{isPending ? "Envoi de la commande…" : `Confirmer · ${formatPrix(total)}`}</Button></div></footer>
    </main>
  );
}

export default function ConfirmerCommandePage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center"><Skeleton className="h-10 w-10 rounded-full" /></main>}><ConfirmerCommandeContent /></Suspense>;
}
