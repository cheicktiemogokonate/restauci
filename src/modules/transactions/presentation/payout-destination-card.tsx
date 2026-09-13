"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";
import {
  BadgeCheck,
  Building2,
  CircleAlert,
  Loader2,
  Smartphone,
  WalletCards,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select";
import type {
  ConfigurePayoutDestinationInput,
  PayoutDestinationDTO,
  PayoutInstitutionDTO,
} from "../contracts";

type ActionResult =
  | { success: true; message: string; destination: PayoutDestinationDTO }
  | { success: false; message: string };

export function PayoutDestinationCard(props: {
  identityVerified: boolean;
  initialDestination: PayoutDestinationDTO | null;
  institutions: PayoutInstitutionDTO[];
  institutionsError: string | null;
  actions: {
    configure: (input: ConfigurePayoutDestinationInput) => Promise<ActionResult>;
    refresh: () => Promise<ActionResult>;
  };
}) {
  const [destination, setDestination] = useState(props.initialDestination);
  const [institutionCode, setInstitutionCode] = useState("");
  const [accountIdentifier, setAccountIdentifier] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const selectedInstitution = useMemo(
    () => props.institutions.find((item) => item.code === institutionCode),
    [institutionCode, props.institutions],
  );
  const mobileInstitutions = props.institutions.filter(
    (item) => item.type === "mobile_money",
  );
  const bankInstitutions = props.institutions.filter(
    (item) => item.type === "bank_account",
  );
  const canConfigure =
    props.identityVerified &&
    (!destination || destination.status === "disabled") &&
    !props.institutionsError;

  const runConfigure = () => {
    startTransition(async () => {
      setFeedback(null);
      const result = await props.actions.configure({
        institutionCode,
        accountIdentifier,
      });
      setFeedback({
        type: result.success ? "success" : "error",
        message: result.message,
      });
      if (result.success) {
        setDestination(result.destination);
        setAccountIdentifier("");
      }
    });
  };

  const runRefresh = () => {
    startTransition(async () => {
      setFeedback(null);
      const result = await props.actions.refresh();
      setFeedback({
        type: result.success ? "success" : "error",
        message: result.message,
      });
      if (result.success) setDestination(result.destination);
    });
  };

  return (
    <Card className="overflow-visible">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <WalletCards className="size-5" aria-hidden />
          </span>
          <div>
            <CardTitle>Compte de versement</CardTitle>
            <CardDescription className="mt-1">
              Destination utilisée pour vos commandes ou réservations. Les abonnements Toutci n’y sont jamais versés.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <Alert>
          <CircleAlert className="size-4" />
          <AlertTitle>Compte bancaire ou Mobile Money uniquement</AlertTitle>
          <AlertDescription>
            Utilisez Wave, Orange Money, MTN Money, Djamo ou une banque proposée. Ne saisissez jamais un numéro de carte Visa/Mastercard, un cryptogramme ou un code secret.
          </AlertDescription>
        </Alert>

        {!props.identityVerified ? (
          <Alert>
            <CircleAlert className="size-4" />
            <AlertTitle>Vérification d’identité requise</AlertTitle>
            <AlertDescription>
              Le compte de versement sera disponible dès que votre dossier KYC sera validé.
            </AlertDescription>
          </Alert>
        ) : null}

        {destination && destination.status !== "disabled" ? (
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {destination.type === "mobile_money" ? (
                  <Smartphone className="mt-0.5 size-5 text-emerald-700" aria-hidden />
                ) : (
                  <Building2 className="mt-0.5 size-5 text-emerald-700" aria-hidden />
                )}
                <div>
                  <p className="font-medium">
                    {destination.institutionName ?? "Destination Paystack"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {destination.maskedIdentifier ?? "Numéro protégé"} · {destination.type === "mobile_money" ? "Mobile Money" : "Compte bancaire"}
                  </p>
                </div>
              </div>
              <span className={destination.status === "active"
                ? "inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800"
                : "inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900"}
              >
                {destination.status === "active" ? <BadgeCheck className="size-3.5" aria-hidden /> : null}
                {destination.status === "active" ? "Actif" : "Validation Paystack en attente"}
              </span>
            </div>
            {destination.environment === "test" && !destination.providerVerified ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Environnement test : la destination est utilisable pour les essais. En production, Paystack devra l’avoir vérifiée.
              </p>
            ) : null}
            {destination.status === "pending" ? (
              <Button className="mt-4" variant="outline" disabled={pending} onClick={runRefresh}>
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                Revérifier auprès de Paystack
              </Button>
            ) : null}
          </div>
        ) : null}

        {canConfigure ? (
          <form
            className="space-y-4"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              runConfigure();
            }}
          >
            <div className="space-y-2">
              <Label>Établissement de versement</Label>
              <Select
                value={institutionCode}
                onValueChange={setInstitutionCode}
                disabled={pending}
                className="z-30"
              >
                <SelectTrigger ariaLabel="Choisir l’établissement de versement">
                  <SelectValue placeholder="Choisir Mobile Money ou une banque" />
                </SelectTrigger>
                <SelectContent>
                  {mobileInstitutions.map((institution) => (
                    <SelectItem key={institution.code} value={institution.code}>
                      {institution.name}
                    </SelectItem>
                  ))}
                  {bankInstitutions.map((institution) => (
                    <SelectItem key={institution.code} value={institution.code}>
                      {institution.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payout-account-identifier">
                {selectedInstitution?.type === "mobile_money"
                  ? "Numéro Mobile Money"
                  : "Numéro de compte ou de virement"}
              </Label>
              <Input
                id="payout-account-identifier"
                value={accountIdentifier}
                onChange={(event) => setAccountIdentifier(event.target.value)}
                inputMode={selectedInstitution?.type === "mobile_money" ? "tel" : "text"}
                autoComplete={selectedInstitution?.type === "mobile_money" ? "tel" : "off"}
                placeholder={selectedInstitution?.type === "mobile_money" ? "07 00 00 00 00" : "Numéro communiqué par votre établissement"}
                disabled={pending || !selectedInstitution}
              />
              <p className="text-xs text-muted-foreground">
                Le numéro complet est envoyé directement à Paystack et n’est pas conservé par Toutci.
              </p>
            </div>
            <Button
              type="submit"
              disabled={pending || !institutionCode || accountIdentifier.trim().length < 6}
            >
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Créer mon compte de versement
            </Button>
          </form>
        ) : null}

        {props.institutionsError ? (
          <Alert variant="destructive">
            <CircleAlert className="size-4" />
            <AlertTitle>Service indisponible</AlertTitle>
            <AlertDescription>{props.institutionsError}</AlertDescription>
          </Alert>
        ) : null}

        <p className={feedback?.type === "error" ? "text-sm text-destructive" : "text-sm text-emerald-700"} aria-live="polite">
          {feedback?.message ?? ""}
        </p>
      </CardContent>
    </Card>
  );
}
