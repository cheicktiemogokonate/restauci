import { Badge } from "@/components/ui/badge";
import type { IdentityVerificationStatus } from "../model";

const STATUS_COPY: Record<IdentityVerificationStatus, { label: string; className: string }> = {
  not_submitted: { label: "Non soumis", className: "bg-gray-100 text-gray-700 hover:bg-gray-100" },
  pending: { label: "En vérification", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  verified: { label: "Identité vérifiée", className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" },
  rejected: { label: "À corriger", className: "bg-red-100 text-red-800 hover:bg-red-100" },
};

export function IdentityStatusBadge({ status }: { status: IdentityVerificationStatus }) {
  const copy = STATUS_COPY[status];
  return <Badge className={copy.className}>{copy.label}</Badge>;
}
