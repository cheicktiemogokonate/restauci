import {
  CAUSAL_ACTOR_TYPES,
  type CausalActorType,
} from "@/shared/causality";

export const AUDIT_ACTOR_TYPES = CAUSAL_ACTOR_TYPES;
export type AuditActorType = CausalActorType;

export const AUDIT_ACTIONS = [
  "restaurant_valide",
  "restaurant_rejete",
  "restaurant_suspendu",
  "restaurant_reactive",
  "user_suspendu",
  "user_reactive",
  "client_suspendu",
  "client_reactive",
  "commission_modifiee",
  "abonnement_valide",
  "abonnement_refuse",
  "abonnement_suspendu",
  "abonnement_reactive",
  "abonnement_expire",
  "abonnement_regrade",
  "refund_obligation_created",
  "catalogue_modifie",
  "quota_catalogue_modifie",
  "commissions_encaissees",
  "politique_commission_modifiee",
  "provider_account_associe",
  "provider_account_desactive",
  "service_market_created",
  "service_market_version_created",
  "service_market_version_published",
  "service_market_capability_changed",
  "geo_source_areas_imported",
  "identity_verification_verified",
  "identity_verification_rejected",
  "admin_account_created",
  "admin_account_suspended",
  "admin_account_reactivated",
  "admin_password_reset",
  "residence_validee",
  "residence_rejetee",
  "residence_suspendue",
  "residence_reactivee",
  "residence_created",
  "residence_updated",
  "residence_published",
  "residence_withdrawn",
  "residence_calendar_blocked",
  "residence_calendar_unblocked",
  "residence_reservation_created",
  "residence_reservation_updated",
  "residence_reservation_cancelled",
  "residence_reservation_confirmed",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditActor {
  type: AuditActorType;
  id: string;
}
