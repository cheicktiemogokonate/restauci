import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ChevronLeft, ChevronRight, SearchX } from "lucide-react";

import { PublicResidenceCard } from "@/modules/residences/presentation/public-residence-card";
import { PublicResidenceHeader } from "@/modules/residences/presentation/public-residence-header";
import { PublicResidenceSearch } from "@/modules/residences/presentation/public-residence-search";
import { Button } from "@/components/ui/button";
import { publicResidenceSearchSchema } from "@/modules/residences/contracts";
import { getTodayInAbidjan } from "@/modules/residences/model";
import { searchPublicResidences } from "@/modules/discovery/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Résidences et logements",
  description:
    "Découvrez les résidences vérifiées disponibles sur Toutci en Côte d’Ivoire.",
  alternates: { canonical: "/residences" },
};

type SearchParams = {
  destination?: string | string[];
  checkIn?: string | string[];
  checkOut?: string | string[];
  guests?: string | string[];
  page?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PublicResidencesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;
  const parsed = publicResidenceSearchSchema.safeParse({
    destination: first(query.destination) || undefined,
    checkIn: first(query.checkIn) || undefined,
    checkOut: first(query.checkOut) || undefined,
    guests: first(query.guests) ? Number(first(query.guests)) : undefined,
    page: first(query.page) ? Number(first(query.page)) : 1,
    limit: 12,
  });
  const filters = parsed.success
    ? parsed.data
    : publicResidenceSearchSchema.parse({ page: 1, limit: 12 });
  const result = await searchPublicResidences(filters);
  const hasFilters = Boolean(
    filters.destination || filters.checkIn || filters.guests,
  );

  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    if (filters.destination) params.set("destination", filters.destination);
    if (filters.checkIn && filters.checkOut) {
      params.set("checkIn", filters.checkIn);
      params.set("checkOut", filters.checkOut);
    }
    if (filters.guests) params.set("guests", String(filters.guests));
    if (page > 1) params.set("page", String(page));
    return params.size > 0 ? `/residences?${params}` : "/residences";
  };

  return (
    <div className="min-h-dvh bg-slate-50">
      <PublicResidenceHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <section>
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-emerald-800">Séjours Toutci</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Choisissez votre prochaine destination
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Recherchez une ville, vos dates et le nombre de voyageurs. Votre position
              actuelle n’est pas utilisée pour limiter les destinations proposées.
            </p>
          </div>

          <PublicResidenceSearch
            initialDestination={filters.destination}
            initialCheckIn={filters.checkIn}
            initialCheckOut={filters.checkOut}
            initialGuests={filters.guests}
            minimumDate={getTodayInAbidjan()}
          />
        </section>

        {result.items.length > 0 ? (
          <>
            <div className="mt-9 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-950">
                  {result.total} logement{result.total > 1 ? "s" : ""} disponible{result.total > 1 ? "s" : ""}
                </p>
                {hasFilters ? (
                  <p className="mt-1 text-sm text-slate-600">
                    Résultats correspondant à votre séjour
                  </p>
                ) : null}
              </div>
              {result.totalPages > 1 ? (
                <p className="text-sm text-slate-500">
                  Page {result.page} sur {result.totalPages}
                </p>
              ) : null}
            </div>

            <section aria-label="Logements disponibles" className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((residence, index) => (
                <PublicResidenceCard
                  key={residence.id}
                  residence={residence}
                  eager={index < 3}
                />
              ))}
            </section>

            {result.totalPages > 1 ? (
              <nav aria-label="Pagination des résidences" className="mt-8 flex items-center justify-center gap-3">
                <Button asChild variant="outline" disabled={result.page <= 1}>
                  <Link href={pageHref(Math.max(1, result.page - 1))} aria-disabled={result.page <= 1}>
                    <ChevronLeft /> Précédente
                  </Link>
                </Button>
                <span className="text-sm font-medium text-slate-700">
                  {result.page} / {result.totalPages}
                </span>
                <Button asChild variant="outline" disabled={result.page >= result.totalPages}>
                  <Link href={pageHref(Math.min(result.totalPages, result.page + 1))} aria-disabled={result.page >= result.totalPages}>
                    Suivante <ChevronRight />
                  </Link>
                </Button>
              </nav>
            ) : null}
          </>
        ) : hasFilters ? (
          <section className="mt-10 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed bg-white px-6 py-10 text-center">
            <SearchX className="size-9 text-emerald-700" />
            <h2 className="mt-4 text-lg font-semibold text-slate-950">
              Aucun logement pour ce séjour
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
              Essayez une autre destination, modifiez les dates ou réduisez le nombre de voyageurs.
            </p>
            <Button asChild variant="outline" className="mt-5">
              <Link href="/residences">Effacer la recherche</Link>
            </Button>
          </section>
        ) : (
          <section className="mt-10 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed bg-white px-6 py-10 text-center">
            <Building2 className="size-9 text-emerald-700" />
            <h2 className="mt-4 text-lg font-semibold text-slate-950">
              Les premières résidences arrivent
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
              Les logements apparaîtront ici dès que leur fiche, leur propriétaire et leur destination auront été vérifiés.
            </p>
            <Button asChild variant="outline" className="mt-5">
              <Link href="/">Retour à l’accueil</Link>
            </Button>
          </section>
        )}
      </main>
    </div>
  );
}
