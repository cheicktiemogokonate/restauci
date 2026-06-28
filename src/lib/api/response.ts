import { NextResponse } from "next/server";

/**
 * Format de réponse standard pour toutes les routes /api/v1/
 *
 * Succès :   { success: true,  data: T,      meta?: PaginationMeta }
 * Erreur :   { success: false, error: string, code: string }
 */

export interface ApiSuccess<T> {
  success:  true;
  data:     T;
  meta?:    PaginationMeta;
}

export interface ApiError {
  success: false;
  error:   string;
  code:    ApiErrorCode;
  details?: Record<string, string[]>;
}

export interface PaginationMeta {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  hasNext:    boolean;
  hasPrev:    boolean;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Codes d'erreur standardisés
export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMIT_EXCEEDED"
  | "INTERNAL_ERROR"
  | "CONFLICT"
  | "BAD_REQUEST";

/**
 * Helpers pour créer des réponses standardisées
 */
export const apiResponse = {
  success<T>(
    data: T,
    options?: { status?: number; meta?: PaginationMeta }
  ): NextResponse {
    const body: ApiSuccess<T> = {
      success: true,
      data,
      ...(options?.meta ? { meta: options.meta } : {}),
    };
    return NextResponse.json(body, { status: options?.status ?? 200 });
  },

  created<T>(data: T): NextResponse {
    return apiResponse.success(data, { status: 201 });
  },

  error(
    error:   string,
    code:    ApiErrorCode,
    options?: { status?: number; details?: Record<string, string[]> }
  ): NextResponse {
    const body: ApiError = {
      success: false,
      error,
      code,
      ...(options?.details ? { details: options.details } : {}),
    };
    return NextResponse.json(body, {
      status: options?.status ?? 400,
    });
  },

  unauthorized(message = "Authentification requise"): NextResponse {
    return apiResponse.error(message, "UNAUTHORIZED", { status: 401 });
  },

  forbidden(message = "Accès interdit"): NextResponse {
    return apiResponse.error(message, "FORBIDDEN", { status: 403 });
  },

  notFound(resource = "Ressource"): NextResponse {
    return apiResponse.error(
      `${resource} introuvable`,
      "NOT_FOUND",
      { status: 404 }
    );
  },

  validationError(details: Record<string, string[]>): NextResponse {
    return apiResponse.error(
      "Données invalides",
      "VALIDATION_ERROR",
      { status: 422, details }
    );
  },

  rateLimit(): NextResponse {
    return apiResponse.error(
      "Trop de requêtes. Réessayez dans quelques instants.",
      "RATE_LIMIT_EXCEEDED",
      { status: 429 }
    );
  },

  internalError(message = "Erreur interne du serveur"): NextResponse {
    return apiResponse.error(message, "INTERNAL_ERROR", { status: 500 });
  },
};