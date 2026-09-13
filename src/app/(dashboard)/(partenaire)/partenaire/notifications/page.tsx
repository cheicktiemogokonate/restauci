import type { Metadata } from "next";
import { NotificationCenter } from "@/modules/notifications/presentation/notification-center";
import { requirePartnerActivity } from "@/modules/partners/server";

export const metadata: Metadata = {
  title: "Notifications | Toutci",
};
export const dynamic = "force-dynamic";

export default async function ResidenceNotificationsPage() {
  await requirePartnerActivity("residence");
  return <NotificationCenter activityType="residence" />;
}
