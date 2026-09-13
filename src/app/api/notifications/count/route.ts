import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/server";
import { createLogger } from "@/infrastructure/logger";
import { countUnreadUserNotifications } from "@/modules/notifications/server";

const log = createLogger("notifications-count");

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const count = await countUnreadUserNotifications(session.userId);

    return NextResponse.json({ count });
  } catch (err) {
    log.error({ err }, "Erreur lors de la récupération du count des notifications");
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
