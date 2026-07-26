import { CustomAvatar } from "@/components/shared/avatar-fallback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Armchair,
  Mail,
  MapPin,
  MoreHorizontal,
  PackageCheck,
  Phone,
} from "lucide-react";

interface ClientInfoProps {
  name: string;
  status: string;
  phone: string;
  email: string;
  address: string;
  modeCommande: "sur_place" | "emporter" | "livraison";
  tableNumber?: string | null;
  avatar?: string | null;
}

export function ClientInfo({
  name,
  status,
  phone,
  email,
  address,
  modeCommande,
  tableNumber,
  avatar,
}: ClientInfoProps) {
  const canCall = phone !== "—";
  const serviceInfo =
    modeCommande === "sur_place"
      ? {
          icon: Armchair,
          label: "Service à table",
          value: tableNumber ? `Table ${tableNumber}` : "Table non renseignée",
        }
      : modeCommande === "emporter"
        ? {
            icon: PackageCheck,
            label: "Retrait",
            value: "À retirer au comptoir",
          }
        : {
            icon: MapPin,
            label: "Adresse de livraison",
            value: address,
          };
  const ServiceIcon = serviceInfo.icon;

  return (
    <Card className="border border-border/60 shadow-sm rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-4 pt-6">
        <CardTitle className="text-[16px] font-bold">Client</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative h-13 w-13 rounded-full overflow-hidden border border-border/50 shrink-0">
            <CustomAvatar
              src={avatar}
              alt={name}
              fallbackText={name}
              className="h-full w-full"
            />
          </div>
          <div>
            <p className="font-bold text-[15px]">{name}</p>
            <Badge
              variant="secondary"
              className="bg-[#e2f5e9] text-[#2d7d46] hover:bg-[#e2f5e9] font-medium text-[12px] px-2 py-0.5 mt-1 rounded-md"
            >
              {status}
            </Badge>
          </div>
        </div>

        <div className="space-y-3.5 text-[14px]">
          <div className="rounded-xl border border-brand-green/15 bg-brand-green/5 px-3.5 py-3">
            <div className="flex items-start gap-3">
              <ServiceIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {serviceInfo.label}
                </p>
                <p className="mt-0.5 font-semibold text-foreground">
                  {serviceInfo.value}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3.5 text-muted-foreground">
            <Phone className="h-4 w-4 shrink-0" />
            <span className="text-foreground">{phone}</span>
          </div>
          <div className="flex items-center gap-3.5 text-muted-foreground">
            <Mail className="h-4 w-4 shrink-0" />
            <span className="text-foreground">{email}</span>
          </div>
          {modeCommande !== "livraison" && (
          <div className="flex items-start gap-3.5 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="text-foreground">{address}</span>
          </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            disabled
            title="La messagerie client sera disponible prochainement."
          >
            Messagerie bientôt disponible
          </Button>
          <Button
            asChild={canCall}
            disabled={!canCall}
            size="lg"
            className="flex-1"
          >
            {canCall ? <a href={`tel:${phone.replace(/\s/g, "")}`}>Appeler</a> : <span>Appeler</span>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
