"use client";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  deleteOpeningHoursAction,
  saveOpeningHoursAction,
  toggleOpeningHoursAction,
  type OpeningHoursInput,
} from "@/lib/actions/restaurant";
import type { CreneauHoraire } from "@/lib/db/types";
import { Clock3, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

const days = [
  { id: "lun", label: "Lun" },
  { id: "mar", label: "Mar" },
  { id: "mer", label: "Mer" },
  { id: "jeu", label: "Jeu" },
  { id: "ven", label: "Ven" },
  { id: "sam", label: "Sam" },
  { id: "dim", label: "Dim" },
] as const;

const defaultForm: OpeningHoursInput = {
  nom: "",
  heureOuverture: "08:00",
  heureFermeture: "18:00",
  joursActifs: ["lun", "mar", "mer", "jeu", "ven"],
  actif: true,
};

function formatDays(activeDays: string[]) {
  return days
    .filter((day) => activeDays.includes(day.id))
    .map((day) => day.label)
    .join(" · ");
}

export default function OpeningHoursManager({
  initialCreneaux,
}: {
  initialCreneaux: CreneauHoraire[];
}) {
  const [creneaux, setCreneaux] = useState(initialCreneaux);
  const [form, setForm] = useState<OpeningHoursInput>(defaultForm);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const openCreate = () => {
    setForm(defaultForm);
    setOpen(true);
  };

  const openEdit = (creneau: CreneauHoraire) => {
    setForm({
      id: creneau.id,
      nom: creneau.nom,
      heureOuverture: creneau.heureOuverture.slice(0, 5),
      heureFermeture: creneau.heureFermeture.slice(0, 5),
      joursActifs: creneau.joursActifs as OpeningHoursInput["joursActifs"],
      actif: creneau.actif,
    });
    setOpen(true);
  };

  const save = () => {
    startTransition(async () => {
      const result = await saveOpeningHoursAction(form);
      if (result.error || !result.creneau) {
        toast.error(result.error ?? "Impossible d'enregistrer ce créneau.");
        return;
      }

      setCreneaux((current) => {
        const exists = current.some((item) => item.id === result.creneau.id);
        return exists
          ? current.map((item) => (item.id === result.creneau.id ? result.creneau : item))
          : [...current, result.creneau];
      });
      setOpen(false);
      toast.success(form.id ? "Créneau mis à jour." : "Créneau ajouté.");
    });
  };

  const toggle = (id: string, actif: boolean) => {
    const previous = creneaux;
    setCreneaux((current) => current.map((item) => (item.id === id ? { ...item, actif } : item)));

    startTransition(async () => {
      const result = await toggleOpeningHoursAction(id, actif);
      if (result.error) {
        setCreneaux(previous);
        toast.error(result.error);
        return;
      }
      toast.success(actif ? "Créneau activé." : "Créneau désactivé.");
    });
  };

  const remove = () => {
    if (!deleteId) return;
    const currentId = deleteId;

    startTransition(async () => {
      const result = await deleteOpeningHoursAction(currentId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setCreneaux((current) => current.filter((item) => item.id !== currentId));
      setDeleteId(null);
      toast.success("Créneau supprimé.");
    });
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
              <Clock3 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle>Horaires d&apos;ouverture</CardTitle>
              <CardDescription>Ils informent les clients et les créneaux liés aux plats. Ils ne changent pas automatiquement l&apos;état en ligne.</CardDescription>
            </div>
          </div>
          <Button type="button" size="lg" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Ajouter un créneau
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {creneaux.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">Aucun horaire défini. Ajoutez un créneau, par exemple « Déjeuner ».</p>
        ) : (
          <div className="divide-y rounded-xl border border-border/70">
            {creneaux.map((creneau) => (
              <div key={creneau.id} className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{creneau.nom}</p>
                    <Badge variant={creneau.actif ? "secondary" : "outline"}>{creneau.actif ? "Actif" : "Désactivé"}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{creneau.heureOuverture.slice(0, 5)} – {creneau.heureFermeture.slice(0, 5)} · {formatDays(creneau.joursActifs)}</p>
                </div>
                <div className="flex items-center justify-between gap-1 sm:justify-end">
                  <Switch checked={creneau.actif} onCheckedChange={(checked) => toggle(creneau.id, checked)} disabled={isPending} aria-label={`Activer ${creneau.nom}`} className="data-checked:bg-brand-green" />
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => openEdit(creneau)} disabled={isPending} aria-label={`Modifier ${creneau.nom}`}><Pencil className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => setDeleteId(creneau.id)} disabled={isPending} aria-label={`Supprimer ${creneau.nom}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle>{form.id ? "Modifier le créneau" : "Ajouter un créneau"}</DialogTitle>
            <DialogDescription>Un créneau peut couvrir minuit, par exemple de 18:00 à 02:00.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid gap-2"><Label htmlFor="creneau-nom">Nom du créneau</Label><Input id="creneau-nom" value={form.nom} onChange={(event) => setForm((current) => ({ ...current, nom: event.target.value }))} placeholder="Ex. Déjeuner" disabled={isPending} /></div>
            <div className="grid grid-cols-2 gap-3"><div className="grid gap-2"><Label htmlFor="creneau-ouverture">Ouverture</Label><Input id="creneau-ouverture" type="time" value={form.heureOuverture} onChange={(event) => setForm((current) => ({ ...current, heureOuverture: event.target.value }))} disabled={isPending} /></div><div className="grid gap-2"><Label htmlFor="creneau-fermeture">Fermeture</Label><Input id="creneau-fermeture" type="time" value={form.heureFermeture} onChange={(event) => setForm((current) => ({ ...current, heureFermeture: event.target.value }))} disabled={isPending} /></div></div>
            <div className="grid gap-2"><Label>Jours concernés</Label><div className="grid grid-cols-2 gap-2 rounded-xl border border-input bg-muted/20 p-3 sm:grid-cols-4">{days.map((day) => <div key={day.id} className="flex items-center gap-2"><Checkbox id={`creneau-${day.id}`} checked={form.joursActifs.includes(day.id)} onCheckedChange={(checked) => setForm((current) => ({ ...current, joursActifs: checked ? [...new Set([...current.joursActifs, day.id])] : current.joursActifs.filter((item) => item !== day.id) }))} disabled={isPending} /><Label htmlFor={`creneau-${day.id}`}>{day.label}</Label></div>)}</div></div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/20 p-3"><div><p className="text-sm font-semibold">Créneau actif</p><p className="text-xs text-muted-foreground">Un créneau désactivé n&apos;est pas utilisé pour la disponibilité liée.</p></div><Switch checked={form.actif} onCheckedChange={(actif) => setForm((current) => ({ ...current, actif }))} disabled={isPending} className="data-checked:bg-brand-green" /></div>
            <Button type="button" size="lg" className="w-full" onClick={save} disabled={isPending || form.nom.trim().length < 2 || form.joursActifs.length === 0}>{isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}{form.id ? "Enregistrer le créneau" : "Ajouter le créneau"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(isOpen) => !isOpen && setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Supprimer ce créneau ?</AlertDialogTitle><AlertDialogDescription>Les plats liés à ce créneau ne seront plus limités par ses horaires.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={remove} disabled={isPending}>{isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}Supprimer</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
