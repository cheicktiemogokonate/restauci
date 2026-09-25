type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
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

const restaurantDriverProperties = {
  nom: { type: "string", minLength: 2, maxLength: 120 },
  telephone: { type: "string", minLength: 8, maxLength: 20 },
  photoUrl: { type: "string", format: "uri", maxLength: 2000 },
  vehicule: {
    type: "string",
    enum: ["moto", "velo", "voiture", "tricycle", "autre"],
  },
  numeroVehicule: { type: "string", minLength: 2, maxLength: 30 },
  fixedDeliveryCompensationFcfa: {
    type: ["integer", "null"],
    minimum: 1,
    maximum: 1_000_000,
    description: "Montant fixe facultatif convenu avec le livreur. Jamais ajouté automatiquement au prix client.",
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
  { method: "post", path: "/client/auth/password", operationId: "changeClientPassword", tag: "Compte consommateur", summary: "Changer le mot de passe du consommateur", body: "ChangeClientPasswordRequest" },
  { method: "post", path: "/client/account/delete", operationId: "deleteClientAccount", tag: "Compte consommateur", summary: "Supprimer le compte consommateur", body: "DeleteClientAccountRequest" },

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
  { method: "get", path: "/client/commandes/{id}/livraison", operationId: "getClientDelivery", tag: "Livraison consommateur", summary: "Lire le suivi, le livreur et la preuve de remise" },
  { method: "post", path: "/client/commandes/{id}/livraison/confirmation", operationId: "confirmClientDelivery", tag: "Livraison consommateur", summary: "Confirmer la remise depuis l'espace client" },

  { method: "get", path: "/client/reservations", operationId: "listClientReservations", tag: "Résidences consommateur", summary: "Lister les réservations de résidences" },
  { method: "post", path: "/client/reservations", operationId: "createClientReservation", tag: "Résidences consommateur", summary: "Réserver une résidence et initialiser son paiement", body: "ResidenceReservationRequest", created: true },
  { method: "get", path: "/client/reservations/{id}", operationId: "getClientReservation", tag: "Résidences consommateur", summary: "Lire une réservation de résidence" },
  { method: "post", path: "/client/reservations/{id}/cancel", operationId: "cancelClientReservation", tag: "Résidences consommateur", summary: "Annuler une réservation" },
  { method: "post", path: "/client/reservations/{id}/payment", operationId: "retryClientReservationPayment", tag: "Résidences consommateur", summary: "Relancer le paiement d'une réservation", body: paymentRetryBody },

  { method: "get", path: "/client/notifications", operationId: "listClientNotifications", tag: "Notifications consommateur", summary: "Lister les notifications et le compteur non lu" },
  { method: "patch", path: "/client/notifications", operationId: "markClientNotificationsRead", tag: "Notifications consommateur", summary: "Marquer des notifications comme lues", body: "MarkNotificationsReadRequest" },
  { method: "post", path: "/client/push/expo", operationId: "registerClientExpoToken", tag: "Notifications consommateur", summary: "Associer une installation Expo au consommateur", body: expoTokenBody },
  { method: "delete", path: "/client/push/expo", operationId: "unregisterClientExpoToken", tag: "Notifications consommateur", summary: "Dissocier une installation Expo", body: expoTokenBody },

  { method: "post", path: "/livreur/auth/login", operationId: "driverLogin", tag: "Auth livreur", summary: "Connecter un livreur ou demander son activation", public: true, body: "DriverLoginRequest" },
  { method: "post", path: "/livreur/auth/activation", operationId: "activateDriver", tag: "Auth livreur", summary: "Choisir le mot de passe définitif", public: true, body: "DriverActivationRequest" },
  { method: "post", path: "/livreur/auth/refresh", operationId: "refreshDriver", tag: "Auth livreur", summary: "Renouveler une session livreur", public: true, body: "DriverRefreshRequest" },
  { method: "post", path: "/livreur/auth/logout", operationId: "logoutDriver", tag: "Auth livreur", summary: "Révoquer une session livreur", public: true, body: "DriverRefreshRequest" },
  { method: "get", path: "/livreur/me", operationId: "getDriverProfile", tag: "Espace livreur", summary: "Lire profil, disponibilité, espèces et rémunérations dues" },
  { method: "patch", path: "/livreur/disponibilite", operationId: "setDriverAvailability", tag: "Espace livreur", summary: "Se déclarer disponible ou indisponible", body: "DriverAvailabilityRequest" },
  { method: "get", path: "/livreur/offres/courante", operationId: "getCurrentDriverOffer", tag: "Missions livreur", summary: "Lire la proposition active" },
  { method: "post", path: "/livreur/offres/{id}/reponse", operationId: "respondDriverOffer", tag: "Missions livreur", summary: "Accepter ou refuser une proposition", body: "DriverOfferResponseRequest" },
  { method: "get", path: "/livreur/livraisons", operationId: "listDriverDeliveries", tag: "Missions livreur", summary: "Lister mission active et historique" },
  { method: "get", path: "/livreur/livraisons/{id}", operationId: "getDriverDelivery", tag: "Missions livreur", summary: "Lire une mission appartenant au livreur" },
  { method: "post", path: "/livreur/livraisons/{id}/depart", operationId: "startDriverDelivery", tag: "Missions livreur", summary: "Confirmer la récupération d'une commande prête" },
  { method: "post", path: "/livreur/livraisons/{id}/remise", operationId: "completeDriverDelivery", tag: "Missions livreur", summary: "Confirmer preuve de remise et espèces", body: "CompleteDriverDeliveryRequest" },
  { method: "post", path: "/livreur/livraisons/{id}/echec", operationId: "failDriverDelivery", tag: "Missions livreur", summary: "Signaler un échec motivé", body: "FailDriverDeliveryRequest" },
  { method: "get", path: "/livreur/notifications", operationId: "listDriverNotifications", tag: "Notifications livreur", summary: "Lister les notifications livreur" },
  { method: "patch", path: "/livreur/notifications", operationId: "markDriverNotificationsRead", tag: "Notifications livreur", summary: "Marquer les notifications livreur comme lues", body: "MarkNotificationsReadRequest" },
  { method: "post", path: "/livreur/push/expo", operationId: "registerDriverExpoToken", tag: "Notifications livreur", summary: "Associer une installation Expo au livreur", body: expoTokenBody },
  { method: "delete", path: "/livreur/push/expo", operationId: "unregisterDriverExpoToken", tag: "Notifications livreur", summary: "Dissocier une installation Expo du livreur", body: expoTokenBody },

  { method: "post", path: "/public/residences/search", operationId: "searchPublicResidences", tag: "Résidences publiques", summary: "Rechercher les résidences publiées", public: true, body: "ResidenceSearchRequest" },
  { method: "get", path: "/public/residences/{id}", operationId: "getPublicResidence", tag: "Résidences publiques", summary: "Lire une résidence par slug", public: true },
  { method: "get", path: "/public/residences/{id}/availability", operationId: "getPublicResidenceAvailability", tag: "Résidences publiques", summary: "Lire les indisponibilités d'une résidence", public: true },
  { method: "post", path: "/public/residences/{id}/quote", operationId: "quotePublicResidence", tag: "Résidences publiques", summary: "Calculer et vérifier un séjour", public: true, body: "ResidenceQuoteRequest" },
  { method: "post", path: "/public/restaurants/search", operationId: "searchPublicRestaurants", tag: "Restaurants publics", summary: "Rechercher les restaurants publiés", public: true, body: "RestaurantSearchRequest" },
  { method: "get", path: "/public/restaurants/{slug}", operationId: "getPublicRestaurant", tag: "Restaurants publics", summary: "Lire le détail public d'un restaurant", public: true },
  { method: "get", path: "/public/restaurants/{slug}/menu", operationId: "getPublicRestaurantMenu", tag: "Restaurants publics", summary: "Lire le menu public d'un restaurant", public: true },
  { method: "post", path: "/public/discovery/events", operationId: "recordDiscoveryEvent", tag: "Découverte", summary: "Attribuer l'ouverture d'un résultat", public: true, body: "DiscoveryEventRequest" },
  { method: "post", path: "/public/discovery/mood", operationId: "searchPublicMood", tag: "Découverte", summary: "Rechercher par ambiance et envie multi-verticales", public: true, body: "MoodSearchRequest" },
  { method: "get", path: "/public/discovery/open", operationId: "openDiscoveryDestination", tag: "Découverte", summary: "Valider une attribution et rediriger", public: true },
  { method: "post", path: "/public/etablissements/search", operationId: "searchPublicEtablissements", tag: "Découverte", summary: "Rechercher les établissements unifiés sur la carte", public: true, body: "EtablissementSearchRequest" },

  { method: "post", path: "/push/expo/register", operationId: "registerPartnerExpoToken", tag: "Notifications partenaire", summary: "Associer une installation Expo au partenaire", body: expoTokenBody },
  { method: "get", path: "/restaurateur/stats", operationId: "getRestaurantStats", tag: "Restaurant partenaire", summary: "Lire les statistiques du restaurant" },
  { method: "get", path: "/restaurateur/commandes", operationId: "listRestaurantOrders", tag: "Restaurant partenaire", summary: "Lister les commandes du restaurant" },
  { method: "get", path: "/restaurateur/commandes/{id}", operationId: "getRestaurantOrder", tag: "Restaurant partenaire", summary: "Lire une commande du restaurant" },
  { method: "patch", path: "/restaurateur/commandes/{id}", operationId: "updateRestaurantOrder", tag: "Restaurant partenaire", summary: "Faire évoluer le statut d'une commande", body: "OrderStatusRequest" },
  { method: "patch", path: "/restaurateur/commandes/{id}/statut", operationId: "updateRestaurantOrderStatus", tag: "Restaurant partenaire", summary: "Faire évoluer le statut (route historique)", body: "OrderStatusRequest" },
  { method: "get", path: "/restaurateur/commandes/{id}/livraison/assignation", operationId: "getRestaurantDelivery", tag: "Livraisons restaurant", summary: "Lire la livraison et son journal" },
  { method: "put", path: "/restaurateur/commandes/{id}/livraison/assignation", operationId: "proposeRestaurantDelivery", tag: "Livraisons restaurant", summary: "Proposer la livraison à un livreur disponible", body: "ProposeDeliveryRequest", created: true },
  { method: "delete", path: "/restaurateur/commandes/{id}/livraison/assignation", operationId: "unassignRestaurantDelivery", tag: "Livraisons restaurant", summary: "Désassigner avant récupération" },
  { method: "get", path: "/restaurateur/livreurs", operationId: "listRestaurantDrivers", tag: "Flotte restaurant", summary: "Lister la flotte et sa disponibilité réelle" },
  { method: "post", path: "/restaurateur/livreurs", operationId: "createRestaurantDriver", tag: "Flotte restaurant", summary: "Créer un livreur et ses accès temporaires", body: "RestaurantDriverRequest", created: true },
  { method: "get", path: "/restaurateur/livreurs/{id}", operationId: "getRestaurantDriver", tag: "Flotte restaurant", summary: "Lire un livreur du restaurant" },
  { method: "patch", path: "/restaurateur/livreurs/{id}", operationId: "updateRestaurantDriver", tag: "Flotte restaurant", summary: "Modifier un livreur du restaurant", body: "RestaurantDriverUpdateRequest" },
  { method: "post", path: "/restaurateur/livreurs/{id}/acces", operationId: "resetDriverAccess", tag: "Flotte restaurant", summary: "Régénérer les accès et révoquer les sessions" },
  { method: "post", path: "/restaurateur/livreurs/{id}/desactivation", operationId: "deactivateRestaurantDriver", tag: "Flotte restaurant", summary: "Désactiver le compte et traiter sa mission" },
  { method: "post", path: "/restaurateur/livreurs/{id}/remises-especes", operationId: "confirmDriverCashRemittance", tag: "Espèces livreur", summary: "Confirmer la remise exacte d'un lot d'encaissements", body: "CashRemittanceRequest", created: true },
  { method: "post", path: "/restaurateur/livreurs/{id}/remunerations", operationId: "confirmDriverCompensationPayment", tag: "Rémunérations livreur", summary: "Déclarer réglées les rémunérations dues du livreur", body: "DriverCompensationPaymentRequest" },
  { method: "get", path: "/restaurateur/plats", operationId: "listRestaurantDishes", tag: "Restaurant partenaire", summary: "Lister les plats du restaurant" },
  { method: "post", path: "/restaurateur/plats", operationId: "createRestaurantDish", tag: "Restaurant partenaire", summary: "Créer un plat", body: { type: "object", additionalProperties: true }, created: true },
];

const queryParameters: Record<string, JsonObject[]> = {
  geocodeClientAddress: [{ name: "q", in: "query", required: true, schema: { type: "string", minLength: 3 } }],
  listClientRestaurants: ["lat", "lng", "rayon", "search", "cuisine", "modeCommande", "page", "limit"].map((name) => ({ name, in: "query", schema: { type: "string" } })),
  getClientRestaurant: ["lat", "lng", "discoveryToken"].map((name) => ({ name, in: "query", schema: { type: "string" } })),
  listClientOrders: ["search", "page", "limit"].map((name) => ({ name, in: "query", schema: { type: "string" } })),
  listClientNotifications: ["page", "limit", "unreadOnly"].map((name) => ({ name, in: "query", schema: { type: "string" } })),
  listDriverDeliveries: ["page", "limit"].map((name) => ({ name, in: "query", schema: { type: "string" } })),
  listDriverNotifications: ["page", "limit", "unreadOnly"].map((name) => ({ name, in: "query", schema: { type: "string" } })),
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
        PartnerLoginRequest: { type: "object", required: ["email", "password"], properties: { email: { type: "string", format: "email" }, password: { type: "string" }, rememberMe: { type: "boolean" }, otp: { type: "string", pattern: "^[0-9]{6}$", description: "Obligatoire pour les administrateurs." } } },
        BearerRefreshRequest: { type: "object", required: ["refreshToken"], properties: { refreshToken: { type: "string" } } },
        ClientRegisterRequest: { type: "object", additionalProperties: false, required: ["nom", "telephone", "password"], properties: { nom: { type: "string", minLength: 2, maxLength: 255 }, telephone: { type: "string", pattern: "^\\+?[0-9\\s]{8,20}$" }, email: { type: "string", format: "email" }, password: { type: "string", minLength: 12, maxLength: 128 }, tokenTransport: ref("TokenTransport") } },
        ClientLoginRequest: { type: "object", additionalProperties: false, required: ["telephone", "password"], properties: { telephone: { type: "string", minLength: 8 }, password: { type: "string" }, rememberMe: { type: "boolean", default: false }, tokenTransport: ref("TokenTransport") } },
        ClientRefreshRequest: { type: "object", additionalProperties: false, properties: { tokenTransport: ref("TokenTransport"), refreshToken: { type: "string", description: "Requis en transport json." } } },
        DriverLoginRequest: { type: "object", additionalProperties: false, required: ["loginId", "password"], properties: { loginId: { type: "string", minLength: 8, maxLength: 32 }, password: { type: "string", maxLength: 128 }, tokenTransport: ref("TokenTransport") } },
        DriverActivationRequest: { type: "object", additionalProperties: false, required: ["activationToken", "password"], properties: { activationToken: { type: "string", minLength: 20, maxLength: 4000 }, password: { type: "string", minLength: 12, maxLength: 128 }, tokenTransport: ref("TokenTransport") } },
        DriverRefreshRequest: { type: "object", additionalProperties: false, properties: { tokenTransport: ref("TokenTransport"), refreshToken: { type: "string", description: "Requis en transport json." } } },
        DriverAvailabilityRequest: { type: "object", additionalProperties: false, required: ["available"], properties: { available: { type: "boolean" } } },
        DriverOfferResponseRequest: { type: "object", additionalProperties: false, required: ["accept"], properties: { accept: { type: "boolean" }, declineReason: { type: "string", enum: ["unavailable", "distance", "vehicle_problem", "other"] }, note: { type: "string", minLength: 3, maxLength: 300 }, becomeUnavailable: { type: "boolean", default: false } } },
        CompleteDriverDeliveryRequest: { type: "object", additionalProperties: false, properties: { proofCode: { type: "string", pattern: "^[0-9]{6}$" }, cashCollected: { type: "boolean", default: false } } },
        FailDriverDeliveryRequest: { type: "object", additionalProperties: false, required: ["reason"], properties: { reason: { type: "string", enum: ["client_absent", "client_unreachable", "address_inaccessible", "vehicle_problem", "order_damaged", "payment_refused", "other"] }, note: { type: "string", minLength: 3, maxLength: 500 } } },
        RestaurantDriverRequest: { type: "object", additionalProperties: false, required: ["nom", "telephone", "vehicule"], properties: restaurantDriverProperties },
        RestaurantDriverUpdateRequest: { type: "object", additionalProperties: false, minProperties: 1, properties: restaurantDriverProperties },
        ProposeDeliveryRequest: { type: "object", additionalProperties: false, required: ["driverId"], properties: { driverId: { type: "string", format: "uuid" } } },
        CashRemittanceRequest: { type: "object", additionalProperties: false, required: ["deliveryIds"], properties: { deliveryIds: { type: "array", minItems: 1, maxItems: 200, uniqueItems: true, items: { type: "string", format: "uuid" } }, note: { type: "string", maxLength: 500 } } },
        DriverCompensationPaymentRequest: { type: "object", additionalProperties: false, properties: { note: { type: "string", maxLength: 500 } }, description: "Déclare réglées toutes les rémunérations actuellement dues. RestauCI ne transfère aucun fonds." },
        ClientProfileUpdateRequest: { type: "object", properties: { nom: { type: "string", minLength: 2, maxLength: 255 }, email: { type: ["string", "null"], format: "email" }, adresseDefaut: { type: ["string", "null"], maxLength: 500 }, latitudeDefaut: { type: ["number", "null"] }, longitudeDefaut: { type: ["number", "null"] }, ancienPassword: { type: "string" }, nouveauPassword: { type: "string", minLength: 12, maxLength: 128 } } },
        ChangeClientPasswordRequest: { type: "object", additionalProperties: false, required: ["ancienPassword", "nouveauPassword"], properties: { ancienPassword: { type: "string", minLength: 1, maxLength: 128 }, nouveauPassword: { type: "string", minLength: 12, maxLength: 128 } } },
        DeleteClientAccountRequest: { type: "object", additionalProperties: false, required: ["password"], properties: { password: { type: "string", minLength: 1, maxLength: 128 }, reason: { type: "string", maxLength: 500 } } },
        LocationSample: { type: "object", additionalProperties: false, required: ["lat", "lng", "accuracyMeters", "capturedAt"], properties: { lat: { type: "number", minimum: -90, maximum: 90 }, lng: { type: "number", minimum: -180, maximum: 180 }, accuracyMeters: { type: "number", minimum: 0, maximum: 100000 }, capturedAt: { type: "string", format: "date-time" }, context: { type: "string", default: "currentLocation" }, use: { type: "string", default: "discovery" } } },
        RestaurantSearchRequest: { type: "object", additionalProperties: false, properties: { query: { type: "string" }, cuisine: { type: "string" }, page: { type: "integer", minimum: 1 }, limit: { type: "integer", minimum: 1, maximum: 100 }, currentLocation: ref("LocationSample") } },
        OrderPrevalidationRequest: { type: "object", required: ["restaurantSlug", "modeCommande"], properties: { restaurantSlug: { type: "string" }, modeCommande: { type: "string", enum: ["sur_place", "livraison", "emporter"] }, currentLocation: ref("LocationSample"), adresseLivraison: { type: "string" }, latitudeLivraison: { type: "number" }, longitudeLivraison: { type: "number" }, numeroTable: { type: "string" } } },
        RestaurantOrderRequest: { allOf: [ref("OrderPrevalidationRequest"), { type: "object", required: ["items", "idempotencyKey", "paymentMethod"], properties: { paymentMethod: { type: "string", enum: ["cash", "mobile_money", "card"] }, paymentReturnChannel: ref("PaymentReturnChannel"), idempotencyKey: { type: "string", format: "uuid" }, discoveryToken: { type: "string" }, noteClient: { type: "string", maxLength: 500 }, items: { type: "array", minItems: 1, maxItems: 100, items: { type: "object", required: ["platId", "quantite"], properties: { platId: { type: "string", format: "uuid" }, quantite: { type: "integer", minimum: 1, maximum: 20 } } } } } }] },
        ResidenceSearchRequest: { type: "object", additionalProperties: false, properties: { destination: { type: "string", maxLength: 100 }, checkIn: { type: "string", format: "date" }, checkOut: { type: "string", format: "date" }, guests: { type: "integer", minimum: 1, maximum: 100 }, page: { type: "integer", minimum: 1, default: 1 }, limit: { type: "integer", minimum: 1, maximum: 48, default: 12 } } },
        ResidenceQuoteRequest: { type: "object", required: ["checkIn", "checkOut", "guests"], properties: { checkIn: { type: "string", format: "date" }, checkOut: { type: "string", format: "date" }, guests: { type: "integer", minimum: 1, maximum: 100 } } },
        ResidenceReservationRequest: { allOf: [ref("ResidenceQuoteRequest"), { type: "object", required: ["residenceId", "paymentMethod"], properties: { residenceId: { type: "string", format: "uuid" }, paymentMethod: { type: "string", enum: ["mobile_money", "card"] }, paymentReturnChannel: ref("PaymentReturnChannel"), discoveryToken: { type: "string" } } }] },
        MarkNotificationsReadRequest: { type: "object", additionalProperties: false, properties: { notificationIds: { type: "array", minItems: 1, maxItems: 100, items: { type: "string", format: "uuid" } }, markAll: { type: "boolean" } }, description: "Renseigner exactement notificationIds ou markAll=true." },
        DiscoveryEventRequest: { type: "object", additionalProperties: false, required: ["token", "eventType"], properties: { token: { type: "string", minLength: 20, maxLength: 2000 }, eventType: { const: "detail_open" } } },
        MoodSearchRequest: { type: "object", additionalProperties: false, required: ["currentLocation"], properties: { currentLocation: ref("LocationSample"), query: { type: "string", maxLength: 100 }, mood: { type: "string", enum: ["calme_discret", "entre_amis", "belle_vue", "coup_de_coeur"] }, type: { type: "string", enum: ["tous", "restaurant", "residence"], default: "tous" }, page: { type: "integer", minimum: 1, default: 1 }, limit: { type: "integer", minimum: 1, maximum: 50, default: 20 }, radiusKm: { type: "number", minimum: 0.5, maximum: 200, default: 50 } } },
        EtablissementSearchRequest: { type: "object", additionalProperties: false, required: ["currentLocation"], properties: { currentLocation: ref("LocationSample"), type: { type: "string", enum: ["tous", "restaurant", "residence"], default: "tous" }, page: { type: "integer", minimum: 1, default: 1 }, limit: { type: "integer", minimum: 1, maximum: 100, default: 50 }, radiusKm: { type: "number", minimum: 0.5, maximum: 200, default: 50 }, search: { type: "string", maxLength: 100 } } },
        OrderStatusRequest: { type: "object", required: ["statut"], properties: { statut: { type: "string", enum: ["en_preparation", "prete", "servie", "annulee"] } } },
      },
    },
  };
}

export type OpenApiV1Spec = ReturnType<typeof buildOpenApiV1Spec>;
