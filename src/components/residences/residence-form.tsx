"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  GripVertical,
  ImagePlus,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  createResidenceAction,
  updateResidenceAction,
} from "@/app/(dashboard)/partenaire/residences/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResidenceLocationPicker } from "@/components/residences/residence-location-picker";
import type {
  PartnerResidenceDTO,
  SaveResidenceInput,
} from "@/modules/residences/contracts";

type PhotoDraft = { url: string; altText: string | null };

function messageFor(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Une erreur inattendue est survenue.";
}

export function ResidenceForm({
  residence,
}: {
  residence?: PartnerResidenceDTO;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [title, setTitle] = useState(residence?.title ?? "");
  const [description, setDescription] = useState(residence?.description ?? "");
  const [price, setPrice] = useState(
    residence ? String(residence.pricePerNightFcfa) : "",
  );
  const [maxGuests, setMaxGuests] = useState(
    residence ? String(residence.maxGuests) : "",
  );
  const [address, setAddress] = useState(residence?.address ?? "");
  const [city, setCity] = useState(residence?.city ?? "");
  const [country, setCountry] = useState(residence?.country ?? "Côte d’Ivoire");
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(
    residence?.latitude !== null &&
      residence?.latitude !== undefined &&
      residence?.longitude !== null &&
      residence?.longitude !== undefined
      ? { latitude: residence.latitude, longitude: residence.longitude }
      : null,
  );
  const [publicationIntent, setPublicationIntent] = useState(
    residence?.publicationIntent ?? false,
  );
  const [photos, setPhotos] = useState<PhotoDraft[]>(
    residence?.photos.map(({ url, altText }) => ({ url, altText })) ?? [],
  );

  async function uploadPhoto(file: File | undefined) {
    if (!file || photos.length >= 12) return;
    setMessage(null);
    setUploading(true);
    try {
      const data = new FormData();
      data.set("file", file);
      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: data,
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Envoi de la photo impossible.");
      }
      setPhotos((current) => [
        ...current,
        { url: payload.url!, altText: title || null },
      ]);
      setMessage({ kind: "success", text: "Photo ajoutée." });
    } catch (error) {
      setMessage({ kind: "error", text: messageFor(error) });
    } finally {
      setUploading(false);
    }
  }

  function payload(): SaveResidenceInput {
    return {
      title,
      description,
      pricePerNightFcfa: Number(price),
      maxGuests: Number(maxGuests),
      address,
      city,
      country,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      publicationIntent,
      photos,
    };
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = residence
          ? await updateResidenceAction(residence.id, payload())
          : await createResidenceAction(payload());
        if (!result.success) {
          setMessage({ kind: "error", text: result.message });
          return;
        }
        setMessage({ kind: "success", text: result.message });
        const outcome = publicationIntent ? "review-requested" : "draft-saved";
        router.replace(`/partenaire/residences?result=${outcome}`);
      } catch (error) {
        setMessage({ kind: "error", text: messageFor(error) });
      }
    });
  }

  return (
    <div className="space-y-6">
      {residence?.moderationStatus === "rejected" && residence.motifRejet ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Corrections demandées</AlertTitle>
          <AlertDescription>{residence.motifRejet}</AlertDescription>
        </Alert>
      ) : null}
      {residence?.moderationStatus === "approved" ? (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
          <CheckCircle2 />
          <AlertTitle>Résidence validée</AlertTitle>
          <AlertDescription>
            Toute modification du contenu déclenchera une nouvelle vérification.
          </AlertDescription>
        </Alert>
      ) : null}
      {residence?.moderationStatus === "suspended" ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Résidence suspendue</AlertTitle>
          <AlertDescription>
            {residence.motifSuspension ?? "Contactez l’équipe Toutci."}
          </AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert variant={message.kind === "error" ? "destructive" : "default"}>
          {message.kind === "error" ? <AlertCircle /> : <CheckCircle2 />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Informations du logement</CardTitle>
          <CardDescription>
            Décrivez précisément le séjour proposé. Le prix est enregistré en FCFA par nuit.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="residence-title">Nom de la résidence</Label>
            <Input id="residence-title" value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} maxLength={160} disabled={residence?.moderationStatus === "suspended"} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="residence-description">Description</Label>
            <Textarea id="residence-description" value={description} onChange={(event) => setDescription(event.target.value)} minLength={30} maxLength={3000} rows={7} disabled={residence?.moderationStatus === "suspended"} />
            <p className="text-xs text-muted-foreground">30 caractères minimum.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="residence-price">Prix par nuit (FCFA)</Label>
            <Input id="residence-price" type="number" min={1000} step={500} value={price} onChange={(event) => setPrice(event.target.value)} disabled={residence?.moderationStatus === "suspended"} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="residence-capacity">Nombre maximal de voyageurs</Label>
            <Input id="residence-capacity" type="number" min={1} max={100} value={maxGuests} onChange={(event) => setMaxGuests(event.target.value)} disabled={residence?.moderationStatus === "suspended"} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adresse et localisation</CardTitle>
          <CardDescription>
            Recherchez l’adresse, utilisez votre position ou placez directement le marqueur.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResidenceLocationPicker
            address={address}
            city={city}
            country={country}
            coordinates={coordinates}
            onAddressChange={setAddress}
            onCityChange={setCity}
            onCountryChange={setCountry}
            onCoordinatesChange={setCoordinates}
            disabled={residence?.moderationStatus === "suspended"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
          <CardDescription>Jusqu’à 12 images JPEG, PNG ou WebP, 5 Mo maximum chacune.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {photos.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo, index) => (
                <div key={`${photo.url}-${index}`} className="overflow-hidden rounded-xl border bg-white">
                  <div className="relative aspect-[4/3] bg-slate-100">
                    <Image src={photo.url} alt={photo.altText ?? title ?? "Photo de la résidence"} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" unoptimized />
                  </div>
                  <div className="flex items-center gap-2 p-2">
                    <GripVertical className="size-4 text-slate-400" aria-hidden />
                    <span className="min-w-0 flex-1 text-xs text-slate-600">Photo {index + 1}</span>
                    <Button type="button" size="icon" variant="ghost" aria-label={`Retirer la photo ${index + 1}`} onClick={() => setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))} disabled={residence?.moderationStatus === "suspended"}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Aucune photo ajoutée. Une photo est requise pour demander la vérification.</p>
          )}
          {photos.length < 12 && residence?.moderationStatus !== "suspended" ? (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
              Ajouter une photo
              <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => void uploadPhoto(event.target.files?.[0])} />
            </label>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-4 rounded-xl border bg-white p-5">
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 size-4 accent-emerald-700" checked={publicationIntent} onChange={(event) => setPublicationIntent(event.target.checked)} disabled={residence?.moderationStatus === "suspended"} />
          <span><span className="block text-sm font-semibold">Demander la vérification de la fiche</span><span className="mt-1 block text-sm leading-6 text-muted-foreground">Le logement sera transmis à l’équipe Toutci. Après la validation de la fiche, de votre identité et de la destination, vous déciderez vous-même quand le publier.</span></span>
        </label>
        <div className="flex justify-end">
          <Button type="button" onClick={save} disabled={isPending || uploading || residence?.moderationStatus === "suspended"}>
            {isPending ? <Loader2 className="animate-spin" /> : null}
            {publicationIntent ? "Enregistrer et demander la vérification" : "Enregistrer le brouillon"}
          </Button>
        </div>
      </div>
    </div>
  );
}
