import { LegalPage } from "@/components/legal/legal-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Traitement des données personnelles par Toutci.",
};

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité" updatedAt="26 juillet 2026">
      <p>
        Toutci traite les données personnelles conformément à la loi ivoirienne
        n° 2013-450 relative à la protection des données à caractère personnel,
        sous le contrôle de l’ARTCI.
      </p>
      <h2>Données traitées</h2>
      <p>
        Nous pouvons traiter les données d’identité et de contact, les données
        de compte, les adresses et coordonnées de livraison, les commandes,
        les échanges avec le support, ainsi que des données techniques de
        sécurité et de connexion.
      </p>
      <h2>Finalités</h2>
      <p>
        Ces données servent à créer et sécuriser les comptes, transmettre et
        suivre les commandes, assurer la livraison, répondre aux demandes,
        prévenir la fraude, améliorer le service et respecter nos obligations
        légales.
      </p>
      <h2>Destinataires</h2>
      <p>
        Les données nécessaires à une commande sont transmises au restaurant
        concerné et, le cas échéant, au livreur. Des prestataires techniques
        peuvent intervenir sous contrat pour l’hébergement, la base de données,
        la sécurité ou les communications.
      </p>
      <h2>Conservation et sécurité</h2>
      <p>
        Les données sont conservées uniquement pendant la durée nécessaire aux
        finalités et obligations applicables. Toutci utilise notamment des
        contrôles d’accès, le chiffrement des communications, la journalisation
        et des sauvegardes adaptées.
      </p>
      <h2>Vos droits</h2>
      <p>
        Vous pouvez demander l’accès, la rectification, l’effacement ou la
        limitation de vos données, et exercer les autres droits reconnus par la
        réglementation ivoirienne. Vous pouvez également introduire une
        réclamation auprès de l’ARTCI.
      </p>
    </LegalPage>
  );
}
