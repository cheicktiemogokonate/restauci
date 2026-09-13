/**
 * Échappe les jokers SQL LIKE (% _ \) d'une entrée utilisateur pour éviter
 * qu'une recherche comme "%%" ou "a_b" ne balaye toute la table.
 *
 * Les valeurs restent paramétrées par Drizzle (pas d'injection SQL possible) :
 * cet échappement traite uniquement la sémantique des wildcards. PostgreSQL
 * utilise le backslash comme caractère d'échappement par défaut de LIKE.
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, "\\$&");
}
