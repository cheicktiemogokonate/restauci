import type { Metadata } from "next";
import { getCurrentUser } from "@/modules/auth/server";
import { redirect } from "next/navigation";
import { NotificationCenter } from "@/modules/notifications/presentation/notification-center";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function NotificationsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  // L'état initial des notifications est fourni par le NotificationsProvider
  // monté dans le layout (chargé côté serveur). Cette page consomme le même
  // contexte — pas de double chargement.
  return <NotificationCenter activityType="restaurant" />;
}
