"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  Bike,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  KeyRound,
  LoaderCircle,
  LogOut,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  ShieldCheck,
  Store,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type {
  DeliveryOfferDTO,
  DriverMeDTO,
  DriverMissionDTO,
} from "@/modules/deliveries/contracts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatPrix } from "@/shared/format";
import {
  driverApi,
  refreshDriverAccess,
  setDriverAccessToken,
} from "@/modules/deliveries/presentation/driver-app/api-client";

type AuthState = "checking" | "signed_out" | "activation" | "authenticated";

const missionLabels: Record<DriverMissionDTO["status"], string> = {
  en_attente: "En attente",
  assignee: "À récupérer",
  en_route: "En route",
  livree: "Livrée",
  echouee: "Échec déclaré",
  annulee: "Annulée",
};

const declineLabels = {
  unavailable: "Je ne suis pas disponible",
  distance: "Distance trop importante",
  vehicle_problem: "Problème de véhicule",
  other: "Autre raison",
};

const failureLabels = {
  client_absent: "Client absent",
  client_unreachable: "Client injoignable",
  address_inaccessible: "Adresse inaccessible",
  vehicle_problem: "Problème de véhicule",
  order_damaged: "Commande endommagée",
  payment_refused: "Paiement en espèces refusé",
  other: "Autre problème",
};

function LoginPanel({
  onAuthenticated,
  onActivation,
}: {
  onAuthenticated: (token: string) => void;
  onActivation: (token: string) => void;
}) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await driverApi.post<
        | { kind: "activation_required"; activationToken: string }
        | { kind: "authenticated"; tokens: { accessToken: string } }
      >("/auth/login", {
        loginId,
        password,
        tokenTransport: "cookie",
      });
      if (!result.success || !result.data) {
        setError(result.error ?? "Connexion impossible.");
        return;
      }
      if (result.data.kind === "activation_required") {
        onActivation(result.data.activationToken);
        return;
      }
      onAuthenticated(result.data.tokens.accessToken);
    });
  };

  return (
    <Card className="w-full max-w-md border-primary/15 shadow-xl shadow-primary/5">
      <CardHeader className="space-y-3 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Bike className="size-6" />
        </span>
        <div>
          <CardTitle className="text-2xl">Espace livreur</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Connectez-vous avec les accès remis par votre restaurant.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="driver-login">Identifiant</Label>
          <Input
            id="driver-login"
            autoComplete="username"
            autoCapitalize="characters"
            value={loginId}
            onChange={(event) => setLoginId(event.target.value.toUpperCase())}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="driver-password">Mot de passe</Label>
          <Input
            id="driver-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
          />
        </div>
        <Button
          className="w-full"
          size="lg"
          disabled={isPending || loginId.length < 8 || !password}
          onClick={submit}
        >
          {isPending ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
          Se connecter
        </Button>
      </CardContent>
    </Card>
  );
}

function ActivationPanel({
  activationToken,
  onAuthenticated,
  onCancel,
}: {
  activationToken: string;
  onAuthenticated: (token: string) => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const valid =
    password.length >= 12 &&
    password === confirmation &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  const activate = () => {
    setError(null);
    startTransition(async () => {
      const result = await driverApi.post<{ accessToken: string }>("/auth/activation", {
        activationToken,
        password,
        tokenTransport: "cookie",
      });
      if (!result.success || !result.data) {
        setError(result.error ?? "Activation impossible.");
        return;
      }
      onAuthenticated(result.data.accessToken);
    });
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <KeyRound className="size-6" />
        </span>
        <CardTitle className="text-2xl">Sécurisez votre compte</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Remplacez le mot de passe temporaire avant votre première mission.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <Alert variant="destructive"><AlertCircle /><AlertDescription>{error}</AlertDescription></Alert> : null}
        <div className="space-y-2">
          <Label htmlFor="new-driver-password">Nouveau mot de passe</Label>
          <Input id="new-driver-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <p className="text-xs text-muted-foreground">12 caractères minimum, avec majuscule, minuscule, chiffre et symbole.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-driver-password">Confirmer le mot de passe</Label>
          <Input id="confirm-driver-password" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        </div>
        <Button className="w-full" size="lg" disabled={!valid || isPending} onClick={activate}>
          {isPending ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}
          Activer mon compte
        </Button>
        <Button className="w-full" variant="ghost" onClick={onCancel}>Retour à la connexion</Button>
      </CardContent>
    </Card>
  );
}

function OfferCard({ offer, onDone }: { offer: DeliveryOfferDTO; onDone: () => void }) {
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState<keyof typeof declineLabels>("unavailable");
  const [note, setNote] = useState("");
  const [becomeUnavailable, setBecomeUnavailable] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const remaining = Math.max(0, Math.ceil((new Date(offer.expiresAt).getTime() - now) / 1000));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const respond = (accept: boolean) => {
    startTransition(async () => {
      const result = await driverApi.post(`/offres/${offer.id}/reponse`,
        accept
          ? { accept: true, becomeUnavailable: false }
          : {
              accept: false,
              declineReason,
              ...(note.trim() ? { note: note.trim() } : {}),
              becomeUnavailable,
            },
      );
      if (!result.success) {
        toast.error(result.error ?? "Réponse impossible.");
        return;
      }
      toast.success(accept ? "Mission acceptée." : "Proposition refusée.");
      setDeclineOpen(false);
      onDone();
    });
  };

  return (
    <Card className="border-primary/30 bg-primary/3 shadow-lg shadow-primary/5">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <Badge>Nouvelle proposition</Badge>
          <CardTitle className="mt-3 text-xl">Commande {offer.orderNumber}</CardTitle>
        </div>
        <div className="rounded-xl bg-background px-3 py-2 text-center shadow-sm">
          <p className="text-xs text-muted-foreground">Expire dans</p>
          <p className="font-mono text-lg font-bold" aria-live="polite">
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-background p-3">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Store className="size-3.5" />Récupération</p>
            <p className="mt-1 text-sm font-semibold">{offer.pickupRestaurantName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{offer.pickupAddress}</p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><MapPin className="size-3.5" />Destination</p>
            <p className="mt-1 text-sm font-semibold">{offer.deliveryArea}</p>
            {offer.distanceKm !== null ? <p className="mt-0.5 text-xs text-muted-foreground">Environ {offer.distanceKm.toFixed(1)} km</p> : null}
          </div>
        </div>
        {offer.cashToCollectFcfa !== null ? (
          <Alert><Banknote /><AlertTitle>Espèces à récupérer</AlertTitle><AlertDescription>Montant exact : <strong>{formatPrix(offer.cashToCollectFcfa)}</strong></AlertDescription></Alert>
        ) : null}
        <Alert>
          <CircleDollarSign />
          <AlertTitle>Rémunération prévue</AlertTitle>
          <AlertDescription>
            {offer.compensationAmountFcfa === null ? (
              <>Aucun montant n’est renseigné. Votre accord est géré directement avec le restaurant et RestauCI ne calculera aucun dû pour cette mission.</>
            ) : (
              <>Montant fixe : <strong>{formatPrix(offer.compensationAmountFcfa)}</strong>. En acceptant, vous prenez connaissance de ce montant pour cette mission.</>
            )}
          </AlertDescription>
        </Alert>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" disabled={isPending || remaining === 0} onClick={() => setDeclineOpen(true)}><X />Refuser</Button>
          <Button size="lg" disabled={isPending || remaining === 0} onClick={() => respond(true)}>{isPending ? <LoaderCircle className="animate-spin" /> : <Check />}Accepter</Button>
        </div>
      </CardContent>

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Refuser la proposition</DialogTitle><DialogDescription>Le restaurant pourra immédiatement proposer la mission à un autre livreur.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="decline-reason">Motif</Label><Select value={declineReason} onValueChange={(value: keyof typeof declineLabels) => setDeclineReason(value)}><SelectTrigger id="decline-reason" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(declineLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            {declineReason === "other" ? <div className="space-y-2"><Label htmlFor="decline-note">Précision</Label><Textarea id="decline-note" value={note} onChange={(event) => setNote(event.target.value)} /></div> : null}
            <div className="flex items-center justify-between gap-4 rounded-xl border p-3"><div><Label htmlFor="become-unavailable">Me rendre indisponible</Label><p className="mt-1 text-xs text-muted-foreground">Aucune nouvelle proposition ne sera envoyée.</p></div><Switch id="become-unavailable" checked={becomeUnavailable} onCheckedChange={setBecomeUnavailable} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDeclineOpen(false)}>Retour</Button><Button variant="destructive" disabled={isPending || (declineReason === "other" && note.trim().length < 3)} onClick={() => respond(false)}>Confirmer le refus</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function MissionCard({ mission, onDone }: { mission: DriverMissionDTO; onDone: () => void }) {
  const [completeOpen, setCompleteOpen] = useState(false);
  const [failureOpen, setFailureOpen] = useState(false);
  const [proofCode, setProofCode] = useState("");
  const [failureReason, setFailureReason] = useState<keyof typeof failureLabels>("client_absent");
  const [failureNote, setFailureNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const isCash = mission.cashToCollectFcfa !== null;

  const action = (path: string, body?: unknown, message?: string) => {
    startTransition(async () => {
      const result = await driverApi.post(`/livraisons/${mission.id}/${path}`, body);
      if (!result.success) {
        toast.error(result.error ?? "Action impossible.");
        return;
      }
      toast.success(message ?? "Mission mise à jour.");
      setCompleteOpen(false);
      setFailureOpen(false);
      onDone();
    });
  };

  const mapsHref = mission.customer.latitude !== null && mission.customer.longitude !== null
    ? `https://www.google.com/maps/dir/?api=1&destination=${mission.customer.latitude},${mission.customer.longitude}`
    : mission.customer.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mission.customer.address)}`
      : null;

  return (
    <Card className="overflow-hidden border-primary/20">
      <div className="h-1 bg-primary" />
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Mission active</p><CardTitle className="mt-1 text-xl">Commande {mission.orderNumber}</CardTitle></div>
        <Badge variant="outline">{missionLabels[mission.status]}</Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          <div className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted"><Store className="size-4" /></span><div><p className="text-xs text-muted-foreground">Restaurant</p><p className="text-sm font-semibold">{mission.restaurant.name}</p><p className="text-xs text-muted-foreground">{mission.restaurant.address}</p></div></div>
          <div className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserRound className="size-4" /></span><div><p className="text-xs text-muted-foreground">Client</p><p className="text-sm font-semibold">{mission.customer.name}</p><p className="text-xs text-muted-foreground">{mission.customer.address ?? "Adresse protégée après la mission"}</p>{mission.customer.instructions ? <p className="mt-1 text-xs italic">« {mission.customer.instructions} »</p> : null}</div></div>
        </div>
        {isCash ? <Alert><Banknote /><AlertTitle>Encaissement à la remise</AlertTitle><AlertDescription>Récupérez exactement <strong>{formatPrix(mission.cashToCollectFcfa!)}</strong>. Cette somme sera ajoutée à votre solde à remettre.</AlertDescription></Alert> : null}
        <Alert>
          <CircleDollarSign />
          <AlertTitle>Rémunération de cette mission</AlertTitle>
          <AlertDescription>
            {mission.compensationAmountFcfa === null
              ? "Aucun montant n’a été enregistré pour cette mission. L’accord reste géré hors RestauCI."
              : `${formatPrix(mission.compensationAmountFcfa)} seront dus après une livraison terminée.`}
          </AlertDescription>
        </Alert>
        <div className="grid grid-cols-2 gap-2">
          {mission.customer.phone ? <Button asChild variant="outline"><a href={`tel:${mission.customer.phone.replace(/\s/g, "")}`}><Phone />Appeler</a></Button> : null}
          {mapsHref ? <Button asChild variant="outline"><a href={mapsHref} target="_blank" rel="noreferrer"><Navigation />Itinéraire</a></Button> : null}
        </div>
        <Separator />
        {mission.status === "assignee" ? (
          <div className="space-y-3">
            {!mission.pickupReady ? (
              <Alert>
                <Clock3 />
                <AlertTitle>Commande encore en préparation</AlertTitle>
                <AlertDescription>
                  Le restaurant doit la marquer prête avant que vous puissiez confirmer le retrait.
                </AlertDescription>
              </Alert>
            ) : null}
            <Button className="w-full" size="lg" disabled={isPending || !mission.pickupReady} onClick={() => action("depart", undefined, "Départ enregistré. Bonne route !")}>
              {isPending ? <LoaderCircle className="animate-spin" /> : <Bike />}J’ai récupéré la commande
            </Button>
          </div>
        ) : null}
        {mission.status === "en_route" ? (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" size="lg" disabled={isPending} onClick={() => setFailureOpen(true)}><AlertCircle />Signaler un échec</Button>
            <Button size="lg" disabled={isPending} onClick={() => setCompleteOpen(true)}><CheckCircle2 />Confirmer la remise</Button>
          </div>
        ) : null}
      </CardContent>

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmer la remise au client</DialogTitle><DialogDescription>Demandez au client son code à 6 chiffres. S’il confirme dans son application, laissez le champ vide puis validez.</DialogDescription></DialogHeader>
          <div className="space-y-2"><Label htmlFor={`proof-${mission.id}`}>Code client (facultatif après confirmation dans l’app)</Label><Input id={`proof-${mission.id}`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={proofCode} placeholder="000000" className="h-12 text-center font-mono text-xl tracking-[0.35em]" onChange={(event) => setProofCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /></div>
          {isCash ? <Alert><Banknote /><AlertTitle>Espèces récupérées</AlertTitle><AlertDescription>En validant, vous confirmez avoir reçu exactement {formatPrix(mission.cashToCollectFcfa!)}.</AlertDescription></Alert> : null}
          <DialogFooter><Button variant="outline" onClick={() => setCompleteOpen(false)}>Retour</Button><Button disabled={isPending || (proofCode.length > 0 && proofCode.length !== 6)} onClick={() => action("remise", { ...(proofCode ? { proofCode } : {}), cashCollected: isCash }, "Livraison terminée.")}>{isPending ? <LoaderCircle className="animate-spin" /> : <Check />}Valider la remise</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={failureOpen} onOpenChange={setFailureOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Signaler l’échec de livraison</DialogTitle><DialogDescription>Après le départ, la mission ne peut pas être annulée. Ce signalement motivé est horodaté et visible par le restaurant.</DialogDescription></DialogHeader>
          <div className="space-y-4"><div className="space-y-2"><Label htmlFor={`failure-${mission.id}`}>Motif</Label><Select value={failureReason} onValueChange={(value: keyof typeof failureLabels) => setFailureReason(value)}><SelectTrigger id={`failure-${mission.id}`} className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(failureLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor={`failure-note-${mission.id}`}>Précisions {failureReason === "other" ? "(obligatoires)" : "(facultatives)"}</Label><Textarea id={`failure-note-${mission.id}`} maxLength={500} value={failureNote} onChange={(event) => setFailureNote(event.target.value)} /></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setFailureOpen(false)}>Retour</Button><Button variant="destructive" disabled={isPending || (failureReason === "other" && failureNote.trim().length < 3)} onClick={() => action("echec", { reason: failureReason, ...(failureNote.trim() ? { note: failureNote.trim() } : {}) }, "Échec transmis au restaurant.")}>Confirmer l’échec</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function DriverApp() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [activationToken, setActivationToken] = useState<string | null>(null);
  const [me, setMe] = useState<DriverMeDTO | null>(null);
  const [offer, setOffer] = useState<DeliveryOfferDTO | null>(null);
  const [missions, setMissions] = useState<DriverMissionDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAvailabilityPending, startAvailabilityTransition] = useTransition();

  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    const [meResult, offerResult, missionsResult] = await Promise.all([
      driverApi.get<DriverMeDTO>("/me"),
      driverApi.get<DeliveryOfferDTO | null>("/offres/courante"),
      driverApi.get<DriverMissionDTO[]>("/livraisons?page=1&limit=20"),
    ]);
    if (!meResult.success || !meResult.data) {
      setError(meResult.error ?? "Session expirée.");
      setAuthState("signed_out");
      setDriverAccessToken(null);
      setIsRefreshing(false);
      return;
    }
    setMe(meResult.data);
    setOffer(offerResult.success ? (offerResult.data ?? null) : null);
    setMissions(missionsResult.success ? (missionsResult.data ?? []) : []);
    setError(null);
    setAuthState("authenticated");
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    void refreshDriverAccess().then((valid) => {
      if (valid) void loadDashboard();
      else setAuthState("signed_out");
    });
  }, [loadDashboard]);

  useEffect(() => {
    if (authState !== "authenticated") return;
    const timer = window.setInterval(() => void loadDashboard(true), 15_000);
    return () => window.clearInterval(timer);
  }, [authState, loadDashboard]);

  const activeMission = useMemo(
    () => missions.find((mission) => mission.status === "assignee" || mission.status === "en_route") ?? null,
    [missions],
  );
  const missionHistory = useMemo(
    () =>
      missions.filter(
        (mission) => mission.status !== "assignee" && mission.status !== "en_route",
      ),
    [missions],
  );

  const authenticated = (token: string) => {
    setDriverAccessToken(token);
    setAuthState("authenticated");
    void loadDashboard();
  };

  const toggleAvailability = (available: boolean) => {
    startAvailabilityTransition(async () => {
      const result = await driverApi.patch<DriverMeDTO>("/disponibilite", { available });
      if (!result.success) {
        toast.error(result.error ?? "Disponibilité impossible à modifier.");
        return;
      }
      toast.success(available ? "Vous êtes disponible." : "Vous êtes indisponible.");
      await loadDashboard(true);
    });
  };

  const logout = async () => {
    await driverApi.post("/auth/logout", { tokenTransport: "cookie" });
    setDriverAccessToken(null);
    setMe(null);
    setMissions([]);
    setOffer(null);
    setAuthState("signed_out");
  };

  if (authState === "checking") {
    return <main id="contenu-principal" className="flex min-h-screen items-center justify-center bg-muted/20"><div className="text-center"><LoaderCircle className="mx-auto size-7 animate-spin text-primary" /><p className="mt-3 text-sm text-muted-foreground">Vérification de votre session…</p></div></main>;
  }
  if (authState === "signed_out") {
    return <main id="contenu-principal" className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,var(--color-primary)/8%,transparent_38%)] px-4 py-10"><LoginPanel onAuthenticated={authenticated} onActivation={(token) => { setActivationToken(token); setAuthState("activation"); }} /></main>;
  }
  if (authState === "activation" && activationToken) {
    return <main id="contenu-principal" className="flex min-h-screen items-center justify-center bg-muted/20 px-4 py-10"><ActivationPanel activationToken={activationToken} onAuthenticated={authenticated} onCancel={() => { setActivationToken(null); setAuthState("signed_out"); }} /></main>;
  }

  return (
    <main id="contenu-principal" className="min-h-screen bg-muted/20 pb-10">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Bike className="size-5" /></span><div className="min-w-0"><p className="truncate text-sm font-bold">{me?.name ?? "Livreur"}</p><p className="truncate text-xs text-muted-foreground">{me?.vehicle}{me?.vehicleNumber ? ` · ${me.vehicleNumber}` : ""}</p></div></div>
          <div className="flex items-center gap-1"><Button size="icon" variant="ghost" aria-label="Actualiser" disabled={isRefreshing} onClick={() => void loadDashboard()}>{isRefreshing ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}</Button><Button size="icon" variant="ghost" aria-label="Se déconnecter" onClick={() => void logout()}><LogOut /></Button></div>
        </div>
      </header>
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
        {error ? <Alert variant="destructive"><AlertCircle /><AlertDescription>{error}</AlertDescription></Alert> : null}
        {me ? (
          <Card>
            <CardContent className="flex items-center justify-between gap-5 p-4 sm:p-5">
              <div><p className="font-semibold">Disponibilité</p><p className="mt-0.5 text-xs text-muted-foreground">{activeMission ? "Votre mission active continue même si vous coupez les nouvelles demandes." : me.declaredAvailable ? "Vous pouvez recevoir une proposition." : "Les nouvelles propositions sont désactivées."}</p></div>
              <div className="flex shrink-0 items-center gap-3"><span className="text-sm font-medium">{me.declaredAvailable ? "Disponible" : "Indisponible"}</span><Switch aria-label="Modifier ma disponibilité" checked={me.declaredAvailable} disabled={isAvailabilityPending} onCheckedChange={toggleAvailability} /></div>
            </CardContent>
          </Card>
        ) : null}
        {me ? (
          <Alert>
            <CircleDollarSign />
            <AlertTitle>Accord avec {me.restaurantName}</AlertTitle>
            <AlertDescription>
              {me.fixedDeliveryCompensationFcfa === null
                ? "Aucun montant fixe n’est actuellement renseigné. RestauCI recommande de convenir d’un montant avec le restaurant ; sinon, l’accord reste entièrement géré hors plateforme."
                : `Montant actuellement prévu pour les nouvelles offres : ${formatPrix(me.fixedDeliveryCompensationFcfa)} par livraison.`}
            </AlertDescription>
          </Alert>
        ) : null}
        {me && me.pendingCashFcfa > 0 ? <Alert><Banknote /><AlertTitle>Espèces à remettre au restaurant</AlertTitle><AlertDescription>Solde enregistré : <strong>{formatPrix(me.pendingCashFcfa)}</strong>. Le restaurant validera la remise exacte.</AlertDescription></Alert> : null}
        {me && me.pendingCompensationFcfa > 0 ? <Alert><CircleDollarSign /><AlertTitle>Rémunérations à recevoir</AlertTitle><AlertDescription>Montant déclaré dû pour vos livraisons terminées : <strong>{formatPrix(me.pendingCompensationFcfa)}</strong>. Le paiement reste effectué directement par le restaurant.</AlertDescription></Alert> : null}
        {offer ? <OfferCard offer={offer} onDone={() => void loadDashboard()} /> : null}
        {activeMission ? <MissionCard mission={activeMission} onDone={() => void loadDashboard()} /> : !offer ? <Card><CardContent className="flex flex-col items-center px-6 py-14 text-center"><span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Clock3 className="size-6" /></span><h2 className="mt-4 text-lg font-semibold">Aucune mission active</h2><p className="mt-1 max-w-sm text-sm text-muted-foreground">{me?.declaredAvailable ? "Restez disponible : une proposition apparaîtra ici et restera libre à accepter ou refuser." : "Activez votre disponibilité lorsque vous êtes prêt à recevoir une proposition."}</p></CardContent></Card> : null}
        {missionHistory.length > 0 ? (
          <section aria-labelledby="history-heading" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 id="history-heading" className="text-base font-semibold">Historique récent</h2>
              <Badge variant="secondary">{missionHistory.length}</Badge>
            </div>
            <div className="space-y-2">
              {missionHistory.slice(0, 8).map((mission) => (
                <Card key={mission.id}>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-semibold">Commande {mission.orderNumber}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {mission.completedAt
                          ? new Intl.DateTimeFormat("fr-CI", { dateStyle: "medium", timeStyle: "short" }).format(new Date(mission.completedAt))
                          : missionLabels[mission.status]}
                      </p>
                      {mission.compensationAmountFcfa !== null ? (
                        <p className="mt-1 text-xs font-medium">
                          {formatPrix(mission.compensationAmountFcfa)} · {mission.status !== "livree" ? "Non due" : mission.compensationPaidAt ? "Déclarée réglée" : "À régler"}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">Rémunération non renseignée</p>
                      )}
                    </div>
                    <Badge variant={mission.status === "livree" ? "default" : mission.status === "echouee" ? "destructive" : "secondary"}>{missionLabels[mission.status]}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
