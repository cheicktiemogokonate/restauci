import { Badge } from "@/components/ui/badge";
import type { ResidenceModerationStatus } from "../model";

const labels: Record<ResidenceModerationStatus, string> = {
  draft: "Brouillon",
  pending: "En vérification",
  approved: "Validée",
  rejected: "À corriger",
  suspended: "Suspendue",
};

const variants: Record<
  ResidenceModerationStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "secondary",
  pending: "outline",
  approved: "default",
  rejected: "destructive",
  suspended: "destructive",
};

export function ResidenceStatusBadge({
  status,
}: {
  status: ResidenceModerationStatus;
}) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
