"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createSubscriptionRequestAction } from "@/app/_actions/partner-subscriptions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RestaurateurSubscriptionButtonProps {
  planCode: string;
  planName: string;
  isCurrent: boolean;
  isPending: boolean;
  hasAnyPending: boolean;
  disabled?: boolean;
  unavailableLabel?: string;
}

export function RestaurateurSubscriptionButton({
  planCode,
  planName,
  isCurrent,
  isPending,
  hasAnyPending,
  disabled,
  unavailableLabel,
}: RestaurateurSubscriptionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const result = await createSubscriptionRequestAction(planCode);
      if (result.authorizationUrl) {
        window.location.assign(result.authorizationUrl);
        return;
      }
      toast.success("Votre demande a été envoyée.");
      setShowConfirm(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la demande");
    } finally {
      setLoading(false);
    }
  };

  if (isCurrent) {
    return (
      <Button variant="outline" className="w-full" disabled>
        Offre actuelle
      </Button>
    );
  }

  if (isPending) {
    return (
      <Button variant="secondary" className="w-full" disabled>
        Demande en cours...
      </Button>
    );
  }

  return (
    <>
      <Button 
        className="w-full" 
        disabled={disabled || hasAnyPending || loading}
        onClick={() => setShowConfirm(true)}
      >
        {unavailableLabel ?? "Choisir cette offre"}
      </Button>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer votre choix</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de demander la souscription à l'offre <strong>{planName}</strong>.
              <br className="mt-2" />
              Pour une offre payante, vous serez redirigé vers Paystack. Votre abonnement actuel reste actif jusqu’à la confirmation réelle du paiement.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={handleSubscribe} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
