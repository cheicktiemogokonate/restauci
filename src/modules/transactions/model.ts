export const TRANSACTION_TYPES = [
  "commande_restaurant",
  "abonnement_partenaire",
  "commission_settlement",
  "reservation_residence",
] as const;

export const TRANSACTION_STATUSES = ["pending", "paid", "cancelled"] as const;

export const PAYMENT_STATUSES = [
  "pending",
  "confirmed",
  "failed",
  "cancelled",
] as const;

export const PAYMENT_METHODS = [
  "cash",
  "mobile_money",
  "card",
  "bank_transfer",
  "cheque",
  "manual",
] as const;

export const PAYMENT_NETWORKS = ["wave", "orange", "mtn"] as const;

export const PAYMENT_RETURN_CHANNELS = ["web", "mobile"] as const;

export const TRANSACTION_CURRENCY = "XOF" as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentNetwork = (typeof PAYMENT_NETWORKS)[number];
export type PaymentReturnChannel = (typeof PAYMENT_RETURN_CHANNELS)[number];
export type TransactionCurrency = typeof TRANSACTION_CURRENCY;

export class FinancialTransactionError extends Error {
  constructor(
    public readonly code:
      | "INVALID_AMOUNT"
      | "INVALID_PAYMENT_DETAILS"
      | "TRANSACTION_NOT_FOUND"
      | "TRANSACTION_ALREADY_PAID"
      | "TRANSACTION_CANCELLED"
      | "PAYMENT_NOT_FOUND"
      | "PAYMENT_NOT_CONFIRMABLE"
      | "PAYMENT_CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "FinancialTransactionError";
  }
}

export function assertPositiveFcfa(amountFcfa: number): void {
  if (!Number.isSafeInteger(amountFcfa) || amountFcfa <= 0) {
    throw new FinancialTransactionError(
      "INVALID_AMOUNT",
      "Le montant doit être un entier FCFA strictement positif.",
    );
  }
}

export function assertPaymentDetails(input: {
  method: PaymentMethod;
  network?: PaymentNetwork | null;
  provider?: string | null;
  providerReference?: string | null;
}): void {
  if (input.network && input.method !== "mobile_money") {
    throw new FinancialTransactionError(
      "INVALID_PAYMENT_DETAILS",
      "Un réseau est uniquement valable pour Mobile Money.",
    );
  }
  if (input.providerReference && !input.provider) {
    throw new FinancialTransactionError(
      "INVALID_PAYMENT_DETAILS",
      "Une référence fournisseur exige un fournisseur.",
    );
  }
  if (input.method === "cash" && input.provider) {
    throw new FinancialTransactionError(
      "INVALID_PAYMENT_DETAILS",
      "Un paiement cash normal ne possède pas de fournisseur.",
    );
  }
}

export function mapOfflinePaymentMethod(
  method: "mobile_money" | "virement" | "especes" | "cheque",
): PaymentMethod {
  switch (method) {
    case "mobile_money":
      return "mobile_money";
    case "virement":
      return "bank_transfer";
    case "especes":
      return "cash";
    case "cheque":
      return "cheque";
  }
}
