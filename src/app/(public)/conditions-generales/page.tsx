import { LegalPage } from "@/components/legal/legal-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions générales d’utilisation",
  description: "Conditions générales d’utilisation de la plateforme Toutci.",
};

export default function ConditionsGeneralesPage() {
  return (
    <LegalPage title="Conditions générales d’utilisation" updatedAt="26 juillet 2026">
      <p>
        Toutci est une place de marché numérique ivoirienne qui met en relation
        des consommateurs et des restaurants indépendants. Les présentes
        conditions encadrent l’accès à la plateforme et son utilisation.
      </p>
      <h2>Rôle de Toutci</h2>
      <p>
        Toutci facilite la consultation des menus, la transmission des
        commandes et leur suivi. Le restaurant reste responsable des produits,
        prix, disponibilités, délais, informations alimentaires et de
        l’exécution de la commande.
      </p>
      <h2>Compte et sécurité</h2>
      <p>
        L’utilisateur doit fournir des informations exactes et préserver la
        confidentialité de ses accès. Toute utilisation frauduleuse, tentative
        d’intrusion ou atteinte au service est interdite.
      </p>
      <h2>Commande et annulation</h2>
      <p>
        Une commande est d’abord enregistrée avec le statut « reçue ». Le
        consommateur peut l’annuler tant que le restaurant n’a pas commencé sa
        préparation. Elle est acceptée lorsque son statut passe à « en
        préparation ». Après ce moment, une annulation nécessite l’accord du
        restaurant.
      </p>
      <h2>Paiement, prix et livraison</h2>
      <p>
        Les prix, frais et total sont affichés avant confirmation. Dans la
        version actuelle, le règlement s’effectue directement au restaurant ou
        au livreur. Les modalités de livraison dépendent du restaurant choisi.
      </p>
      <h2>Restaurants partenaires</h2>
      <p>
        Le partenaire garantit l’exactitude de sa fiche, de ses horaires et de
        sa carte. Il traite les commandes dans l’ordre et selon les statuts
        proposés par Toutci. Il demeure responsable du respect des règles
        sanitaires, fiscales et commerciales applicables en Côte d’Ivoire.
      </p>
      <h2>Disponibilité et responsabilité</h2>
      <p>
        Toutci met en œuvre des moyens raisonnables pour assurer la
        disponibilité et la sécurité du service. Des interruptions peuvent
        néanmoins intervenir pour maintenance, incident ou événement extérieur.
      </p>
      <h2>Droit applicable</h2>
      <p>
        Ces conditions sont soumises au droit ivoirien. Les parties rechercheront
        d’abord une solution amiable avant toute procédure contentieuse.
      </p>
    </LegalPage>
  );
}
