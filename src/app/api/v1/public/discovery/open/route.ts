import { NextRequest, NextResponse } from "next/server";
import { recordDiscoveryClick } from "@/modules/discovery/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/", request.url));

  const destinationPath = await recordDiscoveryClick(token);
  if (!destinationPath) return NextResponse.redirect(new URL("/", request.url));

  const destination = new URL(destinationPath, request.url);
  destination.searchParams.set("discovery", token);
  return NextResponse.redirect(destination);
}
