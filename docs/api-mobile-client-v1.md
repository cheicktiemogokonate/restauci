# Contrat API v1 — application mobile client Toutci

> État audité dans le code le 1er août 2026. Ce document décrit les handlers réellement implémentés, pas seulement la spécification OpenAPI actuelle.

## 1. Périmètre et conventions

Cette API concerne le **client final** qui consulte les restaurants, commande et suit ses commandes. Elle ne concerne pas l'application restaurateur/admin.

- URL de base : `https://<domaine-toutci>/api/v1`
- En local : `http://localhost:3000/api/v1`
- Préfixe principal mobile client : `/client`
- Format des requêtes avec body : `Content-Type: application/json`
- Authentification des routes protégées : `Authorization: Bearer <accessToken>`
- Les montants (`prix`, `sousTotal`, `fraisLivraison`, `total`, etc.) sont des **entiers FCFA**. Ne pas les convertir en nombres à virgule.
- Les dates reçues dans le JSON sont des chaînes ISO 8601.
- Les champs optionnels venant de PostgreSQL peuvent être absents ou valoir `null` selon le endpoint. Le client mobile doit tolérer les deux cas.
- Les identifiants `id`, `platId`, `restaurantId`, `clientId` et `idempotencyKey` sont des UUID sous forme de chaînes, sauf `numero`, qui est un numéro métier tel que `CMD-20260801-AB12`.

Sur un téléphone physique, `localhost` désigne le téléphone et non le serveur de développement. Configurer une URL LAN, un tunnel HTTPS ou l'URL de production.

### Enveloppe de succès standard

```ts
type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: PaginationMeta;
};

type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};
```

### Enveloppe d'erreur standard

```ts
type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMIT_EXCEEDED"
  | "INTERNAL_ERROR"
  | "CONFLICT"
  | "BAD_REQUEST";

type ApiError = {
  success: false;
  error: string;
  code: ApiErrorCode | "SERVICE_UNAVAILABLE";
  details?: Record<string, string[]>;
};
```

Attention : les réponses `429` du limiteur spécifique ne respectent pas toujours l'enveloppe standard et peuvent être :

```json
{
  "error": "Trop de requêtes. Réessayez dans quelques instants.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 42
}
```

Le limiteur global peut également répondre seulement :

```json
{ "error": "Trop de requetes" }
```

Le client doit donc se baser d'abord sur le statut HTTP, puis lire `error`, même si `success` est absent.

## 2. Résumé des endpoints

| Méthode | Chemin | Auth | Fonction |
| --- | --- | --- | --- |
| `POST` | `/client/auth/register` | Non | Créer un compte client |
| `POST` | `/client/auth/login` | Non | Connecter un client |
| `POST` | `/client/auth/refresh` | Refresh token | Renouveler l'access token |
| `POST` | `/client/auth/logout` | Optionnelle | Révoquer la session et effacer le cookie |
| `GET` | `/client/auth/me` | Bearer client | Lire le profil |
| `PATCH` | `/client/auth/me` | Bearer client | Modifier le profil/mot de passe |
| `GET` | `/client/restaurants` | Non | Rechercher les restaurants ouverts |
| `GET` | `/client/restaurants/{slug}` | Non | Détail, distance et attente |
| `GET` | `/client/restaurants/{slug}/menu` | Non | Menu disponible |
| `GET` | `/client/geo/geocode` | Non | Convertir une adresse en coordonnées |
| `POST` | `/client/commandes` | Bearer client | Passer une commande |
| `GET` | `/client/commandes` | Bearer client | Historique paginé |
| `GET` | `/client/commandes/{id}` | Bearer client | Détail et timeline |
| `PATCH` | `/client/commandes/{id}` | Bearer client | Annuler une commande encore reçue |
| `GET` | `/client/commandes/{id}/stream` | Bearer client | Suivi temps réel SSE |

Endpoint technique : `GET /openapi.json` renvoie la spécification OpenAPI actuelle, mais celle-ci contient plusieurs écarts avec le code signalés en section 8.

## 3. Authentification client

### 3.1 Inscription

`POST /client/auth/register`

Auth : aucune.

Body :

```ts
type RegisterRequest = {
  nom: string;          // requis, 2 à 255 caractères
  telephone: string;    // requis, 8 à 20 chiffres/espaces, préfixe + autorisé
  email?: string;       // optionnel, email valide ; omettre plutôt qu'envoyer ""
  password: string;     // requis, 8 à 100 caractères
};
```

Exemple :

```json
{
  "nom": "Awa Koné",
  "telephone": "+225 0701020304",
  "email": "awa@example.com",
  "password": "mot-de-passe-solide"
}
```

Réponse `201` :

```ts
type RegisterResponse = ApiSuccess<{
  client: {
    id: string;
    nom: string;
    telephone: string;
    email: string | null;
  };
  tokens: {
    accessToken: string;
    expiresIn: 900; // secondes, soit 15 minutes
  };
}>;
```

Le serveur pose aussi un cookie HTTP-only `toutci_client_refresh`, valable 7 jours.

Erreurs principales :

- `400 BAD_REQUEST` : body absent ou JSON invalide.
- `409 CONFLICT` : téléphone ou email déjà utilisé. Le message actuel parle toujours du téléphone.
- `422 VALIDATION_ERROR` : champs invalides, avec `details`.
- `429` : plus de 5 tentatives par IP sur 15 minutes.
- `500 INTERNAL_ERROR` : erreur serveur.

### 3.2 Connexion

`POST /client/auth/login`

Auth : aucune.

Body :

```ts
type LoginRequest = {
  telephone: string;    // requis, au moins 8 caractères
  password: string;     // requis, au moins 1 caractère
  rememberMe?: boolean; // défaut false
};
```

Le backend ne normalise pas actuellement le téléphone. Le login fait une comparaison exacte avec la valeur enregistrée : l'application doit appliquer un format canonique constant avant register/login, ou réutiliser exactement la même chaîne.

Réponse `200` :

```ts
type LoginResponse = ApiSuccess<{
  client: {
    id: string;
    nom: string;
    telephone: string;
    email: string | null;
    actif: boolean;
  };
  tokens: {
    accessToken: string;
    expiresIn: 900;
  };
}>;
```

- `rememberMe: false` : cookie refresh initial de 7 jours.
- `rememberMe: true` : cookie refresh initial de 30 jours.
- Après le premier refresh, le cookie rotatif redevient actuellement valable 7 jours, même si `rememberMe` était vrai.

Erreurs principales : `401` mauvais identifiants, `403` compte désactivé, `422` body invalide, `429`, `500`.

### 3.3 Renouvellement du token

`POST /client/auth/refresh`

Auth : pas d'access token requis. Le serveur accepte soit un refresh token dans le body, soit le cookie HTTP-only.

Un body JSON valide est obligatoire. Envoyer au minimum `{}` quand le cookie est utilisé.

```ts
type RefreshRequest = {
  refreshToken?: string;
};
```

Réponse `200` :

```ts
type RefreshResponse = ApiSuccess<{
  accessToken: string;
  expiresIn: 900;
}>;
```

L'ancien refresh token est révoqué et un nouveau refresh token est placé dans le cookie. Il n'est pas présent dans le JSON.

Erreurs principales : `401` session absente/expirée/token invalide, `403` compte désactivé, `422` body invalide.

### 3.4 Déconnexion

`POST /client/auth/logout`

Le body n'est pas lu. Envoyer si possible :

```http
Authorization: Bearer <accessToken>
```

Le serveur tente de révoquer l'access token du header et le refresh token du cookie, puis efface le cookie. Même si un token est invalide, la réponse reste normalement :

```json
{
  "success": true,
  "data": { "loggedOut": true }
}
```

L'application doit ensuite supprimer immédiatement son état d'authentification local.

### 3.5 Lire le profil

`GET /client/auth/me`

Auth : Bearer client obligatoire.

Réponse `200` :

```ts
type ClientProfile = {
  id: string;
  nom: string;
  telephone: string;
  email: string | null;
  adresseDefaut: string | null;
  latitudeDefaut: number | null;
  longitudeDefaut: number | null;
  nombreCommandes: number;
  createdAt: string; // ISO 8601
};

type MeResponse = ApiSuccess<ClientProfile>;
```

Erreurs : `401`, `403` compte désactivé, `404`, `500`.

### 3.6 Modifier le profil ou le mot de passe

`PATCH /client/auth/me`

Auth : Bearer client obligatoire.

Tous les champs sont optionnels, mais au moins une modification effective doit être fournie.

```ts
type UpdateProfileRequest = {
  nom?: string;                    // 2 à 255 caractères
  email?: string | null;           // null pour supprimer l'email
  adresseDefaut?: string | null;   // max 500
  latitudeDefaut?: number | null;
  longitudeDefaut?: number | null;
  ancienPassword?: string;
  nouveauPassword?: string;        // 6 à 100 ; ancienPassword requis avec lui
};
```

Réponse `200` :

```json
{
  "success": true,
  "data": { "message": "Profil mis à jour" }
}
```

La réponse ne renvoie pas le profil actualisé. Mettre à jour l'état local avec les valeurs envoyées ou rappeler `GET /client/auth/me`.

Erreurs particulières :

- `400 BAD_REQUEST` si aucune donnée ne produit de mise à jour.
- `422 VALIDATION_ERROR` si les valeurs sont invalides ou si l'ancien mot de passe est incorrect.

Le téléphone ne peut pas être modifié avec cet endpoint.

## 4. Restaurants et géolocalisation

### Types communs

```ts
type ModeCommande = "sur_place" | "livraison" | "emporter";

type RestaurantListItem = {
  id: string;
  nom: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  banniereUrl: string | null;
  adresse: string;
  ville: string | null;
  latitude: number;
  longitude: number;
  cuisines: string[] | null;
  modesCommande: string[];
  fraisLivraison: number;
  commandeMinimum: number;
  tempsPreparationMoyen: number | null;
  noteMoyenne: number | null;
  nombreAvis: number;
  enLigne: boolean;
  accepteCommandes: boolean;
  distanceKm?: number; // présent seulement quand lat ET lng sont envoyés
};
```

### 4.1 Rechercher/lister les restaurants

`GET /client/restaurants`

Auth : aucune.

Query params :

| Paramètre | Type | Défaut | Règle |
| --- | --- | --- | --- |
| `lat` | number | — | latitude entre -90 et 90 |
| `lng` | number | — | longitude entre -180 et 180 |
| `rayon` | number | `10` | 0,5 à 50 km ; utile avec `lat` + `lng` |
| `search` | string | — | max 100 ; cherche nom, description et cuisines |
| `cuisine` | string | — | max 100 ; correspondance partielle insensible à la casse |
| `modeCommande` | enum | — | `sur_place`, `livraison` ou `emporter` |
| `page` | entier | `1` | toute valeur invalide est ramenée à 1 |
| `limit` | entier | `20` | min 1, max 100 |

Toujours envoyer `lat` et `lng` ensemble. Avec les deux coordonnées, les résultats sont filtrés par rayon, triés du plus proche au plus éloigné et reçoivent `distanceKm`.

Exemple :

```http
GET /client/restaurants?lat=5.35995&lng=-4.00826&rayon=10&modeCommande=livraison&page=1&limit=20
```

Réponse `200` : `ApiSuccess<RestaurantListItem[]>` avec `meta` obligatoire.

Seuls les restaurants `actif=true` et `enLigne=true` sont listés.

### 4.2 Détail d'un restaurant

`GET /client/restaurants/{slug}`

Auth : aucune.

- Path `slug` : slug reçu depuis la liste.
- Query optionnelle : `lat` et `lng`. Envoyer les deux ou aucun.

Réponse `200` :

```ts
type RestaurantDetail = {
  id: string;
  nom: string;
  slug: string;
  description: string | null;
  telephone: string;
  email: string | null;
  siteWeb: string | null;
  adresse: string;
  ville: string | null;
  pays: string | null;
  latitude: number;
  longitude: number;
  logoUrl: string | null;
  banniereUrl: string | null;
  fraisLivraison: number;
  commandeMinimum: number;
  modesCommande: string[];
  cuisines: string[] | null;
  actif: boolean;
  enLigne: boolean;
  accepteCommandes: boolean;
  tempsPreparationMoyen: number | null;
  facebook: string | null;
  instagram: string | null;
  whatsapp: string | null;
  nombreCommandes: number;
  noteMoyenne: number | null;
  nombreAvis: number;
  motifRejet: string | null;
  valideParUserId: string | null;
  valideAt: string | null;
  suspendu: boolean;
  motifSuspension: string | null;
  tauxCommissionBps: number;
  createdAt: string;
  updatedAt: string;
  geo: null | {
    distanceKm: number; // distance à vol d'oiseau
    itineraire: null | {
      distanceKm: number;       // distance routière
      dureeMinutes: number;
      geometrie?: number[][];   // couples [longitude, latitude]
    };
  };
  tempsAttente: {
    totalMinutes: number;
    label: string; // ex. "~45 min"
    detail: {
      preparation: number;
      chargeActuelle: number;
      trajet: number;
    };
  };
  commandesEnCours: number;
};
```

`geo.itineraire` peut être `null` si le service externe OSRM est indisponible. `tempsAttente` reste fourni.

Les champs `motifRejet`, `valideParUserId`, `motifSuspension` et `tauxCommissionBps` sont actuellement exposés par le handler, mais sont des champs internes. L'application mobile ne doit pas en dépendre ; le backend devrait les retirer du contrat public.

### 4.3 Menu d'un restaurant

`GET /client/restaurants/{slug}/menu`

Auth : aucune. Ce handler réutilise exactement le menu public.

```ts
type Nutrition = {
  calories: number;
  proteines: number;
  lipides: number;
  glucides: number;
};

type MenuPlat = {
  id: string;
  restaurantId: string;
  categorieId: string;
  creneauId: string | null;
  nom: string;
  description: string | null;
  prix: number;
  photoUrl: string | null;
  disponible: boolean; // toujours true avec le filtre actuel
  ordre: number;
  tags: string[] | null;
  allergenes: string[] | null;
  nutrition: Nutrition | null;
  nombreCommandes: number;
  noteMoyenne: number | null;
  nombreAvis: number;
  createdAt: string;
  updatedAt: string;
};

type MenuCategorie = {
  id: string;
  restaurantId: string;
  creneauId: string | null;
  nom: string;
  description: string | null;
  imageUrl: string | null;
  ordre: number;
  visible: boolean; // toujours true avec le filtre actuel
  createdAt: string;
  updatedAt: string;
  plats: MenuPlat[];
};

type MenuResponse = ApiSuccess<MenuCategorie[]>;
```

Erreurs : `404` restaurant absent/inactif/hors ligne, `429`, `500`.

### 4.4 Géocoder une adresse

`GET /client/geo/geocode?q=<adresse>`

Auth : aucune.

- `q` requis, de 3 à 200 caractères.
- Encoder la valeur avec `URLSearchParams`.
- La recherche externe est biaisée vers la Côte d'Ivoire.

Réponse `200` :

```ts
type GeocodeResponse = ApiSuccess<{
  adresse: string;
  lat: number;
  lng: number;
  ville?: string;
  pays?: string;
}>;
```

Erreurs : `404 NOT_FOUND` si aucune adresse n'est trouvée, `422`, `429`, `500`.

## 5. Commandes

### Types communs

```ts
type StatutCommande =
  | "recue"
  | "en_preparation"
  | "prete"
  | "servie"
  | "annulee";

type StatutLivraison =
  | "en_attente"
  | "assignee"
  | "en_route"
  | "livree"
  | "echouee";

type CommandeItem = {
  platId: string;
  nom: string;
  prix: number;     // snapshot du prix au moment de la commande
  quantite: number;
  note?: string;
};
```

### 5.1 Passer une commande

`POST /client/commandes`

Auth : Bearer client obligatoire.

Body :

```ts
type CreateCommandeRequest = {
  restaurantSlug: string;
  modeCommande: ModeCommande;
  items: Array<{
    platId: string;
    quantite: number; // entier de 1 à 20
  }>;
  adresseLivraison?: string;     // max 500 ; obligatoire si mode=livraison
  latitudeLivraison?: number;
  longitudeLivraison?: number;
  numeroTable?: string;          // max 10
  noteClient?: string;           // max 500
  idempotencyKey: string;        // UUID obligatoire
};
```

Règles importantes :

- Générer un UUID une seule fois quand l'utilisateur confirme la commande.
- Conserver et réutiliser le même `idempotencyKey` pour tous les retries de cette même commande.
- Générer une nouvelle clé uniquement pour une nouvelle commande logique.
- Ne pas envoyer deux entrées avec le même `platId` ; agréger leurs quantités avant l'envoi.
- Le serveur recalcule les prix, frais et total. Les montants du panier ne sont jamais envoyés comme source de vérité.
- Le restaurant doit être actif, en ligne, accepter les commandes et accepter le mode choisi.
- Les plats doivent appartenir au restaurant et être disponibles.
- Le sous-total doit respecter `commandeMinimum`.

Exemple :

```json
{
  "restaurantSlug": "chez-awa",
  "modeCommande": "livraison",
  "items": [
    { "platId": "6a4f5c29-7b7e-48ef-8141-59e071b9f767", "quantite": 2 }
  ],
  "adresseLivraison": "Cocody Riviera 3, Abidjan",
  "latitudeLivraison": 5.382,
  "longitudeLivraison": -3.968,
  "noteClient": "Appelez à l'arrivée",
  "idempotencyKey": "b1763c9d-07b7-4639-b64a-677c5e9dd22c"
}
```

Réponse `201` :

```ts
type CreateCommandeResponse = ApiSuccess<{
  commande: {
    id: string;
    numero: string;
    statut: StatutCommande;
    total: number;
    fraisLivraison: number;
    sousTotal: number;
    items: CommandeItem[];
    modeCommande: ModeCommande;
    createdAt: string;
  };
}>;
```

Un retry avec la même clé renvoie la commande déjà créée, également avec un statut HTTP `201`.

Erreurs métier :

- `400 BAD_REQUEST` : restaurant fermé, commandes désactivées ou mode refusé.
- `404 NOT_FOUND` : restaurant ou client introuvable.
- `422 VALIDATION_ERROR` : body invalide, adresse manquante, plat absent/étranger/indisponible ou minimum non atteint.
- `429` : maximum 10 tentatives de commande par client et par heure, plus la limite globale.
- `500` : erreur serveur.

### 5.2 Historique des commandes

`GET /client/commandes?page=1&limit=10&search=CMD-20260801`

Auth : Bearer client obligatoire.

| Paramètre | Type | Défaut | Règle |
| --- | --- | --- | --- |
| `page` | entier | `1` | minimum logique 1 |
| `limit` | entier | `10` | utiliser 1 à 100 |
| `search` | string | — | après trim, 3 à 80 caractères ; cherche dans `numero` |

Réponse `200` :

```ts
type CommandeHistorique = {
  id: string;
  numero: string;
  statut: StatutCommande;
  total: number;
  modeCommande: ModeCommande;
  items: CommandeItem[];
  createdAt: string;
  restaurantId: string;
};

type HistoriqueResponse = ApiSuccess<CommandeHistorique[]> & {
  meta: PaginationMeta;
};
```

Les résultats sont triés du plus récent au plus ancien. Le nom/logo du restaurant n'est pas inclus dans cette liste.

### 5.3 Détail et timeline d'une commande

`GET /client/commandes/{id}`

Auth : Bearer client obligatoire. Un client ne peut lire que ses propres commandes.

Réponse `200` :

```ts
type TimelineEtape = {
  etape: "recue" | "en_preparation" | "prete" | "en_route" | "servie";
  label: string;
  fait: boolean;
  actif: boolean;
  timestamp: string | null;
};

type CommandeDetail = {
  id: string;
  numero: string;
  statut: StatutCommande;
  modeCommande: ModeCommande;
  items: CommandeItem[];
  sousTotal: number;
  fraisLivraison: number;
  total: number;
  noteClient: string | null;
  adresseLivraison: string | null;
  numeroTable: string | null;
  createdAt: string;
  heureAcceptee: string | null;
  heurePrete: string | null;
  heureServie: string | null;
  restaurantId: string;
  clientId: string;
  restaurant: null | {
    nom: string;
    logoUrl: string | null;
  };
  statutLabel: string;
  livraisonStatut: StatutLivraison | null;
  estAnnulee: boolean;
  timeline: TimelineEtape[]; // vide si annulee
};

type CommandeDetailResponse = ApiSuccess<CommandeDetail>;
```

Pour une livraison, `statutLabel` peut être `En livraison` lorsque `livraisonStatut` vaut `en_route`. Le label de l'étape timeline `en_route` est actuellement la chaîne brute `en_route` ; prévoir un libellé mobile localisé côté app.

Erreurs : `401`, `403`, `404` si absente ou appartenant à un autre client, `429`, `500`.

### 5.4 Annuler une commande

`PATCH /client/commandes/{id}`

Auth : Bearer client obligatoire.

Pas de body requis. L'annulation ne réussit que si la commande appartient au client et si son statut actuel est encore `recue`.

Réponse `200` :

```json
{
  "success": true,
  "data": {
    "id": "<uuid>",
    "statut": "annulee"
  }
}
```

Si elle n'existe pas, n'appartient pas au client ou a déjà progressé, le handler renvoie `409 CONFLICT` avec : `Cette commande ne peut plus être annulée. Contactez le restaurant.`

### 5.5 Suivi temps réel SSE

`GET /client/commandes/{id}/stream`

Auth : Bearer client obligatoire.

Headers recommandés :

```http
Authorization: Bearer <accessToken>
Accept: text/event-stream
```

Cette réponse n'utilise pas l'enveloppe JSON standard. C'est un flux `text/event-stream`.

Événements possibles :

```text
event: statut
data: {"statut":"en_preparation","commandeId":"<uuid>"}

event: ping
data: {"timestamp":1785580800000}

event: fin
data: {"message":"Commande terminée"}

event: close
data: {"reconnect":true}
```

- `statut` est envoyé immédiatement puis lors d'une modification détectée.
- `ping` est envoyé environ toutes les 25 secondes.
- `fin` est envoyé pour `servie` ou `annulee`, puis le flux se ferme.
- `close` est envoyé après environ 5 minutes ; reconnecter avec un délai et le token courant.
- Le serveur vérifie les changements environ toutes les 2 secondes.
- À chaque événement `statut`, rappeler `GET /client/commandes/{id}` pour obtenir la timeline complète.
- Le flux actuel observe le statut de la commande, mais pas directement les changements de `livraisonStatut`. Un polling occasionnel du détail est conseillé pour afficher `en_route`.

Ne pas utiliser un `EventSource` standard si la bibliothèque mobile ne permet pas d'ajouter le header Bearer. Utiliser une bibliothèque SSE acceptant les headers ou un `fetch` en streaming. Prévoir un fallback par polling du détail.

## 6. Stratégie d'auth recommandée à l'application mobile

1. Après register/login, stocker `accessToken` dans un stockage sécurisé mobile et le profil dans l'état applicatif.
2. Ajouter le header Bearer uniquement aux routes protégées.
3. Considérer l'access token expiré après 900 secondes, avec une petite marge avant expiration.
4. En cas de `401`, tenter un seul refresh, mutualisé entre toutes les requêtes concurrentes.
5. Si le refresh réussit, remplacer le token puis rejouer une fois la requête d'origine.
6. Si le refresh échoue, supprimer l'état local et rediriger vers la connexion.
7. Ne jamais lancer une boucle illimitée `401 -> refresh -> retry`.
8. Au logout, appeler l'API puis effacer les données locales même si l'appel réseau échoue.

### Blocage actuel pour une app native

Les endpoints register/login **ne renvoient pas `refreshToken` dans le JSON**. Ils le déposent seulement dans un cookie HTTP-only. Une app native ne peut donc implémenter le refresh par stockage sécurisé que si le backend est modifié pour renvoyer le refresh token, ou si la pile réseau mobile conserve et retransmet correctement ce cookie.

Avant de finaliser l'auth mobile, choisir et tester l'une des deux stratégies :

- stratégie native recommandée : renvoyer `refreshToken` dans le JSON puis le stocker dans Keychain/Keystore/SecureStore ;
- stratégie cookie : utiliser un gestionnaire de cookies compatible, conserver `Set-Cookie` et renvoyer le cookie sur `/client/auth/refresh` et `/client/auth/logout`.

Le code actuel du client web utilise la stratégie cookie en envoyant `{}` au refresh.

## 7. Rate limits observables

Toutes les routes `/api/*` ont d'abord une limite globale de 200 requêtes par IP et par minute.

| Fonction | Limite spécifique actuelle |
| --- | --- |
| Register/login client | 5 par IP / 15 min |
| Liste sans géo et détail restaurant | 200 par IP / min |
| Liste avec géo et géocodage | 60 par IP / min |
| Menu public | 100 par IP / min |
| Modification du profil, historique, détail, annulation | 200 par client / min |
| Création de commande | 10 par client / heure |

La lecture du profil, le refresh, le logout et le stream SSE n'ont pas de limite spécifique supplémentaire dans leurs handlers ; la limite globale reste applicable.

Respecter `Retry-After` lorsqu'il est présent et appliquer un backoff sur `429`/`503`.

## 8. Écarts et fonctionnalités manquantes à connaître

### Spécification OpenAPI actuelle

Ne pas générer aveuglément le client mobile depuis `GET /api/v1/openapi.json` avant correction :

- le mot de passe register y est indiqué à 6 caractères, mais le code en exige 8 ;
- `refreshToken` y est déclaré obligatoire, alors que le code accepte le cookie et `{}` ;
- `idempotencyKey`, obligatoire pour créer une commande, n'y est pas documenté correctement ;
- plusieurs opérations et schémas de réponses sont absents ou incomplets ;
- les modèles de données précis ne reflètent pas les réponses réelles.

Ce document et les handlers sont donc la source de vérité actuelle.

### Push notifications client non disponible

`POST /push/expo/register` existe, mais il utilise un token restaurateur/admin (`userId`) et la table cible exige aussi un `userId` restaurateur/admin. Un access token client (`clientId`) y reçoit `401`.

Il n'existe donc actuellement **aucun endpoint Expo Push utilisable par l'application mobile client final**. Il faudrait ajouter par exemple `POST /client/push/expo/register`, authentifié par `getClientSession`, et adapter le stockage pour accepter `clientId`.

### Autres fonctions non implémentées dans l'API client v1

- mot de passe oublié/réinitialisation ;
- modification du téléphone ;
- suppression du compte ;
- avis/notation ;
- favoris ;
- paiement en ligne/mobile money ; la commande actuelle est payée au livreur ou au restaurant ;
- suivi GPS du livreur ;
- endpoint de notifications client.

### Points techniques à durcir côté backend

- retirer du détail restaurant les champs internes de validation, suspension et commission ;
- rendre le format des erreurs `429` uniforme avec `success: false` ;
- valider proprement `limit` dans l'historique des commandes ;
- fournir le nom/logo du restaurant dans l'historique si l'écran mobile en a besoin ;
- localiser le label timeline `en_route` ;
- décider officiellement du transport du refresh token pour le mobile natif ;
- compléter ou régénérer la spécification OpenAPI depuis les handlers réels.

## 9. Instruction prête à donner à une IA de développement mobile

```text
Implémente la consommation de l'API mobile client Toutci en utilisant exclusivement
le contrat docs/api-mobile-client-v1.md. N'invente aucun endpoint ni aucun champ.

Contraintes impératives :
- base URL configurable se terminant par /api/v1 ;
- montants conservés en entiers FCFA ;
- dates parsées depuis ISO 8601 ;
- Bearer access token uniquement sur les routes protégées ;
- stockage sécurisé des secrets ;
- un seul refresh concurrent et un seul retry après 401 ;
- prendre en compte que le refresh token actuel est uniquement dans un cookie ;
- erreurs pilotées d'abord par le statut HTTP, car certaines 429 n'ont pas success ;
- idempotencyKey UUID persistant pendant tous les retries d'une même commande ;
- total de commande toujours considéré comme autoritaire côté serveur ;
- SSE avec header Authorization et fallback polling ;
- modèles tolérants aux champs nullables indiqués ;
- ne pas utiliser /api/v1/push/expo/register pour un client final.

Commence par créer les types, le client HTTP, la gestion de session, puis les modules
restaurants, menu, géocodage, commandes et suivi temps réel. Signale comme blocage
toute fonctionnalité demandée qui figure dans la liste des endpoints manquants.
```
