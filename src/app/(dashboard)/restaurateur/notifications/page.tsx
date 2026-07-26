import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NotificationsClient } from "@/components/dashboard/notifications-client";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function NotificationsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  // L'état initial des notifications est fourni par le NotificationsProvider
  // monté dans le layout (chargé côté serveur). Cette page consomme le même
  // contexte — pas de double chargement.
  return <NotificationsClient />;
}
