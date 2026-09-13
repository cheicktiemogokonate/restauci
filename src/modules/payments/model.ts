export class ProviderPaymentError extends Error {
  constructor(
    public readonly code:
      | "PAYMENT_NOT_FOUND"
      | "FORBIDDEN"
      | "NOT_PAYABLE"
      | "PROVIDER_MISMATCH"
      | "AMOUNT_MISMATCH"
      | "CURRENCY_MISMATCH"
      | "MOBILE_RETURN_NOT_CONFIGURED"
      | "INITIALIZATION_CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "ProviderPaymentError";
  }
}
