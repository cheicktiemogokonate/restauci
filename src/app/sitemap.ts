import { db } from "@/lib/db";
import { restaurants } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const staticRoutes = [
    "",
    "/client",
    "/login",
    "/register",
    "/conditions-generales",
    "/confidentialite",
    "/cookies",
  ];
  let slugs: Array<{ slug: string; updatedAt: Date }> = [];
  try {
    slugs = await db
      .select({ slug: restaurants.slug, updatedAt: restaurants.updatedAt })
      .from(restaurants)
      .where(and(eq(restaurants.actif, true), eq(restaurants.enLigne, true)));
  } catch {
    // Le sitemap statique reste disponible pendant une indisponibilité DB.
  }
  return [
    ...staticRoutes.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: route === "" ? ("weekly" as const) : ("monthly" as const),
      priority: route === "" ? 1 : 0.6,
    })),
    ...slugs.map((restaurant) => ({
      url: `${baseUrl}/restaurant/${restaurant.slug}`,
      lastModified: restaurant.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
