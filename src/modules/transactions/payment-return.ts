import type { PaymentReturnChannel, TransactionType } from "./model";

export interface PaymentCallbackContext {
  returnChannel: PaymentReturnChannel;
  transactionType: TransactionType;
  sourceId: string;
  webDestination: string;
}

export function buildMobilePaymentReturnUrl(
  configuredUrl: string,
  input: {
    result: string;
    reference: string;
    transactionType: TransactionType;
    sourceId: string;
  },
) {
  const url = new URL(configuredUrl);
  url.searchParams.set("payment", input.result);
  url.searchParams.set("reference", input.reference);
  url.searchParams.set("type", input.transactionType);
  url.searchParams.set("sourceId", input.sourceId);
  return url;
}

export function buildWebPaymentReturnUrl(
  requestUrl: string,
  destination: string,
  result: string,
) {
  const url = new URL(destination, requestUrl);
  url.searchParams.set("payment", result);
  return url;
}
