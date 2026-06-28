import { CustomAvatar } from "@/components/shared/avatar-fallback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MapPin, MoreHorizontal, Phone } from "lucide-react";

interface ClientInfoProps {
  name: string;
  status: string;
  phone: string;
  email: string;
  address: string;
  avatar?: string | null;
}

export function ClientInfo({
  name,
  status,
  phone,
  email,
  address,
  avatar,
}: ClientInfoProps) {
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
          <div className="flex items-center gap-3.5 text-muted-foreground">
            <Phone className="h-4 w-4 shrink-0" />
            <span className="text-foreground">{phone}</span>
          </div>
          <div className="flex items-center gap-3.5 text-muted-foreground">
            <Mail className="h-4 w-4 shrink-0" />
            <span className="text-foreground">{email}</span>
          </div>
          <div className="flex items-start gap-3.5 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="text-foreground">{address}</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 rounded-xl h-10 font-semibold border-border/80 text-foreground"
          >
            Envoyer un message
          </Button>
          <Button className="flex-1 rounded-xl h-10 font-semibold bg-[#2d7d46] hover:bg-[#2d7d46]/90 text-white">
            Appeler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
