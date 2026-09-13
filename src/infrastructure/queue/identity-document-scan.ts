import "server-only";

import { createHash } from "node:crypto";
import { send } from "@vercel/queue";
import { env } from "@/infrastructure/env";

export const IDENTITY_DOCUMENT_SCAN_TOPIC = "identity-document-scan";

interface IdentityDocumentScanQueueMessage {
  documentId: string;
  sha256: string;
}

export function usesVercelSandboxIdentityScanner() {
  return env.KYC_SCAN_BACKEND === "vercel_sandbox";
}

export async function enqueueIdentityDocumentScan(
  message: IdentityDocumentScanQueueMessage,
  uploadStorageKey: string,
) {
  if (!usesVercelSandboxIdentityScanner()) return null;

  const uploadVersion = createHash("sha256")
    .update(uploadStorageKey)
    .digest("hex")
    .slice(0, 16);

  return send(IDENTITY_DOCUMENT_SCAN_TOPIC, message, {
    // Deux uploads identiques ont des clés privées distinctes et doivent chacun
    // pouvoir déclencher un job, sans exposer la clé de stockage dans la file.
    idempotencyKey: `${message.documentId}:${message.sha256}:${uploadVersion}`,
    retentionSeconds: 24 * 60 * 60,
  });
}
