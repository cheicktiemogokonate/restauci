import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, MapPin, ShieldCheck, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PublicResidenceHeader } from "@/modules/residences/presentation/public-residence-header";
import { ResidenceBookingCard } from "@/components/client-app/residence-booking-card";
import { Button } from "@/components/ui/button";
import { formatPrix } from "@/shared/format";
import {
  getPublicResidenceAvailability,
  getPublicResidenceBySlug,
} from "@/modules/residences/server";
import { recordDiscoveryDetailOpen } from "@/modules/discovery/server";

export const dynamic = "force-dynamic";

type PublicResidencePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ discovery?: string }>;
};

const getResidence = cache(async (slug: string) => getPublicResidenceBySlug(slug));

function metadataDescription(title: string, description: string) {
  const compact = description.replace(/\s+/g, " ").trim();
  const fallback = `Découvrez ${title} et préparez votre séjour sur Toutci.`;
  const source = compact || fallback;
  return source.length > 155 ? `${source.slice(0, 152).trimEnd()}…` : source;
}

export async function generateMetadata({
  params,
}: PublicResidencePageProps): Promise<Metadata> {
  const { slug } = await params;
  const residence = await getResidence(slug);
  if (!residence) return { title: "Résidence introuvable" };
  const description = metadataDescription(residence.title, residence.description);
  const canonical = `/residences/${residence.slug}`;
  const cover = residence.photos[0];
  return {
    title: `${residence.title} — ${residence.city}`,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "fr_CI",
      url: canonical,
      siteName: "Toutci",
      title: residence.title,
      description,
      images: cover ? [{ url: cover.url, alt: cover.altText ?? residence.title }] : [],
    },
  };
}

export default async function PublicResidenceDetailPage({
  params,
  searchParams,
}: PublicResidencePageProps) {
  const { slug } = await params;
  const { discovery: discoveryToken } = await searchParams;
  const residence = await getResidence(slug);
  if (!residence) notFound();
  const [, availability] = await Promise.all([
    discoveryToken
      ? recordDiscoveryDetailOpen(discoveryToken, {
          activityType: "residence",
          resourceId: residence.id,
        })
      : Promise.resolve(false),
    getPublicResidenceAvailability(residence.id),
  ]);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: residence.title,
    description: metadataDescription(residence.title, residence.description),
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/residences/${residence.slug}`,
    image: residence.photos.map((photo) => photo.url),
    address: {
      "@type": "PostalAddress",
      addressLocality: residence.city,
      addressCountry: residence.country,
    },
    occupancy: {
      "@type": "QuantitativeValue",
      maxValue: residence.maxGuests,
    },
    priceRange: `${residence.pricePerNightFcfa} XOF par nuit`,
  };

  return (
    <div className="min-h-dvh bg-slate-50">
      <PublicResidenceHeader />
      {/* Nonce requis par la CSP stricte (script inline JSON-LD) */}
      <script
        type="application/ld+json"
        nonce={(await headers()).get("x-nonce") ?? undefined}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-5">
          <Link href="/residences"><ArrowLeft />Toutes les résidences</Link>
        </Button>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr]">
          {residence.photos.slice(0, 3).map((photo, index) => (
            <div
              key={photo.id}
              className={`relative overflow-hidden rounded-xl bg-slate-100 ${
                index === 0 ? "aspect-[4/3] sm:row-span-2 sm:aspect-auto sm:min-h-120" : "aspect-[4/3]"
              }`}
            >
              <Image
                src={photo.url}
                alt={photo.altText ?? `${residence.title}, photo ${index + 1}`}
                fill
                sizes={index === 0 ? "(max-width: 640px) 100vw, 60vw" : "(max-width: 640px) 100vw, 40vw"}
                className="object-cover"
                priority={index === 0}
                unoptimized
              />
            </div>
          ))}
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <article>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                  {residence.title}
                </h1>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="size-4" />{residence.city}, {residence.country}
                </p>
              </div>
              <p className="text-xl font-semibold text-emerald-800">
                {formatPrix(residence.pricePerNightFcfa)} <span className="text-sm font-normal text-slate-500">/ nuit</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-5 border-b py-5 text-sm text-slate-700">
              <span className="inline-flex items-center gap-2"><Users className="size-4 text-emerald-700" />Jusqu’à {residence.maxGuests} voyageurs</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-700" />Fiche et propriétaire vérifiés</span>
            </div>

            <div className="py-7">
              <h2 className="text-xl font-semibold text-slate-950">À propos de ce logement</h2>
              <p className="mt-4 max-w-3xl whitespace-pre-line text-base leading-7 text-slate-700">
                {residence.description}
              </p>
            </div>
          </article>

          <ResidenceBookingCard
            residenceId={residence.id}
            pricePerNightFcfa={residence.pricePerNightFcfa}
            maxGuests={residence.maxGuests}
            isBookable={residence.bookability.isBookable}
            availability={availability}
            discoveryToken={discoveryToken}
          />
        </div>
      </main>
    </div>
  );
}
