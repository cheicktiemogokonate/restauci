import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Providers from "@/components/Providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RestauCI - Solution de Gestion de Restaurant & SaaS POS",
  description: "Centralisez commandes, menus, stocks, réservations et statistiques dans une seule plateforme moderne pour restaurants.",
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
        <Providers>{children}</Providers>
        {/* Mesure des Core Web Vitals en production Vercel */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
