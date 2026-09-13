"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  Banknote,
  Bike,
  Check,
  CircleDollarSign,
  Copy,
  KeyRound,
  LoaderCircle,
  Plus,
  Power,
  Pencil,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";
import type { DriverFleetDTO } from "@/modules/deliveries/contracts";
import {
  createDriverAction,
  confirmDriverCompensationPaymentAction,
  deactivateDriverAction,
  remitDriverCashAction,
  resetDriverCredentialsAction,
  updateDriverCompensationAction,
} from "@/app/(dashboard)/(partenaire)/restaurateur/livreurs/actions";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatPrix } from "@/shared/format";

type CredentialReveal = {
  loginId: string;
  temporaryPassword: string;
  expiresAt: string;
};

const availabilityLabels: Record<DriverFleetDTO["availability"], string> = {
  disabled: "Désactivé",
  access_pending: "Accès à activer",
  unavailable: "Indisponible",
  requested: "Proposition envoyée",
  available: "Disponible",
  busy: "En mission",
};

function availabilityVariant(
  availability: DriverFleetDTO["availability"],
): "default" | "secondary" | "destructive" | "outline" {
  if (availability === "available") return "default";
  if (availability === "disabled") return "destructive";
  if (availability === "busy" || availability === "requested") return "outline";
  return "secondary";
}

function formatSeenAt(value: string | null) {
  if (!value) return "Jamais connecté";
  return `Vu le ${new Intl.DateTimeFormat("fr-CI", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))}`;
}

function CredentialDialog({
  credentials,
  onClose,
}: {
  credentials: CredentialReveal | null;
  onClose: () => void;
}) {
  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copié.`);
  };

  return (
    <Dialog open={Boolean(credentials)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accès temporaire du livreur</DialogTitle>
          <DialogDescription>
            Transmettez ces informations directement au livreur. Le mot de passe
            ne sera plus affiché après la fermeture.
          </DialogDescription>
        </DialogHeader>
        {credentials ? (
          <div className="space-y-3" role="status">
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">Identifiant</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <code className="text-base font-semibold">{credentials.loginId}</code>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Copier l’identifiant"
                  onClick={() => void copy(credentials.loginId, "Identifiant")}
                >
                  <Copy />
                </Button>
              </div>
            </div>
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">Mot de passe temporaire</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <code className="break-all text-base font-semibold">
                  {credentials.temporaryPassword}
                </code>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Copier le mot de passe temporaire"
                  onClick={() =>
                    void copy(credentials.temporaryPassword, "Mot de passe")
                  }
                >
                  <Copy />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Expire le {new Intl.DateTimeFormat("fr-CI", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(credentials.expiresAt))}.
            </p>
          </div>
        ) : null}
        <DialogFooter>
          <Button onClick={onClose}>J’ai transmis les accès</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DriverActions({
  driver,
  onCredentials,
}: {
  driver: DriverFleetDTO;
  onCredentials: (credentials: CredentialReveal) => void;
}) {
  const [cashOpen, setCashOpen] = useState(false);
  const [compensationOpen, setCompensationOpen] = useState(false);
  const [compensationSettingsOpen, setCompensationSettingsOpen] = useState(false);
  const [compensationAmount, setCompensationAmount] = useState("");
  const [note, setNote] = useState("");
  const [compensationNote, setCompensationNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const resetCredentials = () => {
    startTransition(async () => {
      const result = await resetDriverCredentialsAction(driver.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      onCredentials(result.data);
      toast.success("Nouveaux accès créés.");
    });
  };

  const deactivate = () => {
    startTransition(async () => {
      const result = await deactivateDriverAction(driver.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Compte livreur désactivé.");
    });
  };

  const remitCash = () => {
    startTransition(async () => {
      const result = await remitDriverCashAction({
        driverId: driver.id,
        deliveryIds: driver.pendingCashDeliveries.map((item) => item.deliveryId),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setCashOpen(false);
      setNote("");
      toast.success(`${formatPrix(driver.pendingCashFcfa)} remis et enregistré.`);
    });
  };

  const openCompensationSettings = () => {
    setCompensationAmount(
      driver.fixedDeliveryCompensationFcfa?.toString() ?? "",
    );
    setCompensationSettingsOpen(true);
  };

  const saveCompensation = () => {
    const parsedAmount = compensationAmount.trim()
      ? Number(compensationAmount)
      : null;
    startTransition(async () => {
      const result = await updateDriverCompensationAction(
        driver.id,
        parsedAmount,
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setCompensationSettingsOpen(false);
      toast.success(
        parsedAmount === null
          ? "Montant retiré. L’accord sera géré hors RestauCI."
          : `Montant fixé à ${formatPrix(parsedAmount)} par livraison.`,
      );
    });
  };

  const confirmCompensationPayment = () => {
    startTransition(async () => {
      const result = await confirmDriverCompensationPaymentAction({
        driverId: driver.id,
        ...(compensationNote.trim()
          ? { note: compensationNote.trim() }
          : {}),
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setCompensationOpen(false);
      setCompensationNote("");
      toast.success(
        `${formatPrix(result.data.amountFcfa)} déclarés réglés.`,
      );
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setCompensationOpen(true)}
      >
        <CircleDollarSign /> Rémunérations
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={`Configurer le montant par livraison de ${driver.nom}`}
        title="Configurer le montant par livraison"
        onClick={openCompensationSettings}
      >
        <Pencil />
      </Button>
      {driver.pendingCashDeliveries.length > 0 ? (
        <Button size="sm" variant="outline" onClick={() => setCashOpen(true)}>
          <Banknote /> Encaisser la remise
        </Button>
      ) : null}
      {driver.active ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon-sm" variant="ghost" aria-label={`Désactiver ${driver.nom}`}>
              <Power />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Désactiver {driver.nom} ?</AlertDialogTitle>
              <AlertDialogDescription>
                Ses sessions seront révoquées. Une mission déjà partie sera marquée en
                échec et restera dans l’historique d’audit.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Conserver le compte</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={deactivate}>
                Désactiver
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
      <Button
        size="icon-sm"
        variant="ghost"
        disabled={!driver.active || isPending || Boolean(driver.activeDeliveryNumber)}
        aria-label={`Réinitialiser les accès de ${driver.nom}`}
        title={
          driver.activeDeliveryNumber
            ? "Impossible pendant une mission active"
            : "Réinitialiser les accès"
        }
        onClick={resetCredentials}
      >
        {isPending ? <LoaderCircle className="animate-spin" /> : <KeyRound />}
      </Button>

      <Dialog open={cashOpen} onOpenChange={setCashOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la remise d’espèces</DialogTitle>
            <DialogDescription>
              Vérifiez les commandes remises par {driver.nom}. Le montant est calculé
              depuis les encaissements enregistrés et ne peut pas être modifié.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
            {driver.pendingCashDeliveries.map((item) => (
              <div
                key={item.deliveryId}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span>Commande {item.orderNumber}</span>
                <span className="font-semibold">{formatPrix(item.amountFcfa)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-xl bg-primary/8 px-4 py-3">
            <span className="font-medium">Total exact attendu</span>
            <span className="text-lg font-bold text-primary">
              {formatPrix(driver.pendingCashFcfa)}
            </span>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`cash-note-${driver.id}`}>Note interne (facultatif)</Label>
            <Textarea
              id={`cash-note-${driver.id}`}
              value={note}
              maxLength={500}
              placeholder="Ex. Remise de fin de service"
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCashOpen(false)}>
              Annuler
            </Button>
            <Button disabled={isPending} onClick={remitCash}>
              {isPending ? <LoaderCircle className="animate-spin" /> : <Check />}
              Confirmer la remise exacte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={compensationSettingsOpen} onOpenChange={setCompensationSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Montant par livraison</DialogTitle>
            <DialogDescription>
              Configurez le montant fixe convenu avec {driver.nom}. Les offres déjà
              envoyées et les missions existantes ne seront pas modifiées.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`compensation-amount-${driver.id}`}>
              Montant fixe en FCFA (facultatif)
            </Label>
            <Input
              id={`compensation-amount-${driver.id}`}
              inputMode="numeric"
              min={1}
              max={1_000_000}
              type="number"
              placeholder="Ex. 300"
              value={compensationAmount}
              onChange={(event) => setCompensationAmount(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Recommandé pour la transparence. Ce montant n’est jamais ajouté
              automatiquement au prix payé par le client.
            </p>
          </div>
          {!compensationAmount.trim() ? (
            <Alert>
              <AlertCircle />
              <AlertTitle>Montant non renseigné</AlertTitle>
              <AlertDescription>
                RestauCI ne calculera aucun montant dû pour les prochaines missions.
                L’accord restera géré directement avec le livreur.
              </AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompensationSettingsOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={
                isPending ||
                (compensationAmount.trim().length > 0 &&
                  (!Number.isInteger(Number(compensationAmount)) ||
                    Number(compensationAmount) <= 0 ||
                    Number(compensationAmount) > 1_000_000))
              }
              onClick={saveCompensation}
            >
              {isPending ? <LoaderCircle className="animate-spin" /> : <Check />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={compensationOpen} onOpenChange={setCompensationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suivi des rémunérations</DialogTitle>
            <DialogDescription>
              Historique récent des montants fixes dus à {driver.nom}. RestauCI
              enregistre seulement votre déclaration de règlement.
            </DialogDescription>
          </DialogHeader>
          {driver.compensationHistory.length > 0 ? (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {driver.compensationHistory.map((item) => (
                <div
                  key={item.deliveryId}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">Commande {item.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.completedAt
                        ? new Intl.DateTimeFormat("fr-CI", {
                            dateStyle: "medium",
                          }).format(new Date(item.completedAt))
                        : "Livraison terminée"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatPrix(item.amountFcfa)}</p>
                    <Badge variant={item.paidAt ? "secondary" : "outline"}>
                      {item.paidAt ? "Déclaré réglé" : "À régler"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Aucune livraison rémunérée dans l’historique récent.
            </div>
          )}
          <div className="flex items-center justify-between rounded-xl bg-primary/8 px-4 py-3">
            <span className="font-medium">Total actuellement à régler</span>
            <span className="text-lg font-bold text-primary">
              {formatPrix(driver.pendingCompensationFcfa)}
            </span>
          </div>
          {driver.pendingCompensationFcfa > 0 ? (
            <div className="space-y-2">
              <Label htmlFor={`compensation-note-${driver.id}`}>
                Note de règlement (facultatif)
              </Label>
              <Textarea
                id={`compensation-note-${driver.id}`}
                value={compensationNote}
                maxLength={500}
                placeholder="Ex. Règlement de fin de semaine"
                onChange={(event) => setCompensationNote(event.target.value)}
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompensationOpen(false)}>
              Fermer
            </Button>
            {driver.pendingCompensationFcfa > 0 ? (
              <Button disabled={isPending} onClick={confirmCompensationPayment}>
                {isPending ? <LoaderCircle className="animate-spin" /> : <Check />}
                Déclarer tout réglé
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function FleetPageClient({ drivers }: { drivers: DriverFleetDTO[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [credentials, setCredentials] = useState<CredentialReveal | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    nom: "",
    telephone: "",
    vehicule: "moto" as DriverFleetDTO["vehicule"],
    numeroVehicule: "",
    fixedDeliveryCompensationFcfa: "",
  });

  const totals = useMemo(
    () => ({
      active: drivers.filter((driver) => driver.active).length,
      available: drivers.filter((driver) => driver.availability === "available").length,
      busy: drivers.filter((driver) => driver.availability === "busy").length,
      cash: drivers.reduce((total, driver) => total + driver.pendingCashFcfa, 0),
      compensation: drivers.reduce(
        (total, driver) => total + driver.pendingCompensationFcfa,
        0,
      ),
    }),
    [drivers],
  );

  const createDriver = () => {
    startTransition(async () => {
      const result = await createDriverAction({
        nom: form.nom,
        telephone: form.telephone,
        vehicule: form.vehicule,
        ...(form.numeroVehicule.trim()
          ? { numeroVehicule: form.numeroVehicule.trim() }
          : {}),
        ...(form.fixedDeliveryCompensationFcfa.trim()
          ? {
              fixedDeliveryCompensationFcfa: Number(
                form.fixedDeliveryCompensationFcfa,
              ),
            }
          : {}),
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setCreateOpen(false);
      setCredentials(result.data.credentials);
      setForm({
        nom: "",
        telephone: "",
        vehicule: "moto",
        numeroVehicule: "",
        fixedDeliveryCompensationFcfa: "",
      });
      toast.success("Livreur ajouté.");
    });
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-3 py-4 sm:px-4 lg:px-6 lg:py-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Opérations de livraison
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Livreurs</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Gérez les accès, la disponibilité, les missions, les espèces à remettre
            et les rémunérations fixes. Chaque action est historisée.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus /> Ajouter un livreur
        </Button>
      </header>

      <section aria-label="Résumé de la flotte" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: "Comptes actifs", value: totals.active, icon: UserRoundCheck },
          { label: "Disponibles", value: totals.available, icon: ShieldCheck },
          { label: "En mission", value: totals.busy, icon: Bike },
          { label: "Espèces détenues", value: formatPrix(totals.cash), icon: Banknote },
          {
            label: "Rémunérations dues",
            value: formatPrix(totals.compensation),
            icon: CircleDollarSign,
          },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{item.label}</p>
                <p className="truncate text-xl font-bold">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {drivers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bike className="size-6" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Aucun livreur enregistré</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Ajoutez votre premier livreur. Des accès temporaires sécurisés seront
              générés pour son application.
            </p>
            <Button className="mt-5" onClick={() => setCreateOpen(true)}>
              <Plus /> Ajouter le premier livreur
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Flotte du restaurant</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table className="min-w-[1020px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Livreur</TableHead>
                  <TableHead>État</TableHead>
                  <TableHead>Mission</TableHead>
                  <TableHead>Montant / livraison</TableHead>
                  <TableHead>Rémunération due</TableHead>
                  <TableHead>Espèces détenues</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="pl-6">
                      <div className="font-semibold">{driver.nom}</div>
                      <div className="text-xs text-muted-foreground">
                        {driver.telephone} · {driver.vehicule}
                        {driver.numeroVehicule ? ` · ${driver.numeroVehicule}` : ""}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatSeenAt(driver.lastSeenAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={availabilityVariant(driver.availability)}>
                        {availabilityLabels[driver.availability]}
                      </Badge>
                    </TableCell>
                    <TableCell>{driver.activeDeliveryNumber ?? "—"}</TableCell>
                    <TableCell className="font-semibold">
                      {driver.fixedDeliveryCompensationFcfa === null
                        ? "Non renseigné"
                        : formatPrix(driver.fixedDeliveryCompensationFcfa)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatPrix(driver.pendingCompensationFcfa)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatPrix(driver.pendingCashFcfa)}
                    </TableCell>
                    <TableCell className="pr-6">
                      <DriverActions driver={driver} onCredentials={setCredentials} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Alert>
        <AlertCircle />
        <AlertTitle>Une seule mission active par livreur</AlertTitle>
        <AlertDescription>
          Un livreur disponible peut refuser une proposition. S’il se déclare
          indisponible, sa proposition en attente est automatiquement refusée.
        </AlertDescription>
      </Alert>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un livreur</DialogTitle>
            <DialogDescription>
              Les accès temporaires seront affichés une seule fois après la création.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="driver-name">Nom complet</Label>
              <Input
                id="driver-name"
                autoComplete="name"
                value={form.nom}
                onChange={(event) => setForm({ ...form, nom: event.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="driver-phone">Téléphone</Label>
              <Input
                id="driver-phone"
                type="tel"
                autoComplete="tel"
                placeholder="+225 07 00 00 00 00"
                value={form.telephone}
                onChange={(event) => setForm({ ...form, telephone: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-vehicle">Véhicule</Label>
              <Select
                value={form.vehicule}
                onValueChange={(vehicule: DriverFleetDTO["vehicule"]) =>
                  setForm({ ...form, vehicule })
                }
              >
                <SelectTrigger id="driver-vehicle" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="moto">Moto</SelectItem>
                  <SelectItem value="velo">Vélo</SelectItem>
                  <SelectItem value="voiture">Voiture</SelectItem>
                  <SelectItem value="tricycle">Tricycle</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-number">
                Immatriculation / numéro (facultatif)
              </Label>
              <Input
                id="driver-number"
                placeholder="Laisser vide si le véhicule n’est pas immatriculé"
                value={form.numeroVehicule}
                onChange={(event) =>
                  setForm({ ...form, numeroVehicule: event.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Aucun numéro de véhicule n’est exigé dans cette version.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="driver-compensation">
                Montant fixe par livraison (facultatif)
              </Label>
              <Input
                id="driver-compensation"
                type="number"
                inputMode="numeric"
                min={1}
                max={1_000_000}
                placeholder="Ex. 300"
                value={form.fixedDeliveryCompensationFcfa}
                onChange={(event) =>
                  setForm({
                    ...form,
                    fixedDeliveryCompensationFcfa: event.target.value,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Recommandé pour informer clairement le livreur. Si le champ reste
                vide, l’accord sera géré hors RestauCI et aucun dû ne sera calculé.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={
                isPending ||
                form.nom.trim().length < 2 ||
                form.telephone.trim().length < 8 ||
                (form.fixedDeliveryCompensationFcfa.trim().length > 0 &&
                  (!Number.isInteger(Number(form.fixedDeliveryCompensationFcfa)) ||
                    Number(form.fixedDeliveryCompensationFcfa) <= 0 ||
                    Number(form.fixedDeliveryCompensationFcfa) > 1_000_000))
              }
              onClick={createDriver}
            >
              {isPending ? <LoaderCircle className="animate-spin" /> : <Plus />}
              Créer le compte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CredentialDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </div>
  );
}
