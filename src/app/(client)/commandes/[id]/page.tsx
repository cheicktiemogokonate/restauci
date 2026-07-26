"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommandeTracking } from "@/lib/client-app/hooks/use-commande-tracking";
import { clientApi } from "@/lib/client-app/api-client";
import { useAuthStore } from "@/lib/client-app/stores/auth-store";
import { formatPrix } from "@/lib/utils/format";
import { AlertCircle, ArrowLeft, Check, Circle, Clock3, MapPin, ReceiptText, Store, UtensilsCrossed } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const modeLabels: Record<string, string> = {
  livraison: "Livraison",
  emporter: "À emporter",
  sur_place: "Sur place",
};

export default function SuiviCommandePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const reduceMotion = useReducedMotion();
  const { commande, isLoading, error } = useCommandeTracking(params.id);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelling, startCancellation] = useTransition();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(`/client/login?redirect=${encodeURIComponent(`/commandes/${params.id}`)}`);
    }
  }, [isAuthenticated, params.id, router]);

  if (!isAuthenticated) return null;

  if (isLoading) {
    return <main className="min-h-screen bg-background"><div className="border-b px-4 py-3"><div className="mx-auto flex max-w-2xl items-center gap-3"><Skeleton className="size-8" /><div className="space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div></div></div><div className="mx-auto max-w-2xl space-y-5 px-4 py-6"><Skeleton className="mx-auto h-8 w-48" /><Skeleton className="h-44 w-full" /><Skeleton className="h-28 w-full" /></div></main>;
  }

  if (!commande) {
    return <main className="flex min-h-screen items-center justify-center px-4"><section className="max-w-sm text-center"><span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><AlertCircle className="size-5" /></span><h1 className="mt-4 text-lg font-semibold">Commande introuvable</h1><p className="mt-1 text-sm text-muted-foreground">{error ?? "Cette commande n’est plus disponible."}</p><Button className="mt-5" onClick={() => router.push("/commandes")}>Retour aux commandes</Button></section></main>;
  }

  const ModeIcon = commande.modeCommande === "livraison" ? MapPin : commande.modeCommande === "sur_place" ? UtensilsCrossed : Store;
  const cancelCommande = () => {
    setCancelError(null);
    startCancellation(async () => {
      const result = await clientApi.patch<{ id: string; statut: string }>(
        `/commandes/${commande.id}`,
      );
      if (!result.success) {
        setCancelError(result.error ?? "Impossible d’annuler la commande.");
      }
    });
  };

  return (
    <main className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-20 border-b bg-background/95 px-4 py-3 backdrop-blur-md"><div className="mx-auto flex max-w-2xl items-center gap-3"><Button type="button" variant="ghost" size="icon" onClick={() => router.push("/commandes")} aria-label="Retour aux commandes"><ArrowLeft /></Button><div className="min-w-0"><h1 className="truncate text-base font-bold">Commande {commande.numero}</h1><p className="truncate text-xs text-muted-foreground">{commande.restaurant?.nom}</p></div></div></header>
      <div className="mx-auto max-w-2xl px-4">
        {commande.estAnnulee ? <Alert variant="destructive" className="my-6"><AlertCircle /><AlertTitle>Commande annulée</AlertTitle><AlertDescription>Cette commande n’a pas été traitée par le restaurant.</AlertDescription></Alert> : <>
          <section className="border-b py-8 text-center">
            {commande.statut === "recue" ? (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                <div className="relative mx-auto flex size-24 items-center justify-center">
                  {!reduceMotion ? <motion.span initial={{ scale: 0.65, opacity: 0.5 }} animate={{ scale: 1.35, opacity: 0 }} transition={{ duration: 0.75, ease: "easeOut" }} className="absolute inset-0 rounded-full bg-primary/20" /> : null}
                  <motion.svg viewBox="0 0 64 64" className="relative size-24 text-primary" aria-label="Commande validée">
                    <motion.circle cx="32" cy="32" r="27" fill="currentColor" initial={reduceMotion ? { scale: 1 } : { scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.35, ease: "easeOut" }} style={{ transformOrigin: "center" }} />
                    <motion.path d="M19 32.5 27.5 41 45.5 23" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.34, delay: reduceMotion ? 0 : 0.28, ease: "easeOut" }} />
                  </motion.svg>
                </div>
                <Badge className="mt-5 bg-primary/10 text-primary hover:bg-primary/10">Commande validée</Badge>
                <h2 className="mt-3 text-2xl font-bold tracking-tight">Votre commande est reçue</h2>
                <p className="mt-1 text-sm text-muted-foreground">Le restaurant va la traiter très bientôt.</p>
              </motion.div>
            ) : (
              <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
                <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Suivi en direct</Badge>
                <h2 className="mt-3 text-2xl font-bold tracking-tight">{commande.statutLabel}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Nous vous prévenons à chaque étape.</p>
              </motion.div>
            )}
          </section>
          <section aria-labelledby="tracking-heading" className="border-b py-6"><h2 id="tracking-heading" className="mb-5 flex items-center gap-2 text-base font-semibold"><Clock3 className="size-4 text-primary" />Progression</h2><div>{commande.timeline.map((etape, index) => <motion.div key={etape.etape} initial={reduceMotion ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: Math.min(index * 0.06, 0.24) }} className="flex gap-3"><div className="flex flex-col items-center"><span className={`flex size-7 items-center justify-center rounded-full ${etape.fait ? "bg-primary text-primary-foreground" : etape.actif ? "border-2 border-primary bg-background text-primary" : "border-2 border-muted bg-background text-muted-foreground"}`}>{etape.fait ? <Check className="size-4" /> : <Circle className="size-2 fill-current" />}</span>{index < commande.timeline.length - 1 ? <span className={`my-1 h-9 w-px ${etape.fait ? "bg-primary" : "bg-border"}`} /> : null}</div><div className="pt-1"><p className={`text-sm font-semibold ${etape.fait || etape.actif ? "text-foreground" : "text-muted-foreground"}`}>{etape.label}</p>{etape.actif ? <p className="mt-0.5 text-xs text-primary">En cours</p> : null}</div></motion.div>)}</div></section>
          {commande.statut === "recue" ? (
            <section className="border-b py-5">
              {cancelError ? <Alert variant="destructive" className="mb-3"><AlertCircle /><AlertTitle>Annulation impossible</AlertTitle><AlertDescription>{cancelError}</AlertDescription></Alert> : null}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" className="w-full text-destructive" disabled={isCancelling}>
                    {isCancelling ? "Annulation…" : "Annuler la commande"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Annuler cette commande ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      L’annulation est possible uniquement avant le début de la préparation.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Conserver la commande</AlertDialogCancel>
                    <AlertDialogAction onClick={cancelCommande}>Confirmer l’annulation</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </section>
          ) : null}
        </>}

        <section aria-labelledby="order-detail-heading" className="border-b py-6"><div className="mb-4 flex items-center justify-between gap-3"><h2 id="order-detail-heading" className="flex items-center gap-2 text-base font-semibold"><ReceiptText className="size-4 text-primary" />Détail</h2><Badge variant="secondary"><ModeIcon className="size-3" />{modeLabels[commande.modeCommande] ?? commande.modeCommande}</Badge></div>{commande.adresseLivraison ? <p className="mb-4 flex gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" />{commande.adresseLivraison}</p> : null}{commande.numeroTable ? <p className="mb-4 text-sm text-muted-foreground">Table {commande.numeroTable}</p> : null}<div className="space-y-2.5">{commande.items.map((item, index) => <div key={`${item.nom}-${index}`} className="flex justify-between gap-4 text-sm"><span className="min-w-0 text-muted-foreground"><span className="font-semibold text-foreground">{item.quantite}×</span> {item.nom}</span><span className="shrink-0 font-medium">{formatPrix(item.prix * item.quantite)}</span></div>)}</div><Separator className="my-4" /><div className="flex justify-between"><span className="font-semibold">Total</span><span className="text-lg font-bold text-primary">{formatPrix(commande.total)}</span></div></section>
      </div>
    </main>
  );
}
