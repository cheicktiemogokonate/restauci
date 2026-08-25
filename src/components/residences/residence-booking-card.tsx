"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertCircle, CalendarDays, CheckCircle2, CreditCard, Smartphone } from "lucide-react";
import TeamSelector from "@/components/kokonutui/team-selector";
import { StatefulButton } from "@/components/motion/stateful-button";
import { ResidenceDateRangePicker } from "@/components/residences/residence-date-range-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { clientApi } from "@/lib/client-app/api-client";
import { useAuthStore } from "@/lib/client-app/stores/auth-store";
import { formatPrix } from "@/lib/utils/format";
import type {
  ResidenceAvailabilityDTO,
  ResidenceStayQuoteDTO,
} from "@/modules/residences/contracts";

type PaymentMethod = "mobile_money" | "card";

function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

export function ResidenceBookingCard({
  residenceId,
  pricePerNightFcfa,
  maxGuests,
  isBookable,
  availability,
  discoveryToken,
}: {
  residenceId: string;
  pricePerNightFcfa: number;
  maxGuests: number;
  isBookable: boolean;
  availability: ResidenceAvailabilityDTO;
  discoveryToken?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [method, setMethod] = useState<PaymentMethod>("mobile_money");
  const [quote, setQuote] = useState<ResidenceStayQuoteDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isQuoting, startQuote] = useTransition();
  const [isBooking, startBooking] = useTransition();
  const [minimumDate] = useState(todayIso);

  const requestQuote = () => {
    setError(null);
    setQuote(null);
    startQuote(async () => {
      const response = await fetch(`/api/v1/public/residences/${residenceId}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkIn, checkOut, guests }),
      });
      const result = await response.json().catch(() => null);
      if (!result?.success) {
        setError(result?.error ?? "Impossible de vérifier ces dates.");
        return;
      }
      setQuote(result.data);
      if (!result.data.available) {
        setError("Ces dates sont déjà occupées. Choisissez une autre période.");
      }
    });
  };

  const book = () => {
    if (!isAuthenticated) {
      const returnPath = discoveryToken
        ? `${pathname}?discovery=${encodeURIComponent(discoveryToken)}`
        : pathname;
      router.push(`/client/login?redirect=${encodeURIComponent(returnPath)}`);
      return;
    }
    if (!quote?.available) {
      requestQuote();
      return;
    }
    setError(null);
    startBooking(async () => {
      const result = await clientApi.post<{
        reservationId: string;
        checkoutUrl: string;
      }>("/reservations", {
        residenceId,
        checkIn,
        checkOut,
        guests,
        paymentMethod: method,
        ...(discoveryToken && { discoveryToken }),
      });
      if (!result.success || !result.data?.checkoutUrl) {
        setQuote(null);
        setError(result.error ?? "Impossible de créer la réservation.");
        return;
      }
      window.location.assign(result.data.checkoutUrl);
    });
  };

  return (
    <aside className="h-fit rounded-2xl border bg-white p-5 shadow-sm lg:sticky lg:top-6">
      <p className="text-lg font-semibold text-slate-950">
        {formatPrix(pricePerNightFcfa)}{" "}
        <span className="text-sm font-normal text-slate-500">par nuit</span>
      </p>

      {!isBookable ? (
        <Alert className="mt-4 border-amber-200 bg-amber-50 text-amber-950">
          <CalendarDays />
          <AlertDescription>
            Cette résidence est visible, mais son paiement sécurisé n’est pas encore activé.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="mt-5 space-y-4">
          <ResidenceDateRangePicker
            checkIn={checkIn}
            checkOut={checkOut}
            minimumDate={minimumDate}
            unavailable={availability.unavailable}
            onChange={(range) => {
              setCheckIn(range.checkIn);
              setCheckOut(range.checkOut);
              setQuote(null);
              setError(null);
            }}
          />
          <TeamSelector
            value={guests}
            max={maxGuests}
            onChange={(value) => {
              setGuests(value);
              setQuote(null);
              setError(null);
            }}
            label={`Voyageurs · maximum ${maxGuests}`}
            singularLabel="voyageur"
            pluralLabel="voyageurs"
            decrementLabel="Retirer un voyageur"
            incrementLabel="Ajouter un voyageur"
            showAvatars={false}
            variant="compact"
          />

          {quote?.available ? (
            <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">
              <p className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="size-4" />Dates disponibles
              </p>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between"><span>{quote.nights} nuit{quote.nights > 1 ? "s" : ""}</span><span>{formatPrix(quote.totalFcfa)}</span></div>
                <div className="flex justify-between border-t border-emerald-200 pt-2 font-semibold"><span>Total</span><span>{formatPrix(quote.totalFcfa)}</span></div>
              </div>
            </div>
          ) : null}

          {quote?.available ? (
            <FieldSet>
              <FieldLegend variant="label">Moyen de paiement</FieldLegend>
              <RadioGroup
                value={method}
                onValueChange={(value) => setMethod(value as PaymentMethod)}
                className="grid-cols-1 sm:grid-cols-2"
              >
                <FieldLabel htmlFor="payment-mobile-money">
                  <Field orientation="horizontal">
                    <Smartphone className="mt-0.5 size-4 text-primary" />
                    <FieldContent>
                      <FieldTitle>Mobile Money</FieldTitle>
                      <FieldDescription>Orange, MTN, Moov ou Wave via Paystack</FieldDescription>
                    </FieldContent>
                    <RadioGroupItem id="payment-mobile-money" value="mobile_money" />
                  </Field>
                </FieldLabel>
                <FieldLabel htmlFor="payment-card">
                  <Field orientation="horizontal">
                    <CreditCard className="mt-0.5 size-4 text-primary" />
                    <FieldContent>
                      <FieldTitle>Carte bancaire</FieldTitle>
                      <FieldDescription>Paiement sécurisé via Paystack</FieldDescription>
                    </FieldContent>
                    <RadioGroupItem id="payment-card" value="card" />
                  </Field>
                </FieldLabel>
              </RadioGroup>
            </FieldSet>
          ) : null}

          {error ? (
            <Alert variant="destructive"><AlertCircle /><AlertDescription>{error}</AlertDescription></Alert>
          ) : null}

          {!quote?.available ? (
            <StatefulButton
              type="button"
              variant="outline"
              className="w-full"
              state={isQuoting ? "loading" : error ? "error" : "idle"}
              loadingText="Vérification des disponibilités…"
              errorText="Choisir d’autres dates"
              icon={<CalendarDays />}
              disabled={!checkIn || !checkOut || isQuoting}
              onClick={requestQuote}
            >
              Vérifier les dates
            </StatefulButton>
          ) : (
            <StatefulButton
              type="button"
              className="w-full"
              state={isBooking ? "loading" : "idle"}
              loadingText="Redirection vers Paystack…"
              disabled={isBooking}
              onClick={book}
            >
              {isAuthenticated ? "Réserver et payer" : "Se connecter pour réserver"}
            </StatefulButton>
          )}
          <p className="text-center text-xs leading-5 text-slate-500">
            Paiement sécurisé par Paystack. Aucun paiement en espèces.
          </p>
        </div>
      )}
    </aside>
  );
}
