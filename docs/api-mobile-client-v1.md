# Intégration mobile — API consommateur Toutci v1

## Source de vérité

Le contrat machine est `GET /api/v1/openapi.json`. Il décrit toutes les routes
v1 exposées et doit être utilisé pour générer les types et le client HTTP de
l'application mobile. Un test compare chaque méthode des Route Handlers avec ce
contrat afin d'empêcher une dérive silencieuse.

- Base locale : `http://localhost:3000/api/v1`
- Authentification protégée : `Authorization: Bearer <accessToken>`
- Enveloppe succès : `{ success: true, data, meta? }`
- Enveloppe erreur : `{ success: false, error, code, details? }`
- Montants : entiers FCFA
- Dates de séjour : `YYYY-MM-DD`

Sur un téléphone physique, `localhost` désigne le téléphone. Utiliser une URL
LAN, un tunnel HTTPS ou le domaine déployé.

## Session native

Pour l'application native, envoyer `tokenTransport: "json"` lors de
l'inscription et de la connexion. La réponse contient alors :

```json
{
  "tokens": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 900
  }
}
```

Stocker le refresh token dans le stockage sécurisé du système, jamais dans
AsyncStorage en clair. Pour la rotation :

```http
POST /api/v1/client/auth/refresh
Content-Type: application/json

{
  "tokenTransport": "json",
  "refreshToken": "<refresh-token-courant>"
}
```

Le serveur révoque l'ancien refresh token et retourne le nouveau. Remplacer les
deux jetons atomiquement. La durée standard est de 7 jours et la durée
`rememberMe` de 30 jours, y compris après rotation.

Pour se déconnecter, envoyer le Bearer courant et le même body JSON à
`POST /client/auth/logout`, puis effacer localement les jetons même si le réseau
échoue. Le mode navigateur reste `tokenTransport: "cookie"` par défaut et
continue d'utiliser le cookie HttpOnly.

## Parcours consommateur disponibles

Le contrat OpenAPI couvre notamment :

- profil, géocodage et résolution de marché de service ;
- recherche/détail/menu Restaurants ;
- prévalidation, création idempotente, historique, détail, annulation, paiement
  et suivi SSE des commandes ;
- recherche/détail/disponibilités/devis Résidences ;
- création, historique, détail, annulation et paiement des réservations ;
- lecture/marquage des notifications et enregistrement d'un token Expo ;
- attribution des résultats de découverte sponsorisés ou organiques.

Les règles de zone restent distinctes : la politique Restaurants s'applique aux
commandes et livraisons, tandis que la découverte/réservation Résidences dépend
de sa propre politique et n'hérite pas automatiquement des contraintes d'un
restaurant.

## Notifications Expo

Après connexion, enregistrer le token de l'installation :

```http
POST /api/v1/client/push/expo
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "expoToken": "ExponentPushToken[...]" }
```

À la déconnexion de ce compte sur l'appareil, appeler `DELETE` sur la même route
avec le même body. Le serveur associe une installation à un seul propriétaire et
réattribue proprement un token après un changement de compte.

Les notifications consommateur sont disponibles via :

- `GET /client/notifications?page=1&limit=20&unreadOnly=false` ;
- `PATCH /client/notifications` avec soit `notificationIds`, soit
  `{ "markAll": true }`.

## Paiement mobile

Pour une commande ou réservation payée en ligne, envoyer :

```json
{
  "paymentReturnChannel": "mobile"
}
```

Ce champ accompagne le body complet de création ou de relance de paiement. Le
serveur initialise Paystack avec son callback HTTPS, enregistre le canal sur la
tentative et redirige ensuite vers `MOBILE_APP_PAYMENT_RETURN_URL`, par exemple :

```text
toutci://payments/callback?payment=confirmed&reference=...&type=reservation_residence&sourceId=...
```

L'application ne doit jamais considérer le deep link seul comme preuve de
paiement. Après retour au premier plan, relire la commande ou la réservation par
son endpoint authentifié ; le statut serveur est l'état faisant foi.

Le serveur refuse une URL de retour fournie par le client et refuse de changer
le canal d'une tentative Paystack déjà initialisée.

## Idempotence et reprises

- Générer un UUID `idempotencyKey` par validation du panier et le conserver
  jusqu'à obtention d'une réponse définitive.
- En cas de timeout, rejouer la création avec la même clé.
- Sur `401`, effectuer une seule rotation du refresh token, puis rejouer la
  requête une fois.
- Sur `409` de paiement, relire d'abord la ressource avant de créer une nouvelle
  tentative.
- Respecter le statut HTTP avant d'interpréter le corps d'erreur.

## Vérifications du dépôt

```bash
npm run typecheck
npm run test:architecture
npm test
npm run lint
npm run build
```

La documentation juridique et les écrans de consentement sont volontairement
hors de ce document fonctionnel et seront traités après stabilisation du MVP.
