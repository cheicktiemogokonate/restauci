"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/modules/auth/server";
import {
  reactivateAdminRestaurant,
  rejectAdminRestaurant,
  suspendAdminRestaurant,
  validateAdminRestaurant,
} from "@/modules/restaurants/server";
import { RestaurantAdminTransitionError } from "@/modules/restaurants/model";
import { restaurantLogger } from "@/infrastructure/loggers";

async function runRestaurantTransition(
  operation: string,
  restaurantId: string,
  transition: () => Promise<unknown>,
) {
  try {
    await transition();
    return { success: true } as const;
  } catch (error) {
    if (error instanceof RestaurantAdminTransitionError) {
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
    () => validateAdminRestaurant(restaurantId, admin.userId),
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
    () => rejectAdminRestaurant(restaurantId, admin.userId, motif),
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
    () => suspendAdminRestaurant(restaurantId, admin.userId, motif),
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
    () => reactivateAdminRestaurant(restaurantId, admin.userId),
  );
  if ("error" in result) return result;
  revalidatePath("/admin/restaurants");
  revalidatePath(`/admin/restaurants/${restaurantId}`);
  return { success: true } as const;
}
