import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import {
  getNotificationsUser,
  countNotificationsNonLues,
} from "@/lib/db/queries";
import { redirect } from "next/navigation";
import { NotificationsClient } from "@/components/dashboard/notifications-client";

export const metadata: Metadata = {
  title: "Notifications — RestauCI",
};

export default async function NotificationsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const userId = session.userId as string;
  const [notifications, unreadCount] = await Promise.all([
    getNotificationsUser(userId, 50),
    countNotificationsNonLues(userId),
  ]);

  return (
    <NotificationsClient
      initialNotifications={notifications}
      initialUnreadCount={unreadCount}
    />
  );
}
