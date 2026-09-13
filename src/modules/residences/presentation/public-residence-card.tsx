import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Users } from "lucide-react";
import { formatPrix } from "@/shared/format";
import type { PublicResidenceDTO } from "@/modules/residences/contracts";
import { Badge } from "@/components/ui/badge";

export function PublicResidenceCard({
  residence,
  eager = false,
}: {
  residence: PublicResidenceDTO;
  eager?: boolean;
}) {
  const cover = residence.photos[0];
  const href = residence.discoveryToken
    ? `/api/v1/public/discovery/open?token=${encodeURIComponent(residence.discoveryToken)}`
    : `/residences/${residence.slug}`;
  return (
    <article className="overflow-hidden rounded-xl border bg-white">
      <Link href={href} prefetch={false} className="group block">
        <div className="relative aspect-[4/3] bg-slate-100">
          {residence.placement === "promoted" ? (
            <Badge className="absolute left-3 top-3 z-10 bg-slate-950 text-white hover:bg-slate-950">
              Mis en avant
            </Badge>
          ) : null}
          {residence.partnerBadgeEnabled ? (
            <Badge className="absolute right-3 top-3 z-10 bg-emerald-700 text-white hover:bg-emerald-700">
              Partenaire Toutci
            </Badge>
          ) : null}
          {cover ? (
            <Image
              src={cover.url}
              alt={cover.altText ?? residence.title}
              fill
              loading={eager ? "eager" : "lazy"}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              unoptimized
            />
          ) : null}
        </div>
        <div className="space-y-3 p-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 group-hover:text-emerald-800">
              {residence.title}
            </h2>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{residence.city}</span>
              <span className="inline-flex items-center gap-1.5"><Users className="size-4" />Jusqu’à {residence.maxGuests}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t pt-3">
            <p className="font-semibold text-emerald-800">
              {formatPrix(residence.pricePerNightFcfa)} <span className="text-sm font-normal text-slate-500">/ nuit</span>
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-700">
              Découvrir <ArrowRight className="size-4" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
