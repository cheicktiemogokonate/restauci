import { describe, expect, it } from "vitest";
import {
  calculerCommissionFcfa,
  calculerSousTotalFcfa,
  calculerTotalCommandeFcfa,
  parseMontantFcfa,
  calculateArrearsRecovery,
} from "./money";
import { formatPrix } from "./utils/format";

describe("convention monétaire FCFA", () => {
  it.each([
    [0, "0 FCFA"],
    [500, "500 FCFA"],
    [1_500, "1 500 FCFA"],
    [25_000, "25 000 FCFA"],
    [50_000, "50 000 FCFA"],
    [1_500_000, "1 500 000 FCFA"],
  ])("formate %i sans conversion d'unité", (montant, attendu) => {
    expect(formatPrix(montant)).toBe(attendu);
  });

  it("calcule une commande en FCFA entiers", () => {
    const sousTotal = calculerSousTotalFcfa([
      { prix: 1_500, quantite: 2 },
      { prix: 5_000, quantite: 1 },
    ]);

    expect(sousTotal).toBe(8_000);
    expect(calculerTotalCommandeFcfa(sousTotal, 500)).toBe(8_500);
  });

  it("enregistre exactement le montant FCFA saisi dans les formulaires", () => {
    expect(parseMontantFcfa("2500")).toBe(2_500);
    expect(parseMontantFcfa("2 500 FCFA")).toBe(2_500);
    expect(parseMontantFcfa("0")).toBeNull();
  });

  it("calcule la commission sans changer d'unité monétaire", () => {
    expect(calculerCommissionFcfa(21_500, 1_500)).toBe(3_225);
  });

  it("arrondit les demi-FCFA vers le haut de façon déterministe", () => {
    expect(calculerCommissionFcfa(1, 5_000)).toBe(1);
    expect(calculerCommissionFcfa(3, 5_000)).toBe(2);
  });

  it("plafonne la récupération d'arriérés à 50 % du net partenaire", () => {
    expect(calculateArrearsRecovery({
      orderTotalFcfa: 20_000,
      currentCommissionFcfa: 2_000,
      outstandingCashDebtFcfa: 12_000,
      recoveryMaxBps: 5_000,
    })).toEqual({
      normalPartnerNetFcfa: 18_000,
      maxRecoveryFcfa: 9_000,
      arrearsRecoveryFcfa: 9_000,
      partnerNetAfterRecoveryFcfa: 9_000,
      remainingCashDebtFcfa: 3_000,
    });
  });

  it("ne récupère que la dette lorsqu'elle est inférieure au plafond", () => {
    expect(calculateArrearsRecovery({ orderTotalFcfa: 20_000, currentCommissionFcfa: 2_000, outstandingCashDebtFcfa: 4_000, recoveryMaxBps: 5_000 }).arrearsRecoveryFcfa).toBe(4_000);
  });

  it("ne récupère rien sans dette et refuse un plafond supérieur à 50 %", () => {
    expect(calculateArrearsRecovery({ orderTotalFcfa: 20_000, currentCommissionFcfa: 2_000, outstandingCashDebtFcfa: 0, recoveryMaxBps: 5_000 }).arrearsRecoveryFcfa).toBe(0);
    expect(() => calculateArrearsRecovery({ orderTotalFcfa: 20_000, currentCommissionFcfa: 2_000, outstandingCashDebtFcfa: 1_000, recoveryMaxBps: 5_001 })).toThrow("invalides");
  });
});
