import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set.");
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export const config = {
  matcher: [
    "/dashboard/restaurateur/:path*",
    "/dashboard/admin/:path*",
  ],
};

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let payload: Record<string, unknown> | undefined;

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    payload = verified.payload as Record<string, unknown>;
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = typeof payload?.role === "string" ? payload.role : "";
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/dashboard/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard/restaurateur", request.url));
  }

  if (pathname.startsWith("/dashboard/restaurateur") && role !== "restaurateur") {
    return NextResponse.redirect(new URL("/dashboard/admin", request.url));
  }

  return NextResponse.next();
}
