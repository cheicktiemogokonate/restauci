"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { getAdminSession } from "@/modules/auth/server";
import {
  approveResidence,
  reactivateResidence,
  rejectResidence,
  suspendResidence,
} from "@/modules/residences/server";
import { ResidenceDomainError } from "@/modules/residences/model";

function expectedActionError(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Vérifiez les informations saisies.";
  }
  if (error instanceof ResidenceDomainError) return error.message;
  console.error("[residences] action admin impossible", error);
  return "La décision est momentanément impossible.";
}

function refreshResidence(residenceId: string) {
  revalidatePath("/admin/residences");
  revalidatePath(`/admin/residences/${residenceId}`);
  revalidatePath("/partenaire/residences");
  revalidatePath(`/partenaire/residences/${residenceId}`);
}

export async function approveResidenceAction(residenceId: string) {
  try {
    const admin = await getAdminSession();
    await approveResidence(admin.userId, residenceId);
    refreshResidence(residenceId);
    return { success: true as const, message: "Résidence validée." };
  } catch (error) {
    return { success: false as const, message: expectedActionError(error) };
  }
}

export async function rejectResidenceAction(input: { residenceId: string; reason: string }) {
  try {
    const admin = await getAdminSession();
    await rejectResidence(admin.userId, input);
    refreshResidence(input.residenceId);
    return { success: true as const, message: "Corrections demandées au partenaire." };
  } catch (error) {
    return { success: false as const, message: expectedActionError(error) };
  }
}

export async function suspendResidenceAction(input: { residenceId: string; reason: string }) {
  try {
    const admin = await getAdminSession();
    await suspendResidence(admin.userId, input);
    refreshResidence(input.residenceId);
    return { success: true as const, message: "Résidence suspendue." };
  } catch (error) {
    return { success: false as const, message: expectedActionError(error) };
  }
}

export async function reactivateResidenceAction(residenceId: string) {
  try {
    const admin = await getAdminSession();
    await reactivateResidence(admin.userId, residenceId);
    refreshResidence(residenceId);
    return { success: true as const, message: "Résidence réactivée." };
  } catch (error) {
    return { success: false as const, message: expectedActionError(error) };
  }
}
