"use client";

import { useTransition } from "react";
import { EyeOff, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  publishResidenceAction,
  withdrawResidenceAction,
} from "@/app/(dashboard)/partenaire/residences/actions";
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
import { Button } from "@/components/ui/button";

export function ResidencePublicationControls({
  residenceId,
  publicationEnabled,
  canPublish,
}: {
  residenceId: string;
  publicationEnabled: boolean;
  canPublish: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function publish() {
    startTransition(async () => {
      const result = await publishResidenceAction(residenceId);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function withdraw() {
    startTransition(async () => {
      const result = await withdrawResidenceAction(residenceId);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  if (!publicationEnabled) {
    return canPublish ? (
      <Button size="sm" onClick={publish} disabled={isPending}>
        {isPending ? <Loader2 className="animate-spin" /> : <Send />}
        Publier la résidence
      </Button>
    ) : null;
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : <EyeOff />}
          Retirer du catalogue
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retirer cette résidence ?</AlertDialogTitle>
          <AlertDialogDescription>
            Elle ne sera plus visible par les voyageurs. Sa fiche et son
            historique resteront enregistrés, et vous pourrez la republier
            plus tard.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={withdraw}>
            Retirer du catalogue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
