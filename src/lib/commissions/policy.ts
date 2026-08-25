export function resolveCashAccess({
  outstandingDebtFcfa,
  cycle,
  now,
}: {
  outstandingDebtFcfa: number;
  cycle: { triggeredAt: Date; graceDaysSnapshot: number } | null;
  now: Date;
}) {
  const graceEndsAt = cycle
    ? new Date(
        cycle.triggeredAt.getTime() +
          cycle.graceDaysSnapshot * 24 * 60 * 60 * 1_000,
      )
    : null;
  const cashAllowed =
    outstandingDebtFcfa === 0 ||
    !cycle ||
    (graceEndsAt !== null && now < graceEndsAt);
  return {
    graceEndsAt,
    cashAllowed,
    reason: cashAllowed ? null : ("CASH_DEBT_GRACE_EXPIRED" as const),
  };
}

export function calculateArrearsRecovery(input: {
  normalPartnerNetFcfa: number;
  availableDebtFcfa: number;
  recoveryBps: number;
}) {
  if (
    !Number.isSafeInteger(input.normalPartnerNetFcfa) || input.normalPartnerNetFcfa < 0 ||
    !Number.isSafeInteger(input.availableDebtFcfa) || input.availableDebtFcfa < 0 ||
    !Number.isInteger(input.recoveryBps) || input.recoveryBps < 0 || input.recoveryBps > 5_000
  ) throw new Error("Paramètres de recovery invalides");
  const maxRecovery = Math.floor((input.normalPartnerNetFcfa * input.recoveryBps) / 10_000);
  return Math.min(input.availableDebtFcfa, maxRecovery);
}
