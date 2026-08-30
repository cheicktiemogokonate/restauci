import { z } from "zod";

export const driverTokenTransportSchema = z
  .enum(["cookie", "json"])
  .default("cookie");

export type DriverTokenTransport = z.infer<
  typeof driverTokenTransportSchema
>;

export const driverRefreshRequestSchema = z
  .object({
    refreshToken: z.string().min(1).optional(),
    tokenTransport: driverTokenTransportSchema,
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

export const driverLogoutRequestSchema = z
  .object({
    refreshToken: z.string().min(1).optional(),
    tokenTransport: driverTokenTransportSchema,
  })
  .strict();

export function resolveDriverRefreshToken(input: {
  transport: DriverTokenTransport;
  bodyToken?: string;
  cookieToken?: string;
}) {
  if (input.transport === "json") return input.bodyToken ?? null;
  return input.bodyToken ?? input.cookieToken ?? null;
}

export async function readOptionalDriverLogoutBody(request: Request) {
  const text = await request.text();
  if (!text.trim()) return driverLogoutRequestSchema.parse({});
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = driverLogoutRequestSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
