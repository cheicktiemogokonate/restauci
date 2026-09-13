export const TRANSACTION_TYPES = [
  "commande_restaurant",
  "abonnement_partenaire",
  "commission_settlement",
  "reservation_residence",
  "remboursement",
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

export const PAYOUT_DESTINATION_TYPES = [
  "bank_account",
  "mobile_money",
] as const;

export const PAYMENT_PROVIDER_ACCOUNT_STATUSES = [
  "pending",
  "active",
  "disabled",
] as const;

export const FINANCIAL_JOURNAL_ENTRY_TYPES = [
  "payment_confirmed",
  "refund_obligation_created",
] as const;

export const FINANCIAL_DIRECTIONS = ["inflow", "outflow"] as const;

export const FINANCIAL_CHANNELS = ["provider", "offline", "internal"] as const;

export const TRANSACTION_CURRENCY = "XOF" as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentNetwork = (typeof PAYMENT_NETWORKS)[number];
export type PaymentReturnChannel = (typeof PAYMENT_RETURN_CHANNELS)[number];
export type PayoutDestinationType = (typeof PAYOUT_DESTINATION_TYPES)[number];
export type PaymentProviderAccountStatus =
  (typeof PAYMENT_PROVIDER_ACCOUNT_STATUSES)[number];
export type FinancialJournalEntryType =
  (typeof FINANCIAL_JOURNAL_ENTRY_TYPES)[number];
export type FinancialDirection = (typeof FINANCIAL_DIRECTIONS)[number];
export type FinancialChannel = (typeof FINANCIAL_CHANNELS)[number];
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
      | "PAYMENT_CONFLICT"
      | "REFUND_NOT_ALLOWED"
      | "REFUND_LIMIT_EXCEEDED",
    message: string,
  ) {
    super(message);
    this.name = "FinancialTransactionError";
  }
}

export class PayoutDestinationError extends Error {
  constructor(
    public readonly code:
      | "DESTINATION_INVALID"
      | "INSTITUTION_UNAVAILABLE"
      | "ACCOUNT_ALREADY_CONFIGURED"
      | "PROVIDER_REJECTED"
      | "PROVIDER_UNAVAILABLE",
    message: string,
  ) {
    super(message);
    this.name = "PayoutDestinationError";
  }
}

function passesLuhn(value: string) {
  let sum = 0;
  let double = false;
  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export function normalizePayoutAccountIdentifier(input: {
  value: string;
  type: PayoutDestinationType;
}) {
  if (input.type === "mobile_money") {
    let digits = input.value.replaceAll(/\D/g, "");
    if (digits.length === 13 && digits.startsWith("225")) digits = digits.slice(3);
    if (!/^0[0-9]{9}$/.test(digits)) {
      throw new PayoutDestinationError(
        "DESTINATION_INVALID",
        "Saisissez un numéro Mobile Money ivoirien à 10 chiffres.",
      );
    }
    return digits;
  }

  const compact = input.value.replaceAll(/[ .-]/g, "").toUpperCase();
  if (!/^[A-Z0-9]{6,34}$/.test(compact)) {
    throw new PayoutDestinationError(
      "DESTINATION_INVALID",
      "Saisissez un numéro de compte ou de virement valide.",
    );
  }
  if (/^[0-9]{13,19}$/.test(compact) && passesLuhn(compact)) {
    throw new PayoutDestinationError(
      "DESTINATION_INVALID",
      "Un numéro de carte Visa ou Mastercard ne peut pas recevoir les versements. Utilisez le numéro de compte communiqué par l’établissement.",
    );
  }
  return compact;
}

export function assertPositiveFcfa(amountFcfa: number): void {
  if (!Number.isSafeInteger(amountFcfa) || amountFcfa <= 0) {
    throw new FinancialTransactionError(
      "INVALID_AMOUNT",
      "Le montant doit être un entier FCFA strictement positif.",
    );
  }
}

export function assertRefundCapacity(input: {
  originalAmountFcfa: number;
  alreadyRefundedFcfa: number;
  requestedAmountFcfa: number;
}): void {
  assertPositiveFcfa(input.originalAmountFcfa);
  assertPositiveFcfa(input.requestedAmountFcfa);
  if (
    !Number.isSafeInteger(input.alreadyRefundedFcfa) ||
    input.alreadyRefundedFcfa < 0
  ) {
    throw new FinancialTransactionError(
      "REFUND_NOT_ALLOWED",
      "Le cumul remboursé existant est invalide.",
    );
  }
  if (
    input.alreadyRefundedFcfa + input.requestedAmountFcfa >
    input.originalAmountFcfa
  ) {
    throw new FinancialTransactionError(
      "REFUND_LIMIT_EXCEEDED",
      "Le total des remboursements dépasse le paiement d’origine.",
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
