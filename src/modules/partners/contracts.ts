import { z } from "zod";
import {
  PARTNER_ACTIVITY_TYPES,
  type PartnerActivityType,
} from "./model";

export const partnerActivitySchema = z.enum(PARTNER_ACTIVITY_TYPES);
export type ChoosePartnerActivityInput = z.infer<typeof partnerActivitySchema>;

export interface PartnerAccountDTO {
  id: string;
  userId: string;
  activityType: PartnerActivityType;
  createdAt: string;
  updatedAt: string;
}

export const adminPartnerOwnerListSchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
  })
  .strict();

export type AdminPartnerOwnerListInput = z.infer<
  typeof adminPartnerOwnerListSchema
>;

export interface AdminPartnerOwnerDTO {
  userId: string;
  name: string;
  email: string;
  phone: string;
  suspended: boolean;
  createdAt: string;
  partnerAccount: {
    id: string;
    activityType: PartnerActivityType;
  } | null;
  subscription: {
    planCode: string;
    planName: string;
    status: string;
    expiresAt: string | null;
  } | null;
}

export interface AdminPartnerOwnerPageDTO {
  items: AdminPartnerOwnerDTO[];
  total: number;
  page: number;
  totalPages: number;
}

interface AdminPartnerAccessBaseDTO {
  userId: string;
  name: string;
  email: string;
  phone: string;
  suspended: boolean;
  createdAt: string;
  subscription: AdminPartnerOwnerDTO["subscription"];
}

export type AdminPartnerAccessDTO =
  | (AdminPartnerAccessBaseDTO & {
      activityType: null;
      partnerAccountId: null;
      onboardingState: "activity_pending";
    })
  | (AdminPartnerAccessBaseDTO & {
      activityType: "restaurant";
      partnerAccountId: string;
      onboardingState: "entity_pending" | "complete";
      restaurant: {
        id: string;
        name: string;
        active: boolean;
        suspended: boolean;
        rejectionReason: string | null;
      } | null;
    })
  | (AdminPartnerAccessBaseDTO & {
      activityType: "residence";
      partnerAccountId: string;
      onboardingState: "entity_pending" | "complete";
      residenceAccount: {
        residences: Array<{
          id: string;
          title: string;
          moderationStatus:
            | "draft"
            | "pending"
            | "approved"
            | "rejected"
            | "suspended";
          isPubliclyVisible: boolean;
        }>;
        visibleCount: number;
        quota: {
          planCode: string;
          maxPublicResidences: number | null;
        };
      };
    });

export interface AdminPartnerAccessPageDTO {
  items: AdminPartnerAccessDTO[];
  total: number;
  page: number;
  totalPages: number;
}
