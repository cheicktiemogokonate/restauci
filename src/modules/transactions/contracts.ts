import { z } from "zod";
import type {
  PaymentMethod,
  PaymentNetwork,
  PaymentProviderAccountStatus,
  PayoutDestinationType,
  TransactionType,
} from "./model";
import { PAYMENT_RETURN_CHANNELS } from "./model";

export const paymentReturnChannelSchema = z
  .enum(PAYMENT_RETURN_CHANNELS)
  .default("web");

type TransactionOwnership = {
  partnerAccountId: string;
  clientId?: string | null;
  amountFcfa: number;
};

export type CreateFinancialTransactionInput = TransactionOwnership &
  (
    | {
        type: "commande_restaurant";
        restaurantOrderId: string;
      }
    | {
        type: "abonnement_partenaire";
        subscriptionRequestId: string;
      }
    | {
        type: "commission_settlement";
        commissionSettlementId: string;
      }
    | {
        type: "reservation_residence";
        residenceReservationId: string;
      }
    | {
        type: "remboursement";
        originalPaymentId: string;
        refundIdempotencyKey: string;
      }
  );

export interface CreatePaymentAttemptInput {
  transactionId: string;
  amountFcfa: number;
  method: PaymentMethod;
  network?: PaymentNetwork | null;
  provider?: string | null;
  providerReference?: string | null;
  recordedReference?: string | null;
  idempotencyKey?: string | null;
  recoverySettlementId?: string | null;
}

export interface InitializeGatewayPaymentInput {
  amountFcfa: number;
  currency: "XOF";
  email: string;
  reference: string;
  callbackUrl: string;
  method: "mobile_money" | "card";
  metadata: { paymentId: string; transactionId: string; purpose: TransactionType };
  split?: {
    providerAccountReference: string;
    platformChargeFcfa: number;
    feeBearer: "account";
  };
}

export interface InitializedGatewayPayment {
  reference: string;
  authorizationUrl: string;
}

export type GatewayPaymentStatus =
  | "success"
  | "pending"
  | "failed"
  | "reversed";

export interface VerifiedGatewayPayment {
  reference: string;
  status: GatewayPaymentStatus;
  amountFcfa: number;
  currency: string;
  network: PaymentNetwork | null;
}

export interface PaymentGateway {
  initialize(input: InitializeGatewayPaymentInput): Promise<InitializedGatewayPayment>;
  verify(reference: string): Promise<VerifiedGatewayPayment>;
}

export const configurePayoutDestinationSchema = z
  .object({
    institutionCode: z
      .string()
      .trim()
      .toUpperCase()
      .min(2)
      .max(50)
      .regex(/^[A-Z0-9_-]+$/, "Établissement de versement invalide."),
    accountIdentifier: z
      .string()
      .trim()
      .min(6, "Le numéro de compte est trop court.")
      .max(34, "Le numéro de compte est trop long.")
      .regex(
        /^\+?[A-Za-z0-9][A-Za-z0-9 .-]*$/,
        "Le numéro de compte contient des caractères invalides.",
      ),
  })
  .strict();

export type ConfigurePayoutDestinationInput = z.input<
  typeof configurePayoutDestinationSchema
>;

export interface PayoutInstitutionDTO {
  code: string;
  name: string;
  type: PayoutDestinationType;
}

export interface PayoutDestinationDTO {
  status: PaymentProviderAccountStatus;
  type: PayoutDestinationType;
  environment: "test" | "live";
  providerVerified: boolean;
  institutionCode: string | null;
  institutionName: string | null;
  maskedIdentifier: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutProviderAccount {
  reference: string;
  businessName: string;
  active: boolean;
  verified: boolean;
  currency: string | null;
  environment: "test" | "live";
  institutionCode: string | null;
  institutionName: string | null;
}

export interface PayoutGateway {
  listInstitutions(currency: "XOF"): Promise<PayoutInstitutionDTO[]>;
  createSubaccount(input: {
    businessName: string;
    institutionCode: string;
    accountIdentifier: string;
    percentageCharge: number;
  }): Promise<PayoutProviderAccount>;
  getSubaccount(reference: string): Promise<PayoutProviderAccount>;
}

export interface ConfirmPaymentInput {
  paymentId: string;
  confirmedByAdminId?: string | null;
  now?: Date;
}

export interface PaymentConfirmationResult {
  paymentId: string;
  transactionId: string;
  alreadyConfirmed: boolean;
}

export interface RecordConfirmedPaymentJournalInput {
  paymentId: string;
  eventId: string;
  channel: "provider" | "offline";
  actor: FinancialActor;
  occurredAt?: Date;
}

export interface TransactionSourceReference {
  type: TransactionType;
  sourceId: string;
}

export interface FinancialActor {
  type: "admin" | "partner" | "client" | "driver" | "system" | "provider";
  id: string;
}

export interface AdminFinancialJournalEntryDTO {
  id: string;
  transactionId: string;
  transactionType: TransactionType;
  entryType: "payment_confirmed" | "refund_obligation_created";
  direction: "inflow" | "outflow";
  amountFcfa: number;
  currency: "XOF";
  channel: "provider" | "offline" | "internal";
  provider: string | null;
  method: PaymentMethod | null;
  reference: string | null;
  occurredAt: Date;
  sourceId: string;
  partnerAccountId: string;
  partnerName: string;
  activityType: "restaurant" | "residence";
  entitlement: {
    type: "subscription_period";
    id: string;
    planCode: string;
  } | null;
}
