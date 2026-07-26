import { DashboardRealtimeProvider } from "@/components/dashboard/layout/dashboard-realtime-provider";
import { NotificationsProvider } from "@/components/dashboard/notifications/notifications-provider";
import Footer from "@/components/dashboard/layout/footer";
import Navbar from "@/components/dashboard/layout/navbar";
import { Sidebar } from "@/components/dashboard/layout/sidebar";
import { getRestaurateurSession } from "@/lib/auth/get-restaurateur-session";
import { countNotificationsNonLues, getNotificationsUser } from "@/lib/db/queries";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const { restaurant } = await getRestaurateurSession();
  return {
    title: `${restaurant.nom} - Dashboard`,
    description: "Restaurant management dashboard - Vue d'ensemble en direct",
  };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Vérification de la session et existence du restaurant, avec redirection auto
  const { session, restaurant } = await getRestaurateurSession();

  // Notifications initiales (chargées côté serveur pour éviter un flash côté
  // client). Le NotificationsProvider garde ensuite l'état synchronisé via
  // le contexte realtime + les actions markAsRead.
  const [initialNotifications, initialUnreadCount] = await Promise.all([
    getNotificationsUser(session.userId as string, 50),
    countNotificationsNonLues(session.userId as string),
  ]);

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-background">
      <Sidebar />
      <main className="w-full flex-1 flex flex-col overflow-x-hidden lg:pl-64">
        <DashboardRealtimeProvider restaurantId={restaurant.id}>
          <NotificationsProvider
            initialNotifications={initialNotifications}
            initialUnreadCount={initialUnreadCount}
          >
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
          </NotificationsProvider>
        </DashboardRealtimeProvider>
      </main>
    </div>
  );
}
