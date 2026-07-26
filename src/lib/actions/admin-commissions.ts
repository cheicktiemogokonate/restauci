"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth/get-admin-session";
import { marquerCommissionsRestaurantPayees } from "@/lib/db/mutations-admin";

export async function marquerCommissionsRestaurantPayeesAction(
  restaurantId: string,
  referenceReglement: string,
  notes?: string
) {
  const admin = await getAdminSession();
  const resultat = await marquerCommissionsRestaurantPayees(
    restaurantId,
    admin.userId,
    referenceReglement,
    notes
  );

  revalidatePath("/admin");
  revalidatePath("/admin/commissions");
  revalidatePath(`/admin/restaurants/${restaurantId}`);
  return { success: true, ...resultat };
}
