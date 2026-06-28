import { z } from "zod";
import { apiResponse } from "./response";

/**
 * Parse et valide le body d'une requête avec un schéma Zod.
 * Retourne les données validées ou une réponse d'erreur 422.
 */
export async function validateBody<T extends z.ZodType>(
  req: Request,
  schema: T
): Promise<
  | { data: z.infer<T>; error: null }
  | { data: null; error: Response }
> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return {
      data:  null,
      error: apiResponse.error(
        "Corps de requête invalide — JSON attendu",
        "BAD_REQUEST",
        { status: 400 }
      ),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      data:  null,
      error: apiResponse.validationError(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      ),
    };
  }

  return { data: parsed.data, error: null };
}

/**
 * Parse et valide les searchParams d'une requête.
 */
export function validateSearchParams<T extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: T
): { data: z.infer<T>; error: null } | { data: null; error: Response } {
  const raw    = Object.fromEntries(searchParams.entries());
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    return {
      data:  null,
      error: apiResponse.validationError(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      ),
    };
  }

  return { data: parsed.data, error: null };
}