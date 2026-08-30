import { NextRequest } from "next/server";
import { requirePartnerAccount } from "@/lib/auth/partner-account";
import { readPartnerIdentityDocument } from "@/modules/identity/server";

export const runtime = "nodejs";

function privateDocumentResponse(
  body: Buffer,
  contentType: string,
) {
  const extension =
    contentType === "application/pdf"
      ? "pdf"
      : contentType === "image/png"
        ? "png"
        : "jpg";
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="justificatif-identite.${extension}"`,
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const partnerAccount = await requirePartnerAccount();
    const { id } = await params;
    const document = await readPartnerIdentityDocument(partnerAccount.id, id);
    return privateDocumentResponse(document.body, document.contentType);
  } catch {
    return Response.json({ error: "Justificatif introuvable." }, { status: 404 });
  }
}
