import { z } from "zod";

export const PAYSTACK_PROVIDER = "paystack" as const;

export function toPaystackSubunit(amountFcfa: number): number {
  if (!Number.isSafeInteger(amountFcfa) || amountFcfa <= 0) {
    throw new Error("Le montant Paystack doit être un entier FCFA positif");
  }
  const result = amountFcfa * 100;
  if (!Number.isSafeInteger(result)) throw new Error("Montant Paystack hors limites");
  return result;
}

export function fromPaystackSubunit(amount: number): number {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount % 100 !== 0) {
    throw new Error("Sous-unité XOF Paystack invalide");
  }
  return amount / 100;
}

export const initializeResponseSchema = z.object({
  status: z.literal(true),
  message: z.string(),
  data: z.object({
    authorization_url: z.string().url(),
    access_code: z.string().min(1),
    reference: z.string().min(1),
  }),
});

export const verifyResponseSchema = z.object({
  status: z.literal(true),
  message: z.string(),
  data: z.object({
    status: z.string(),
    reference: z.string().min(1),
    amount: z.number().int().positive(),
    currency: z.string(),
    channel: z.string().nullable().optional(),
    authorization: z.object({ bank: z.string().nullable().optional() }).passthrough().nullable().optional(),
  }),
});

export const subaccountResponseSchema = z.object({
  status: z.literal(true),
  message: z.string(),
  data: z.object({
    subaccount_code: z.string().regex(/^ACCT_[A-Za-z0-9]+$/),
    business_name: z.string().min(1),
    active: z.boolean(),
    is_verified: z.boolean(),
    currency: z.string().nullable().optional(),
    settlement_bank: z.string().nullable().optional(),
    account_name: z.string().nullable().optional(),
  }).passthrough(),
});

export const payoutInstitutionsResponseSchema = z.object({
  status: z.literal(true),
  message: z.string(),
  data: z.array(z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    type: z.string().nullable().optional(),
    active: z.boolean().optional().default(true),
    currency: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
  }).passthrough()),
});

export function mapPaystackStatus(status: string) {
  if (status === "success") return "success" as const;
  if (["pending", "ongoing", "processing", "queued"].includes(status)) return "pending" as const;
  if (["failed", "abandoned"].includes(status)) return "failed" as const;
  if (status === "reversed") return "reversed" as const;
  return "pending" as const;
}

export function mapReliablePaystackNetwork(data: {
  channel?: string | null;
  authorization?: { bank?: string | null } | null;
}): "wave" | "orange" | "mtn" | null {
  if (data.channel !== "mobile_money") return null;
  const normalized = data.authorization?.bank?.trim().toLowerCase() ?? "";
  if (normalized.includes("wave")) return "wave";
  if (normalized.includes("orange")) return "orange";
  if (normalized === "mtn" || normalized.includes("mtn mobile")) return "mtn";
  return null;
}
