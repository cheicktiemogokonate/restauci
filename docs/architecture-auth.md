# Architecture d'authentification Toutci

Toutci sépare les identités partenaires/administrateurs (`users`) des identités
consommateurs (`clients`). Les pages web et l'API v1 n'utilisent pas le même
transport, mais partagent la signature JWT, la révocation et les limites de
requêtes.

## Dashboard web partenaire

- Les pages Next.js utilisent un cookie HttpOnly vérifié par `src/proxy.ts`.
- Les Route Handlers `/api/v1/auth/*` acceptent des Bearer JWT pour les clients
  techniques ou une future application partenaire.
- Le rôle canonique est `partner` ou `admin`; l'activité Restaurant/Résidence
  appartient au compte partenaire et ne constitue pas un rôle d'authentification.

## Consommateur web ou mobile

L'access token dure 15 minutes et accompagne les routes protégées :

```http
Authorization: Bearer <accessToken>
```

Le champ `tokenTransport` définit uniquement le transport du refresh token :

| Valeur | Usage | Refresh token |
| --- | --- | --- |
| `cookie` (défaut) | Navigateur | Cookie HttpOnly, jamais exposé au JavaScript |
| `json` | Application native | Réponse JSON et body refresh/logout |

En mode `json`, le serveur ne retombe jamais sur le cookie. Cette séparation
empêche une requête JavaScript de transformer indirectement un cookie HttpOnly
en jeton lisible.

La rotation révoque l'ancien refresh token. Une session standard conserve une
durée de 7 jours et une session `rememberMe` une durée de 30 jours après chaque
rotation.

## Protection des routes

`src/proxy.ts` exclut `/api/v1` de l'authentification cookie globale. Chaque
handler v1 protégé valide donc explicitement le Bearer correspondant : client,
partenaire ou administrateur. Les routes publiques sont marquées sans sécurité
dans `/api/v1/openapi.json`.

## Stockage recommandé

- Web : cookie HttpOnly géré par le serveur.
- Mobile : access token en mémoire et refresh token dans Keychain/Keystore via
  un stockage sécurisé Expo/React Native.
- Ne pas conserver le refresh token natif dans `localStorage` ou AsyncStorage
  en clair.

## Variables utiles

- `JWT_SECRET`
- `JWT_COOKIE_NAME`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `MOBILE_APP_PAYMENT_RETURN_URL` pour le retour Paystack natif
