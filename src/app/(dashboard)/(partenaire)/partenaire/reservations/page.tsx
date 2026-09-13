import { PartnerReservationsWorkspace } from "@/modules/residences/presentation/partner-reservations-workspace";
import { requirePartnerActivity } from "@/modules/partners/server";
import {
  getPartnerResidenceAvailability,
  listPartnerResidenceReservations,
  listPartnerResidences,
  listPartnerResidenceUnavailablePeriods,
} from "@/modules/residences/server";
import {
  createResidenceUnavailablePeriodAction,
  deleteResidenceUnavailablePeriodAction,
} from "../residences/actions";
import {
  cancelPartnerResidenceReservationAction,
  updatePartnerResidenceReservationAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Réservations et calendrier | Toutci" };

export default async function PartnerReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ reservation?: string | string[] }>;
}) {
  const partner = await requirePartnerActivity("residence");
  const requestedReservation = (await searchParams).reservation;
  const [reservations, residences] = await Promise.all([
    listPartnerResidenceReservations(partner.id),
    listPartnerResidences(partner.id),
  ]);
  const calendars = await Promise.all(
    residences.map(async (residence) => {
      const [periods, availability] = await Promise.all([
        listPartnerResidenceUnavailablePeriods(partner.id, residence.id),
        getPartnerResidenceAvailability(partner.id, residence.id),
      ]);
      return {
        residence: { id: residence.id, title: residence.title },
        periods,
        unavailable: availability.unavailable,
      };
    }),
  );

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 p-4 sm:p-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
          Exploitation
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Réservations et calendrier
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Suivez les séjours et bloquez les dates pendant lesquelles un logement
          ne doit pas être proposé.
        </p>
      </header>

      <PartnerReservationsWorkspace
        reservations={reservations}
        calendars={calendars}
        focusReservationId={
          typeof requestedReservation === "string"
            ? requestedReservation
            : undefined
        }
        actions={{
          update: updatePartnerResidenceReservationAction,
          cancel: cancelPartnerResidenceReservationAction,
          calendar: {
            createUnavailablePeriod: createResidenceUnavailablePeriodAction,
            deleteUnavailablePeriod: deleteResidenceUnavailablePeriodAction,
          },
        }}
      />
    </main>
  );
}
