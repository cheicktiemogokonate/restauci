"use client";

import { useState, useTransition } from "react";
import { CustomAvatar } from "@/components/shared/avatar-fallback";
import { assignCommandeDriver, updateDeliveryStatus } from "@/lib/actions/commandes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, MessageSquare, MoreHorizontal, Phone, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface AvailableDriver {
  id: string;
  name: string;
  vehicle: string | null;
  isOnline: boolean;
}

interface DriverInfoProps {
  commandeId: string;
  assigned: boolean;
  name: string;
  status: "en_ligne" | "hors_ligne" | "en_livraison";
  phone: string | null;
  vehicleType: string | null;
  vehicleNumber: string | null;
  avatar?: string | null;
  availableDrivers: AvailableDriver[];
  deliveryStatus: "en_attente" | "assignee" | "en_route" | "livree" | "echouee" | null;
  commandeStatus: "recue" | "en_preparation" | "prete" | "servie" | "annulee";
}

const statusConfig = {
  en_ligne: {
    label: "En ligne",
    className: "bg-[#2d7d46]",
  },
  hors_ligne: {
    label: "Hors ligne",
    className: "bg-gray-400",
  },
  en_livraison: {
    label: "En livraison",
    className: "bg-amber-500",
  },
};

export function DriverInfo({
  commandeId,
  assigned,
  name,
  status,
  phone,
  vehicleType,
  vehicleNumber,
  avatar,
  availableDrivers,
  deliveryStatus,
  commandeStatus,
}: DriverInfoProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [isPending, startTransition] = useTransition();
  const statusInfo = statusConfig[status];
  const canCall = assigned && Boolean(phone);

  const handleAssign = () => {
    if (!selectedDriverId) return;
    startTransition(async () => {
      try {
        await assignCommandeDriver(commandeId, selectedDriverId);
        toast.success("Livreur assigné à la commande.");
        setIsDialogOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Le livreur n'a pas pu être assigné.",
        );
      }
    });
  };
  const handleDeliveryStatus = (nextStatus: "en_route" | "livree") => {
    startTransition(async () => {
      try {
        await updateDeliveryStatus(commandeId, nextStatus);
        toast.success(
          nextStatus === "en_route"
            ? "Le livreur est en route."
            : "La commande est marquée comme livrée.",
        );
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "La livraison n’a pas pu être mise à jour.",
        );
      }
    });
  };

  return (
    <Card className="border border-border/60 shadow-sm rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-4 pt-6">
        <CardTitle className="text-[16px] font-bold">Livreur</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-13 w-13 rounded-full overflow-hidden border border-border/50 shrink-0">
              {assigned ? (
                <CustomAvatar
                  src={avatar}
                  alt={name}
                  fallbackText={name}
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                  <Truck className="h-5 w-5" />
                </div>
              )}
            </div>
            <div>
              <p className="font-bold text-[15px]">{name}</p>
              {assigned ? (
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${statusInfo.className}`} />
                  <span className="text-[12px] font-medium text-[#2d7d46]">
                    {statusInfo.label}
                  </span>
                </div>
              ) : (
                <Badge variant="secondary" className="mt-1 text-[11px] font-medium">
                  En attente d&apos;assignation
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-border/80 text-muted-foreground hover:text-foreground"
              disabled
              title="La messagerie livreur sera disponible prochainement."
            >
              <MessageSquare className="h-4.5 w-4.5" />
            </Button>
            <Button
              asChild={canCall}
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-border/80 text-muted-foreground hover:text-foreground"
              disabled={!canCall}
            >
              {canCall ? (
                <a href={`tel:${phone!.replace(/\s/g, "")}`} aria-label={`Appeler ${name}`}>
                  <Phone className="h-4.5 w-4.5" />
                </a>
              ) : (
                <Phone className="h-4.5 w-4.5" />
              )}
            </Button>
          </div>
        </div>

        {assigned ? (
        <>
        <div className="grid grid-cols-3 gap-4 border-t border-border/60 pt-4">
          <div>
            <p className="text-[12px] text-muted-foreground mb-1">Téléphone</p>
            <p className="text-[14px] font-semibold">{phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-[12px] text-muted-foreground mb-1">
              Type de véhicule
            </p>
            <p className="text-[14px] font-semibold">{vehicleType ?? "—"}</p>
          </div>
          <div>
            <p className="text-[12px] text-muted-foreground mb-1">
              Numéro de véhicule
            </p>
            <p className="text-[14px] font-semibold">{vehicleNumber ?? "—"}</p>
          </div>
        </div>
        {commandeStatus === "prete" && deliveryStatus === "assignee" ? (
          <Button className="w-full" size="lg" disabled={isPending} onClick={() => handleDeliveryStatus("en_route")}>
            <Truck className="h-4 w-4" />
            {isPending ? "Mise à jour…" : "Démarrer la livraison"}
          </Button>
        ) : null}
        {commandeStatus === "prete" && deliveryStatus === "en_route" ? (
          <Button className="w-full" size="lg" disabled={isPending} onClick={() => handleDeliveryStatus("livree")}>
            <CheckCircle2 className="h-4 w-4" />
            {isPending ? "Mise à jour…" : "Confirmer la livraison"}
          </Button>
        ) : null}
        </>
        ) : (
          <div className="space-y-3 border-t border-border/60 pt-4">
            <p className="text-sm text-muted-foreground">
              Les coordonnées du livreur apparaîtront ici dès son assignation.
            </p>
            <Button
              size="lg"
              className="w-full"
              onClick={() => setIsDialogOpen(true)}
              disabled={availableDrivers.length === 0}
            >
              <Truck className="h-4 w-4" />
              {availableDrivers.length > 0
                ? "Assigner un livreur"
                : "Aucun livreur actif"}
            </Button>
          </div>
        )}
      </CardContent>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner un livreur</DialogTitle>
            <DialogDescription>
              Sélectionnez le livreur qui prendra en charge cette livraison.
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Choisir un livreur" />
            </SelectTrigger>
            <SelectContent>
              {availableDrivers.map((driver) => (
                <SelectItem key={driver.id} value={driver.id}>
                  {driver.name}
                  {driver.vehicle ? ` · ${driver.vehicle}` : ""}
                  {driver.isOnline ? " · En ligne" : " · Hors ligne"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              size="lg"
              onClick={handleAssign}
              disabled={!selectedDriverId || isPending}
            >
              <CheckCircle2 className="h-4 w-4" />
              {isPending ? "Assignation…" : "Assigner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
