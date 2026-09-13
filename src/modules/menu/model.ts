export const DEFAULT_MENU_CATEGORIES = [
  "Entrées",
  "Plats principaux",
  "Accompagnements",
  "Desserts",
  "Boissons",
] as const;

export const TOUTCI_TIME_ZONE = "Africa/Abidjan";

export type DishAvailabilityState = {
  disponible: boolean;
  creneauId?: string | null;
};

export type CategoryAvailabilityState = {
  creneauId?: string | null;
};

export type ScheduleAvailabilityState = {
  id: string;
  actif: boolean;
  joursActifs: string[];
  heureOuverture: string;
  heureFermeture: string;
};

export type DishPublicationState = {
  dishPublicationIntent: boolean;
  categoryPublicationIntent: boolean;
  dishQuotaEligible: boolean;
  categoryQuotaEligible: boolean;
};

export type MenuDomainErrorCode =
  | "CATEGORY_NOT_FOUND"
  | "CATEGORY_NAME_TAKEN"
  | "DISH_NOT_FOUND"
  | "DISH_NOT_ORDERABLE"
  | "MEDIA_ASSET_REQUIRED"
  | "MEDIA_OWNER_REQUIRED";

export class MenuDomainError extends Error {
  constructor(
    public readonly code: MenuDomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MenuDomainError";
  }
}

export function getInitialMenuCategories(categoryLimit: number | null) {
  if (categoryLimit === null) return [...DEFAULT_MENU_CATEGORIES];
  return DEFAULT_MENU_CATEGORIES.slice(0, Math.max(0, categoryLimit));
}

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

const DAY_ORDER = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

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

function isTimeRangeActive(
  openingTime: string,
  closingTime: string,
  currentMinutes: number,
) {
  const opening = parseTimeToMinutes(openingTime);
  const closing = parseTimeToMinutes(closingTime);
  if (closing === opening) return true;
  if (closing > opening) {
    return currentMinutes >= opening && currentMinutes < closing;
  }
  return currentMinutes >= opening || currentMinutes < closing;
}

export function isScheduleActive(
  schedule: ScheduleAvailabilityState,
  options: { now?: Date; timeZone?: string } = {},
) {
  if (!schedule.actif) return false;

  const { day, minutes } = getLocalClock(
    options.now ?? new Date(),
    options.timeZone ?? TOUTCI_TIME_ZONE,
  );
  const activeDays = schedule.joursActifs.map(
    (value) => DAY_ALIASES[value.toLowerCase()] ?? value.toLowerCase(),
  );
  const opening = parseTimeToMinutes(schedule.heureOuverture);
  const closing = parseTimeToMinutes(schedule.heureFermeture);
  if (opening === closing) return activeDays.includes(day);
  if (closing > opening) {
    return (
      activeDays.includes(day) &&
      isTimeRangeActive(
        schedule.heureOuverture,
        schedule.heureFermeture,
        minutes,
      )
    );
  }
  if (minutes >= opening) return activeDays.includes(day);
  const dayIndex = DAY_ORDER.indexOf(day);
  const previousDay = DAY_ORDER[
    (dayIndex + DAY_ORDER.length - 1) % DAY_ORDER.length
  ];
  return minutes < closing && activeDays.includes(previousDay ?? "");
}

export function isDishAvailable(
  dish: DishAvailabilityState,
  category: CategoryAvailabilityState | undefined,
  schedules: ScheduleAvailabilityState[],
  options: { now?: Date; timeZone?: string } = {},
) {
  if (!dish.disponible) return false;
  const scheduleId = dish.creneauId ?? category?.creneauId;
  if (!scheduleId) return true;
  const schedule = schedules.find((item) => item.id === scheduleId);
  return schedule ? isScheduleActive(schedule, options) : false;
}

export function isDishPubliclyVisible(state: DishPublicationState) {
  return (
    state.dishPublicationIntent &&
    state.categoryPublicationIntent &&
    state.dishQuotaEligible &&
    state.categoryQuotaEligible
  );
}

export function isDishOrderable(
  publication: DishPublicationState,
  dish: DishAvailabilityState,
  category: CategoryAvailabilityState | undefined,
  schedules: ScheduleAvailabilityState[],
  options: { now?: Date; timeZone?: string } = {},
) {
  return (
    isDishPubliclyVisible(publication) &&
    isDishAvailable(dish, category, schedules, options)
  );
}
