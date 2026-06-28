"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deletePlatAction } from "@/lib/actions/menu";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface DeletePlatDialogProps {
  platId: string;
  platNom: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectTo?: string;
}

export default function DeletePlatDialog({
  platId,
  platNom,
  open,
  onOpenChange,
  redirectTo,
}: DeletePlatDialogProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    const result = await deletePlatAction(platId);

    if (result?.error) {
      setError(result.error);
      setIsDeleting(false);
      return;
    }

    onOpenChange(false);
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
    setIsDeleting(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogTitle>Supprimer ce plat ?</AlertDialogTitle>
        <AlertDialogDescription>
          « {platNom} » sera définitivement retiré de votre carte. Cette action
          est irréversible.
        </AlertDialogDescription>

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Supprimer
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
