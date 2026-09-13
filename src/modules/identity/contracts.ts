import { z } from "zod";
import {
  IDENTITY_DOCUMENT_SIDES,
  IDENTITY_DOCUMENT_SCAN_STATUSES,
  IDENTITY_DOCUMENT_TYPES,
  IDENTITY_VERIFICATION_STATUSES,
} from "./model";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
  }, "Date invalide");

export const identityVerificationStatusSchema = z.enum(
  IDENTITY_VERIFICATION_STATUSES,
);
export const identityDocumentTypeSchema = z.enum(IDENTITY_DOCUMENT_TYPES);
export const identityDocumentSideSchema = z.enum(IDENTITY_DOCUMENT_SIDES);
export const identityDocumentScanStatusSchema = z.enum(
  IDENTITY_DOCUMENT_SCAN_STATUSES,
);

export const identityDraftSchema = z
  .object({
    legalName: z.string().trim().min(2).max(255),
    documentType: identityDocumentTypeSchema,
    documentCountryCode: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase()),
    documentExpiresOn: isoDateSchema,
  })
  .strict();

export const identityDocumentUploadSchema = z
  .object({
    side: identityDocumentSideSchema,
  })
  .strict();

export const reviewIdentityVerificationSchema = z
  .object({
    verificationId: z.string().uuid(),
  })
  .strict();

export const rejectIdentityVerificationSchema = reviewIdentityVerificationSchema
  .extend({
    reason: z.string().trim().min(10).max(1_000),
  })
  .strict();

export const identityDocumentScanMessageSchema = z
  .object({
    documentId: z.string().uuid(),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();

export const listIdentityVerificationsSchema = z
  .object({
    status: identityVerificationStatusSchema.optional(),
    search: z.string().trim().max(255).optional(),
    page: z.number().int().positive().default(1),
    limit: z.number().int().min(1).max(100).default(20),
  })
  .strict();

export type IdentityDraftInput = z.infer<typeof identityDraftSchema>;
export type IdentityDocumentUploadInput = z.infer<
  typeof identityDocumentUploadSchema
>;
export type ReviewIdentityVerificationInput = z.infer<
  typeof reviewIdentityVerificationSchema
>;
export type RejectIdentityVerificationInput = z.infer<
  typeof rejectIdentityVerificationSchema
>;
export type ListIdentityVerificationsInput = z.infer<
  typeof listIdentityVerificationsSchema
>;
export type IdentityDocumentScanMessage = z.infer<
  typeof identityDocumentScanMessageSchema
>;

export interface IdentityDocumentDTO {
  id: string;
  side: "front" | "back";
  contentType: "image/jpeg" | "image/png" | "application/pdf";
  sizeBytes: number;
  scanStatus: "pending" | "processing" | "clean" | "rejected" | "error";
  scanAttempts: number;
  scanRetryable: boolean;
  uploadedAt: string;
}

export interface PartnerIdentityVerificationDTO {
  id: string;
  partnerAccountId: string;
  status: "not_submitted" | "pending" | "verified" | "rejected";
  legalName: string | null;
  documentType: "national_id" | "passport" | null;
  documentCountryCode: string | null;
  documentExpiresOn: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  verifiedAt: string | null;
  documents: IdentityDocumentDTO[];
}

export interface AdminIdentityVerificationListItemDTO {
  id: string;
  partnerAccountId: string;
  status: "not_submitted" | "pending" | "verified" | "rejected";
  legalName: string | null;
  activityType: "restaurant" | "residence";
  accountName: string;
  accountEmail: string;
  submittedAt: string | null;
  reviewedAt: string | null;
}

export interface AdminIdentityVerificationDetailsDTO
  extends PartnerIdentityVerificationDTO {
  activityType: "restaurant" | "residence";
  accountName: string;
  accountEmail: string;
  accountPhone: string;
  reviewedByAdminName: string | null;
}
