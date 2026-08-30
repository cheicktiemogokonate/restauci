"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  Bike,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import type { ClientDeliveryDTO } from "@/modules/deliveries/contracts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { clientApi } from "@/lib/client-app/api-client";

const statusLabels: Record<ClientDeliveryDTO["status"], string> = {
  en_attente: "Recherche d’un livreur",
  assignee: "Livreur assigné",
  en_route: "Livreur en route",
  livree: "Livraison terminée",
  echouee: "Incident signalé",
  annulee: "Livraison annulée",
};

export function ClientDeliveryPanel({ orderId }: { orderId: string }) {
  const [delivery, setDelivery] = useState<ClientDeliveryDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    const result = await clientApi.get<ClientDeliveryDTO>(
      `/commandes/${orderId}/livraison`,
    );
    setDelivery(result.success ? (result.data ?? null) : null);
    if (!silent) setIsLoading(false);
  }, [orderId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(true), 15_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [load]);

  const confirm = () => {
    startTransition(async () => {
      const result = await clientApi.post(`/commandes/${orderId}/livraison/confirmation`);
      if (!result.success) {
        toast.error(result.error ?? "Confirmation impossible.");
        return;
      }
      toast.success("Remise confirmée. Merci !");
      await load(true);
    });
  };

  const copyCode = async () => {
    if (!delivery?.proofCode) return;
    await navigator.clipboard.writeText(delivery.proofCode);
    toast.success("Code copié.");
  };

  if (isLoading) {
    return (
      <section className="border-b py-6" aria-label="Chargement de la livraison">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-4 h-28 w-full" />
      </section>
    );
  }
  if (!delivery) return null;

  return (
    <section aria-labelledby="delivery-heading" className="border-b py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="delivery-heading" className="flex items-center gap-2 text-base font-semibold">
          <Bike className="size-4 text-primary" /> Livraison
        </h2>
        <Badge variant={delivery.status === "echouee" ? "destructive" : "secondary"}>
          {statusLabels[delivery.status]}
        </Badge>
      </div>

      {delivery.driver ? (
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-3">
            <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
              {delivery.driver.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL restaurateur contrôlée, sans dimensions garanties.
                <img src={delivery.driver.photoUrl} alt="" className="size-full object-cover" />
              ) : (
                <UserRound className="size-5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">{delivery.driver.name}</CardTitle>
              <p className="truncate text-xs text-muted-foreground">
                {delivery.driver.restaurantName} · {delivery.driver.vehicle}
                {delivery.driver.vehicleNumber ? ` · ${delivery.driver.vehicleNumber}` : ""}
              </p>
            </div>
            <Button asChild size="icon" variant="outline">
              <a
                href={`tel:${delivery.driver.phone.replace(/\s/g, "")}`}
                aria-label={`Appeler ${delivery.driver.name}`}
              >
                <Phone />
              </a>
            </Button>
          </CardHeader>
        </Card>
      ) : (
        <div className="flex gap-3 rounded-xl border bg-muted/30 p-4">
          <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Le restaurant cherche un livreur disponible. Vous verrez ici son nom,
            son téléphone, son véhicule et son numéro dès son acceptation.
          </p>
        </div>
      )}

      {delivery.proofRequired && delivery.proofCode ? (
        <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-4 text-center">
          <ShieldCheck className="mx-auto size-5 text-primary" />
          <p className="mt-2 text-sm font-semibold">Code de remise au livreur</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <code className="text-3xl font-bold tracking-[0.25em] text-primary">
              {delivery.proofCode}
            </code>
            <Button size="icon" variant="ghost" aria-label="Copier le code de remise" onClick={() => void copyCode()}>
              <Copy />
            </Button>
          </div>
          <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground">
            Donnez ce code uniquement après avoir reçu et vérifié votre commande.
            Vous pouvez aussi confirmer directement ci-dessous.
          </p>
          <Button className="mt-4 w-full sm:w-auto" disabled={isPending} onClick={confirm}>
            {isPending ? <Clock3 /> : <Check />}
            J’ai reçu ma commande
          </Button>
        </div>
      ) : delivery.status === "en_route" ? (
        <Alert className="mt-4">
          <CheckCircle2 />
          <AlertTitle>Remise confirmée</AlertTitle>
          <AlertDescription>
            Votre confirmation est horodatée. Le livreur peut maintenant clôturer la mission.
          </AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
