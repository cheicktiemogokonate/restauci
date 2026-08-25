// Availability logic for plats and creneaux horaires
// Determines whether a dish is available based on the restaurant's opening schedule

type DishAvailability = { disponible: boolean; creneauId?: string | null };
type CategoryAvailability = { creneauId?: string | null };
type ScheduleAvailability = {
  id: string;
  actif: boolean;
  joursActifs: string[];
  heureOuverture: string;
  heureFermeture: string;
};

export const TOUTCI_TIME_ZONE = "Africa/Abidjan";

const DAY_CODES: Record<string, string> = {
  Mon: "lun",
  Tue: "mar",
  Wed: "mer",
  Thu: "jeu",
  Fri: "ven",
  Sat: "sam",
  Sun: "dim",
};

const DAY_ALIASES: Record<string, string> = {
  lundi: "lun",
  mardi: "mar",
  mercredi: "mer",
  jeudi: "jeu",
  vendredi: "ven",
  samedi: "sam",
  dimanche: "dim",
};

function getLocalClock(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    day: DAY_CODES[value("weekday")] ?? "",
    minutes: Number(value("hour")) * 60 + Number(value("minute")),
  };
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

export function isCreneauActif(
  creneau: ScheduleAvailability,
  options: { now?: Date; timeZone?: string } = {},
) {
  if (creneau.actif === false) {
    return false;
  }

  const { day, minutes } = getLocalClock(
    options.now ?? new Date(),
    options.timeZone ?? TOUTCI_TIME_ZONE,
  );
  const activeDays = creneau.joursActifs.map(
    (value) => DAY_ALIASES[value.toLowerCase()] ?? value.toLowerCase(),
  );
  if (!activeDays.includes(day)) {
    return false;
  }

  return isHeureActive(
    creneau.heureOuverture,
    creneau.heureFermeture,
    minutes,
  );
}

export function isPlatDisponible(
  plat: DishAvailability,
  categorie: CategoryAvailability | undefined,
  creneaux: ScheduleAvailability[],
  options: { now?: Date; timeZone?: string } = {},
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

  return isCreneauActif(creneau, options);
}
