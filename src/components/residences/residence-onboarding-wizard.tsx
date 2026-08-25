"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  Home,
  ImagePlus,
  Images,
  Loader2,
  MapPin,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { createResidenceAction } from "@/app/(dashboard)/partenaire/residences/actions";
import { ResidenceLocationPicker } from "@/components/residences/residence-location-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SaveResidenceInput } from "@/modules/residences/contracts";

type PhotoDraft = { url: string; altText: string | null };

interface ResidenceDraft {
  title: string;
  description: string;
  price: string;
  maxGuests: string;
  address: string;
  city: string;
  country: string;
  coordinates: { latitude: number; longitude: number } | null;
  photos: PhotoDraft[];
}

const INITIAL_DRAFT: ResidenceDraft = {
  title: "",
  description: "",
  price: "",
  maxGuests: "",
  address: "",
  city: "",
  country: "Côte d’Ivoire",
  coordinates: null,
  photos: [],
};

const STEPS = [
  {
    number: 1,
    title: "Le logement",
    description: "Nom, description, prix et capacité",
    icon: Home,
  },
  {
    number: 2,
    title: "La localisation",
    description: "Adresse et position sur la carte",
    icon: MapPin,
  },
  {
    number: 3,
    title: "Les photos",
    description: "Quelques images pour présenter le lieu",
    icon: Images,
  },
  {
    number: 4,
    title: "Vérifier et enregistrer",
    description: "Relire avant de créer la résidence",
    icon: ClipboardCheck,
  },
] as const;

function messageFor(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Une erreur inattendue est survenue.";
}

function loadDraft(storageKey: string): ResidenceDraft {
  if (typeof window === "undefined") return INITIAL_DRAFT;
  try {
    const cached = window.localStorage.getItem(storageKey);
    if (!cached) return INITIAL_DRAFT;
    const parsed = JSON.parse(cached) as Partial<ResidenceDraft>;
    return {
      ...INITIAL_DRAFT,
      ...parsed,
      coordinates: parsed.coordinates ?? null,
      photos: Array.isArray(parsed.photos) ? parsed.photos.slice(0, 12) : [],
    };
  } catch {
    return INITIAL_DRAFT;
  }
}

export function ResidenceOnboardingWizard({
  partnerAccountId,
}: {
  partnerAccountId: string;
}) {
  const router = useRouter();
  const storageKey = `toutci_residence_onboarding:${partnerAccountId}`;
  const stepKey = `${storageKey}:step`;
  const [draft, setDraft] = useState<ResidenceDraft>(() => loadDraft(storageKey));
  const [currentStep, setCurrentStep] = useState(() => {
    if (typeof window === "undefined") return 1;
    const saved = Number(window.localStorage.getItem(stepKey));
    return Number.isInteger(saved) ? Math.min(4, Math.max(1, saved)) : 1;
  });
  const [furthestStep, setFurthestStep] = useState(currentStep);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const updateDraft = (patch: Partial<ResidenceDraft>) => {
    setDraft((current) => {
      const next = { ...current, ...patch };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Le formulaire reste utilisable si le stockage local est indisponible.
      }
      return next;
    });
  };

  const goToStep = (step: number) => {
    if (step > furthestStep) return;
    setCurrentStep(step);
    try {
      window.localStorage.setItem(stepKey, String(step));
    } catch {
      // Navigation locale seulement.
    }
    setMessage(null);
  };

  const validateCurrentStep = () => {
    if (currentStep === 1) {
      if (draft.title.trim().length < 3) return "Donnez un nom au logement.";
      if (draft.description.trim().length < 30) {
        return "Ajoutez une description d’au moins 30 caractères.";
      }
      if (!Number.isInteger(Number(draft.price)) || Number(draft.price) < 1_000) {
        return "Indiquez un prix par nuit d’au moins 1 000 FCFA.";
      }
      if (
        !Number.isInteger(Number(draft.maxGuests)) ||
        Number(draft.maxGuests) < 1 ||
        Number(draft.maxGuests) > 100
      ) {
        return "Indiquez une capacité comprise entre 1 et 100 voyageurs.";
      }
    }
    if (currentStep === 2) {
      if (draft.address.trim().length < 5) return "Précisez l’adresse du logement.";
      if (draft.city.trim().length < 2) return "Précisez la ville ou la localité.";
      if (draft.country.trim().length < 2) return "Précisez le pays.";
      if (!draft.coordinates) {
        return "Confirmez la position en cliquant sur la carte ou en utilisant votre position.";
      }
    }
    return null;
  };

  const nextStep = () => {
    const error = validateCurrentStep();
    if (error) {
      setMessage(error);
      return;
    }
    const next = Math.min(4, currentStep + 1);
    setCurrentStep(next);
    setFurthestStep((current) => Math.max(current, next));
    setMessage(null);
    try {
      window.localStorage.setItem(stepKey, String(next));
    } catch {
      // Navigation locale seulement.
    }
  };

  async function uploadPhoto(file: File | undefined) {
    if (!file || draft.photos.length >= 12) return;
    setMessage(null);
    setUploading(true);
    try {
      const data = new FormData();
      data.set("file", file);
      const response = await fetch("/api/media/upload", { method: "POST", body: data });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Envoi de la photo impossible.");
      }
      updateDraft({
        photos: [...draft.photos, { url: payload.url, altText: draft.title || null }],
      });
    } catch (error) {
      setMessage(messageFor(error));
    } finally {
      setUploading(false);
    }
  }

  const save = (publicationIntent: boolean) => {
    if (publicationIntent && draft.photos.length === 0) {
      setMessage("Ajoutez au moins une photo avant d’envoyer le logement en vérification.");
      return;
    }
    if (!draft.coordinates) {
      setMessage("La position du logement doit être confirmée avant l’enregistrement.");
      return;
    }

    const payload: SaveResidenceInput = {
      title: draft.title,
      description: draft.description,
      pricePerNightFcfa: Number(draft.price),
      maxGuests: Number(draft.maxGuests),
      address: draft.address,
      city: draft.city,
      country: draft.country,
      latitude: draft.coordinates.latitude,
      longitude: draft.coordinates.longitude,
      publicationIntent,
      photos: draft.photos,
    };

    setMessage(null);
    startTransition(async () => {
      try {
        const result = await createResidenceAction(payload);
        if (!result.success) {
          setMessage(result.message);
          return;
        }
        window.localStorage.removeItem(storageKey);
        window.localStorage.removeItem(stepKey);
        const outcome = publicationIntent ? "review-requested" : "draft-saved";
        router.replace(`/partenaire/residences?result=${outcome}`);
      } catch (error) {
        setMessage(messageFor(error));
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="mb-3 flex items-center justify-between lg:block">
          <p className="text-sm font-semibold text-emerald-800">
            Étape {currentStep} sur {STEPS.length}
          </p>
          <div className="flex gap-1.5 lg:hidden" aria-hidden>
            {STEPS.map((step) => (
              <span
                key={step.number}
                className={`h-1.5 rounded-full ${
                  step.number <= currentStep ? "w-5 bg-emerald-700" : "w-2 bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>
        <ol className="hidden space-y-2 lg:block">
          {STEPS.map((step) => {
            const StepIcon = step.icon;
            const completed = step.number < currentStep;
            const active = step.number === currentStep;
            const available = step.number <= furthestStep;
            return (
              <li key={step.number}>
                <button
                  type="button"
                  onClick={() => goToStep(step.number)}
                  disabled={!available}
                  aria-current={active ? "step" : undefined}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                    active
                      ? "bg-emerald-50 text-emerald-950"
                      : available
                        ? "text-slate-700 hover:bg-white"
                        : "cursor-not-allowed text-slate-400"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border ${
                      completed
                        ? "border-emerald-700 bg-emerald-700 text-white"
                        : active
                          ? "border-emerald-700 bg-white text-emerald-800"
                          : "border-slate-200 bg-white"
                    }`}
                  >
                    {completed ? <Check className="size-4" /> : <StepIcon className="size-4" />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{step.title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                      {step.description}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      <section className="min-w-0 rounded-2xl border bg-white">
        <div className="border-b px-5 py-5 sm:px-7">
          <h2 className="text-xl font-semibold text-slate-950">{STEPS[currentStep - 1].title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {STEPS[currentStep - 1].description}
          </p>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-7">
          {message ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}

          {currentStep === 1 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="onboarding-residence-title">Nom de la résidence</Label>
                <Input
                  id="onboarding-residence-title"
                  value={draft.title}
                  onChange={(event) => updateDraft({ title: event.target.value })}
                  placeholder="Ex. Villa Lagune Assinie"
                  minLength={3}
                  maxLength={160}
                  autoFocus
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="onboarding-residence-description">Description</Label>
                <Textarea
                  id="onboarding-residence-description"
                  value={draft.description}
                  onChange={(event) => updateDraft({ description: event.target.value })}
                  placeholder="Décrivez simplement le lieu, l’ambiance et ce que les voyageurs y trouveront."
                  minLength={30}
                  maxLength={3000}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">30 caractères minimum.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboarding-residence-price">Prix par nuit (FCFA)</Label>
                <Input
                  id="onboarding-residence-price"
                  type="number"
                  min={1000}
                  step={500}
                  inputMode="numeric"
                  value={draft.price}
                  onChange={(event) => updateDraft({ price: event.target.value })}
                  placeholder="Ex. 75000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboarding-residence-guests">Voyageurs maximum</Label>
                <Input
                  id="onboarding-residence-guests"
                  type="number"
                  min={1}
                  max={100}
                  inputMode="numeric"
                  value={draft.maxGuests}
                  onChange={(event) => updateDraft({ maxGuests: event.target.value })}
                  placeholder="Ex. 6"
                />
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <ResidenceLocationPicker
              address={draft.address}
              city={draft.city}
              country={draft.country}
              coordinates={draft.coordinates}
              onAddressChange={(address) => updateDraft({ address })}
              onCityChange={(city) => updateDraft({ city })}
              onCountryChange={(country) => updateDraft({ country })}
              onCoordinatesChange={(coordinates) => updateDraft({ coordinates })}
            />
          ) : null}

          {currentStep === 3 ? (
            <div className="space-y-5">
              <div>
                <p className="text-sm leading-6 text-slate-600">
                  Vous pouvez passer cette étape et garder un brouillon. Une photo sera
                  nécessaire seulement pour envoyer le logement en vérification.
                </p>
              </div>
              {draft.photos.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {draft.photos.map((photo, index) => (
                    <div key={`${photo.url}-${index}`} className="overflow-hidden rounded-xl border">
                      <div className="relative aspect-[4/3] bg-slate-100">
                        <Image
                          src={photo.url}
                          alt={photo.altText ?? draft.title ?? "Photo de la résidence"}
                          fill
                          sizes="(max-width: 640px) 100vw, 40vw"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="text-xs text-slate-600">Photo {index + 1}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Retirer la photo ${index + 1}`}
                          onClick={() =>
                            updateDraft({
                              photos: draft.photos.filter((_, itemIndex) => itemIndex !== index),
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed px-5 py-8 text-center">
                  <Images className="mx-auto size-6 text-slate-400" />
                  <p className="mt-2 text-sm font-medium text-slate-800">Aucune photo pour le moment</p>
                  <p className="mt-1 text-xs text-slate-500">JPEG, PNG ou WebP, 5 Mo maximum.</p>
                </div>
              )}
              {draft.photos.length < 12 ? (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                  Ajouter une photo
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploading}
                    onChange={(event) => void uploadPhoto(event.target.files?.[0])}
                  />
                </label>
              ) : null}
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div className="space-y-6">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Logement</dt>
                  <dd className="mt-1 font-semibold text-slate-950">{draft.title}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Prix et capacité</dt>
                  <dd className="mt-1 font-semibold text-slate-950">
                    {Number(draft.price).toLocaleString("fr-FR")} FCFA / nuit · {draft.maxGuests} voyageur{Number(draft.maxGuests) > 1 ? "s" : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Localisation</dt>
                  <dd className="mt-1 font-semibold text-slate-950">{draft.address}, {draft.city}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Photos</dt>
                  <dd className="mt-1 font-semibold text-slate-950">
                    {draft.photos.length} photo{draft.photos.length > 1 ? "s" : ""}
                  </dd>
                </div>
              </dl>

              <div className="rounded-xl bg-emerald-50 p-4 text-emerald-950">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold">Vérification de l’identité du propriétaire</h3>
                    <p className="mt-1 text-sm leading-6 text-emerald-900">
                      Avant de pouvoir publier, Toutci vérifiera dans un espace sécurisé
                      l’identité de la personne responsable du logement à partir d’une
                      pièce d’identité. Ces documents restent privés et ne sont jamais
                      affichés aux voyageurs.
                    </p>
                    <p className="mt-2 text-xs leading-5 text-emerald-800">
                      Cette vérification est séparée de la création du logement : vous pourrez la terminer ensuite, puis choisir vous-même le moment de la publication.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <h3 className="text-sm font-semibold text-slate-950">Que souhaitez-vous faire ?</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Gardez un brouillon pour compléter plus tard, ou envoyez maintenant le contenu à l’équipe Toutci.
                </p>
                {draft.photos.length === 0 ? (
                  <p className="mt-3 text-xs font-medium text-amber-700">
                    Ajoutez une photo pour pouvoir envoyer le logement en vérification.
                  </p>
                ) : null}
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" onClick={() => save(false)} disabled={isPending || uploading}>
                    Enregistrer le brouillon
                  </Button>
                  <Button type="button" onClick={() => save(true)} disabled={isPending || uploading || draft.photos.length === 0}>
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />}
                    Envoyer pour vérification
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t px-5 py-4 sm:px-7">
          <Button
            type="button"
            variant="ghost"
            onClick={() => goToStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1 || isPending}
          >
            <ArrowLeft className="size-4" />
            Précédent
          </Button>
          {currentStep < 4 ? (
            <Button type="button" onClick={nextStep} disabled={uploading}>
              Continuer
              <ArrowRight className="size-4" />
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
