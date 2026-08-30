import { NextRequest } from "next/server";
import { z } from "zod";
import { requireDriverSession } from "@/lib/api/auth-driver";
import { apiResponse } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { buildPaginationMeta } from "@/lib/config/pagination";
import {
  listDriverNotificationsSchema,
  markDriverNotificationsReadSchema,
} from "@/modules/notifications/contracts";
import {
  listDriverNotifications,
  markDriverNotificationsRead,
} from "@/modules/notifications/server";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export async function GET(request: NextRequest) {
  const { session, error } = await requireDriverSession(request);
  if (error) return error;
  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return apiResponse.validationError(z.flattenError(parsed.error).fieldErrors);
  }
  const result = await listDriverNotifications(
    session.driverId,
    listDriverNotificationsSchema.parse(parsed.data),
  );
  return apiResponse.success(
    { items: result.items, unreadCount: result.unreadCount },
    { meta: buildPaginationMeta(result.total, result.page, result.limit) },
  );
}

export async function PATCH(request: NextRequest) {
  const { session, error } = await requireDriverSession(request);
  if (error) return error;
  const validated = await validateBody(
    request,
    markDriverNotificationsReadSchema,
  );
  if (validated.error) return validated.error;
  return apiResponse.success(
    await markDriverNotificationsRead(session.driverId, validated.data),
  );
}
