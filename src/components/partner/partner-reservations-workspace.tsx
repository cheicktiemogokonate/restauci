"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  LoaderCircle,
  Pencil,
  Phone,
  TriangleAlert,
  Users,
  XCircle,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  cancelPartnerResidenceReservationAction,
  updatePartnerResidenceReservationAction,
} from "@/app/(dashboard)/partenaire/reservations/actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/motion/tabs";
import { ResidenceCalendarManager } from "@/components/partner/residence-calendar-manager";
import { ResidenceDateRangePicker } from "@/components/residences/residence-date-range-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
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

function ReservationActions({
  reservation,
  unavailable,
}: {
  reservation: ResidenceReservationDTO;
  unavailable: ResidenceAvailabilityDTO["unavailable"];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [checkIn, setCheckIn] = useState(reservation.checkIn);
  const [checkOut, setCheckOut] = useState(reservation.checkOut);
  const [guests, setGuests] = useState(String(reservation.guests));
  const [reason, setReason] = useState("");
  const [refundAcknowledged, setRefundAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isFutureActive =
    reservation.status !== "annulee" && reservation.temporalStatus === "a_venir";
  const isPaid = reservation.paymentStatus === "confirmed";
  const canEdit = isFutureActive && !isPaid;
  const canCancel = isFutureActive;
  const selectablePeriods = unavailable.filter(
    (period) =>
      !(
        period.source === "reservation" &&
        period.checkIn === reservation.checkIn &&
        period.checkOut === reservation.checkOut
      ),
  );
  const minimumDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Abidjan",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const changeEditOpen = (open: boolean) => {
    setEditOpen(open);
    setError(null);
    if (open) {
      setCheckIn(reservation.checkIn);
      setCheckOut(reservation.checkOut);
      setGuests(String(reservation.guests));
    }
  };

  const changeCancelOpen = (open: boolean) => {
    setCancelOpen(open);
    setError(null);
    if (!open) {
      setReason("");
      setRefundAcknowledged(false);
    }
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await updatePartnerResidenceReservationAction({
        reservationId: reservation.id,
        checkIn,
        checkOut,
        guests: Number(guests),
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      toast.success(result.message);
      setEditOpen(false);
      router.refresh();
    });
  };

  const cancel = () => {
    setError(null);
    startTransition(async () => {
      const result = await cancelPartnerResidenceReservationAction({
        reservationId: reservation.id,
        reason,
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      if (result.requiresManualRefund) toast.warning(result.message);
      else toast.success(result.message);
      setCancelOpen(false);
      router.refresh();
    });
  };

  if (!canEdit && !canCancel) {
    return reservation.cancellationReason ? (
      <p className="max-w-56 text-xs leading-5 text-muted-foreground">
        Motif : {reservation.cancellationReason}
      </p>
    ) : (
      <span className="text-xs text-muted-foreground">Aucune action</span>
    );
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {canEdit ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => changeEditOpen(true)}
        >
          <Pencil /> Modifier
        </Button>
      ) : null}
      {canCancel ? (
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={() => changeCancelOpen(true)}
        >
          <XCircle /> Annuler
        </Button>
      ) : null}

      <Dialog open={editOpen} onOpenChange={changeEditOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Modifier la réservation</DialogTitle>
            <DialogDescription>
              Le séjour doit conserver sa durée de {reservation.nights} nuit
              {reservation.nights > 1 ? "s" : ""} et son montant de {formatPrix(reservation.totalFcfa)}.
              Une réservation payée ne peut plus être modifiée.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <ResidenceDateRangePicker
              checkIn={checkIn}
              checkOut={checkOut}
              minimumDate={minimumDate}
              unavailable={selectablePeriods}
              onChange={(range) => {
                setCheckIn(range.checkIn);
                setCheckOut(range.checkOut);
                setError(null);
              }}
            />
            <div className="space-y-2">
              <Label htmlFor={`reservation-guests-${reservation.id}`}>
                Nombre de voyageurs
              </Label>
              <Input
                id={`reservation-guests-${reservation.id}`}
                type="number"
                inputMode="numeric"
                min={1}
                max={reservation.residenceMaxGuests}
                value={guests}
                onChange={(event) => {
                  setGuests(event.target.value);
                  setError(null);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Capacité maximale : {reservation.residenceMaxGuests} voyageur
                {reservation.residenceMaxGuests > 1 ? "s" : ""}.
              </p>
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => changeEditOpen(false)}>
              Fermer
            </Button>
            <Button
              type="button"
              disabled={
                pending ||
                !checkIn ||
                !checkOut ||
                !Number.isInteger(Number(guests)) ||
                Number(guests) < 1
              }
              onClick={save}
            >
              {pending ? <LoaderCircle className="animate-spin" /> : <Pencil />}
              {pending ? "Enregistrement…" : "Enregistrer et informer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelOpen} onOpenChange={changeCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette réservation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les dates seront immédiatement libérées et le client sera informé du motif.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            {isPaid ? (
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertTitle>Paiement déjà encaissé</AlertTitle>
                <AlertDescription>
                  Cette action n’effectue aucun remboursement automatique. Le remboursement
                  devra être traité avec le support.
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor={`reservation-cancel-reason-${reservation.id}`}>
                Motif communiqué au client
              </Label>
              <Textarea
                id={`reservation-cancel-reason-${reservation.id}`}
                value={reason}
                minLength={10}
                maxLength={500}
                placeholder="Expliquez clairement pourquoi le séjour doit être annulé."
                onChange={(event) => {
                  setReason(event.target.value);
                  setError(null);
                }}
              />
              <p className="text-xs text-muted-foreground">10 caractères minimum.</p>
            </div>
            {isPaid ? (
              <div className="flex items-start gap-2">
                <Checkbox
                  id={`reservation-refund-${reservation.id}`}
                  checked={refundAcknowledged}
                  onCheckedChange={(checked) => setRefundAcknowledged(checked === true)}
                />
                <Label
                  htmlFor={`reservation-refund-${reservation.id}`}
                  className="font-normal leading-5"
                >
                  Je comprends que le remboursement doit être traité séparément.
                </Label>
              </div>
            ) : null}
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Conserver la réservation</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending || reason.trim().length < 10 || (isPaid && !refundAcknowledged)}
              onClick={(event) => {
                event.preventDefault();
                cancel();
              }}
            >
              {pending ? <LoaderCircle className="animate-spin" /> : <XCircle />}
              {pending ? "Annulation…" : "Annuler et informer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ReservationsPanel({
  reservations,
  calendars,
}: {
  reservations: ResidenceReservationDTO[];
  calendars: ResidenceCalendarEntry[];
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.map((reservation) => {
              const unavailable =
                calendars.find(
                  ({ residence }) => residence.id === reservation.residenceId,
                )?.unavailable ?? [];
              return (
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
                <TableCell className="text-right">
                  <ReservationActions
                    reservation={reservation}
                    unavailable={unavailable}
                  />
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 md:hidden">
        {reservations.map((reservation) => {
          const unavailable =
            calendars.find(
              ({ residence }) => residence.id === reservation.residenceId,
            )?.unavailable ?? [];
          return (
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
              <div className="mt-4 border-t pt-4">
                <ReservationActions
                  reservation={reservation}
                  unavailable={unavailable}
                />
              </div>
            </CardContent>
          </Card>
          );
        })}
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
        <ReservationsPanel reservations={reservations} calendars={calendars} />
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
