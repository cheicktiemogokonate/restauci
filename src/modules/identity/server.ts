import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/infrastructure/db";
import {
  partnerIdentityVerifications,
  partnerAccounts,
} from "@/infrastructure/db/schema";
import { transactionalDb } from "@/infrastructure/db/transaction";
import type { DbExecutor } from "@/infrastructure/db/transaction";
import { persistNotification } from "@/modules/notifications/server";
import { persistBusinessEvent } from "@/modules/events/server";
import {
  deletePrivateIdentityDocument,
  isPrivateIdentityStorageConfigured,
  putCleanPrivateIdentityDocument,
  putPrivateIdentityDocument,
  readPrivateIdentityDocument,
} from "@/infrastructure/storage/private-identity";
import {
  enqueueIdentityDocumentScan,
  usesVercelSandboxIdentityScanner,
} from "@/infrastructure/queue/identity-document-scan";
import type { MalwareScanner } from "@/infrastructure/security/malware-scanner";
import { env } from "@/infrastructure/env";
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
  type IdentityDocumentScanMessage,
} from "./contracts";
import {
  canEditIdentityVerification,
  areIdentityDocumentsClean,
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
  claimIdentityDocumentForScan,
  listPartnerDocumentsAwaitingScan,
  listIdentityVerificationRecords,
  lockVerificationRecord,
  markIdentityDocumentQueueError,
  markIdentityDocumentScanClean,
  markIdentityDocumentScanError,
  markIdentityDocumentScanRejected,
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
  const validated = await validateIdentityDocument(input.body);
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
    body: validated.body,
    contentType: validated.contentType,
    extension: validated.extension,
  });

  let previousStorageKey: string | null = null;
  let previousCleanStorageKey: string | null = null;
  let storedDocumentId: string | null = null;
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
        sizeBytes: validated.body.length,
        sha256: validated.sha256,
      });
      storedDocumentId = replacement.document.id;
      previousStorageKey = replacement.previousStorageKey;
      previousCleanStorageKey = replacement.previousCleanStorageKey;
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
  if (previousCleanStorageKey) {
    await deletePrivateIdentityDocument(previousCleanStorageKey).catch(
      (error) => {
        console.error("[identity] ancien justificatif nettoyé non supprimé", {
          error,
          verificationId: draft.id,
        });
      },
    );
  }
  if (storedDocumentId && usesVercelSandboxIdentityScanner()) {
    try {
      await enqueueIdentityDocumentScan({
        documentId: storedDocumentId,
        sha256: validated.sha256,
      }, stored.key);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur de file inconnue";
      await markIdentityDocumentQueueError({
        documentId: storedDocumentId,
        expectedSha256: validated.sha256,
        error: message,
      }).catch((markError) => {
        console.error("[identity] erreur de file KYC non enregistrée", {
          error: markError,
          documentId: storedDocumentId,
        });
      });
      console.error("[identity] mise en file du scan KYC impossible", {
        error,
        documentId: storedDocumentId,
      });
      throw new IdentityVerificationError(
        "DOCUMENT_SCAN_UNAVAILABLE",
        "Le document est enregistré, mais son analyse n’a pas pu démarrer. Réessayez l’envoi dans quelques instants.",
      );
    }
  }
  return getPartnerIdentityVerification(input.partnerAccountId);
}

function cleanExtension(
  contentType: "image/jpeg" | "image/png" | "application/pdf",
) {
  if (contentType === "application/pdf") return "pdf" as const;
  return contentType === "image/png" ? ("png" as const) : ("jpg" as const);
}

export async function processIdentityDocumentScan(
  message: IdentityDocumentScanMessage,
  scanner: MalwareScanner,
) {
  const staleBefore = new Date(
    Date.now() - env.KYC_SCAN_STALE_AFTER_SECONDS * 1_000,
  );
  const claim = await claimIdentityDocumentForScan({
    documentId: message.documentId,
    expectedSha256: message.sha256,
    maxAttempts: env.KYC_SCAN_MAX_ATTEMPTS,
    staleBefore,
  });
  if (claim.state !== "claimed") return claim.state;

  const { document } = claim;
  try {
    const stored = await readPrivateIdentityDocument(document.storageKey);
    const actualSha256 = createHash("sha256")
      .update(stored.body)
      .digest("hex");
    if (
      stored.body.length !== document.sizeBytes ||
      actualSha256 !== document.sha256
    ) {
      throw new Error("L’intégrité du document en quarantaine est invalide.");
    }

    const scan = await scanner.scan({
      body: stored.body,
      contentType: document.contentType,
    });
    if (scan.status === "infected") {
      const updated = await markIdentityDocumentScanRejected({
        documentId: document.id,
        storageKey: document.storageKey,
        engine: scan.engine,
        result: scan.result,
      });
      if (updated) {
        await deletePrivateIdentityDocument(document.storageKey).catch(
          (error) => {
            console.error("[identity] quarantaine infectée non supprimée", {
              error,
              documentId: document.id,
            });
          },
        );
      }
      return updated ? ("rejected" as const) : ("stale_message" as const);
    }

    const clean = await putCleanPrivateIdentityDocument({
      documentId: document.id,
      verificationId: document.verificationId,
      body: stored.body,
      contentType: document.contentType,
      extension: cleanExtension(document.contentType),
    });
    const updated = await markIdentityDocumentScanClean({
      documentId: document.id,
      storageKey: document.storageKey,
      cleanStorageKey: clean.key,
      cleanContentType: document.contentType,
      cleanSizeBytes: stored.body.length,
      cleanSha256: actualSha256,
      engine: scan.engine,
    });
    if (!updated) {
      await deletePrivateIdentityDocument(clean.key).catch(() => undefined);
      return "stale_message" as const;
    }

    await deletePrivateIdentityDocument(document.storageKey).catch((error) => {
      console.error("[identity] quarantaine saine non supprimée", {
        error,
        documentId: document.id,
      });
    });
    return "clean" as const;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur de scan inconnue";
    await markIdentityDocumentScanError({
      documentId: document.id,
      storageKey: document.storageKey,
      error: message,
    }).catch((markError) => {
      console.error("[identity] échec d’enregistrement de l’erreur de scan", {
        error: markError,
        documentId: document.id,
      });
    });
    throw error;
  }
}

export async function ensurePartnerIdentityDocumentScansQueued(
  partnerAccountId: string,
) {
  if (!usesVercelSandboxIdentityScanner()) return;

  const staleBefore = new Date(
    Date.now() - env.KYC_SCAN_STALE_AFTER_SECONDS * 1_000,
  );
  const documents = await listPartnerDocumentsAwaitingScan({
    partnerAccountId,
    maxAttempts: env.KYC_SCAN_MAX_ATTEMPTS,
    staleBefore,
  });

  await Promise.all(
    documents.map(async (document) => {
      try {
        await enqueueIdentityDocumentScan(
          { documentId: document.id, sha256: document.sha256 },
          document.storageKey,
        );
      } catch (error) {
        // Le prochain rafraîchissement retentera avec la même clé
        // d'idempotence ; ne pas rendre ici l'erreur transitoire terminale.
        console.error("[identity] remise en file du scan KYC impossible", {
          error,
          documentId: document.id,
        });
      }
    }),
  );
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
    if (
      !areIdentityDocumentsClean(
        current.documents.map((document) => document.scanStatus),
      )
    ) {
      throw new IdentityVerificationError(
        "DOCUMENT_SCAN_PENDING",
        "Chaque justificatif doit être analysé et assaini avant la soumission.",
      );
    }
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
    if (
      !areIdentityDocumentsClean(
        current.documents.map((document) => document.scanStatus),
      )
    ) {
      throw new IdentityVerificationError(
        "DOCUMENT_SCAN_PENDING",
        "Les justificatifs ne sont pas tous déclarés sûrs.",
      );
    }
    const now = new Date();
    const account = await tx.query.partnerAccounts.findFirst({
      where: eq(partnerAccounts.id, current.partnerAccountId),
      columns: { userId: true, activityType: true },
    });
    if (!account) {
      throw new IdentityVerificationError(
        "VERIFICATION_NOT_FOUND",
        "Le compte partenaire du dossier est introuvable.",
      );
    }
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
    const eventId = randomUUID();
    const correlationId = randomUUID();
    await persistBusinessEvent(tx, {
      eventId,
      correlationId,
      type: "identity.verification.verified.v1",
      actor: { type: "admin", id: adminId },
      partnerAccountId: current.partnerAccountId,
      target: { type: "partner_identity_verification", id: current.id },
      occurredAt: now,
      payload: {
        decision: "verified",
        activityType: account.activityType,
        eligibilityRecalculated: true,
      },
      effects: [
        {
          type: "audit.project",
          payload: {
            action: "identity_verification_verified",
            details: {
              decision: "verified",
              activityType: account.activityType,
              eligibilityRecalculated: true,
            },
          },
        },
        {
          type: "notification.project",
          payload: {
            items: [
              {
                recipient: { type: "user", id: account.userId },
                template: "identity_verified",
                destination: {
                  type: "verification_identite",
                  id: current.id,
                },
              },
            ],
          },
        },
      ],
    });
    await persistNotification(tx, {
      userId: account.userId,
      type: "systeme",
      titre: "Identité vérifiée",
      message:
        "Votre identité a été vérifiée. Votre établissement peut maintenant devenir visible lorsque les autres conditions sont remplies.",
      lienType: "verification_identite",
      lienId: current.id,
      eventId,
      correlationId,
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
    const account = await tx.query.partnerAccounts.findFirst({
      where: eq(partnerAccounts.id, current.partnerAccountId),
      columns: { userId: true, activityType: true },
    });
    if (!account) {
      throw new IdentityVerificationError(
        "VERIFICATION_NOT_FOUND",
        "Le compte partenaire du dossier est introuvable.",
      );
    }
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
    const eventId = randomUUID();
    const correlationId = randomUUID();
    await persistBusinessEvent(tx, {
      eventId,
      correlationId,
      type: "identity.verification.rejected.v1",
      actor: { type: "admin", id: adminId },
      partnerAccountId: current.partnerAccountId,
      target: { type: "partner_identity_verification", id: current.id },
      occurredAt: now,
      payload: {
        decision: "rejected",
        activityType: account.activityType,
        eligibilityRecalculated: true,
      },
      effects: [
        {
          type: "audit.project",
          payload: {
            action: "identity_verification_rejected",
            details: {
              decision: "rejected",
              activityType: account.activityType,
              eligibilityRecalculated: true,
            },
          },
        },
        {
          type: "notification.project",
          payload: {
            items: [
              {
                recipient: { type: "user", id: account.userId },
                template: "identity_rejected",
                destination: {
                  type: "verification_identite",
                  id: current.id,
                },
              },
            ],
          },
        },
      ],
    });
    await persistNotification(tx, {
      userId: account.userId,
      type: "systeme",
      titre: "Vérification d’identité à corriger",
      message:
        "Votre dossier d’identité nécessite une correction. Consultez votre espace de vérification pour connaître le motif.",
      lienType: "verification_identite",
      lienId: current.id,
      eventId,
      correlationId,
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
    columns: { id: true, status: true, verifiedAt: true, legalName: true },
  });
  const legalName = verification?.legalName;
  if (
    verification?.status !== "verified" ||
    !verification.verifiedAt ||
    !legalName
  ) {
    throw new IdentityVerificationError(
      "IDENTITY_NOT_VERIFIED",
      "L’identité du propriétaire doit être vérifiée avant publication.",
    );
  }
  return { ...verification, legalName };
}

async function readAuthorizedDocument(
  document:
    | {
        cleanStorageKey: string | null;
        cleanContentType: string | null;
        scanStatus: "pending" | "processing" | "clean" | "rejected" | "error";
      }
    | undefined,
) {
  if (!document) {
    throw new IdentityVerificationError(
      "DOCUMENT_NOT_FOUND",
      "Justificatif introuvable.",
    );
  }
  if (document.scanStatus === "rejected") {
    throw new IdentityVerificationError(
      "DOCUMENT_REJECTED",
      "Ce justificatif a été rejeté par l’analyse de sécurité.",
    );
  }
  if (
    document.scanStatus !== "clean" ||
    !document.cleanStorageKey ||
    !document.cleanContentType
  ) {
    throw new IdentityVerificationError(
      "DOCUMENT_SCAN_PENDING",
      "Ce justificatif n’est pas encore disponible après analyse.",
    );
  }
  try {
    const stored = await readPrivateIdentityDocument(document.cleanStorageKey);
    return { ...stored, contentType: document.cleanContentType };
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
