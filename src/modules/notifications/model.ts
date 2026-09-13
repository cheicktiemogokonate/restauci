export const NOTIFICATION_TYPES = [
  "nouvelle_commande",
  "commande_prete",
  "commande_annulee",
  "nouveau_avis",
  "promotion",
  "systeme",
  "abonnement_valide",
  "abonnement_refuse",
  "echeance_proche",
  "abonnement_regrade",
  "abonnement_suspendu",
  "abonnement_expire",
  "restaurant_valide",
  "restaurant_rejete",
  "commission_cash_threshold",
  "delivery_offer_received",
  "delivery_offer_declined",
  "delivery_started",
  "delivery_completed",
  "delivery_failed",
  "cash_remittance_confirmed",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Types historiques conservés en base mais masqués tant que leur parcours n'est pas complet. */
export const HIDDEN_PRODUCT_NOTIFICATION_TYPES = [
  "nouveau_avis",
  "promotion",
] as const satisfies readonly NotificationType[];

/** Destinations produit reconnues et résolues par Notifications. */
export const NOTIFICATION_DESTINATION_TYPES = [
  "abonnement",
  "commande",
  "commission",
  "livraison",
  "profil",
  "remboursement",
  "remise_especes",
  "reservation_residence",
  "residence",
  "restaurant",
  "verification_identite",
] as const;

export type NotificationDestinationType =
  (typeof NOTIFICATION_DESTINATION_TYPES)[number];

export const NOTIFICATION_TEMPLATE_CODES = [
  "identity_rejected",
  "identity_verified",
  "refund_created",
  "restaurant_rejected",
  "restaurant_validated",
  "residence_approved",
  "residence_reactivated",
  "residence_rejected",
  "residence_suspended",
  "subscription_activated",
  "subscription_expired",
  "subscription_reactivated",
  "subscription_rejected",
  "subscription_suspended",
] as const;

export type NotificationTemplateCode =
  (typeof NOTIFICATION_TEMPLATE_CODES)[number];

export type NotificationRecipientType = "user" | "client" | "driver";

export interface NotificationDestination {
  type: NotificationDestinationType;
  id: string;
}

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  titre: string;
  message: string;
  lienType: NotificationDestinationType | null;
  lienId: string | null;
  lue: boolean;
  lueAt: Date | string | null;
  createdAt: Date | string;
  eventId: string | null;
  correlationId: string | null;
}

const TEMPLATE_CONTENT: Record<
  NotificationTemplateCode,
  { type: NotificationType; titre: string; message: string }
> = {
  identity_rejected: {
    type: "systeme",
    titre: "Vérification d’identité à corriger",
    message:
      "Votre dossier d’identité nécessite une correction. Consultez votre espace de vérification pour connaître le motif.",
  },
  identity_verified: {
    type: "systeme",
    titre: "Identité vérifiée",
    message:
      "Votre identité a été vérifiée. Votre établissement peut maintenant devenir visible lorsque les autres conditions sont remplies.",
  },
  refund_created: {
    type: "systeme",
    titre: "Remboursement enregistré",
    message:
      "Une obligation de remboursement a été enregistrée et sera suivie par l’administration.",
  },
  restaurant_rejected: {
    type: "restaurant_rejete",
    titre: "Votre dossier nécessite des corrections",
    message:
      "Votre restaurant n’a pas été validé. Consultez votre profil pour connaître le motif et corriger le dossier.",
  },
  restaurant_validated: {
    type: "restaurant_valide",
    titre: "Votre restaurant est validé",
    message:
      "Votre restaurant a été validé. Vous pouvez finaliser sa configuration et commencer votre activité.",
  },
  residence_approved: {
    type: "systeme",
    titre: "Résidence validée",
    message: "Votre résidence a été validée par l’équipe Toutci.",
  },
  residence_reactivated: {
    type: "systeme",
    titre: "Résidence réactivée",
    message: "Votre résidence a été réactivée.",
  },
  residence_rejected: {
    type: "systeme",
    titre: "Résidence à corriger",
    message:
      "Votre résidence nécessite des corrections. Consultez sa fiche pour reprendre le dossier.",
  },
  residence_suspended: {
    type: "systeme",
    titre: "Résidence suspendue",
    message:
      "Votre résidence a été suspendue. Consultez sa fiche pour connaître les actions attendues.",
  },
  subscription_activated: {
    type: "abonnement_valide",
    titre: "Abonnement validé",
    message: "Votre abonnement Toutci a été activé.",
  },
  subscription_expired: {
    type: "abonnement_expire",
    titre: "Abonnement expiré",
    message:
      "Votre abonnement a expiré. L’offre Découverte s’applique désormais automatiquement.",
  },
  subscription_reactivated: {
    type: "systeme",
    titre: "Abonnement réactivé",
    message: "Votre abonnement Toutci a été réactivé.",
  },
  subscription_rejected: {
    type: "abonnement_refuse",
    titre: "Abonnement refusé",
    message:
      "Votre demande d’abonnement n’a pas été validée. Consultez la facturation pour connaître le motif.",
  },
  subscription_suspended: {
    type: "abonnement_suspendu",
    titre: "Abonnement suspendu",
    message:
      "Votre abonnement a été suspendu. Consultez la facturation pour connaître le motif.",
  },
};

export function renderNotificationTemplate(code: NotificationTemplateCode) {
  return TEMPLATE_CONTENT[code];
}

export interface UserNotificationLinkInput {
  lienType: NotificationDestinationType | null;
  lienId: string | null;
}

export function getUserNotificationDestination(
  activityType: "restaurant" | "residence",
  notification: UserNotificationLinkInput,
): { href: string; label: string } | null {
  if (!notification.lienType || !notification.lienId) return null;

  if (activityType === "residence") {
    switch (notification.lienType) {
      case "reservation_residence":
        return {
          href: `/partenaire/reservations?reservation=${encodeURIComponent(notification.lienId)}`,
          label: "Voir la réservation",
        };
      case "residence":
        return {
          href: `/partenaire/residences/${encodeURIComponent(notification.lienId)}`,
          label: "Voir la résidence",
        };
      case "verification_identite":
      case "profil":
        return {
          href: "/partenaire/verification",
          label: "Voir ma vérification",
        };
      case "abonnement":
      case "remboursement":
        return {
          href: "/partenaire/facturation",
          label: "Voir la facturation",
        };
      default:
        return null;
    }
  }

  switch (notification.lienType) {
    case "commande":
      return {
        href: `/restaurateur/commandes/${encodeURIComponent(notification.lienId)}`,
        label: "Voir la commande",
      };
    case "livraison":
      return {
        href: "/restaurateur/commandes",
        label: "Voir les livraisons",
      };
    case "profil":
    case "restaurant":
      return {
        href: "/restaurateur/profil",
        label:
          notification.lienType === "profil"
            ? "Corriger mon dossier"
            : "Voir mon restaurant",
      };
    case "verification_identite":
      return {
        href: "/partenaire/verification",
        label: "Voir ma vérification",
      };
    case "abonnement":
    case "commission":
    case "remboursement":
    case "remise_especes":
      return {
        href: "/restaurateur/facturation",
        label: "Voir la facturation",
      };
    default:
      return null;
  }
}
