export const FUSEAU = "Africa/Porto-Novo";

/** Nombre entier groupé, sans unité : « 72 000 ». */
export function nombre(n: number | string): string {
  const valeur = Number(n);
  if (!Number.isFinite(valeur)) return "0";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 })
    .format(Math.round(valeur))
    .replace(/\u202f|\u00a0/g, " ");
}


/** JJ/MM/AAAA dans le fuseau de l'officine. */
export function formatDate(d: string | Date | null | undefined, fuseau = FUSEAU): string {
  if (!d) return "Date non renseignée";
  const date = new Date(d);
  if (!Number.isFinite(date.getTime())) return "Date non renseignée";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: fuseau,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateHeure(d: string | Date | null | undefined, fuseau = FUSEAU): string {
  if (!d) return "Date non renseignée";
  const date = new Date(d);
  if (!Number.isFinite(date.getTime())) return "Date non renseignée";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: fuseau,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Montant en FCFA, sans décimale. */
export function formatFCFA(n: number): string {
  return `${nombre(n)} FCFA`;
}

/** Mot de passe robuste : 12+ caractères, majuscule, minuscule, chiffre. */
export function motDePasseRobuste(p: string): boolean {
  return p.length >= 12 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p);
}
