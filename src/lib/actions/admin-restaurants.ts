"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth/get-admin-session";
import {
  validerRestaurant,
  rejeterRestaurant,
  suspendreRestaurant,
  reactiverRestaurant,
  modifierTauxCommission,
} from "@/lib/db/mutations-admin";

export async function validerRestaurantAction(restaurantId: string) {
  const admin = await getAdminSession();
  await validerRestaurant(restaurantId, admin.userId);
  revalidatePath("/admin/restaurants");
  revalidatePath(`/admin/restaurants/${restaurantId}`);
  return { success: true };
}

export async function rejeterRestaurantAction(
  restaurantId: string,
  motif:        string
) {
  if (!motif || motif.trim().length < 5) {
    return { error: "Le motif doit contenir au moins 5 caractères" };
  }
  const admin = await getAdminSession();
  await rejeterRestaurant(restaurantId, admin.userId, motif.trim());
  revalidatePath("/admin/restaurants");
  revalidatePath(`/admin/restaurants/${restaurantId}`);
  return { success: true };
}

export async function suspendreRestaurantAction(
  restaurantId: string,
  motif:        string
) {
  if (!motif || motif.trim().length < 5) {
    return { error: "Le motif doit contenir au moins 5 caractères" };
  }
  const admin = await getAdminSession();
  await suspendreRestaurant(restaurantId, admin.userId, motif.trim());
  revalidatePath("/admin/restaurants");
  revalidatePath(`/admin/restaurants/${restaurantId}`);
  return { success: true };
}

export async function reactiverRestaurantAction(restaurantId: string) {
  const admin = await getAdminSession();
  await reactiverRestaurant(restaurantId, admin.userId);
  revalidatePath("/admin/restaurants");
  revalidatePath(`/admin/restaurants/${restaurantId}`);
  return { success: true };
}

export async function modifierCommissionAction(
  restaurantId:   string,
  nouveauTauxPourcent: number
) {
  if (nouveauTauxPourcent < 0 || nouveauTauxPourcent > 50) {
    return { error: "Le taux doit être entre 0% et 50%" };
  }
  const admin   = await getAdminSession();
  const tauxBps = Math.round(nouveauTauxPourcent * 100);
  await modifierTauxCommission(restaurantId, admin.userId, tauxBps);
  revalidatePath(`/admin/restaurants/${restaurantId}`);
  return { success: true };
}
