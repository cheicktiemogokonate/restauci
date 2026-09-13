import { NextRequest } from "next/server";
import { requireAdminSession } from "@/app/api/_shared/auth-admin";
import { readAdminIdentityDocument } from "@/modules/identity/server";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession(request);
  if (auth.error) return auth.error;
  try {
    const { id } = await params;
    const document = await readAdminIdentityDocument(id);
    const extension =
      document.contentType === "application/pdf"
        ? "pdf"
        : document.contentType === "image/png"
          ? "png"
          : "jpg";
    return new Response(new Uint8Array(document.body), {
      headers: {
        "Content-Type": document.contentType,
        "Content-Disposition": `inline; filename="justificatif-identite.${extension}"`,
        "Cache-Control": "private, no-store, max-age=0",
        Pragma: "no-cache",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Content-Security-Policy": "sandbox",
      },
    });
  } catch {
    return Response.json({ error: "Justificatif introuvable." }, { status: 404 });
  }
}
