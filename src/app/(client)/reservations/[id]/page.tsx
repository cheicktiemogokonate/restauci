"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AlertCircle, ArrowLeft, CalendarDays, CheckCircle2, MapPin, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { clientApi } from "@/lib/client-app/api-client";
import { useAuthStore } from "@/lib/client-app/stores/auth-store";
import { formatPrix } from "@/lib/utils/format";
import type { ResidenceReservationDTO } from "@/modules/residences/contracts";
import { getResidenceReservationStatusLabel } from "@/modules/residences/presentation";

function formatStayDate(value: string) {
  return new Intl.DateTimeFormat("fr-CI", { weekday: "short", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00Z`));
}

export default function ClientReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [reservation, setReservation] = useState<ResidenceReservationDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const refreshReservation = async () => {
    const result = await clientApi.get<ResidenceReservationDTO>(`/reservations/${id}`);
    if (result.success && result.data) setReservation(result.data);
    else setError(result.error ?? "Réservation introuvable.");
    setLoading(false);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(`/client/login?redirect=${encodeURIComponent(`/reservations/${id}`)}`);
      return;
    }
    let cancelled = false;
    void clientApi.get<ResidenceReservationDTO>(`/reservations/${id}`).then((result) => {
      if (cancelled) return;
      if (result.success && result.data) setReservation(result.data);
      else setError(result.error ?? "Réservation introuvable.");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id, isAuthenticated, router]);

  if (!isAuthenticated) return null;
  if (loading) return <main className="mx-auto max-w-2xl space-y-4 p-4"><Skeleton className="h-12" /><Skeleton className="h-60 rounded-2xl" /><Skeleton className="h-40 rounded-2xl" /></main>;
  if (!reservation) return <main className="flex min-h-dvh items-center justify-center p-4"><div className="text-center"><AlertCircle className="mx-auto size-9 text-red-600" /><h1 className="mt-3 font-semibold">Réservation introuvable</h1><p className="mt-1 text-sm text-slate-600">{error}</p><Button className="mt-5" onClick={() => router.push("/reservations")}>Retour à mes séjours</Button></div></main>;

  const resumePayment = () => startTransition(async () => {
    setError(null);
    if (reservation.checkoutUrl && reservation.paymentStatus === "pending") {
      window.location.assign(reservation.checkoutUrl);
      return;
    }
    const result = await clientApi.post<{ authorizationUrl: string }>(`/reservations/${id}/payment`, { method: reservation.paymentMethod });
    if (result.data?.authorizationUrl) window.location.assign(result.data.authorizationUrl);
    else setError(result.error ?? "Impossible de reprendre le paiement.");
  });
  const cancel = () => startTransition(async () => {
    setError(null);
    const result = await clientApi.post(`/reservations/${id}/cancel`);
    if (!result.success) setError(result.error ?? "Impossible d’annuler cette réservation.");
    else await refreshReservation();
  });

  return (
    <main className="min-h-dvh bg-slate-50 pb-10">
      <header className="sticky top-0 z-20 border-b bg-white/95 px-4 py-3 backdrop-blur"><div className="mx-auto flex max-w-2xl items-center gap-3"><Button type="button" variant="ghost" size="icon" onClick={() => router.push("/reservations")}><ArrowLeft /></Button><div className="min-w-0"><h1 className="truncate font-semibold">{reservation.residenceTitle}</h1><p className="text-xs text-slate-500">Réservation {reservation.id.slice(0, 8)}</p></div></div></header>
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        {reservation.residenceCoverUrl ? <div className="relative aspect-[16/8] overflow-hidden rounded-2xl bg-slate-100"><Image src={reservation.residenceCoverUrl} alt={reservation.residenceTitle} fill sizes="672px" className="object-cover" unoptimized /></div> : null}
        <section className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><Badge variant={reservation.status === "annulee" ? "destructive" : "secondary"}>{getResidenceReservationStatusLabel(reservation.status)}</Badge><h2 className="mt-3 text-xl font-semibold">{reservation.residenceTitle}</h2><p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="size-4" />{reservation.residenceCity}</p></div>{reservation.status === "confirmee" ? <CheckCircle2 className="size-8 text-emerald-600" /> : null}</div><Separator className="my-5" /><div className="grid gap-4 sm:grid-cols-2"><div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Arrivée</p><p className="mt-1 flex gap-2 text-sm font-semibold"><CalendarDays className="size-4 text-emerald-700" />{formatStayDate(reservation.checkIn)}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Départ</p><p className="mt-1 flex gap-2 text-sm font-semibold"><CalendarDays className="size-4 text-emerald-700" />{formatStayDate(reservation.checkOut)}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Voyageurs</p><p className="mt-1 flex gap-2 text-sm font-semibold"><Users className="size-4 text-emerald-700" />{reservation.guests}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total</p><p className="mt-1 font-semibold text-emerald-800">{formatPrix(reservation.totalFcfa)}</p></div></div></section>
        {error ? <Alert variant="destructive"><AlertCircle /><AlertTitle>Action impossible</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        {reservation.status === "en_attente_paiement" ? <section className="space-y-3 rounded-2xl border bg-white p-5"><h2 className="font-semibold">Finaliser la réservation</h2><p className="text-sm leading-6 text-slate-600">Les dates restent réservées pendant que votre paiement est en attente.</p><Button className="w-full" disabled={pending} onClick={resumePayment}>{pending ? "Traitement…" : "Reprendre le paiement Paystack"}</Button><Button variant="outline" className="w-full text-red-700" disabled={pending} onClick={cancel}>Annuler et libérer les dates</Button></section> : reservation.status === "confirmee" && reservation.temporalStatus === "a_venir" ? <Button variant="outline" className="w-full text-red-700" disabled={pending} onClick={cancel}>{pending ? "Traitement…" : "Annuler le séjour"}</Button> : null}
      </div>
    </main>
  );
}
