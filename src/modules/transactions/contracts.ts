import { z } from "zod";
import type {
  PaymentMethod,
  PaymentNetwork,
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
  );

export interface CreatePaymentAttemptInput {
  transactionId: string;
  amountFcfa: number;
  method: PaymentMethod;
  network?: PaymentNetwork | null;
  provider?: string | null;
  providerReference?: string | null;
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

export interface TransactionSourceReference {
  type: TransactionType;
  sourceId: string;
}
