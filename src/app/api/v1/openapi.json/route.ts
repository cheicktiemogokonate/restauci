import { NextResponse } from "next/server";

/**
 * Endpoint qui retourne la spec OpenAPI 3.0 de l'API v1.
 * Accessible sur : GET /api/v1/openapi.json
 *
 * Cette spec peut être importée dans :
 * - Postman pour les tests
 * - Swagger UI pour la documentation interactive
 * - openapi-typescript pour générer les types côté mobile
 */
export async function GET() {
  const spec = {
    openapi: "3.0.0",
    info: {
      title: "RestauCI API v1",
      description: "API REST pour l'application mobile RestauCI",
      version: "1.0.0",
      contact: {
        name: "RestauCI Support",
        email: "support@restauci.ci",
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_APP_URL + "/api/v1",
        description: "Production",
      },
    ],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ApiSuccess: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object" },
            meta: { $ref: "#/components/schemas/PaginationMeta" },
          },
        },
        ApiError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string" },
            code: { type: "string" },
            details: { type: "object" },
          },
        },
        PaginationMeta: {
          type: "object",
          properties: {
            total: { type: "integer" },
            page: { type: "integer" },
            limit: { type: "integer" },
            totalPages: { type: "integer" },
            hasNext: { type: "boolean" },
            hasPrev: { type: "boolean" },
          },
        },
      },
    },
    paths: {
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Connexion restaurateur",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                    rememberMe: { type: "boolean", default: false },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Connexion réussie — retourne les tokens JWT",
            },
            "401": { description: "Email ou mot de passe incorrect" },
            "429": { description: "Trop de tentatives" },
          },
        },
      },
      "/auth/refresh": {
        post: {
          tags: ["Auth"],
          summary: "Rafraîchir le token d'accès",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["refreshToken"],
                  properties: {
                    refreshToken: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Nouveau token d'accès" },
            "401": { description: "Refresh token invalide ou expiré" },
          },
        },
      },
      "/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Déconnexion utilisateur",
          responses: {
            "200": { description: "Déconnexion réussie" },
            "401": { description: "Token invalide ou manquant" },
          },
        },
      },
      "/restaurateur/stats": {
        get: {
          tags: ["Restaurateur"],
          summary: "Statistiques du dashboard",
          responses: {
            "200": { description: "Statistiques du restaurant" },
          },
        },
      },
      "/restaurateur/commandes": {
        get: {
          tags: ["Restaurateur"],
          summary: "Liste des commandes (paginée)",
          parameters: [
            { name: "statut", in: "query", schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
          ],
          responses: {
            "200": { description: "Liste des commandes avec pagination" },
          },
        },
      },
      "/restaurateur/plats": {
        get: {
          tags: ["Restaurateur"],
          summary: "Liste des plats (paginée)",
          responses: {
            "200": { description: "Liste des plats avec pagination" },
          },
        },
        post: {
          tags: ["Restaurateur"],
          summary: "Créer un nouveau plat",
          responses: {
            "201": { description: "Plat créé" },
            "422": { description: "Données invalides" },
          },
        },
      },
      "/public/restaurants/{slug}": {
        get: {
          tags: ["Public"],
          summary: "Informations publiques d'un restaurant",
          security: [],
          parameters: [
            {
              name: "slug",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Données publiques du restaurant" },
            "404": { description: "Restaurant introuvable" },
          },
        },
      },
      "/public/restaurants/{slug}/menu": {
        get: {
          tags: ["Public"],
          summary: "Menu public d'un restaurant",
          security: [],
          responses: {
            "200": { description: "Catégories et plats disponibles" },
          },
        },
      },
      // === CLIENT ENDPOINTS ===
      "/client/auth/register": {
        post: {
          tags: ["Client Auth"],
          summary: "Inscription client",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["nom", "telephone", "password"],
                  properties: {
                    nom: { type: "string", minLength: 2, maxLength: 255 },
                    telephone: {
                      type: "string",
                      pattern: "^\\+?[0-9\\s]{8,20}$",
                    },
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 6, maxLength: 100 },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Client créé avec tokens JWT" },
            "409": { description: "Compte déjà existant" },
            "429": { description: "Trop de tentatives" },
          },
        },
      },
      "/client/auth/login": {
        post: {
          tags: ["Client Auth"],
          summary: "Connexion client (téléphone + mot de passe)",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["telephone", "password"],
                  properties: {
                    telephone: { type: "string", minLength: 8 },
                    password: { type: "string", minLength: 1 },
                    rememberMe: { type: "boolean", default: false },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Tokens JWT client" },
            "401": { description: "Identifiants incorrects" },
            "429": { description: "Trop de tentatives" },
          },
        },
      },
      "/client/auth/me": {
        get: {
          tags: ["Client Auth"],
          summary: "Profil du client connecté",
          responses: {
            "200": { description: "Profil client" },
            "401": { description: "Authentification requise" },
          },
        },
        patch: {
          tags: ["Client Auth"],
          summary: "Mettre à jour le profil client",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    nom: { type: "string", minLength: 2, maxLength: 255 },
                    email: { type: "string", format: "email" },
                    adresseDefaut: { type: "string", maxLength: 500 },
                    latitudeDefaut: { type: "number" },
                    longitudeDefaut: { type: "number" },
                    ancienPassword: { type: "string" },
                    nouveauPassword: {
                      type: "string",
                      minLength: 6,
                      maxLength: 100,
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Profil mis à jour" },
            "422": { description: "Données invalides" },
            "429": { description: "Trop de tentatives" },
          },
        },
      },
      "/client/auth/refresh": {
        post: {
          tags: ["Client Auth"],
          summary: "Rafraîchir le token client",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["refreshToken"],
                  properties: {
                    refreshToken: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Nouveau token d'accès" },
            "401": { description: "Refresh token invalide ou expiré" },
          },
        },
      },
      "/client/restaurants": {
        get: {
          tags: ["Client Restaurants"],
          summary: "Liste des restaurants (avec proximité si lat/lng fournis)",
          security: [],
          parameters: [
            {
              name: "lat",
              in: "query",
              schema: { type: "number" },
              description: "Latitude client",
            },
            {
              name: "lng",
              in: "query",
              schema: { type: "number" },
              description: "Longitude client",
            },
            {
              name: "rayon",
              in: "query",
              schema: { type: "number", default: 10 },
              description: "Rayon en km",
            },
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "cuisine", in: "query", schema: { type: "string" } },
            { name: "modeCommande", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "Liste paginée de restaurants" } },
        },
      },
      "/client/restaurants/{slug}": {
        get: {
          tags: ["Client Restaurants"],
          summary: "Détail restaurant avec temps d'attente et itinéraire",
          security: [],
          parameters: [
            {
              name: "slug",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            { name: "lat", in: "query", schema: { type: "number" } },
            { name: "lng", in: "query", schema: { type: "number" } },
          ],
          responses: {
            "200": { description: "Restaurant avec géo et temps d'attente" },
          },
        },
      },
      "/client/geo/geocode": {
        get: {
          tags: ["Client Géo"],
          summary: "Convertir une adresse en coordonnées GPS (Photon)",
          security: [],
          parameters: [
            {
              name: "q",
              in: "query",
              required: true,
              schema: { type: "string" },
              description: "Adresse à geocoder. Ex: Cocody Riviera 3, Abidjan",
            },
          ],
          responses: { "200": { description: "Coordonnées GPS" } },
        },
      },
      "/client/commandes": {
        post: {
          tags: ["Client Commandes"],
          summary: "Passer une commande",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["restaurantSlug", "modeCommande", "items"],
                  properties: {
                    restaurantSlug: { type: "string" },
                    modeCommande: {
                      type: "string",
                      enum: ["sur_place", "livraison", "emporter"],
                    },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["platId", "quantite"],
                        properties: {
                          platId: { type: "string" },
                          quantite: {
                            type: "integer",
                            minimum: 1,
                            maximum: 20,
                          },
                        },
                      },
                      minItems: 1,
                    },
                    adresseLivraison: { type: "string", maxLength: 500 },
                    latitudeLivraison: { type: "number" },
                    longitudeLivraison: { type: "number" },
                    numeroTable: { type: "string", maxLength: 10 },
                    noteClient: { type: "string", maxLength: 500 },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Commande créée" },
            "422": { description: "Données invalides ou plat indisponible" },
            "429": { description: "Trop de tentatives" },
          },
        },
        get: {
          tags: ["Client Commandes"],
          summary: "Historique des commandes du client",
          responses: { "200": { description: "Liste paginée" } },
        },
      },
      "/client/commandes/{id}": {
        get: {
          tags: ["Client Commandes"],
          summary: "Détail et suivi d'une commande (timeline statut)",
          responses: { "200": { description: "Commande avec timeline" } },
        },
      },
      "/client/commandes/{id}/stream": {
        get: {
          tags: ["Client Commandes"],
          summary: "SSE : suivi temps réel du statut d'une commande",
          responses: {
            "200": { description: "Stream SSE de mise à jour de statut" },
          },
        },
      },
      "/push/expo/register": {
        post: {
          tags: ["Push"],
          summary: "Enregistrer un token Expo Push",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["expoToken"],
                  properties: {
                    expoToken: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Token Expo enregistré" },
            "401": { description: "Authentification requise" },
            "422": { description: "Token Expo invalide" },
          },
        },
      },
    },
  };

  return NextResponse.json(spec, {
    headers: {
      "Access-Control-Allow-Origin": "*", // Swagger UI depuis n'importe où
      "Cache-Control": "public, max-age=3600",
    },
  });
}
