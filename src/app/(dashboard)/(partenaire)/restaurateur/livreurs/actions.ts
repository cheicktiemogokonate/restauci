"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireCurrentPartnerContext } from "@/modules/partners/server";
import { getRestaurantAccessByPartnerAccountId } from "@/modules/restaurants/server";
import {
  DeliveryDomainError,
  confirmDriverCashRemittance,
  confirmDriverCompensationPayment,
  createRestaurantDriver,
  deactivateRestaurantDriver,
  resetDriverCredentials,
  updateRestaurantDriver,
} from "@/modules/deliveries/server";
import type { CreateRestaurantDriverCommand } from "@/modules/deliveries/contracts";

interface ActionSuccess<T> {
  success: true;
  data: T;
}

interface ActionFailure {
  success: false;
  error: string;
}

export type DeliveryActionResult<T> = ActionSuccess<T> | ActionFailure;

async function getActor() {
  const { identity, partnerAccount } = await requireCurrentPartnerContext(
    "restaurant",
  );
  const restaurant = await getRestaurantAccessByPartnerAccountId(partnerAccount.id);
  if (!restaurant) throw new Error("Restaurant introuvable");
  return { userId: identity.userId, restaurantId: restaurant.id };
}

function actionError(error: unknown): ActionFailure {
  if (error instanceof DeliveryDomainError) {
    return { success: false, error: error.message };
  }
  if (error instanceof ZodError) {
    return {
      success: false,
      error: error.issues[0]?.message ?? "Données invalides.",
    };
  }
  return { success: false, error: "Action temporairement impossible." };
}

export async function createDriverAction(
  command: CreateRestaurantDriverCommand,
) {
  try {
    const result = await createRestaurantDriver(await getActor(), command);
    revalidatePath("/restaurateur/livreurs");
    return { success: true, data: result } satisfies DeliveryActionResult<typeof result>;
  } catch (error) {
    return actionError(error);
  }
}

export async function resetDriverCredentialsAction(driverId: string) {
  try {
    const credentials = await resetDriverCredentials(await getActor(), driverId);
    revalidatePath("/restaurateur/livreurs");
    return {
      success: true,
      data: credentials,
    } satisfies DeliveryActionResult<typeof credentials>;
  } catch (error) {
    return actionError(error);
  }
}

export async function deactivateDriverAction(driverId: string) {
  try {
    const result = await deactivateRestaurantDriver(await getActor(), driverId);
    revalidatePath("/restaurateur/livreurs");
    return { success: true, data: result } satisfies DeliveryActionResult<typeof result>;
  } catch (error) {
    return actionError(error);
  }
}

export async function remitDriverCashAction(input: {
  driverId: string;
  deliveryIds: string[];
  note?: string;
}) {
  try {
    const result = await confirmDriverCashRemittance(await getActor(), input);
    revalidatePath("/restaurateur/livreurs");
    return { success: true, data: result } satisfies DeliveryActionResult<typeof result>;
  } catch (error) {
    return actionError(error);
  }
}

export async function updateDriverCompensationAction(
  driverId: string,
  fixedDeliveryCompensationFcfa: number | null,
) {
  try {
    const result = await updateRestaurantDriver(await getActor(), driverId, {
      fixedDeliveryCompensationFcfa,
    });
    revalidatePath("/restaurateur/livreurs");
    return { success: true, data: result } satisfies DeliveryActionResult<typeof result>;
  } catch (error) {
    return actionError(error);
  }
}

export async function confirmDriverCompensationPaymentAction(input: {
  driverId: string;
  note?: string;
}) {
  try {
    const result = await confirmDriverCompensationPayment(await getActor(), input);
    revalidatePath("/restaurateur/livreurs");
    return { success: true, data: result } satisfies DeliveryActionResult<typeof result>;
  } catch (error) {
    return actionError(error);
  }
}
