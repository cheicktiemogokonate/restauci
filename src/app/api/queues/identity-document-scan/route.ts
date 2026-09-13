import { handleCallback } from "@vercel/queue";
import { ZodError } from "zod";
import { VercelSandboxClamAvScanner } from "@/infrastructure/security/vercel-sandbox-clamav";
import { identityDocumentScanMessageSchema } from "@/modules/identity/contracts";
import { processIdentityDocumentScan } from "@/modules/identity/server";

export const runtime = "nodejs";
export const maxDuration = 300;

class IdentityScanAlreadyProcessingError extends Error {
  constructor() {
    super("IDENTITY_SCAN_ALREADY_PROCESSING");
    this.name = "IdentityScanAlreadyProcessingError";
  }
}

const handleIdentityDocumentScan = handleCallback(
  async (rawMessage, metadata) => {
    const message = identityDocumentScanMessageSchema.parse(rawMessage);
    const outcome = await processIdentityDocumentScan(
      message,
      new VercelSandboxClamAvScanner(),
    );

    if (outcome === "busy") {
      throw new IdentityScanAlreadyProcessingError();
    }

    console.info("[identity] message de scan KYC traité", {
      documentId: message.documentId,
      messageId: metadata.messageId,
      outcome,
    });
  },
  {
    visibilityTimeoutSeconds: 300,
    retry: (error, metadata) => {
      if (error instanceof ZodError) return { acknowledge: true };
      if (error instanceof IdentityScanAlreadyProcessingError) {
        return { afterSeconds: 60 };
      }
      return {
        afterSeconds: Math.min(300, 2 ** metadata.deliveryCount * 5),
      };
    },
  },
);

export async function POST(request: Request) {
  return handleIdentityDocumentScan(request);
}
