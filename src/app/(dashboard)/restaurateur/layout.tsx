import Footer from "@/components/dashboard/layout/footer";
import Navbar from "@/components/dashboard/layout/navbar";
import { Sidebar } from "@/components/dashboard/layout/sidebar";
import { getRestaurateurSession } from "@/lib/auth/get-restaurateur-session";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RestauCI - Dashboard",
  description: "Restaurant management dashboard - Vue d'ensemble en direct",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Vérification de la session et existence du restaurant, avec redirection auto
  const { session, restaurant } = await getRestaurateurSession();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="w-full flex-1 flex flex-col lg:pl-64">
        <Navbar
          user={{
            nom: session.nom || "Utilisateur",
            avatarUrl: session.avatarUrl ?? null,
          }}
          restaurant={{
            nom: restaurant.nom,
            logoUrl: restaurant.logoUrl ?? null,
          }}
        />
        <div className="flex-1 flex flex-col min-h-screen relative z-10 pt-16">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}
