"use client";

import { Input } from "@/components/motion/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select";
import { StatefulButton } from "@/components/motion/stateful-button";
import { Button } from "@/components/ui/button";
import { Input as FileInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Plus,
  Trash2,
  Upload,
  Utensils,
} from "lucide-react";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import type { MenuItem } from "./types";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const PRICE_FORMATTER = new Intl.NumberFormat("fr-FR");
const EMPTY_ITEM: Omit<MenuItem, "id"> = {
  name: "",
  price: 0,
  category: "",
  description: "",
  photoUrl: null,
};

interface StepMenuProps {
  menu: MenuItem[];
  updateMenu: (newMenu: MenuItem[]) => void;
  categories: string[];
  planName: string;
  onNext: () => void;
  onPrev: () => void;
}

export default function StepMenu({
  menu,
  updateMenu,
  categories,
  planName,
  onNext,
  onPrev,
}: StepMenuProps) {
  const reduceMotion = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addedDishesRef = useRef<HTMLElement>(null);
  const previousMenuLengthRef = useRef(menu.length);
  const [newItem, setNewItem] = useState<Omit<MenuItem, "id">>(EMPTY_ITEM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const onboardingDish = menu[0] ?? null;
  const canAdd =
    !onboardingDish &&
    newItem.name.trim().length >= 2 &&
    categories.includes(newItem.category) &&
    newItem.price > 0 &&
    !isUploading;

  useEffect(() => {
    if (menu.length > previousMenuLengthRef.current) {
      addedDishesRef.current?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    }
    previousMenuLengthRef.current = menu.length;
  }, [menu.length, reduceMotion]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const uploadImage = async (file: File) => {
    const body = new FormData();
    body.set("file", file);
    const response = await fetch("/api/media/upload", {
      method: "POST",
      body,
    });
    const payload = (await response.json()) as {
      url?: string;
      error?: string;
    };

    if (!response.ok || !payload.url) {
      throw new Error(payload.error || "Impossible d’envoyer cette image.");
    }

    return payload.url;
  };

  const selectImage = (file: File) => {
    setImageError(null);

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError("Choisissez une image JPG, PNG ou WebP.");
      return;
    }

    if (file.size === 0 || file.size > MAX_IMAGE_SIZE) {
      setImageError("L’image doit faire moins de 5 Mo.");
      return;
    }

    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) selectImage(file);
    event.target.value = "";
  };

  const handleAddItem = async () => {
    if (!canAdd) return;
    setImageError(null);
    setIsUploading(true);

    try {
      const photoUrl = imageFile ? await uploadImage(imageFile) : null;

      updateMenu([
        ...menu,
        {
          ...newItem,
          id: crypto.randomUUID(),
          name: newItem.name.trim(),
          category: newItem.category.trim(),
          description: newItem.description.trim(),
          photoUrl,
        },
      ]);
      setNewItem(EMPTY_ITEM);
      setImageFile(null);
      setImagePreviewUrl(null);
    } catch (error) {
      setImageError(
        error instanceof Error
          ? error.message
          : "Impossible d’envoyer cette image.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveItem = (id: string) => {
    updateMenu(menu.filter((item) => item.id !== id));
  };

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-semibold tracking-wider text-gray-400 uppercase">
                Étape 4/5
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Donnez envie dès le premier plat
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-gray-500">
              Créez un premier plat pour découvrir le fonctionnement de votre
              carte. Vous pourrez compléter le menu depuis votre tableau de
              bord.
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1  px-4 py-3 text-xs text-emerald-800">
              <span className="font-bold">Offre {planName}</span>
              <span aria-hidden="true">·</span>
              <span>
                {onboardingDish
                  ? "Premier plat ajouté"
                  : "1 plat de démonstration"}
              </span>
              <span aria-hidden="true">·</span>
              <span>{categories.length} catégories initiales</span>
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {!onboardingDish ? (
              <motion.section
                key="dish-form"
                aria-labelledby="new-dish-title"
                initial={
                  reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }
                }
                animate={{ opacity: 1, y: 0 }}
                exit={
                  reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }
                }
                className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
              >
                <div className="border-b border-gray-100 bg-gray-50/70 px-5 py-4 sm:px-6">
                  <h2
                    id="new-dish-title"
                    className="text-sm font-bold text-gray-900"
                  >
                    Nouveau plat
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Le nom, la catégorie et le prix sont nécessaires.
                  </p>
                </div>

                <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
                  <div className="grid content-start gap-5 sm:grid-cols-2">
                    <Input
                      id="onboarding-dish-name"
                      name="dishName"
                      label="Nom du plat"
                      value={newItem.name}
                      onChange={(name) =>
                        setNewItem((current) => ({ ...current, name }))
                      }
                      placeholder="Ex. Garba Royal"
                      autoComplete="off"
                    />
                    <div className="flex flex-col gap-2">
                      <Label
                        id="onboarding-dish-category-label"
                        className="px-1 text-[11px] font-bold tracking-[0.08em] text-[#173c2f]/75 uppercase"
                      >
                        Catégorie
                      </Label>
                      <Select
                        value={newItem.category}
                        onValueChange={(category) =>
                          setNewItem((current) => ({ ...current, category }))
                        }
                        disabled={categories.length === 0}
                      >
                        <SelectTrigger
                          className="h-12 rounded-2xl border-black/8 bg-[#f7faf8] px-4 font-medium"
                        >
                          <span className="sr-only">Catégorie : </span>
                          <SelectValue placeholder="Catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-2 sm:col-span-2">
                      <Label
                        htmlFor="onboarding-dish-description"
                        className="px-1 text-[11px] font-bold tracking-[0.08em] text-[#173c2f]/75 uppercase"
                      >
                        Description courte
                      </Label>
                      <Textarea
                        id="onboarding-dish-description"
                        name="dishDescription"
                        value={newItem.description}
                        onChange={(event) =>
                          setNewItem((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        maxLength={300}
                        rows={3}
                        placeholder="Ingrédients, accompagnement, saveurs…"
                        className="min-h-24 resize-none rounded-2xl border-black/8 bg-[#f7faf8] px-4 py-3 text-sm font-medium text-[#132d24] placeholder:text-[#789087]/70 focus-visible:border-[#0f8a5f]/45 focus-visible:bg-white focus-visible:ring-[#0f8a5f]/10"
                      />
                      <span className="px-1 text-right text-[10px] text-gray-400">
                        {newItem.description.length}/300
                      </span>
                    </div>

                    <Input
                      id="onboarding-dish-price"
                      name="dishPrice"
                      type="number"
                      min={0}
                      step={50}
                      inputMode="numeric"
                      label="Prix (FCFA)"
                      value={newItem.price ? String(newItem.price) : ""}
                      onChange={(price) =>
                        setNewItem((current) => ({
                          ...current,
                          price: Number.parseInt(price, 10) || 0,
                        }))
                      }
                      placeholder="Ex. 5 000"
                      rightIcon={
                        <span className="text-[10px] font-bold text-gray-500">
                          FCFA
                        </span>
                      }
                      className="sm:col-span-2"
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <p className="px-1 text-[11px] font-bold tracking-[0.08em] text-[#173c2f]/75 uppercase">
                      Photo du plat
                      <span className="ml-1 font-medium tracking-normal text-gray-400 normal-case">
                        (optionnel)
                      </span>
                    </p>
                    <FileInput
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      disabled={isUploading}
                      className="sr-only"
                      aria-describedby={
                        imageError ? "onboarding-dish-image-error" : undefined
                      }
                    />

                    <div
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const file = event.dataTransfer.files[0];
                        if (file && !isUploading) selectImage(file);
                      }}
                      className="group relative min-h-56 overflow-hidden rounded-2xl border border-dashed border-emerald-900/15 bg-[#f7faf8] transition-colors hover:border-brand-500/40 hover:bg-emerald-50/40"
                    >
                      {imagePreviewUrl ? (
                        <>
                          <Image
                            src={imagePreviewUrl}
                            alt={`Aperçu de ${newItem.name || "votre plat"}`}
                            fill
                            sizes="272px"
                            className="object-cover"
                            unoptimized
                          />
                          <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-emerald-800 shadow-sm backdrop-blur-sm">
                            Prête à envoyer
                          </span>
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-linear-to-t from-black/75 to-transparent p-3 pt-10">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading}
                            >
                              <Upload aria-hidden="true" />
                              Changer
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon-sm"
                              onClick={() => {
                                setImageFile(null);
                                setImagePreviewUrl(null);
                                setImageError(null);
                              }}
                              disabled={isUploading}
                              aria-label="Retirer la photo"
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="flex min-h-56 w-full flex-col items-center justify-center p-6 text-center outline-none focus-visible:ring-3 focus-visible:ring-brand-500/25 disabled:cursor-wait"
                        >
                          <motion.span
                            animate={
                              isUploading && !reduceMotion
                                ? { rotate: 360 }
                                : { rotate: 0 }
                            }
                            transition={
                              isUploading
                                ? {
                                  duration: 1,
                                  ease: "linear",
                                  repeat: Infinity,
                                }
                                : undefined
                            }
                            className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm ring-1 ring-black/5"
                          >
                            {isUploading ? (
                              <Upload className="size-5" aria-hidden="true" />
                            ) : (
                              <ImagePlus className="size-5" aria-hidden="true" />
                            )}
                          </motion.span>
                          <span className="text-sm font-semibold text-gray-800">
                            Ajouter une photo
                          </span>
                          <span className="mt-1 max-w-44 text-[11px] leading-relaxed text-gray-400">
                            Aperçu local uniquement. L’image sera envoyée avec le
                            plat. JPG, PNG ou WebP, 5&nbsp;Mo max.
                          </span>
                        </button>
                      )}
                    </div>

                    <AnimatePresence initial={false}>
                      {imageError ? (
                        <motion.p
                          id="onboarding-dish-image-error"
                          role="alert"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="px-1 text-xs font-medium text-red-600"
                        >
                          {imageError}
                        </motion.p>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex justify-end border-t border-gray-100 bg-gray-50/50 px-5 py-4 sm:px-6">
                  <div className="flex flex-col items-end gap-2">
                    <StatefulButton
                      type="button"
                      onClick={handleAddItem}
                      disabled={!canAdd}
                      state={isUploading ? "loading" : "idle"}
                      loadingText="Envoi de la photo…"
                      icon={<Plus aria-hidden="true" />}
                      className="h-10 px-4"
                    >
                      Ajouter mon premier plat
                    </StatefulButton>
                  </div>
                </div>
              </motion.section>
            ) : (
              <motion.section
                key="dish-summary"
                ref={addedDishesRef}
                aria-labelledby="added-dish-title"
                initial={
                  reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }
                }
                animate={{ opacity: 1, y: 0 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.98 }
                }
                className="scroll-mt-6 overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm"
              >
                <div className="flex items-center justify-between gap-4 border-b   px-5 py-4 sm:px-6">
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.08em] text-brand-700 uppercase">
                      Premier plat ajouté
                    </p>
                    <h2
                      id="added-dish-title"
                      className="mt-1 text-base font-bold text-gray-900"
                    >
                      Votre démonstration est prête
                    </h2>
                  </div>

                </div>

                <article className="grid gap-5 p-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:p-6">
                  <div className="relative aspect-4/3 overflow-hidden rounded-2xl  sm:aspect-square">
                    {onboardingDish.photoUrl ? (
                      <Image
                        src={onboardingDish.photoUrl}
                        alt={onboardingDish.name}
                        fill
                        sizes="(min-width: 640px) 176px, calc(100vw - 40px)"
                        className="object-cover"
                      />
                    ) : (
                      <Utensils className="absolute inset-0 m-auto size-8 text-brand-300" />
                    )}
                  </div>

                  <div className="flex min-w-0 flex-col justify-center">
                    <span className="w-fit rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                      {onboardingDish.category}
                    </span>
                    <h3 className="mt-3 text-xl font-bold tracking-tight text-gray-900">
                      {onboardingDish.name}
                    </h3>
                    {onboardingDish.description ? (
                      <p className="mt-2 text-sm leading-relaxed text-gray-500">
                        {onboardingDish.description}
                      </p>
                    ) : null}
                    <p className="mt-4 text-lg font-extrabold text-brand-700">
                      {PRICE_FORMATTER.format(onboardingDish.price)} FCFA
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveItem(onboardingDish.id)}
                      className="mt-5 w-fit text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 aria-hidden="true" />
                      Supprimer et recommencer
                    </Button>
                  </div>
                </article>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="z-10 flex shrink-0 items-center justify-between border-t border-gray-100 bg-white/95 p-4 backdrop-blur-sm sm:p-6">
        <Button onClick={onPrev} variant="outline" size="lg">
          <ChevronLeft aria-hidden="true" />
          Retour
        </Button>
        <Button onClick={onNext} size="lg">
          Continuer, aperçu
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
