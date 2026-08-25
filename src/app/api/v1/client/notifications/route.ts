import { z } from "zod";
import { NextRequest } from "next/server";
import { getClientSession } from "@/lib/api/auth-client";
import { apiResponse } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { buildPaginationMeta } from "@/lib/config/pagination";
import {
  listClientNotificationsSchema,
  markClientNotificationsReadSchema,
} from "@/modules/notifications/contracts";
import {
  listClientNotifications,
  markClientNotificationsRead,
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
  const { session, error } = await getClientSession(request);
  if (error) return error;

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return apiResponse.validationError(z.flattenError(parsed.error).fieldErrors);
  }
  const input = listClientNotificationsSchema.parse(parsed.data);
  const result = await listClientNotifications(session.clientId, input);
  return apiResponse.success(
    { items: result.items, unreadCount: result.unreadCount },
    { meta: buildPaginationMeta(result.total, result.page, result.limit) },
  );
}

export async function PATCH(request: NextRequest) {
  const { session, error } = await getClientSession(request);
  if (error) return error;
  const { data, error: bodyError } = await validateBody(
    request,
    markClientNotificationsReadSchema,
  );
  if (bodyError) return bodyError;
  return apiResponse.success(
    await markClientNotificationsRead(session.clientId, data),
  );
}
