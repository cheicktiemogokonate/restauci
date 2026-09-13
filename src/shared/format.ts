// Formatting utilities for display values (prices, dates, phone numbers, etc.)

/** Formate un montant métier stocké en FCFA entiers, sans conversion d'unité. */
export function formatPrix(montantFcfa: number): string {
  return (
    new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montantFcfa) + " FCFA"
  );
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatHeure(date: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatTelephone(tel: string): string {
  const clean = tel.replace(/\D/g, "");
  if (clean.length === 10) {
    return `+225 ${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 6)} ${clean.slice(6, 8)} ${clean.slice(8, 10)}`;
  }
  return tel;
}
