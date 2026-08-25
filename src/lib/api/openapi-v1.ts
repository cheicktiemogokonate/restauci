type HttpMethod = "get" | "post" | "patch" | "delete";
type JsonObject = Record<string, unknown>;

interface OperationDefinition {
  method: HttpMethod;
  path: string;
  operationId: string;
  tag: string;
  summary: string;
  public?: boolean;
  body?: string | JsonObject;
  created?: boolean;
  stream?: boolean;
}

const ref = (name: string): JsonObject => ({
  $ref: `#/components/schemas/${name}`,
});

const expoTokenBody = {
  type: "object",
  additionalProperties: false,
  required: ["expoToken"],
  properties: { expoToken: { type: "string", minLength: 20, maxLength: 500 } },
};

const paymentRetryBody = {
  type: "object",
  additionalProperties: false,
  required: ["method"],
  properties: {
    method: { type: "string", enum: ["mobile_money", "card"] },
    paymentReturnChannel: ref("PaymentReturnChannel"),
  },
};

export const openApiV1Operations: readonly OperationDefinition[] = [
  { method: "post", path: "/auth/login", operationId: "partnerLogin", tag: "Auth partenaire", summary: "Connecter un partenaire ou administrateur", public: true, body: "PartnerLoginRequest" },
  { method: "post", path: "/auth/logout", operationId: "partnerLogout", tag: "Auth partenaire", summary: "Déconnecter le compte partenaire" },
  { method: "post", path: "/auth/refresh", operationId: "partnerRefresh", tag: "Auth partenaire", summary: "Renouveler les jetons partenaire", public: true, body: "BearerRefreshRequest" },

  { method: "post", path: "/client/auth/register", operationId: "clientRegister", tag: "Auth consommateur", summary: "Créer un compte consommateur", public: true, body: "ClientRegisterRequest", created: true },
  { method: "post", path: "/client/auth/login", operationId: "clientLogin", tag: "Auth consommateur", summary: "Connecter un consommateur", public: true, body: "ClientLoginRequest" },
  { method: "post", path: "/client/auth/logout", operationId: "clientLogout", tag: "Auth consommateur", summary: "Révoquer la session web ou native", public: true, body: "ClientRefreshRequest" },
  { method: "post", path: "/client/auth/refresh", operationId: "clientRefresh", tag: "Auth consommateur", summary: "Renouveler la session consommateur", public: true, body: "ClientRefreshRequest" },
  { method: "get", path: "/client/auth/me", operationId: "getClientProfile", tag: "Compte consommateur", summary: "Lire le profil consommateur" },
  { method: "patch", path: "/client/auth/me", operationId: "updateClientProfile", tag: "Compte consommateur", summary: "Modifier le profil consommateur", body: "ClientProfileUpdateRequest" },

  { method: "get", path: "/client/geo/geocode", operationId: "geocodeClientAddress", tag: "Localisation", summary: "Géocoder une adresse", public: true },
  { method: "post", path: "/client/location/resolve", operationId: "resolveClientLocation", tag: "Localisation", summary: "Résoudre le marché de service d'une position", public: true, body: "LocationSample" },

  { method: "get", path: "/client/restaurants", operationId: "listClientRestaurants", tag: "Restaurants consommateur", summary: "Lister les restaurants découvrables", public: true },
  { method: "post", path: "/client/restaurants/search", operationId: "searchClientRestaurants", tag: "Restaurants consommateur", summary: "Rechercher et classer les restaurants", public: true, body: "RestaurantSearchRequest" },
  { method: "get", path: "/client/restaurants/{slug}", operationId: "getClientRestaurant", tag: "Restaurants consommateur", summary: "Lire le détail d'un restaurant", public: true },
  { method: "get", path: "/client/restaurants/{slug}/menu", operationId: "getClientRestaurantMenu", tag: "Restaurants consommateur", summary: "Lire le menu public d'un restaurant", public: true },

  { method: "post", path: "/client/commandes/prevalidate", operationId: "prevalidateClientOrder", tag: "Commandes consommateur", summary: "Prévalider la zone et le mode d'une commande", body: "OrderPrevalidationRequest" },
  { method: "get", path: "/client/commandes", operationId: "listClientOrders", tag: "Commandes consommateur", summary: "Lister l'historique des commandes" },
  { method: "post", path: "/client/commandes", operationId: "createClientOrder", tag: "Commandes consommateur", summary: "Créer une commande idempotente", body: "RestaurantOrderRequest", created: true },
  { method: "get", path: "/client/commandes/{id}", operationId: "getClientOrder", tag: "Commandes consommateur", summary: "Lire le détail et le paiement d'une commande" },
  { method: "patch", path: "/client/commandes/{id}", operationId: "cancelClientOrder", tag: "Commandes consommateur", summary: "Annuler une commande encore annulable" },
  { method: "post", path: "/client/commandes/{id}/paiement", operationId: "retryClientOrderPayment", tag: "Commandes consommateur", summary: "Relancer le paiement Paystack d'une commande", body: paymentRetryBody },
  { method: "get", path: "/client/commandes/{id}/stream", operationId: "streamClientOrder", tag: "Commandes consommateur", summary: "Suivre une commande en SSE", stream: true },

  { method: "get", path: "/client/reservations", operationId: "listClientReservations", tag: "Résidences consommateur", summary: "Lister les réservations de résidences" },
  { method: "post", path: "/client/reservations", operationId: "createClientReservation", tag: "Résidences consommateur", summary: "Réserver une résidence et initialiser son paiement", body: "ResidenceReservationRequest", created: true },
  { method: "get", path: "/client/reservations/{id}", operationId: "getClientReservation", tag: "Résidences consommateur", summary: "Lire une réservation de résidence" },
  { method: "post", path: "/client/reservations/{id}/cancel", operationId: "cancelClientReservation", tag: "Résidences consommateur", summary: "Annuler une réservation" },
  { method: "post", path: "/client/reservations/{id}/payment", operationId: "retryClientReservationPayment", tag: "Résidences consommateur", summary: "Relancer le paiement d'une réservation", body: paymentRetryBody },

  { method: "get", path: "/client/notifications", operationId: "listClientNotifications", tag: "Notifications consommateur", summary: "Lister les notifications et le compteur non lu" },
  { method: "patch", path: "/client/notifications", operationId: "markClientNotificationsRead", tag: "Notifications consommateur", summary: "Marquer des notifications comme lues", body: "MarkNotificationsReadRequest" },
  { method: "post", path: "/client/push/expo", operationId: "registerClientExpoToken", tag: "Notifications consommateur", summary: "Associer une installation Expo au consommateur", body: expoTokenBody },
  { method: "delete", path: "/client/push/expo", operationId: "unregisterClientExpoToken", tag: "Notifications consommateur", summary: "Dissocier une installation Expo", body: expoTokenBody },

  { method: "post", path: "/public/residences/search", operationId: "searchPublicResidences", tag: "Résidences publiques", summary: "Rechercher les résidences publiées", public: true, body: "ResidenceSearchRequest" },
  { method: "get", path: "/public/residences/{id}", operationId: "getPublicResidence", tag: "Résidences publiques", summary: "Lire une résidence par slug", public: true },
  { method: "get", path: "/public/residences/{id}/availability", operationId: "getPublicResidenceAvailability", tag: "Résidences publiques", summary: "Lire les indisponibilités d'une résidence", public: true },
  { method: "post", path: "/public/residences/{id}/quote", operationId: "quotePublicResidence", tag: "Résidences publiques", summary: "Calculer et vérifier un séjour", public: true, body: "ResidenceQuoteRequest" },
  { method: "get", path: "/public/restaurants/{slug}", operationId: "getPublicRestaurant", tag: "Restaurants publics", summary: "Lire le détail public d'un restaurant", public: true },
  { method: "get", path: "/public/restaurants/{slug}/menu", operationId: "getPublicRestaurantMenu", tag: "Restaurants publics", summary: "Lire le menu public d'un restaurant", public: true },
  { method: "post", path: "/public/discovery/events", operationId: "recordDiscoveryEvent", tag: "Découverte", summary: "Attribuer l'ouverture d'un résultat", public: true, body: "DiscoveryEventRequest" },
  { method: "get", path: "/public/discovery/open", operationId: "openDiscoveryDestination", tag: "Découverte", summary: "Valider une attribution et rediriger", public: true },

  { method: "post", path: "/push/expo/register", operationId: "registerPartnerExpoToken", tag: "Notifications partenaire", summary: "Associer une installation Expo au partenaire", body: expoTokenBody },
  { method: "get", path: "/restaurateur/stats", operationId: "getRestaurantStats", tag: "Restaurant partenaire", summary: "Lire les statistiques du restaurant" },
  { method: "get", path: "/restaurateur/commandes", operationId: "listRestaurantOrders", tag: "Restaurant partenaire", summary: "Lister les commandes du restaurant" },
  { method: "get", path: "/restaurateur/commandes/{id}", operationId: "getRestaurantOrder", tag: "Restaurant partenaire", summary: "Lire une commande du restaurant" },
  { method: "patch", path: "/restaurateur/commandes/{id}", operationId: "updateRestaurantOrder", tag: "Restaurant partenaire", summary: "Faire évoluer le statut d'une commande", body: "OrderStatusRequest" },
  { method: "patch", path: "/restaurateur/commandes/{id}/statut", operationId: "updateRestaurantOrderStatus", tag: "Restaurant partenaire", summary: "Faire évoluer le statut (route historique)", body: "OrderStatusRequest" },
  { method: "get", path: "/restaurateur/plats", operationId: "listRestaurantDishes", tag: "Restaurant partenaire", summary: "Lister les plats du restaurant" },
  { method: "post", path: "/restaurateur/plats", operationId: "createRestaurantDish", tag: "Restaurant partenaire", summary: "Créer un plat", body: { type: "object", additionalProperties: true }, created: true },
];

const queryParameters: Record<string, JsonObject[]> = {
  geocodeClientAddress: [{ name: "q", in: "query", required: true, schema: { type: "string", minLength: 3 } }],
  listClientRestaurants: ["lat", "lng", "rayon", "search", "cuisine", "modeCommande", "page", "limit"].map((name) => ({ name, in: "query", schema: { type: "string" } })),
  getClientRestaurant: ["lat", "lng", "discoveryToken"].map((name) => ({ name, in: "query", schema: { type: "string" } })),
  listClientOrders: ["search", "page", "limit"].map((name) => ({ name, in: "query", schema: { type: "string" } })),
  listClientNotifications: ["page", "limit", "unreadOnly"].map((name) => ({ name, in: "query", schema: { type: "string" } })),
  openDiscoveryDestination: [{ name: "token", in: "query", required: true, schema: { type: "string" } }],
  listRestaurantOrders: ["statut", "page", "limit"].map((name) => ({ name, in: "query", schema: { type: "string" } })),
  listRestaurantDishes: ["search", "categorieId", "disponible", "page", "limit"].map((name) => ({ name, in: "query", schema: { type: "string" } })),
};

function pathParameters(path: string): JsonObject[] {
  return [...path.matchAll(/\{([^}]+)\}/g)].map(([, name]) => ({
    name,
    in: "path",
    required: true,
    schema: { type: "string" },
  }));
}

function buildOperation(definition: OperationDefinition) {
  const parameters = [
    ...pathParameters(definition.path),
    ...(queryParameters[definition.operationId] ?? []),
  ];
  const responseContent = definition.stream
    ? { "text/event-stream": { schema: { type: "string" } } }
    : { "application/json": { schema: ref("ApiSuccess") } };
  return {
    operationId: definition.operationId,
    tags: [definition.tag],
    summary: definition.summary,
    ...(definition.public ? { security: [] } : {}),
    ...(parameters.length ? { parameters } : {}),
    ...(definition.body
      ? {
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema:
                  typeof definition.body === "string"
                    ? ref(definition.body)
                    : definition.body,
              },
            },
          },
        }
      : {}),
    responses: {
      [definition.created ? "201" : "200"]: {
        description: "Succès",
        content: responseContent,
      },
      "401": { description: "Session absente ou expirée", content: { "application/json": { schema: ref("ApiError") } } },
      "422": { description: "Données invalides", content: { "application/json": { schema: ref("ApiError") } } },
      "429": { description: "Limite de requêtes dépassée", content: { "application/json": { schema: ref("ApiError") } } },
    },
  };
}

export function buildOpenApiV1Spec(appUrl: string) {
  const paths: Record<string, Partial<Record<HttpMethod, JsonObject>>> = {};
  for (const definition of openApiV1Operations) {
    paths[definition.path] ??= {};
    paths[definition.path][definition.method] = buildOperation(definition);
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "Toutci API v1",
      version: "1.1.0",
      description: "Contrat fonctionnel de référence pour les clients web et mobiles Toutci.",
    },
    servers: [{ url: `${appUrl.replace(/\/$/, "")}/api/v1` }],
    security: [{ bearerAuth: [] }],
    paths,
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
      schemas: {
        ApiSuccess: { type: "object", required: ["success", "data"], properties: { success: { const: true }, data: {}, meta: ref("PaginationMeta") } },
        ApiError: { type: "object", required: ["success", "error", "code"], properties: { success: { const: false }, error: { type: "string" }, code: { type: "string" }, details: { type: "object" } } },
        PaginationMeta: { type: "object", required: ["total", "page", "limit", "totalPages", "hasNext", "hasPrev"], properties: { total: { type: "integer", minimum: 0 }, page: { type: "integer", minimum: 1 }, limit: { type: "integer", minimum: 1 }, totalPages: { type: "integer", minimum: 0 }, hasNext: { type: "boolean" }, hasPrev: { type: "boolean" } } },
        PaymentReturnChannel: { type: "string", enum: ["web", "mobile"], default: "web" },
        TokenTransport: { type: "string", enum: ["cookie", "json"], default: "cookie" },
        PartnerLoginRequest: { type: "object", required: ["email", "password"], properties: { email: { type: "string", format: "email" }, password: { type: "string" }, rememberMe: { type: "boolean" } } },
        BearerRefreshRequest: { type: "object", required: ["refreshToken"], properties: { refreshToken: { type: "string" } } },
        ClientRegisterRequest: { type: "object", additionalProperties: false, required: ["nom", "telephone", "password"], properties: { nom: { type: "string", minLength: 2, maxLength: 255 }, telephone: { type: "string", pattern: "^\\+?[0-9\\s]{8,20}$" }, email: { type: "string", format: "email" }, password: { type: "string", minLength: 8, maxLength: 100 }, tokenTransport: ref("TokenTransport") } },
        ClientLoginRequest: { type: "object", additionalProperties: false, required: ["telephone", "password"], properties: { telephone: { type: "string", minLength: 8 }, password: { type: "string" }, rememberMe: { type: "boolean", default: false }, tokenTransport: ref("TokenTransport") } },
        ClientRefreshRequest: { type: "object", additionalProperties: false, properties: { tokenTransport: ref("TokenTransport"), refreshToken: { type: "string", description: "Requis en transport json." } } },
        ClientProfileUpdateRequest: { type: "object", properties: { nom: { type: "string", minLength: 2, maxLength: 255 }, email: { type: ["string", "null"], format: "email" }, adresseDefaut: { type: ["string", "null"], maxLength: 500 }, latitudeDefaut: { type: ["number", "null"] }, longitudeDefaut: { type: ["number", "null"] }, ancienPassword: { type: "string" }, nouveauPassword: { type: "string", minLength: 6, maxLength: 100 } } },
        LocationSample: { type: "object", additionalProperties: false, required: ["lat", "lng", "accuracyMeters", "capturedAt"], properties: { lat: { type: "number", minimum: -90, maximum: 90 }, lng: { type: "number", minimum: -180, maximum: 180 }, accuracyMeters: { type: "number", minimum: 0, maximum: 100000 }, capturedAt: { type: "string", format: "date-time" }, context: { type: "string", default: "currentLocation" }, use: { type: "string", default: "discovery" } } },
        RestaurantSearchRequest: { type: "object", additionalProperties: false, properties: { query: { type: "string" }, cuisine: { type: "string" }, page: { type: "integer", minimum: 1 }, limit: { type: "integer", minimum: 1, maximum: 100 }, currentLocation: ref("LocationSample") } },
        OrderPrevalidationRequest: { type: "object", required: ["restaurantSlug", "modeCommande"], properties: { restaurantSlug: { type: "string" }, modeCommande: { type: "string", enum: ["sur_place", "livraison", "emporter"] }, currentLocation: ref("LocationSample"), adresseLivraison: { type: "string" }, latitudeLivraison: { type: "number" }, longitudeLivraison: { type: "number" }, numeroTable: { type: "string" } } },
        RestaurantOrderRequest: { allOf: [ref("OrderPrevalidationRequest"), { type: "object", required: ["items", "idempotencyKey", "paymentMethod"], properties: { paymentMethod: { type: "string", enum: ["cash", "mobile_money", "card"] }, paymentReturnChannel: ref("PaymentReturnChannel"), idempotencyKey: { type: "string", format: "uuid" }, discoveryToken: { type: "string" }, noteClient: { type: "string", maxLength: 500 }, items: { type: "array", minItems: 1, maxItems: 100, items: { type: "object", required: ["platId", "quantite"], properties: { platId: { type: "string", format: "uuid" }, quantite: { type: "integer", minimum: 1, maximum: 20 } } } } } }] },
        ResidenceSearchRequest: { type: "object", additionalProperties: false, properties: { destination: { type: "string", maxLength: 100 }, checkIn: { type: "string", format: "date" }, checkOut: { type: "string", format: "date" }, guests: { type: "integer", minimum: 1, maximum: 100 }, page: { type: "integer", minimum: 1, default: 1 }, limit: { type: "integer", minimum: 1, maximum: 48, default: 12 } } },
        ResidenceQuoteRequest: { type: "object", required: ["checkIn", "checkOut", "guests"], properties: { checkIn: { type: "string", format: "date" }, checkOut: { type: "string", format: "date" }, guests: { type: "integer", minimum: 1, maximum: 100 } } },
        ResidenceReservationRequest: { allOf: [ref("ResidenceQuoteRequest"), { type: "object", required: ["residenceId", "paymentMethod"], properties: { residenceId: { type: "string", format: "uuid" }, paymentMethod: { type: "string", enum: ["mobile_money", "card"] }, paymentReturnChannel: ref("PaymentReturnChannel"), discoveryToken: { type: "string" } } }] },
        MarkNotificationsReadRequest: { type: "object", additionalProperties: false, properties: { notificationIds: { type: "array", minItems: 1, maxItems: 100, items: { type: "string", format: "uuid" } }, markAll: { type: "boolean" } }, description: "Renseigner exactement notificationIds ou markAll=true." },
        DiscoveryEventRequest: { type: "object", additionalProperties: false, required: ["token", "eventType"], properties: { token: { type: "string", minLength: 20, maxLength: 2000 }, eventType: { const: "detail_open" } } },
        OrderStatusRequest: { type: "object", required: ["statut"], properties: { statut: { type: "string", enum: ["en_preparation", "prete", "servie", "annulee"] } } },
      },
    },
  };
}

export type OpenApiV1Spec = ReturnType<typeof buildOpenApiV1Spec>;
