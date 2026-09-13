import { z } from "zod";

export interface CreateResidenceCommissionInput {
  residenceReservationId: string;
  partnerAccountId: string;
  baseAmountFcfa: number;
  now?: Date;
}

export const adminCommissionListSchema = z.object({
  restaurantId: z.string().uuid().optional(),
  restaurantSearch: z.string().trim().max(100).optional(),
  status: z.enum(["pending", "due", "void", "all"]).default("all"),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const partnerCommissionWorkspaceSchema = z.object({
  partnerAccountId: z.string().uuid(),
  commissionLimit: z.number().int().min(1).max(100).default(20),
  settlementLimit: z.number().int().min(1).max(100).default(10),
});

export type AdminCommissionListInput = z.infer<typeof adminCommissionListSchema>;

export type PartnerCommissionWorkspaceInput = z.infer<
  typeof partnerCommissionWorkspaceSchema
>;
