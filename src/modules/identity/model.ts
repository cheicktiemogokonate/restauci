export const IDENTITY_VERIFICATION_STATUSES = [
  "not_submitted",
  "pending",
  "verified",
  "rejected",
] as const;

export type IdentityVerificationStatus =
  (typeof IDENTITY_VERIFICATION_STATUSES)[number];

export const IDENTITY_DOCUMENT_TYPES = ["national_id", "passport"] as const;
export type IdentityDocumentType = (typeof IDENTITY_DOCUMENT_TYPES)[number];

export const IDENTITY_DOCUMENT_SIDES = ["front", "back"] as const;
export type IdentityDocumentSide = (typeof IDENTITY_DOCUMENT_SIDES)[number];

export const IDENTITY_DOCUMENT_SCAN_STATUSES = [
  "pending",
  "processing",
  "clean",
  "rejected",
  "error",
] as const;
export type IdentityDocumentScanStatus =
  (typeof IDENTITY_DOCUMENT_SCAN_STATUSES)[number];

export const IDENTITY_DOCUMENT_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;

export type IdentityDocumentContentType =
  (typeof IDENTITY_DOCUMENT_CONTENT_TYPES)[number];

export const MAX_IDENTITY_DOCUMENT_SIZE = 8 * 1024 * 1024;

export function requiredIdentityDocumentSides(
  documentType: IdentityDocumentType,
): readonly IdentityDocumentSide[] {
  return documentType === "national_id" ? ["front", "back"] : ["front"];
}

export function canEditIdentityVerification(
  status: IdentityVerificationStatus,
) {
  return status === "not_submitted" || status === "rejected";
}

export function isIdentityDocumentSetComplete(input: {
  documentType: IdentityDocumentType;
  documentSides: readonly IdentityDocumentSide[];
}) {
  const uploaded = new Set(input.documentSides);
  return requiredIdentityDocumentSides(input.documentType).every((side) =>
    uploaded.has(side),
  );
}

export function areIdentityDocumentsClean(
  statuses: readonly IdentityDocumentScanStatus[],
) {
  return statuses.length > 0 && statuses.every((status) => status === "clean");
}

export function isIdentityDocumentExpired(
  expiresOn: string,
  today: string,
) {
  return expiresOn <= today;
}

export class IdentityVerificationError extends Error {
  constructor(
    public readonly code:
      | "VERIFICATION_NOT_FOUND"
      | "VERIFICATION_NOT_EDITABLE"
      | "VERIFICATION_NOT_PENDING"
      | "VERIFICATION_INCOMPLETE"
      | "DOCUMENT_INVALID"
      | "DOCUMENT_NOT_FOUND"
      | "DOCUMENT_SCAN_PENDING"
      | "DOCUMENT_REJECTED"
      | "DOCUMENT_STORAGE_UNAVAILABLE"
      | "IDENTITY_NOT_VERIFIED",
    message: string,
  ) {
    super(message);
    this.name = "IdentityVerificationError";
  }
}
