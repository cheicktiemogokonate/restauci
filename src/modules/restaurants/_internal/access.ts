import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/infrastructure/db";
import { restaurants } from "@/lib/db/schema";

export function getRestaurantAccessRecordByPartnerAccountId(
  partnerAccountId: string,
) {
  return db.query.restaurants.findFirst({
    where: eq(restaurants.partnerAccountId, partnerAccountId),
    columns: { id: true },
  });
}
