"use client";

import { ResidenceWorkspaceError } from "@/modules/residences/presentation/residence-workspace-error";

export default function PartnerReservationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ResidenceWorkspaceError error={error} reset={reset} />;
}
