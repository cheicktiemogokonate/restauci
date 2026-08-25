/**
 * Convention monétaire du domaine Toutci : tous les montants sont des FCFA
 * entiers. Aucune conversion en sous-unité n'est effectuée dans le métier.
 */
export function calculerSousTotalFcfa(
  items: readonly { prix: number; quantite: number }[],
): number {
  return items.reduce((total, item) => total + item.prix * item.quantite, 0);
}

export function parseMontantFcfa(value: string): number | null {
  const montant = Number(value.replace(/\s/g, "").replace(/[^\d]/g, ""));
  if (!Number.isSafeInteger(montant) || montant <= 0) return null;
  return montant;
}

export function calculerTotalCommandeFcfa(
  sousTotalFcfa: number,
  fraisLivraisonFcfa = 0,
  remiseFcfa = 0,
): number {
  return sousTotalFcfa + fraisLivraisonFcfa - remiseFcfa;
}

export function calculerCommissionFcfa(
  montantCommandeFcfa: number,
  tauxCommissionBps: number,
): number {
  if (
    !Number.isSafeInteger(montantCommandeFcfa) ||
    montantCommandeFcfa < 0 ||
    !Number.isInteger(tauxCommissionBps) ||
    tauxCommissionBps < 0 ||
    tauxCommissionBps > 10_000
  ) {
    throw new Error("Montant ou taux de commission invalide");
  }
  const result =
    (BigInt(montantCommandeFcfa) * BigInt(tauxCommissionBps) + BigInt(5_000)) /
    BigInt(10_000);
  const amount = Number(result);
  if (!Number.isSafeInteger(amount)) throw new Error("Commission hors limite");
  return amount;
}

export function calculateArrearsRecovery({
  orderTotalFcfa,
  currentCommissionFcfa,
  outstandingCashDebtFcfa,
  recoveryMaxBps,
}: {
  orderTotalFcfa: number;
  currentCommissionFcfa: number;
  outstandingCashDebtFcfa: number;
  recoveryMaxBps: number;
}) {
  const values = [orderTotalFcfa, currentCommissionFcfa, outstandingCashDebtFcfa];
  if (
    values.some((value) => !Number.isSafeInteger(value) || value < 0) ||
    !Number.isInteger(recoveryMaxBps) ||
    recoveryMaxBps < 0 ||
    recoveryMaxBps > 5_000 ||
    currentCommissionFcfa > orderTotalFcfa
  ) {
    throw new Error("Paramètres de récupération d’arriérés invalides");
  }
  const normalPartnerNetFcfa = orderTotalFcfa - currentCommissionFcfa;
  const maxRecoveryFcfa = Number(
    (BigInt(normalPartnerNetFcfa) * BigInt(recoveryMaxBps)) / BigInt(10_000),
  );
  const arrearsRecoveryFcfa = Math.min(
    outstandingCashDebtFcfa,
    maxRecoveryFcfa,
  );
  return {
    normalPartnerNetFcfa,
    maxRecoveryFcfa,
    arrearsRecoveryFcfa,
    partnerNetAfterRecoveryFcfa:
      normalPartnerNetFcfa - arrearsRecoveryFcfa,
    remainingCashDebtFcfa:
      outstandingCashDebtFcfa - arrearsRecoveryFcfa,
  };
}
