"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BedDouble, CalendarDays, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { clientApi } from "@/lib/client-app/api-client";
import { useAuthStore } from "@/lib/client-app/stores/auth-store";
import { formatPrix } from "@/lib/utils/format";
import type { ResidenceReservationDTO } from "@/modules/residences/contracts";
import { getResidenceReservationStatusLabel } from "@/modules/residences/presentation";

function formatStayDate(value: string) {
  return new Intl.DateTimeFormat("fr-CI", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00Z`));
}

export default function ClientReservationsPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [reservations, setReservations] = useState<ResidenceReservationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/client/login?redirect=%2Freservations");
      return;
    }
    void clientApi.get<ResidenceReservationDTO[]>("/reservations").then((result) => {
      if (result.success && result.data) setReservations(result.data);
      else setError(result.error ?? "Impossible de charger vos séjours.");
      setLoading(false);
    });
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;
  return (
    <main className="min-h-dvh bg-slate-50 pb-10">
      <header className="border-b bg-white px-4 py-5">
        <div className="mx-auto flex max-w-3xl items-start gap-3">
          <Button asChild variant="ghost" size="icon"><Link href="/residences" aria-label="Retour aux résidences"><ArrowLeft /></Link></Button>
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Vos voyages</p><h1 className="mt-1 text-2xl font-semibold">Mes séjours</h1><p className="mt-1 text-sm text-slate-600">Retrouvez vos réservations et reprenez un paiement interrompu.</p></div>
        </div>
      </header>
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-6">
        {loading ? Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />) : null}
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
        {!loading && !error && reservations.length === 0 ? (
          <section className="rounded-2xl border border-dashed bg-white px-6 py-14 text-center"><BedDouble className="mx-auto size-10 text-emerald-700" /><h2 className="mt-4 font-semibold">Aucun séjour pour le moment</h2><p className="mt-2 text-sm text-slate-600">Votre première réservation apparaîtra ici.</p><Button asChild className="mt-5"><Link href="/residences">Découvrir les résidences</Link></Button></section>
        ) : null}
        {reservations.map((reservation) => (
          <Link key={reservation.id} href={`/reservations/${reservation.id}`} className="group flex gap-4 rounded-2xl border bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm">
            <div className="relative hidden h-28 w-36 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:block">{reservation.residenceCoverUrl ? <Image src={reservation.residenceCoverUrl} alt="" fill sizes="144px" className="object-cover" unoptimized /> : <BedDouble className="absolute inset-0 m-auto size-8 text-slate-400" />}</div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-950">{reservation.residenceTitle}</h2><Badge variant={reservation.status === "annulee" ? "destructive" : "secondary"}>{getResidenceReservationStatusLabel(reservation.status)}</Badge></div><p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="size-3.5" />{reservation.residenceCity}</p><p className="mt-3 flex items-center gap-2 text-sm text-slate-700"><CalendarDays className="size-4 text-emerald-700" />{formatStayDate(reservation.checkIn)} → {formatStayDate(reservation.checkOut)}</p><div className="mt-2 flex items-center justify-between"><span className="text-sm font-semibold text-emerald-800">{formatPrix(reservation.totalFcfa)}</span><ArrowRight className="size-4 text-slate-400 transition group-hover:translate-x-1" /></div></div>
          </Link>
        ))}
      </div>
    </main>
  );
}
