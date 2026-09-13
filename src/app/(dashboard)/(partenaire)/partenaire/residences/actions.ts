"use server";

import { revalidatePath } from "next/cache";
import { z, ZodError } from "zod";
import { requirePartnerActivity } from "@/modules/partners/server";
import type { SaveResidenceInput } from "@/modules/residences/contracts";
import {
  createResidenceUnavailablePeriod,
  createResidence,
  deleteResidenceUnavailablePeriod,
  publishResidence,
  updateResidence,
  withdrawResidence,
} from "@/modules/residences/server";
import { ResidenceDomainError } from "@/modules/residences/model";
import { geocoder } from "@/infrastructure/geocoding";

const residenceGeocodingSchema = z.object({
  address: z.string().trim().min(3, "Saisissez une adresse plus précise.").max(500),
  city: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
});

function expectedActionError(error: unknown) {
  if (error instanceof ZodError) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[residences] Payload partenaire invalide:",
        error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      );
    }
    return error.issues[0]?.message ?? "Vérifiez les informations saisies.";
  }
  if (error instanceof ResidenceDomainError) return error.message;
  console.error("[residences] action partenaire impossible", error);
  return "Cette action est momentanément impossible.";
}

export async function createResidenceUnavailablePeriodAction(input: {
  residenceId: string;
  checkIn: string;
  checkOut: string;
  reason: string | null;
}) {
  try {
    const partnerAccount = await requirePartnerActivity("residence");
    await createResidenceUnavailablePeriod(partnerAccount.id, input);
    revalidatePath("/partenaire/reservations");
    revalidatePath(`/residences`);
    return { success: true as const, message: "Période indisponible ajoutée." };
  } catch (error) {
    return { success: false as const, message: expectedActionError(error) };
  }
}

export async function deleteResidenceUnavailablePeriodAction(
  residenceId: string,
  periodId: string,
) {
  try {
    const partnerAccount = await requirePartnerActivity("residence");
    const deleted = await deleteResidenceUnavailablePeriod(
      partnerAccount.id,
      residenceId,
      periodId,
    );
    if (!deleted) throw new Error("Période introuvable.");
    revalidatePath("/partenaire/reservations");
    revalidatePath(`/residences`);
    return { success: true as const, message: "Période supprimée." };
  } catch (error) {
    return { success: false as const, message: expectedActionError(error) };
  }
}

export async function geocodeResidenceAddressAction(input: {
  address: string;
  city?: string;
  country?: string;
}) {
  await requirePartnerActivity("residence");
  const parsed = residenceGeocodingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Adresse invalide." };
  }

  const query = [parsed.data.address, parsed.data.city, parsed.data.country]
    .filter(Boolean)
    .join(", ");
  const result = await geocoder(query);
  if (!result) {
    return {
      error: "Adresse introuvable. Ajustez-la ou placez directement le marqueur sur la carte.",
    };
  }

  return { success: true as const, result };
}

export async function createResidenceAction(input: SaveResidenceInput) {
  try {
    const partnerAccount = await requirePartnerActivity("residence");
    const residence = await createResidence(partnerAccount.id, input);
    if (!residence) throw new Error("Création de la résidence impossible.");
    revalidatePath("/partenaire");
    revalidatePath("/partenaire/residences");
    revalidatePath("/admin/residences");
    return {
      success: true as const,
      residenceId: residence.id,
      message: input.publicationIntent
        ? "Résidence créée et transmise pour vérification."
        : "Brouillon de résidence enregistré.",
    };
  } catch (error) {
    return { success: false as const, message: expectedActionError(error) };
  }
}

export async function updateResidenceAction(
  residenceId: string,
  input: SaveResidenceInput,
) {
  try {
    const partnerAccount = await requirePartnerActivity("residence");
    const residence = await updateResidence(partnerAccount.id, residenceId, input);
    if (!residence) throw new Error("Mise à jour de la résidence impossible.");
    revalidatePath("/partenaire/residences");
    revalidatePath(`/partenaire/residences/${residenceId}`);
    revalidatePath("/admin/residences");
    revalidatePath(`/admin/residences/${residenceId}`);
    return {
      success: true as const,
      residenceId,
      message: input.publicationIntent
        ? "Modifications enregistrées et transmises pour une nouvelle vérification."
        : "Brouillon mis à jour.",
    };
  } catch (error) {
    return { success: false as const, message: expectedActionError(error) };
  }
}

export async function publishResidenceAction(residenceId: string) {
  try {
    const partnerAccount = await requirePartnerActivity("residence");
    const residence = await publishResidence(partnerAccount.id, residenceId);
    revalidatePath("/partenaire/residences");
    revalidatePath(`/partenaire/residences/${residenceId}`);
    revalidatePath("/residences");
    revalidatePath(`/residences/${residence.slug}`);
    revalidatePath(`/admin/residences/${residenceId}`);
    return {
      success: true as const,
      message: "La résidence est maintenant visible par les voyageurs.",
    };
  } catch (error) {
    return { success: false as const, message: expectedActionError(error) };
  }
}

export async function withdrawResidenceAction(residenceId: string) {
  try {
    const partnerAccount = await requirePartnerActivity("residence");
    const residence = await withdrawResidence(partnerAccount.id, residenceId);
    revalidatePath("/partenaire/residences");
    revalidatePath(`/partenaire/residences/${residenceId}`);
    revalidatePath("/residences");
    revalidatePath(`/residences/${residence.slug}`);
    revalidatePath(`/admin/residences/${residenceId}`);
    return {
      success: true as const,
      message: "La résidence a été retirée du catalogue public.",
    };
  } catch (error) {
    return { success: false as const, message: expectedActionError(error) };
  }
}
