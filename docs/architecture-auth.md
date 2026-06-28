# Architecture d'authentification — RestauCI

## Vue d'ensemble

RestauCI utilise un système à **deux canaux d'authentification** distincts, chacun adapté à son consommateur :

| Canal                    | Consommateur               | Mécanisme                         | Préfixe routes     | Stockage token                    |
| ------------------------ | -------------------------- | --------------------------------- | ------------------ | --------------------------------- |
| **Restaurateur / Admin** | Navigateur (dashboard SSR) | Cookie `token` httpOnly           | `/api/auth/*`      | Cookie automatique par le serveur |
| **Client final**         | App mobile / SPA           | Bearer JWT (Authorization header) | `/api/v1/client/*` | Zustand store + localStorage      |

---

## Canal 1 — Restaurateur & Admin (cookie)

### Flux

1. L'utilisateur soumet identifiants sur `/login`
2. `POST /api/auth/login` valide et place un cookie httpOnly `token`
3. Le fichier `src/proxy.ts`, qui remplace `middleware.ts` selon la convention Next.js 16, lit le cookie et valide le token
4. Les routes protégées du dashboard sont accessibles seulement si le token est valide

### Routes concernées

- `POST /api/auth/login` — connexion
- `POST /api/auth/register` — inscription restaurateur
- `POST /api/auth/logout` — déconnexion (efface le cookie)
- Toutes les routes sous `/(dashboard)` lisent le cookie via le fichier `src/proxy.ts`

### Sécurité

- Cookie httpOnly + SameSite=Lax
- Expiration du cookie : 7 jours
- Le fichier `src/proxy.ts` rejette toute requête sans cookie valide vers les routes protégées

---

## Canal 2 — Client final (Bearer JWT)

### Flux

1. L'app mobile envoie `POST /api/v1/client/auth/login` avec `{ telephone, password }`
2. Le serveur renvoie `{ accessToken, refreshToken }`
3. L'app stocke les tokens dans le Zustand store (`src/lib/client-app/stores/auth-store.ts`)
4. Chaque requête ultérieure inclut `Authorization: Bearer <accessToken>`
5. Le fichier `src/proxy.ts`, qui remplace `middleware.ts` selon la convention Next.js 16, exclut les routes `/api/v1` de la vérification cookie
6. Les handlers `/api/v1` valident le Bearer token eux-mêmes

### Routes concernées

- `POST /api/v1/client/auth/login` — connexion
- `POST /api/v1/client/auth/register` — inscription
- `POST /api/v1/client/auth/refresh` — renouvellement du access token
- Toutes les routes `/api/v1/client/*` nécessitent un Bearer token valide

### Sécurité

- Access token courte durée (15 min)
- Refresh token longue durée (7 jours)
- Les tokens sont validés côté handler (pas par le middleware global)
- Le fichier `src/proxy.ts` n'applique PAS la vérification cookie sur `/api/v1` (voir `src/proxy.ts`)

---

## `src/proxy.ts` (remplace `middleware.ts` dans Next.js 16)

Le fichier `src/proxy.ts` est le gardien central. Sa logique simplifiée :

```
SI route commence par /api/v1
  → PAS de vérification cookie (Bearer token géré par chaque handler)
SINON SI route commence par /api/
  → Vérifier cookie "token" → injecter req.user OU rejeter 401
  → Rate limiting global (200 req/min via Upstash Redis)
SINON
  → Laisser passer (pages publiques, assets, etc.)
```

### Variables d'environnement utilisées

- `DATABASE_URL` — connexion PostgreSQL
- `JWT_SECRET` — signature des tokens
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — rate limiting

---

## Schema base de données

Les tables principales impliquées :

- `users` — restaurateurs/admins (mot de passe hashé, rôle `restaurateur`|`admin`)
- `clients` — clients finaux (mot de passe hashé, identifiés par téléphone)

Les deux populations vivent dans des tables distinctes et ne partagent pas le même schéma d'authentification.
