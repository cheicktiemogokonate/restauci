import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  partnerIdentityVerifications,
} from "@/lib/db/schema";
import { transactionalDb } from "@/lib/db/transaction";
import type { DbExecutor } from "@/lib/db/transaction";
import { persistAuditLog } from "@/lib/audit";
import {
  deletePrivateIdentityDocument,
  isPrivateIdentityStorageConfigured,
  putPrivateIdentityDocument,
  readPrivateIdentityDocument,
} from "@/infrastructure/storage/private-identity";
import {
  identityDraftSchema,
  identityDocumentUploadSchema,
  listIdentityVerificationsSchema,
  rejectIdentityVerificationSchema,
  reviewIdentityVerificationSchema,
  type IdentityDraftInput,
  type IdentityDocumentUploadInput,
  type ListIdentityVerificationsInput,
  type RejectIdentityVerificationInput,
  type ReviewIdentityVerificationInput,
} from "./contracts";
import {
  canEditIdentityVerification,
  IdentityVerificationError,
  isIdentityDocumentExpired,
  isIdentityDocumentSetComplete,
} from "./model";
import { validateIdentityDocument } from "./_internal/document-validation";
import {
  ensurePartnerVerificationDraft,
  getAdminVerificationRecord,
  getDocumentForAdmin,
  getDocumentForPartner,
  getPartnerVerificationRecord,
  listIdentityVerificationRecords,
  lockVerificationRecord,
  partnerVerificationDTO,
  replaceIdentityDocumentRecord,
} from "./_internal/persistence";

function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function assertCompleteSubmission(input: {
  documentType: "national_id" | "passport";
  documentExpiresOn: string;
  documentSides: readonly ("front" | "back")[];
  now?: Date;
}) {
  if (
    isIdentityDocumentExpired(
      input.documentExpiresOn,
      todayIso(input.now),
    )
  ) {
    throw new IdentityVerificationError(
      "VERIFICATION_INCOMPLETE",
      "La pièce d’identité est expirée ou expire aujourd’hui.",
    );
  }
  if (
    !isIdentityDocumentSetComplete({
      documentType: input.documentType,
      documentSides: input.documentSides,
    })
  ) {
    throw new IdentityVerificationError(
      "VERIFICATION_INCOMPLETE",
      input.documentType === "national_id"
        ? "Le recto et le verso de la pièce sont requis."
        : "La page d’identité du passeport est requise.",
    );
  }
}

export async function getPartnerIdentityVerification(
  partnerAccountId: string,
  options: { executor?: DbExecutor } = {},
) {
  const row = await getPartnerVerificationRecord(
    partnerAccountId,
    options.executor,
  );
  return row ? partnerVerificationDTO(row, row.documents) : null;
}

export async function savePartnerIdentityDraft(
  partnerAccountId: string,
  input: IdentityDraftInput,
) {
  const parsed = identityDraftSchema.parse(input);
  const draft = await ensurePartnerVerificationDraft(partnerAccountId);
  await transactionalDb.transaction(async (tx) => {
    const current = await lockVerificationRecord(tx, draft.id);
    if (!current || current.partnerAccountId !== partnerAccountId) {
      throw new IdentityVerificationError(
        "VERIFICATION_NOT_FOUND",
        "Dossier de vérification introuvable.",
      );
    }
    if (!canEditIdentityVerification(current.status)) {
      throw new IdentityVerificationError(
        "VERIFICATION_NOT_EDITABLE",
        "Ce dossier ne peut plus être modifié pendant sa vérification.",
      );
    }
    await tx
      .update(partnerIdentityVerifications)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(partnerIdentityVerifications.id, current.id));
  });
  return getPartnerIdentityVerification(partnerAccountId);
}

export async function uploadPartnerIdentityDocument(input: {
  partnerAccountId: string;
  document: IdentityDocumentUploadInput;
  body: Buffer;
}) {
  const parsed = identityDocumentUploadSchema.parse(input.document);
  const validated = validateIdentityDocument(input.body);
  if (!validated) {
    throw new IdentityVerificationError(
      "DOCUMENT_INVALID",
      "Le document doit être un PDF, JPEG ou PNG valide de 8 Mo maximum.",
    );
  }
  if (!isPrivateIdentityStorageConfigured()) {
    throw new IdentityVerificationError(
      "DOCUMENT_STORAGE_UNAVAILABLE",
      "Le stockage privé des justificatifs n’est pas encore configuré.",
    );
  }

  const draft = await ensurePartnerVerificationDraft(input.partnerAccountId);
  if (!canEditIdentityVerification(draft.status)) {
    throw new IdentityVerificationError(
      "VERIFICATION_NOT_EDITABLE",
      "Ce dossier ne peut plus recevoir de document.",
    );
  }

  const stored = await putPrivateIdentityDocument({
    partnerAccountId: input.partnerAccountId,
    verificationId: draft.id,
    body: input.body,
    contentType: validated.contentType,
    extension: validated.extension,
  });

  let previousStorageKey: string | null = null;
  try {
    await transactionalDb.transaction(async (tx) => {
      const current = await lockVerificationRecord(tx, draft.id);
      if (
        !current ||
        current.partnerAccountId !== input.partnerAccountId ||
        !canEditIdentityVerification(current.status)
      ) {
        throw new IdentityVerificationError(
          "VERIFICATION_NOT_EDITABLE",
          "Le dossier a changé pendant l’envoi du document.",
        );
      }
      const replacement = await replaceIdentityDocumentRecord(tx, {
        verificationId: current.id,
        side: parsed.side,
        storageKey: stored.key,
        contentType: validated.contentType,
        sizeBytes: input.body.length,
        sha256: validated.sha256,
      });
      previousStorageKey = replacement.previousStorageKey;
    });
  } catch (error) {
    await deletePrivateIdentityDocument(stored.key).catch(() => undefined);
    throw error;
  }

  if (previousStorageKey) {
    await deletePrivateIdentityDocument(previousStorageKey).catch((error) => {
      console.error("[identity] ancien justificatif non supprimé", {
        error,
        verificationId: draft.id,
      });
    });
  }
  return getPartnerIdentityVerification(input.partnerAccountId);
}

export async function submitPartnerIdentityVerification(
  partnerAccountId: string,
  input: IdentityDraftInput,
) {
  const parsed = identityDraftSchema.parse(input);
  const draft = await ensurePartnerVerificationDraft(partnerAccountId);
  await transactionalDb.transaction(async (tx) => {
    const current = await lockVerificationRecord(tx, draft.id);
    if (!current || current.partnerAccountId !== partnerAccountId) {
      throw new IdentityVerificationError(
        "VERIFICATION_NOT_FOUND",
        "Dossier de vérification introuvable.",
      );
    }
    if (!canEditIdentityVerification(current.status)) {
      throw new IdentityVerificationError(
        "VERIFICATION_NOT_EDITABLE",
        "Ce dossier a déjà été soumis.",
      );
    }
    assertCompleteSubmission({
      documentType: parsed.documentType,
      documentExpiresOn: parsed.documentExpiresOn,
      documentSides: current.documents.map((document) => document.side),
    });
    const now = new Date();
    await tx
      .update(partnerIdentityVerifications)
      .set({
        ...parsed,
        status: "pending",
        submittedAt: now,
        reviewedAt: null,
        reviewedByAdminId: null,
        verifiedAt: null,
        rejectionReason: null,
        updatedAt: now,
      })
      .where(eq(partnerIdentityVerifications.id, current.id));
  });
  return getPartnerIdentityVerification(partnerAccountId);
}

export async function listIdentityVerifications(
  input: ListIdentityVerificationsInput,
) {
  return listIdentityVerificationRecords(
    listIdentityVerificationsSchema.parse(input),
  );
}

export async function getAdminIdentityVerification(verificationId: string) {
  return getAdminVerificationRecord(verificationId);
}

export async function verifyPartnerIdentity(
  adminId: string,
  input: ReviewIdentityVerificationInput,
) {
  const parsed = reviewIdentityVerificationSchema.parse(input);
  await transactionalDb.transaction(async (tx) => {
    const current = await lockVerificationRecord(tx, parsed.verificationId);
    if (!current) {
      throw new IdentityVerificationError(
        "VERIFICATION_NOT_FOUND",
        "Dossier de vérification introuvable.",
      );
    }
    if (current.status !== "pending") {
      throw new IdentityVerificationError(
        "VERIFICATION_NOT_PENDING",
        "Seul un dossier en attente peut être vérifié.",
      );
    }
    assertCompleteSubmission({
      documentType: current.documentType!,
      documentExpiresOn: current.documentExpiresOn!,
      documentSides: current.documents.map((document) => document.side),
    });
    const now = new Date();
    await tx
      .update(partnerIdentityVerifications)
      .set({
        status: "verified",
        reviewedAt: now,
        reviewedByAdminId: adminId,
        verifiedAt: now,
        rejectionReason: null,
        updatedAt: now,
      })
      .where(eq(partnerIdentityVerifications.id, current.id));
    await persistAuditLog(tx, {
      adminId,
      action: "identity_verification_verified",
      ressourceType: "partner_identity_verification",
      ressourceId: current.id,
      details: { partnerAccountId: current.partnerAccountId },
    });
  });
  return getAdminIdentityVerification(parsed.verificationId);
}

export async function rejectPartnerIdentity(
  adminId: string,
  input: RejectIdentityVerificationInput,
) {
  const parsed = rejectIdentityVerificationSchema.parse(input);
  await transactionalDb.transaction(async (tx) => {
    const current = await lockVerificationRecord(tx, parsed.verificationId);
    if (!current) {
      throw new IdentityVerificationError(
        "VERIFICATION_NOT_FOUND",
        "Dossier de vérification introuvable.",
      );
    }
    if (current.status !== "pending") {
      throw new IdentityVerificationError(
        "VERIFICATION_NOT_PENDING",
        "Seul un dossier en attente peut être rejeté.",
      );
    }
    const now = new Date();
    await tx
      .update(partnerIdentityVerifications)
      .set({
        status: "rejected",
        reviewedAt: now,
        reviewedByAdminId: adminId,
        verifiedAt: null,
        rejectionReason: parsed.reason,
        updatedAt: now,
      })
      .where(eq(partnerIdentityVerifications.id, current.id));
    await persistAuditLog(tx, {
      adminId,
      action: "identity_verification_rejected",
      ressourceType: "partner_identity_verification",
      ressourceId: current.id,
      details: {
        partnerAccountId: current.partnerAccountId,
        reason: parsed.reason,
      },
    });
  });
  return getAdminIdentityVerification(parsed.verificationId);
}

export async function assertPartnerIdentityVerified(partnerAccountId: string) {
  const verification = await db.query.partnerIdentityVerifications.findFirst({
    where: eq(
      partnerIdentityVerifications.partnerAccountId,
      partnerAccountId,
    ),
    columns: { id: true, status: true, verifiedAt: true },
  });
  if (verification?.status !== "verified" || !verification.verifiedAt) {
    throw new IdentityVerificationError(
      "IDENTITY_NOT_VERIFIED",
      "L’identité du propriétaire doit être vérifiée avant publication.",
    );
  }
  return verification;
}

async function readAuthorizedDocument(
  document:
    | { storageKey: string; contentType: string }
    | undefined,
) {
  if (!document) {
    throw new IdentityVerificationError(
      "DOCUMENT_NOT_FOUND",
      "Justificatif introuvable.",
    );
  }
  try {
    const stored = await readPrivateIdentityDocument(document.storageKey);
    return { ...stored, contentType: document.contentType };
  } catch {
    throw new IdentityVerificationError(
      "DOCUMENT_STORAGE_UNAVAILABLE",
      "Le justificatif privé est temporairement indisponible.",
    );
  }
}

export async function readPartnerIdentityDocument(
  partnerAccountId: string,
  documentId: string,
) {
  return readAuthorizedDocument(
    await getDocumentForPartner(documentId, partnerAccountId),
  );
}

export async function readAdminIdentityDocument(documentId: string) {
  return readAuthorizedDocument(await getDocumentForAdmin(documentId));
}

export { isPrivateIdentityStorageConfigured };
