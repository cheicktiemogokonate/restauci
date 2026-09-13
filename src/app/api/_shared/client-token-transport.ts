import { z } from "zod";

export const clientTokenTransportSchema = z
  .enum(["cookie", "json"])
  .default("cookie");

export type ClientTokenTransport = z.infer<
  typeof clientTokenTransportSchema
>;

export const clientRefreshRequestSchema = z
  .object({
    refreshToken: z.string().min(1).optional(),
    tokenTransport: clientTokenTransportSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.tokenTransport === "json" && !value.refreshToken) {
      context.addIssue({
        code: "custom",
        path: ["refreshToken"],
        message: "Le refresh token est requis pour une session native.",
      });
    }
  });

export const clientLogoutRequestSchema = z
  .object({
    refreshToken: z.string().min(1).optional(),
    tokenTransport: clientTokenTransportSchema,
  })
  .strict();

export function resolveClientRefreshToken(input: {
  transport: ClientTokenTransport;
  bodyToken?: string;
  cookieToken?: string;
}) {
  if (input.transport === "json") return input.bodyToken ?? null;
  return input.bodyToken ?? input.cookieToken ?? null;
}

export function getClientRefreshLifetime(sessionDuration: unknown) {
  return sessionDuration === "extended"
    ? { expiresIn: "30d", maxAge: 30 * 24 * 3600 }
    : { expiresIn: "7d", maxAge: 7 * 24 * 3600 };
}

export async function readOptionalClientLogoutBody(request: Request) {
  const text = await request.text();
  if (!text.trim()) {
    return clientLogoutRequestSchema.parse({});
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = clientLogoutRequestSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
