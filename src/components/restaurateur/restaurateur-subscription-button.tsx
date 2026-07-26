"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createSubscriptionRequestAction } from "@/lib/actions/restaurateur-subscriptions";
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
  isCurrent: boolean;
  isPending: boolean;
  hasAnyPending: boolean;
  disabled?: boolean;
}

export function RestaurateurSubscriptionButton({
  planCode,
  isCurrent,
  isPending,
  hasAnyPending,
  disabled
}: RestaurateurSubscriptionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      await createSubscriptionRequestAction(planCode);
      toast.success("Votre demande a été envoyée. Notre équipe la traitera sous peu.");
      setShowConfirm(false);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la demande");
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
        Choisir cette offre
      </Button>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer votre choix</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de demander la souscription à l'offre <strong>{planCode.replace('_', ' ')}</strong>.
              <br className="mt-2" />
              Une fois votre demande validée, notre équipe vous contactera pour procéder au règlement. 
              Votre abonnement actuel (le cas échéant) restera actif jusqu'à la validation.
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
