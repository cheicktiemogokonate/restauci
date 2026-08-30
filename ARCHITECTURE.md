# TOUTCI — Architecture Canonique (A3.0)

Ce document est la source de vérité de l'architecture du projet TOUTCI à partir de la phase A3. Il décrit l'état cible et les règles actives.

## 1. But

Cette architecture existe pour :
- **Séparer le code métier du code technique et de présentation** (Next.js, Drizzle).
- **Protéger les frontières métier** avec des règles d'importation strictes et vérifiables.
- **Rendre le code explicite** (qui possède quelle donnée, qui orchestre quel comportement).
- **Empêcher la duplication** des règles métier complexes et des calculs.

## 2. Racines Architecturales

Le code cible est organisé en quatre racines distinctes dans `src/` :

- `app/` : Couche de présentation Next.js (App Router) et d'adaptation HTTP. Compose les UI et expose les endpoints.
- `modules/` : Domaines métier propriétaires de la logique, des règles et des processus centraux.
- `shared/` : Primitives purement transversales et rares.
- `infrastructure/` : Mécanismes techniques et transports.

À A3.0, `src/modules`, `src/shared` et `src/infrastructure` peuvent ne pas
encore exister physiquement. Un lot ultérieur les crée seulement lorsqu'un vrai
fichier y est déplacé ; les placeholders sont interdits.

Les candidats Shared validés sont `ui`, `money`, `pagination`, `time` et le
`geo` pur. Il n'existe pas de tiroir initial `shared/types`, `constants`,
`helpers`, `services`, `common` ou `utils`.

Infrastructure emploie des noms techniques explicites : `db`, `cache`, `env`,
`logger`, `geocoding`, `push`, `realtime`, `storage` et `rate-limit`. Les
notifications produit n'y vivent jamais.

## 3. Convention d'un module

Chaque module métier (`src/modules/<nom_du_module>`) suit un format standard. **Toutes les surfaces sont optionnelles**.

- `server.ts` : La façade serveur publique du module. Doit avoir `import "server-only";`. Expose les opérations pour les autres modules ou pour Next.js. Ne réexporte jamais tout `_internal`.
- `model.ts` : Contient les enums, types domaine, règles client-safe, et politiques déterministes. **Interdit : DB, secrets, Next.js APIs, transactions**.
- `contracts.ts` : Contient les schémas Zod, DTOs de transport et inputs de commande publics. Ne jamais exposer directement un row Drizzle.
- `presentation/` : UI propre au domaine (ex. `OrderStatusBadge`). Peut importer `model`, `contracts` et `shared/ui`. **Interdit : `server.ts`, DB, infrastructure**.
- `_internal/` : L'implémentation privée (Drizzle, queries, helpers, transactions). **Règle absolue : Aucun autre module ne peut importer `_internal/`**.

> Les "root barrels" (`index.ts`) sont interdits pour les modules métier pour éviter l'ambiguïté. Les imports doivent cibler la surface explicitement (ex. `@/modules/orders/model`).

## 4. Catalogue des modules actuels

| Module | Responsabilité |
| :--- | :--- |
| **auth** | Authentification, sessions, protection des routes. |
| **partners** | Gestion des partenaires, de leurs comptes et de leur activité (statut). |
| **clients** | Gestion des profils clients (acheteurs finaux). |
| **restaurants** | Profil des restaurants, visibilité publique, configuration (hors menu). |
| **service-markets** | Frontières géographiques versionnées, résolution point-dans-marché et capacités commerciales par activité. |
| **menu** | Catalogue des plats, catégories, et disponibilité des éléments. |
| **subscriptions** | Plans, périodes, transitions et logique d'abonnement partenaire. |
| **quotas** | Limites opérationnelles effectives dérivées des abonnements. |
| **commissions** | Calcul, snapshots et cycle de vie des commissions sur les commandes et réservations. |
| **orders** | Création, cycle de vie et transition d'états des commandes. |
| **deliveries** | Flotte restaurant, propositions, missions, preuve de remise et garde des espèces par les livreurs. |
| **residences** | Logements, visibilité, calendrier, réservations et cycle de vie des séjours. |
| **transactions** | Obligations financières et tentatives de paiement provider-agnostic. |
| **notifications** | Modèle produit des notifications métier. |
| **audit** | Traçabilité des actions critiques. |
| **media** | Gestion métier des ressources média et images. |
| **identity** | Vérification manuelle de l’identité des partenaires et frontières d’éligibilité KYC. |

## 5. Sources de vérité

**DO NOT DUPLICATE** : Il est interdit de dupliquer ces logiques. Utilisez toujours la source de vérité.

| Concept | Owner cible | API canonique | Emplacement actuel pendant A3 |
| :--- | :--- | :--- | :--- |
| Partner account | Partners | `requirePartnerAccount()` | `src/lib/auth/partner-account.ts` |
| Partner activity | Partners | `requirePartnerActivity()` | `src/lib/auth/partner-account.ts` |
| Effective plan | Subscriptions | `getEffectivePlan()` | `src/lib/subscription-plans.ts` |
| Subscription transition | Subscriptions | `evaluateSubscriptionTransition()` | `src/lib/subscription-policy.ts` |
| Effective limits | Quotas | `getEffectiveLimits()` | `src/lib/quota-entitlements.ts` |
| Quota selection | Quotas | `selectQuotaEligibleResources()` | `src/lib/quota-selection.ts` |
| Restaurant visibility | Restaurants | `isRestaurantPubliclyVisible()` | `src/lib/restaurants/policy.ts` |
| Restaurant orderability | Restaurants | `isRestaurantOrderable()` | `src/lib/restaurants/policy.ts` |
| Service market resolution | Service Markets | `resolveServiceMarketAtPoint()` | `src/modules/service-markets/server.ts` |
| Service capability | Service Markets | `getServiceMarketCapability()`, `requireActiveServiceMarketCapability()` | `src/modules/service-markets/server.ts` |
| Dish availability | Menu | `isDishAvailable()` ; legacy `isPlatDisponible()` | `src/lib/utils/creneaux.ts` |
| Commercial dish eligibility | Menu | `assertDishesCommerciallyEligible()` | `src/lib/quota-entitlements.ts` |
| Order creation | Orders | `createRestaurantOrder()` | `src/lib/orders/restaurant-order.ts` |
| Order transition | Orders | `transitionRestaurantOrder()` | `src/lib/db/commandes-mutations.ts` |
| Delivery lifecycle | Deliveries | commandes publiques de `src/modules/deliveries/server.ts` | `src/modules/deliveries/` |
| Commission lifecycle | Commissions | façade lifecycle minimale | `src/lib/commissions/ledger.ts` |
| Cash debt | Commissions | API cash-debt publique | `src/lib/commissions/ledger.ts` |
| Settlement | Commissions | commande settlement publique | `src/lib/commissions/ledger.ts` |
| Financial transaction | Transactions | `createTransaction()`, `cancelTransaction()` | `src/modules/transactions/server.ts` |
| Payment attempt | Transactions | `createPaymentAttempt()`, `confirmPayment()`, `failPayment()` | `src/modules/transactions/server.ts` |
| Audit transactional | Audit | `persistAuditLog()` | `src/lib/audit.ts` |
| Notification persistence | Notifications | `persistNotification()` | `src/lib/notifications/index.ts` |
| Notification orchestration | Notifications | `sendNotification()` si nécessaire | `src/lib/notifications/index.ts` |
| Money | Shared Money | primitives FCFA/BPS | `src/lib/money.ts`, `src/lib/utils/format.ts` |
| Partner identity eligibility | Identity | `assertPartnerIdentityVerified()` | `src/modules/identity/server.ts` |
| Residence availability | Residences | `getResidenceAvailability()`, `createResidenceUnavailablePeriod()` | `src/modules/residences/server.ts` |
| Residence booking | Residences | `createResidenceReservation()`, `cancelClientResidenceReservation()` | `src/modules/residences/server.ts` |
| Residence commission snapshot | Commissions | `createResidenceCommissionInTransaction()` | `src/modules/commissions/server.ts` |

`applyRestaurantOrderTransition()` est une implémentation interne Orders, pas
une API inter-module. De même, `deliverNotification()` reste interne à
Notifications : elle pilote les transports Push/Realtime, mais ne définit pas
le contrat produit. Un export legacy ne devient pas automatiquement public.

## 6. Graphe de dépendances

Le graphe des dépendances inter-modules autorisé est le suivant :

- `Partners` → `Auth`
- `Clients` → `Auth`
- `Restaurants` → `Partners`, `ServiceMarkets`
- `Subscriptions` → `Partners`
- `Quotas` → `Subscriptions`
- `Menu` → `Restaurants`, `Quotas`
- `Commissions` → `Partners`, `Subscriptions`, `Transactions`, `Audit`, `Notifications`, `shared/money`
- `Orders` → `Clients`, `Restaurants`, `Menu`, `ServiceMarkets`, `Commissions`, `Transactions`, `Notifications`, `shared/money`
- `Deliveries` → `Orders`, `Restaurants`, `Transactions`, `Notifications`, `infrastructure/db`, `infrastructure/auth`, `infrastructure/realtime`
- `Residences` → `Clients`, `ServiceMarkets`, `Identity`, `Quotas`, `Commissions`, `Transactions`, `Audit`, `Notifications`, `shared/money`
- `Events` → `ServiceMarkets` (à la matérialisation du vertical)
- `ServiceMarkets` → `infrastructure/db`, `Audit` uniquement pour les commandes administratives
- `Subscriptions` → `Transactions`
- `Transactions` → `infrastructure/db`
- `Identity` → `Partners`, `Audit`, `infrastructure/db`, `infrastructure/storage`
- `Audit` → `infrastructure/db`
- `Notifications` → `infrastructure/push`, `infrastructure/realtime`
- `Media` → `infrastructure/storage`

*(Note : La dépendance `Menu` → `Media` est en statut **REVIEW DURING A3**. Elle n'est pas encore obligatoire, une référence suffisant dans un premier temps)*.
*(Note 2 : `Subscriptions` ne dépend **pas** de `Restaurants`)*.

## 7. Matrice des imports

| Source \ Cible | `app/` | `modules/*/server` | `modules/*/model` | `modules/*/presentation` | `modules/*/_internal` | `shared/` | `infrastructure/` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `app/` | Oui | Oui | Oui | Oui | **Non** | Oui | Technique seulement ; **jamais DB** |
| `modules/*/server`| **Non** | APIs publiques étrangères | Oui | Non | Même module | Oui | Oui |
| `modules/*/model` | **Non** | **Non** | Même module | Non | **Non** | Pur seulement | **Non** |
| `modules/*/presentation`| **Non** | **Non** | Oui | Même module | **Non** | Oui | **Non** |
| `modules/*/_internal`| **Non** | APIs publiques étrangères | Oui | **Non** | Même module | Oui | Oui |
| `shared/` | **Non** | **Non** | **Non** | **Non** | **Non** | Oui | **Non** |
| `infrastructure/` | **Non** | **Non** | Oui (Uniquement enums purs) | **Non** | **Non** | Oui | Oui |

> **Exception DB Schema** : `infrastructure/db/schema` a le droit d'importer des constantes **pures** depuis `modules/*/model` pour la construction des enums Drizzle (ex: `ORDER_STATUSES`).

## 8. Server / Client dans Next.js

- **Page** (`app/**/page.tsx`) : appelle une query/projection publique du module et compose l'UI. Elle ne reconstruit pas une règle avec Drizzle.
- **Route Handler** (`app/api/**/route.ts`) : Adaptateur HTTP. Valide le transport, vérifie l'auth globale, et appelle la commande du module appropriée. Ce n'est pas un service métier.
- **Server Action** : Identique au Route Handler. Gère l'auth, la validation Zod de transport, l'appel au module métier, puis effectue la revalidation Next.js.
- **Client Components** (`"use client"`) : Peuvent importer `presentation`, `model` et `contracts`. **Interdit d'importer `modules/*/server` ou `infrastructure/db`**.

## 9. DB et transactions

L'abstraction de la persistance passe par les modules. **Il n'est pas nécessaire de masquer Drizzle derrière des "Repositories" stricts si cela reste encapsulé**.

- `app` **n'a pas le droit d'importer** la DB directement. (Une baseline est en cours pour résorber la dette actuelle).
- `_internal` a le droit d'utiliser Drizzle directement.
- Les transactions inter-modules utilisent le mécanisme transactionnel exposé publiquement (s'il existe) ou injecté.

Le schéma Drizzle reste central pendant l'A3 initial. Cette conservation est
volontaire. Son découpage n'est réévalué qu'après disparition des imports DB
depuis `app`. Les internals peuvent utiliser Drizzle directement : un
repository générique n'est pas requis.

## 10. Types / DTO / Zod / enums

Sémantique des noms et de la localisation :
- `*Row` / `*Insert` → Persistance (`_internal` ou `infrastructure`).
- `*Command` → Input de fonction métier en écriture (`contracts`).
- `*DTO` → Format de transport sérialisable (`contracts`).
- `*ViewModel` → Format attendu par un composant d'UI (`presentation`).
- `*Status` / `*State` → Modèle de domaine (`model`).

Les valeurs d'un enum runtime sont définies une seule fois comme tuple pur
`as const` dans le modèle propriétaire. L'union TypeScript et le schéma Zod en
dérivent. Le schéma Drizzle central peut importer ce tuple uniquement pour
assembler `pgEnum`. Un Client Component n'importe jamais le schéma DB. Une
validation propre à une route reste près de la route ; un contrat réutilisable
vit dans `contracts.ts`.

## 11. Constantes

Pas de fichier global ou fourre-tout `constants.ts`. Chaque constante relève
d'une catégorie :

- donnée administrable → DB/admin setting ;
- invariant métier → `modules/<module>/model.ts`, plus contrainte DB si utile ;
- métadonnée de présentation → `modules/<module>/presentation/` ;
- primitive partagée → `shared/<concept>` ;
- constante technique → `infrastructure/<mechanism>` ;
- valeur locale → reste dans son fichier consommateur.

## 12. UI / badges / présentation

- `shared/ui` contient les primitives agnostiques (ex. le composant `<Badge>`).
- `modules/*/presentation` possède la connaissance d'affichage du statut (ex. l'association du statut métier "servie" au badge "Retirée" ou "Livrée" selon le contexte).

Pour Orders, le statut métier reste `servie`. La présentation peut afficher
`Servie` pour `sur_place`, `Retirée` pour `emporter` et `Livrée` pour
`livraison`.

## 13. Audit / Notifications

- `modules/audit` possède la sémantique de trace métier/admin.
  `persistAuditLog()` est transactionnel ; les logs techniques restent dans
  `infrastructure/logger`.
- `modules/notifications` gère la création et le format produit. Il possède
  `persistNotification()` et peut exposer `sendNotification()` lorsque utile.
- L'infrastructure (`push`, `realtime`) gère l'acheminement Expo, WebPush et
  SSE. `deliverNotification()` reste `_internal`.

## 14. Cache

`infrastructure/cache` possède Redis, Next cache, les clés et les opérations
techniques. Le module qui modifie une donnée possède la décision sémantique
sur les projections à invalider. Un cache global ne doit pas connaître toutes
les règles des domaines.

## 15. Tests d'architecture

`npm run test:architecture` utilise l'API TypeScript installée pour analyser
les imports, réexports, imports dynamiques statiques, imports de type et
`require` statiques. Les cibles sont résolues avec `tsconfig.json`, y compris
`@/*` et les chemins relatifs. Le scan exclut dépendances et sorties de build ;
les migrations ne sont jamais analysées.

La règle `app -> DB` est un ratchet. Sa baseline A3.0 enregistre 106 arêtes
d'import exactes réparties sur 56 fichiers legacy. Une arête connue peut
disparaître ; une nouvelle arête ou la même arête déplacée dans un autre
fichier échoue. À zéro violation réelle, la baseline est supprimée et la règle
devient absolue.

Les autres règles partent de zéro : module vers app, internal étranger, app
vers internal, Client Component vers module server/DB, shared vers module,
infrastructure vers module et barrel racine de module.

## 16. Bridges temporaires

Pendant la migration A3, `src/lib` est considéré comme du code *legacy*. Un bridge est un export temporaire reliant l'ancienne structure au nouveau module, ou inversement.
**Un bridge ne doit contenir aucune logique métier (pas de duplication, pas de modification sémantique).**

| Bridge | Nouveau propriétaire | Lot suppression |
| :--- | :--- | :--- |
| `src/lib/restaurants/policy.ts` | Restaurants | Lot géographique 6 |
| `src/lib/orders/restaurant-order*.ts` | Orders | Lot géographique 6 |
| `src/infrastructure/auth/driver-tokens.ts` | Auth | Suppression après migration de `src/lib/auth/tokens.ts` vers Infrastructure/Auth |
| `src/infrastructure/auth/session-revocation.ts` | Auth | Suppression après migration du registre Redis vers Infrastructure/Auth |

Le module `service-markets` ne dépend d'aucun vertical. Une activité choisit
elle-même le contexte faisant autorité (`currentLocation`,
`destinationLocation` ou `serviceLocation`) et possède sa règle de transaction.
Les associations sont des clés étrangères dans chaque table verticale ; une
table polymorphe générique d'entités géographiques est interdite.

Chaque futur bridge doit être enregistré avant usage avec son lot de
suppression. Il peut seulement réexporter ou déléguer à l'implémentation
canonique unique.

## 17. Ajouter un nouveau module

1. Démontrer que le concept possède un propriétaire métier stable et n'est pas
   une simple surface.
2. Créer uniquement les surfaces nécessaires : `server.ts`, `model.ts`,
   `contracts.ts`, `presentation/`, `_internal/`.
3. Déclarer ses dépendances autorisées et préserver un graphe sans cycle.
4. Exposer la plus petite API utile ; `server.ts` commence par
   `import "server-only"`.
5. Ajouter les tests métier et d'architecture. Ne jamais créer de barrel
   racine `index.ts`.

## 18. Décisions différées

Modules futurs qui seront intégrés lors de phases ultérieures :
- `transactions`
- `payments` (Paystack)
- `residences`
- `identity`
- `search`

Ne pas anticiper leur conception interne avant leur lot dédié.

---

# How to change Toutci

Pour toute intervention de l'IA (Antigravity ou autre agent), suivez ces règles cardinales :
1. **Identifier le concept métier** concerné.
2. **Identifier le propriétaire** (voir table ci-dessous).
3. **Lire dans l'ordre** : `model.ts` → `contracts.ts` → `server.ts`.
4. Ne consulter les `_internal` que si vous modifiez activement la persistance du module.
5. **Ne jamais ajouter de logique métier dans l'ancien `src/lib`.**

| Task | Owner | Entry point (Module) |
| :--- | :--- | :--- |
| Plan, transitions | Subscriptions | `@/modules/subscriptions/server` ou `model` |
| Quota limits | Quotas | `@/modules/quotas/server` |
| Order creation/transition | Orders | `@/modules/orders/server` |
| Restaurant visibility | Restaurants | `@/modules/restaurants/model` |
| Dish availability | Menu | `@/modules/menu/model` |
| Commission debt/lifecycle | Commissions | `@/modules/commissions/server` |
| Financial obligation/payment | Transactions | `@/modules/transactions/server` ou `model` |
| Partner access | Partners | `@/modules/partners/server` |
| Notification | Notifications | `@/modules/notifications/server` |
| Audit | Audit | `@/modules/audit/server` |
