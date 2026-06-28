import { CustomAvatar } from "@/components/shared/avatar-fallback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, MoreHorizontal, Phone } from "lucide-react";

interface DriverInfoProps {
  name: string;
  status: "en_ligne" | "hors_ligne" | "en_livraison";
  phone: string;
  vehicleType: string;
  vehicleNumber: string;
  avatar?: string | null;
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
  name,
  status,
  phone,
  vehicleType,
  vehicleNumber,
  avatar,
}: DriverInfoProps) {
  const statusInfo = statusConfig[status];

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
              <CustomAvatar
                src={avatar}
                alt={name}
                fallbackText={name}
                className="h-full w-full"
              />
            </div>
            <div>
              <p className="font-bold text-[15px]">{name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`h-2 w-2 rounded-full ${statusInfo.className}`}
                />
                <span className="text-[12px] text-[#2d7d46] font-medium">
                  {statusInfo.label}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-border/80 text-muted-foreground hover:text-foreground"
            >
              <MessageSquare className="h-4.5 w-4.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-border/80 text-muted-foreground hover:text-foreground"
            >
              <Phone className="h-4.5 w-4.5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/60">
          <div>
            <p className="text-[12px] text-muted-foreground mb-1">Téléphone</p>
            <p className="text-[14px] font-semibold">{phone}</p>
          </div>
          <div>
            <p className="text-[12px] text-muted-foreground mb-1">
              Type de véhicule
            </p>
            <p className="text-[14px] font-semibold">{vehicleType}</p>
          </div>
          <div>
            <p className="text-[12px] text-muted-foreground mb-1">
              Numéro de véhicule
            </p>
            <p className="text-[14px] font-semibold">{vehicleNumber}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
