import { z } from "zod";
import { PARTNER_ACTIVITY_TYPES } from "./model";

export const partnerActivitySchema = z.enum(PARTNER_ACTIVITY_TYPES);
export type ChoosePartnerActivityInput = z.infer<typeof partnerActivitySchema>;
