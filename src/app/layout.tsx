import Providers from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Toutci — une app pour tout",
    template: "%s | Toutci",
  },
  description:
    "Découvrez les restaurants de Côte d’Ivoire, consultez leurs menus et commandez facilement avec Toutci.",
  keywords: [
    "Toutci",
    "restaurants Côte d'Ivoire",
    "commande restaurant",
    "livraison Côte d'Ivoire",
    "commande en ligne",
  ],
  openGraph: {
    title: "Toutci — une app pour tout",
    description:
      "Découvrez les restaurants, consultez leurs menus et commandez facilement.",
    url: "/",
    siteName: "Toutci",
    locale: "fr_CI",
    type: "website",
    images: [
      {
        url: "/icon.png", // 1200x630, à créer si pas déjà fait
        width: 1487,
        height: 1058,
        alt: "Toutci — une app pour tout",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Toutci — une app pour tout",
    description:
      "Découvrez les restaurants, consultez leurs menus et commandez facilement.",
    images: ["/icon.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${manrope.variable} h-full antialiased scroll-smooth`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col font-sans bg-[#FAFBFA] text-slate-900">
        <a
          href="#contenu-principal"
          className="sr-only z-100 bg-white p-3 text-sm font-semibold focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Aller au contenu principal
        </a>
        <div id="contenu-principal">
          <Providers>{children}</Providers>
        </div>
        <Toaster position="top-right" richColors />
        {/* Mesure des Core Web Vitals en production Vercel */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
