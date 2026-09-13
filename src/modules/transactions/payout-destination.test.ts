import { describe, expect, it } from "vitest";
import { configurePayoutDestinationSchema } from "./contracts";
import {
  normalizePayoutAccountIdentifier,
  PayoutDestinationError,
} from "./model";

describe("destination de versement partenaire", () => {
  it("normalise un numéro Mobile Money ivoirien local ou international", () => {
    expect(normalizePayoutAccountIdentifier({
      value: "07 00 00 00 00",
      type: "mobile_money",
    })).toBe("0700000000");
    expect(normalizePayoutAccountIdentifier({
      value: "+225 07 00 00 00 00",
      type: "mobile_money",
    })).toBe("0700000000");
  });

  it("refuse les numéros Mobile Money non ivoiriens", () => {
    expect(() => normalizePayoutAccountIdentifier({
      value: "123456",
      type: "mobile_money",
    })).toThrow(PayoutDestinationError);
  });

  it("refuse un numéro de carte même sélectionné comme compte bancaire", () => {
    expect(() => normalizePayoutAccountIdentifier({
      value: "4111 1111 1111 1111",
      type: "bank_account",
    })).toThrow(/numéro de carte/i);
  });

  it("n’accepte que les deux champs attendus depuis le navigateur", () => {
    expect(configurePayoutDestinationSchema.safeParse({
      institutionCode: "WAVE_CI",
      accountIdentifier: "0700000000",
      partnerAccountId: crypto.randomUUID(),
    }).success).toBe(false);
  });
});
