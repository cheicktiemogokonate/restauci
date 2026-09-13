import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function enforceContentLength(
  request: NextRequest,
  maximumBytes: number,
): NextResponse | null {
  const rawLength = request.headers.get("content-length");
  if (!rawLength) {
    return NextResponse.json(
      { error: "L’en-tête Content-Length est requis." },
      { status: 411 },
    );
  }

  const length = Number(rawLength);
  if (!Number.isSafeInteger(length) || length < 0) {
    return NextResponse.json(
      { error: "L’en-tête Content-Length est invalide." },
      { status: 400 },
    );
  }

  if (length > maximumBytes) {
    return NextResponse.json(
      { error: "Corps de requête trop volumineux." },
      { status: 413 },
    );
  }

  return null;
}
