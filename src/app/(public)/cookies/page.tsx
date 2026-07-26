import { LegalPage } from "@/components/legal/legal-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de cookies",
  description: "Utilisation des cookies et traceurs sur Toutci.",
};

export default function CookiesPage() {
  return (
    <LegalPage title="Politique de cookies" updatedAt="26 juillet 2026">
      <p>
        Toutci utilise des cookies et stockages locaux pour faire fonctionner
        le service, protéger les sessions et mémoriser certains choix.
      </p>
      <h2>Traceurs strictement nécessaires</h2>
      <p>
        Ils permettent notamment l’authentification, la sécurité, la
        conservation du panier et la continuité de navigation. Ils ne peuvent
        pas être désactivés sans rendre certaines fonctions indisponibles.
      </p>
      <h2>Mesure d’audience</h2>
      <p>
        Les outils de mesure non strictement nécessaires ne doivent être
        activés qu’après votre choix. Lorsqu’ils sont utilisés, leur durée de
        conservation ne dépasse pas treize mois.
      </p>
      <h2>Gérer vos choix</h2>
      <p>
        Vous pouvez supprimer les cookies dans les réglages de votre navigateur.
        Une interface de consentement est présentée lorsque des traceurs
        facultatifs sont activés sur le service.
      </p>
    </LegalPage>
  );
}
