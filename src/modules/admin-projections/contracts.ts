import { z } from "zod";

export const adminDashboardProjectionInputSchema = z
  .object({
    days: z.number().int().min(1).max(90).default(14),
  })
  .strict();

export type AdminDashboardProjectionInput = z.input<
  typeof adminDashboardProjectionInputSchema
>;
