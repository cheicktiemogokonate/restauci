import { LegalPage } from "@/components/legal/legal-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Informations légales relatives à Toutci.",
  robots: { index: false, follow: true },
};

export default function MentionsLegalesPage() {
  return (
    <LegalPage title="Mentions légales" updatedAt="26 juillet 2026">
      <h2>Éditeur</h2>
      <p>
        Toutci est une plateforme numérique exploitée en Côte d’Ivoire. La
        dénomination sociale, la forme juridique, le capital, les numéros RCCM
        et NCC, l’adresse du siège, le téléphone et le directeur de publication
        doivent être renseignés par l’éditeur avant l’ouverture commerciale.
      </p>
      <h2>Hébergement</h2>
      <p>
        L’identité du prestataire d’hébergement de production, son adresse et
        le pays d’hébergement seront publiés dès le choix définitif de
        l’infrastructure.
      </p>
      <h2>Propriété intellectuelle</h2>
      <p>
        La marque, les interfaces, textes, logiciels et éléments graphiques de
        Toutci sont protégés. Toute reproduction non autorisée est interdite.
        Les restaurants restent responsables des contenus qu’ils publient.
      </p>
      <h2>Contact</h2>
      <p>
        Les adresses officielles de contact général et de protection des
        données seront affichées ici avant la mise en production publique.
      </p>
    </LegalPage>
  );
}
