"use client";

import Link from "next/link";
import { CalendarDays, Phone, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/motion/tabs";
import { ResidenceCalendarManager } from "@/components/partner/residence-calendar-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrix } from "@/lib/utils/format";
import type {
  ResidenceAvailabilityDTO,
  ResidenceReservationDTO,
  ResidenceUnavailablePeriodDTO,
} from "@/modules/residences/contracts";
import { getResidenceReservationStatusLabel } from "@/modules/residences/presentation";

type ResidenceCalendarEntry = {
  residence: { id: string; title: string };
  periods: ResidenceUnavailablePeriodDTO[];
  unavailable: ResidenceAvailabilityDTO["unavailable"];
};

function formatStayDate(value: string) {
  return new Intl.DateTimeFormat("fr-CI", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));
}

function ReservationStatusBadge({
  reservation,
}: {
  reservation: ResidenceReservationDTO;
}) {
  return (
    <Badge variant={reservation.status === "annulee" ? "destructive" : "secondary"}>
      {getResidenceReservationStatusLabel(reservation.status)}
    </Badge>
  );
}

function ReservationsPanel({
  reservations,
}: {
  reservations: ResidenceReservationDTO[];
}) {
  if (reservations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card p-10 text-center">
        <CalendarDays className="mx-auto size-8 text-primary" />
        <h3 className="mt-3 font-medium">Aucune réservation reçue</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Les nouveaux séjours apparaîtront ici après le démarrage de leur paiement.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Résidence</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Séjour</TableHead>
              <TableHead>Voyageurs</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.map((reservation) => (
              <TableRow key={reservation.id}>
                <TableCell className="font-medium">{reservation.residenceTitle}</TableCell>
                <TableCell>
                  <span className="block font-medium">{reservation.clientName}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="size-3" /> {reservation.clientPhone}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatStayDate(reservation.checkIn)} → {formatStayDate(reservation.checkOut)}
                </TableCell>
                <TableCell>{reservation.guests}</TableCell>
                <TableCell><ReservationStatusBadge reservation={reservation} /></TableCell>
                <TableCell className="text-right font-semibold text-emerald-800">
                  {formatPrix(reservation.totalFcfa)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 md:hidden">
        {reservations.map((reservation) => (
          <Card key={reservation.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{reservation.residenceTitle}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{reservation.clientName}</p>
                </div>
                <ReservationStatusBadge reservation={reservation} />
              </div>
              <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" />
                  {formatStayDate(reservation.checkIn)} → {formatStayDate(reservation.checkOut)}
                </p>
                <p className="flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  {reservation.guests} voyageur{reservation.guests > 1 ? "s" : ""}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="size-4 text-primary" /> {reservation.clientPhone}
                </p>
              </div>
              <p className="mt-4 font-semibold text-emerald-800">
                {formatPrix(reservation.totalFcfa)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

export function PartnerReservationsWorkspace({
  reservations,
  calendars,
}: {
  reservations: ResidenceReservationDTO[];
  calendars: ResidenceCalendarEntry[];
}) {
  const [selectedResidenceId, setSelectedResidenceId] = useState(
    calendars[0]?.residence.id ?? "",
  );
  const selectedCalendar = useMemo(
    () =>
      calendars.find(({ residence }) => residence.id === selectedResidenceId) ??
      calendars[0],
    [calendars, selectedResidenceId],
  );

  return (
    <Tabs defaultValue="reservations" variant="underline" className="w-full">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="reservations" indicatorClassName="bg-primary">
          Réservations
          <Badge variant="secondary" className="ml-1.5">{reservations.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="calendar" indicatorClassName="bg-primary">
          Calendrier
        </TabsTrigger>
      </TabsList>

      <TabsContent value="reservations" className="mt-6 outline-none">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Réservations reçues</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Consultez les voyageurs, les dates, le paiement et le montant du séjour.
          </p>
        </div>
        <ReservationsPanel reservations={reservations} />
      </TabsContent>

      <TabsContent value="calendar" className="mt-6 outline-none">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Indisponibilités manuelles</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Bloquez les périodes réservées à un usage personnel ou à des travaux.
            </p>
          </div>
          {calendars.length > 0 ? (
            <Select value={selectedCalendar?.residence.id} onValueChange={setSelectedResidenceId}>
              <SelectTrigger className="w-full sm:w-72" aria-label="Résidence à gérer">
                <SelectValue placeholder="Choisir une résidence" />
              </SelectTrigger>
              <SelectContent position="popper" align="end">
                {calendars.map(({ residence }) => (
                  <SelectItem key={residence.id} value={residence.id}>
                    {residence.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        {selectedCalendar ? (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">{selectedCalendar.residence.title}</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/partenaire/residences/${selectedCalendar.residence.id}`}>
                    Voir la fiche
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResidenceCalendarManager
                residenceId={selectedCalendar.residence.id}
                periods={selectedCalendar.periods}
                unavailable={selectedCalendar.unavailable}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border border-dashed bg-card p-10 text-center">
            <h3 className="font-medium">Aucune résidence à gérer</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Enregistrez une résidence avant de configurer son calendrier.
            </p>
            <Button asChild className="mt-4">
              <Link href="/partenaire/residences/nouvelle">Ajouter une résidence</Link>
            </Button>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
