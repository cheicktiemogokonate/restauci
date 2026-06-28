// Availability logic for plats and creneaux horaires
// Determines whether a dish is available based on the restaurant's opening schedule

import type { Categorie, CreneauHoraire, Plat } from "@/types";

const DAYS_SHORT = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

function getJourCourt(): string {
  return DAYS_SHORT[new Date().getDay()] || "";
}

function parseTimeToMinutes(time: string) {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function isHeureActive(
  heureOuverture: string,
  heureFermeture: string,
  currentMinutes: number
) {
  const ouverture = parseTimeToMinutes(heureOuverture);
  const fermeture = parseTimeToMinutes(heureFermeture);

  if (fermeture === ouverture) {
    return true;
  }

  if (fermeture > ouverture) {
    return currentMinutes >= ouverture && currentMinutes < fermeture;
  }

  return currentMinutes >= ouverture || currentMinutes < fermeture;
}

function isCreneauActif(creneau: CreneauHoraire) {
  if (creneau.actif === false) {
    return false;
  }

  const jour = getJourCourt();
  if (!creneau.joursActifs.includes(jour)) {
    return false;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return isHeureActive(
    creneau.heureOuverture,
    creneau.heureFermeture,
    currentMinutes
  );
}

export function isPlatDisponible(
  plat: Plat,
  categorie: Categorie | undefined,
  creneaux: CreneauHoraire[]
): boolean {
  if (!plat.disponible) {
    return false;
  }

  const creneauId = plat.creneauId ?? categorie?.creneauId;
  if (!creneauId) {
    return true;
  }

  const creneau = creneaux.find((item) => item.id === creneauId);
  if (!creneau) {
    return true;
  }

  return isCreneauActif(creneau);
}
