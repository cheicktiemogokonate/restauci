"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth/get-admin-session";
import {
  AdminTransitionError,
  validerRestaurant,
  rejeterRestaurant,
  suspendreRestaurant,
  reactiverRestaurant,
} from "@/lib/db/mutations-admin";
import { restaurantLogger } from "@/lib/loggers";

async function runRestaurantTransition(
  operation: string,
  restaurantId: string,
  transition: () => Promise<unknown>,
) {
  try {
    await transition();
    return { success: true } as const;
  } catch (error) {
    if (error instanceof AdminTransitionError) {
      return { error: error.message } as const;
    }

    restaurantLogger.error(
      { err: error, operation, restaurantId },
      "Admin restaurant transition failed",
    );
    return {
      error: "Une erreur interne est survenue. Réessayez dans un instant.",
    } as const;
  }
}

export async function validerRestaurantAction(restaurantId: string) {
  const admin = await getAdminSession();
  const result = await runRestaurantTransition(
    "validate",
    restaurantId,
    () => validerRestaurant(restaurantId, admin.userId),
  );
  if ("error" in result) return result;
  revalidatePath("/admin/restaurants");
  revalidatePath(`/admin/restaurants/${restaurantId}`);
  revalidatePath("/restaurateur");
  return { success: true } as const;
}

export async function rejeterRestaurantAction(
  restaurantId: string,
  motif:        string
) {
  if (!motif || motif.trim().length < 5) {
    return { error: "Le motif doit contenir au moins 5 caractères" };
  }
  const admin = await getAdminSession();
  const result = await runRestaurantTransition(
    "reject",
    restaurantId,
    () => rejeterRestaurant(restaurantId, admin.userId, motif.trim()),
  );
  if ("error" in result) return result;
  revalidatePath("/admin/restaurants");
  revalidatePath(`/admin/restaurants/${restaurantId}`);
  revalidatePath("/restaurateur");
  revalidatePath("/restaurateur/profil");
  return { success: true } as const;
}

export async function suspendreRestaurantAction(
  restaurantId: string,
  motif:        string
) {
  if (!motif || motif.trim().length < 5) {
    return { error: "Le motif doit contenir au moins 5 caractères" };
  }
  const admin = await getAdminSession();
  const result = await runRestaurantTransition(
    "suspend",
    restaurantId,
    () => suspendreRestaurant(restaurantId, admin.userId, motif.trim()),
  );
  if ("error" in result) return result;
  revalidatePath("/admin/restaurants");
  revalidatePath(`/admin/restaurants/${restaurantId}`);
  return { success: true } as const;
}

export async function reactiverRestaurantAction(restaurantId: string) {
  const admin = await getAdminSession();
  const result = await runRestaurantTransition(
    "reactivate",
    restaurantId,
    () => reactiverRestaurant(restaurantId, admin.userId),
  );
  if ("error" in result) return result;
  revalidatePath("/admin/restaurants");
  revalidatePath(`/admin/restaurants/${restaurantId}`);
  return { success: true } as const;
}
