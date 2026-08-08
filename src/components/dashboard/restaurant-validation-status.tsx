"use client";

import { Button } from "@/components/ui/button";
import { resoumettreRestaurantAction } from "@/lib/actions/restaurant";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  PencilLine,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

interface RestaurantValidationStatusProps {
  actif: boolean;
  suspendu: boolean;
  motifRejet: string | null;
  motifSuspension?: string | null;
}

export function RestaurantValidationStatus({
  actif,
  suspendu,
  motifRejet,
  motifSuspension,
}: RestaurantValidationStatusProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const resubmit = () => {
    startTransition(async () => {
      const result = await resoumettreRestaurantAction();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Votre dossier a été renvoyé pour validation.");
      router.refresh();
    });
  };

  if (suspendu) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-950 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-red-700" />
          <div>
            <p className="font-semibold">Restaurant suspendu</p>
            <p className="mt-1 text-sm text-red-800">
              {motifSuspension || "Votre activité est temporairement suspendue. Contactez l’assistance pour obtenir plus d’informations."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (actif) {
    return (
      <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />
        <div>
          <p className="font-semibold">Restaurant validé</p>
          <p className="mt-1 text-sm text-emerald-800">
            Votre établissement est approuvé. Finalisez votre menu et vos horaires avant de le mettre en ligne.
          </p>
        </div>
      </div>
    );
  }

  if (motifRejet) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Votre dossier nécessite des corrections</p>
            <p className="mt-1 text-sm text-amber-900">
              <span className="font-medium">Motif :</span> {motifRejet}
            </p>
            <p className="mt-2 text-sm text-amber-800">
              Corrigez les informations concernées, enregistrez-les, puis renvoyez le dossier à l’équipe de validation.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button asChild variant="outline" className="border-amber-300 bg-white">
            <Link href="/restaurateur/profil">
              <PencilLine className="size-4" />
              Corriger mon dossier
            </Link>
          </Button>
          <Button onClick={resubmit} disabled={isPending}>
            <RotateCcw className={isPending ? "size-4 animate-spin" : "size-4"} />
            {isPending ? "Envoi en cours…" : "Renvoyer pour validation"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-950">
      <Clock3 className="mt-0.5 size-5 shrink-0 text-blue-700" />
      <div>
        <p className="font-semibold">En attente de validation</p>
        <p className="mt-1 text-sm text-blue-800">
          Votre dossier a bien été transmis. Vous recevrez une notification dès que l’équipe aura pris une décision.
        </p>
      </div>
    </div>
  );
}
