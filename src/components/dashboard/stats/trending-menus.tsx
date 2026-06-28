import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrix } from "@/lib/utils/format";
import Image from "next/image";
import Link from "next/link";

interface PlatTop {
  id: string;
  nom: string;
  image?: string | null;
  photoUrl?: string | null;
  prix: number;
  categorie?: { nom: string } | null;
  nombreCommandes: number;
}

interface TrendingMenusProps {
  menus?: PlatTop[];
}

function MenuCard({ item, index }: { item: PlatTop; index: number }) {
  const badgeText =
    index === 0
      ? "1er"
      : index === 1
        ? "2ème"
        : index === 2
          ? "3ème"
          : `${index + 1}ème`;

  return (
    <div className="flex group relative overflow-hidden rounded-xl bg-card border border-border">
      <div className="relative aspect-4/3 w-32 overflow-hidden shrink-0 bg-muted">
        {item.photoUrl || item.image ? (
          <Image
            src={(item.photoUrl || item.image)!}
            alt={item.nom}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            Sans image
          </div>
        )}
        <Badge className="absolute left-2 top-2 bg-brand-green text-white px-1.5 py-0">
          {badgeText}
        </Badge>
      </div>
      <div className="p-3 flex-1 flex flex-col justify-center">
        <h3 className="font-semibold text-sm text-foreground line-clamp-1">
          {item.nom}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {item.categorie?.nom || "Non catégorisé"}
        </p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <ShoppingBagIcon className="h-3.5 w-3.5" />
            <span className="text-xs">{item.nombreCommandes} cmd.</span>
          </div>
          <span className="text-sm font-bold text-brand-green">
            {formatPrix(item.prix)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ShoppingBagIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

export function TrendingMenus({ menus = [] }: TrendingMenusProps) {
  const hasData = menus.length > 0;

  return (
    <Card className="col-span-full xl:col-span-1 h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base font-semibold">
          Plats les plus commandés
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">
        {!hasData ? (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg py-8">
            <p className="text-muted-foreground text-sm">
              Données insuffisantes
            </p>
          </div>
        ) : (
          <div className="grid gap-4 flex-1">
            {menus.map((item, i) => (
              <MenuCard key={item.id} item={item} index={i} />
            ))}
          </div>
        )}
        <Button asChild variant="outline" className="w-full text-xs mt-auto">
          <Link href="/restaurateur/menu">Voir le menu</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
