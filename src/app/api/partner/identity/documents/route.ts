import { NextRequest, NextResponse } from "next/server";
import { requirePartnerAccount } from "@/modules/partners/server";
import { PartnerAuthorizationError } from "@/modules/partners/model";
import { checkRateLimit, uploadLimiter } from "@/infrastructure/rate-limit";
import {
  IdentityVerificationError,
  MAX_IDENTITY_DOCUMENT_SIZE,
} from "@/modules/identity/model";
import {
  ensurePartnerIdentityDocumentScansQueued,
  getPartnerIdentityVerification,
  uploadPartnerIdentityDocument,
} from "@/modules/identity/server";
import { enforceContentLength } from "@/app/api/_shared/request-size";

const MAX_MULTIPART_OVERHEAD = 128 * 1024;

export const runtime = "nodejs";

export async function GET() {
  try {
    const partnerAccount = await requirePartnerAccount();
    await ensurePartnerIdentityDocumentScansQueued(partnerAccount.id);
    const verification = await getPartnerIdentityVerification(
      partnerAccount.id,
    );
    return NextResponse.json({ verification });
  } catch (error) {
    if (error instanceof PartnerAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[identity] rafraîchissement du statut KYC impossible", {
      error,
    });
    return NextResponse.json(
      { error: "Statut de vérification indisponible." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const partnerAccount = await requirePartnerAccount();
    const rateLimitResponse = await checkRateLimit(
      uploadLimiter,
      partnerAccount.userId,
    );
    if (rateLimitResponse) return rateLimitResponse;

    const sizeError = enforceContentLength(
      request,
      MAX_IDENTITY_DOCUMENT_SIZE + MAX_MULTIPART_OVERHEAD,
    );
    if (sizeError) return sizeError;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Corps multipart invalide." },
        { status: 400 },
      );
    }
    const file = formData.get("file");
    const side = formData.get("side");
    if (!(file instanceof File) || typeof side !== "string") {
      return NextResponse.json(
        { error: "Document ou face manquante." },
        { status: 400 },
      );
    }
    if (file.size === 0 || file.size > MAX_IDENTITY_DOCUMENT_SIZE) {
      return NextResponse.json(
        { error: "Le document doit faire moins de 8 Mo." },
        { status: 400 },
      );
    }

    const verification = await uploadPartnerIdentityDocument({
      partnerAccountId: partnerAccount.id,
      document: { side: side as "front" | "back" },
      body: Buffer.from(await file.arrayBuffer()),
    });
    return NextResponse.json({ verification });
  } catch (error) {
    if (error instanceof PartnerAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof IdentityVerificationError) {
      const status =
        error.code === "DOCUMENT_STORAGE_UNAVAILABLE" ||
        error.code === "DOCUMENT_SCAN_UNAVAILABLE"
          ? 503
          : error.code === "VERIFICATION_NOT_EDITABLE"
            ? 409
            : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("[identity] échec upload KYC", { error });
    return NextResponse.json(
      { error: "Envoi du justificatif impossible." },
      { status: 500 },
    );
  }
}
