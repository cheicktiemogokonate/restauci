import { Badge } from "@/components/ui/badge";
import type { ResidencePublicationStatusDTO } from "../contracts";
import type { ResidenceVisibilityBlocker } from "../model";

const blockerMessages: Record<
  ResidenceVisibilityBlocker,
  { title: string; description: string }
> = {
  publication_not_requested: {
    title: "Brouillon privé",
    description: "Envoyez la fiche pour vérification lorsque sa présentation est prête.",
  },
  admin_review_pending: {
    title: "Vérification de la fiche en cours",
    description: "L’équipe Toutci examine le contenu du logement. Aucune action n’est requise pour le moment.",
  },
  admin_corrections_required: {
    title: "Corrections demandées",
    description: "Corrigez la fiche puis envoyez-la de nouveau pour vérification.",
  },
  residence_suspended: {
    title: "Résidence suspendue",
    description: "Cette fiche ne peut pas être affichée publiquement pendant sa suspension.",
  },
  identity_not_submitted: {
    title: "Identité du propriétaire à vérifier",
    description: "Terminez la vérification d’identité du compte partenaire avant la mise en ligne.",
  },
  identity_review_pending: {
    title: "Identité en cours de vérification",
    description: "Le dossier d’identité a été transmis et doit être validé par l’équipe Toutci.",
  },
  identity_rejected: {
    title: "Dossier d’identité à corriger",
    description: "Consultez la vérification d’identité et transmettez les corrections demandées.",
  },
  location_missing: {
    title: "Position du logement manquante",
    description: "Confirmez l’emplacement du logement sur la carte.",
  },
  destination_unserved: {
    title: "Destination pas encore ouverte",
    description: "Toutci n’a pas encore activé les résidences dans cette destination.",
  },
  destination_ambiguous: {
    title: "Destination à vérifier",
    description: "La position se trouve dans plusieurs zones et doit être examinée par l’équipe Toutci.",
  },
  residence_service_unavailable: {
    title: "Résidences indisponibles dans cette zone",
    description: "La zone existe, mais l’activité Résidence n’y est pas encore active.",
  },
  quota_exceeded: {
    title: "Limite de logements publics atteinte",
    description: "Le logement reste enregistré, mais votre offre actuelle ne permet pas de l’afficher publiquement.",
  },
  partner_publication_disabled: {
    title: "Prête à publier",
    description:
      "Tous les contrôles sont terminés. Publiez la résidence lorsque vous souhaitez l’afficher aux voyageurs.",
  },
};

export function getResidenceVisibilityMessage(
  publication: ResidencePublicationStatusDTO,
) {
  if (publication.isPubliclyVisible) {
    return {
      title: "Visible publiquement",
      description: "La résidence est accessible aux voyageurs sur Toutci.",
    };
  }
  const blocker = publication.blockers[0] ?? "publication_not_requested";
  return blockerMessages[blocker];
}

export function getResidenceVisibilityBlockerMessage(
  blocker: ResidenceVisibilityBlocker,
) {
  return blockerMessages[blocker];
}

export function ResidencePublicationStatusBadge({
  publication,
}: {
  publication: ResidencePublicationStatusDTO;
}) {
  if (publication.isPubliclyVisible) {
    return (
    <Badge className="bg-emerald-700 text-white hover:bg-emerald-700">
      Visible publiquement
    </Badge>
    );
  }
  return publication.blockers[0] === "partner_publication_disabled" ? (
    <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
      Prête à publier
    </Badge>
  ) : (
    <Badge variant="secondary">Non publiée</Badge>
  );
}
