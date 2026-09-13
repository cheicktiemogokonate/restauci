import type { ReactNode } from "react";
import { NotificationsProvider } from "@/modules/notifications/presentation/notifications-provider";
import { PartnerNavigation } from "@/components/partner/partner-navigation";
import {
  countUnreadUserNotifications,
  listUserNotifications,
} from "@/modules/notifications/server";
import { requireCurrentPartnerContext } from "@/modules/partners/server";

export default async function PartnerLayout({ children }: { children: ReactNode }) {
  const { identity, partnerAccount } = await requireCurrentPartnerContext();
  const [initialNotifications, initialUnreadCount] = await Promise.all([
    listUserNotifications(identity.userId, { limit: 50 }),
    countUnreadUserNotifications(identity.userId),
  ]);

  return (
    <div className="min-h-dvh bg-slate-50 lg:pl-72">
      <PartnerNavigation
        email={identity.email}
        activityType={partnerAccount.activityType}
      />
      <NotificationsProvider
        initialNotifications={initialNotifications}
        initialUnreadCount={initialUnreadCount}
      >
        <div className="min-h-dvh">{children}</div>
      </NotificationsProvider>
    </div>
  );
}
