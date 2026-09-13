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

Les trois racines `src/modules`, `src/shared` et `src/infrastructure` sont
effectives. `src/lib` a été supprimé et sa recréation est interdite. Une racine
ou une surface n'est créée que lorsqu'elle possède un vrai fichier ; les
placeholders restent interdits.

Les candidats Shared validés sont `ui`, `money`, `pagination`, `time`, le
`geo` pur et l'enum transversal des acteurs causaux dans `shared/causality`.
Il n'existe pas de tiroir initial `shared/types`, `constants`,
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

### Cohérence des interfaces

La séparation des composants par module organise la propriété métier ; elle
n'autorise pas chaque domaine à créer son propre langage visuel. Les primitives,
tokens, variantes, comportements responsive et règles d'accessibilité communs
vivent dans `shared/ui`. Les composants de `presentation/` les composent avec du
vocabulaire métier, sans les dupliquer ni les redéfinir localement.

Avant toute création ou refonte d'interface applicative, appliquer le skill
global `app-components-registry` : recherche beUI en premier, puis shadcn/ui.
Les shells et layouts de dashboard utilisent directement le bloc dashboard
shadcn/ui. Aucun composant maison isolé n'est créé lorsqu'un équivalent existe.
L'interface historique n'est pas une cible de compatibilité visuelle pendant la
migration : les écrans obsolètes peuvent être reconstruits avec leur domaine.

## 4. Catalogue des modules actuels

| Module | Responsabilité |
| :--- | :--- |
| **auth** | Authentification, sessions, protection des routes. |
| **admin-accounts** | Création, suspension, réactivation et récupération contrôlée des comptes administrateurs. |
| **admin-projections** | Read models transversaux du tableau de bord et du centre d’actions administrateur. |
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
| **payments** | Orchestration des fournisseurs de paiement et des retours/callbacks vers les domaines propriétaires. |
| **notifications** | Modèle produit des notifications métier. |
| **audit** | Traçabilité des actions critiques. |
| **events** | Enveloppes causales, outbox transactionnelle, reprise et réconciliation des effets. |
| **discovery** | Classement, exposition commerciale et attribution des ressources déclarées éligibles par les domaines. |
| **media** | Gestion métier des ressources média et images. |
| **identity** | Vérification manuelle de l’identité des partenaires et frontières d’éligibilité KYC. |

## 5. Sources de vérité

**DO NOT DUPLICATE** : Il est interdit de dupliquer ces logiques. Utilisez toujours la source de vérité.

| Concept | Owner | API canonique | Emplacement canonique |
| :--- | :--- | :--- | :--- |
| Partner account | Partners | `requirePartnerAccount()` | `src/modules/partners/server.ts` |
| Partner activity | Partners | `requirePartnerActivity()` | `src/modules/partners/server.ts` |
| Effective plan | Subscriptions | `getEffectivePlan()` | `src/modules/subscriptions/server.ts` |
| Subscription transition | Subscriptions | `evaluateSubscriptionTransition()` | `src/modules/subscriptions/model.ts` |
| Effective limits | Quotas | `getEffectiveRestaurantQuota()` | `src/modules/quotas/server.ts` |
| Quota selection | Quotas | `selectRestaurantQuotaEligibleResources()` | `src/modules/quotas/model.ts` |
| Restaurant visibility | Restaurants | `isRestaurantPubliclyVisible()` | `src/modules/restaurants/model.ts` |
| Restaurant orderability | Restaurants | `isRestaurantOrderable()` | `src/modules/restaurants/model.ts` |
| Service market resolution | Service Markets | `resolveServiceMarketAtPoint()` | `src/modules/service-markets/server.ts` |
| Service capability | Service Markets | `getServiceMarketCapability()`, `requireActiveServiceMarketCapability()` | `src/modules/service-markets/server.ts` |
| Dish availability | Menu | `isDishAvailable()` | `src/modules/menu/model.ts` |
| Commercial dish eligibility | Menu | `assertRestaurantDishesOrderable()` | `src/modules/menu/server.ts` |
| Client profile and account state | Clients | commandes et projections publiques Clients | `src/modules/clients/server.ts` |
| Order creation | Orders | `createRestaurantOrder()` | `src/modules/orders/server.ts` |
| Order transition | Orders | `transitionRestaurantOrder()` | `src/modules/orders/server.ts` |
| Order-chain reconciliation | Orders | `restaurant_order_chain_health`, `refresh_restaurant_order_reconciliation()` | `drizzle/migrations/0042_order_chain_reconciliation.sql` |
| Completed-order counters | Clients / Orders / Menu | projections recalculables par propriétaire | `client_order_projections`, `restaurant_order_projections`, `dish_order_projections` |
| Delivery lifecycle | Deliveries | commandes publiques de `src/modules/deliveries/server.ts` | `src/modules/deliveries/` |
| Commission lifecycle | Commissions | commandes publiques de cycle de vie | `src/modules/commissions/server.ts` |
| Cash debt | Commissions | API cash-debt publique | `src/modules/commissions/server.ts` |
| Settlement | Commissions | commandes de règlement manuel et Paystack | `src/modules/commissions/server.ts` |
| Financial transaction | Transactions | `createTransaction()`, `cancelTransaction()` | `src/modules/transactions/server.ts` |
| Payment attempt | Transactions | `createPaymentAttempt()`, `confirmPayment()`, `failPayment()` | `src/modules/transactions/server.ts` |
| Provider payment orchestration | Payments | `confirmProviderPayment()`, `initializePreparedPaystackPayment()` | `src/modules/payments/server.ts` |
| Audit transactional | Audit | `persistAuditLog()` | `src/modules/audit/server.ts` |
| Causal event and outbox | Events | `persistBusinessEvent()`, `processCausalityOutbox()` | `src/modules/events/server.ts` |
| Notification persistence | Notifications | `persistNotification()` | `src/modules/notifications/server.ts` |
| Notification destination | Notifications | `getUserNotificationDestination()` | `src/modules/notifications/model.ts` |
| Admin dashboard projections | Admin Projections | `getAdminDashboardProjection()`, `getAdminActionCenter()` | `src/modules/admin-projections/server.ts` |
| Public discovery | Discovery | `searchRestaurantsInCurrentMarket()`, `searchPublicResidences()` | `src/modules/discovery/server.ts` |
| Money | Shared Money | primitives FCFA/BPS | `src/shared/money.ts`, `src/shared/format.ts` |
| Partner identity eligibility | Identity | `assertPartnerIdentityVerified()` | `src/modules/identity/server.ts` |
| Residence availability | Residences | `getResidenceAvailability()`, `createResidenceUnavailablePeriod()` | `src/modules/residences/server.ts` |
| Residence booking | Residences | `createResidenceReservation()`, `cancelClientResidenceReservation()` | `src/modules/residences/server.ts` |
| Residence commission snapshot | Commissions | `createResidenceCommissionInTransaction()` | `src/modules/commissions/server.ts` |

`applyRestaurantOrderTransition()` est une implémentation interne Orders, pas
une API inter-module. De même, `deliverNotification()` reste interne à
Notifications : elle pilote les transports Push/Realtime, mais ne définit pas
le contrat produit. Un export legacy ne devient pas automatiquement public.

## 6. Carte des dépendances inter-modules

La carte ci-dessous est une **allowlist**, pas une simple photographie.
Dependency Cruiser refuse toute arête inter-module qui n'y figure pas, ainsi
que tout cycle réel du graphe de fichiers. Une dépendance autorisée doit encore
respecter les surfaces de la matrice de la section 7.

| Source | Modules cibles autorisés |
| :--- | :--- |
| `admin-accounts` | `auth`, `events` |
| `admin-projections` | — |
| `audit` | — |
| `auth` | — |
| `clients` | `audit`, `auth` |
| `commissions` | `audit`, `notifications`, `subscriptions`, `transactions` |
| `deliveries` | `notifications`, `orders`, `transactions` |
| `discovery` | `residences`, `restaurants`, `subscriptions` |
| `events` | `audit`, `notifications` |
| `identity` | `events`, `media`, `notifications` |
| `media` | — |
| `menu` | `media`, `quotas` |
| `notifications` | `partners` |
| `orders` | `clients`, `commissions`, `menu`, `notifications`, `restaurants`, `service-markets`, `transactions` |
| `partners` | `audit`, `auth` |
| `payments` | `clients`, `commissions`, `orders`, `subscriptions`, `transactions` |
| `quotas` | `subscriptions` |
| `residences` | `audit`, `clients`, `commissions`, `events`, `identity`, `media`, `notifications`, `partners`, `payments`, `quotas`, `service-markets`, `subscriptions`, `transactions` |
| `restaurants` | `events`, `media`, `notifications`, `orders`, `partners`, `service-markets`, `subscriptions` |
| `service-markets` | `audit` |
| `subscriptions` | `audit`, `events`, `notifications`, `transactions` |
| `transactions` | `audit`, `events`, `notifications` |

Les accès à `shared` et `infrastructure` ne sont pas des dépendances
inter-modules ; ils sont régis par la matrice ci-dessous. Toute nouvelle arête
requiert une décision d'architecture, sa déclaration dans
`.dependency-cruiser.cjs` et la mise à jour de cette carte dans le même
changement.

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
- Les Server Actions restent des adaptateurs `app` marqués `"use server"`.
  Lorsqu'un Client Component en a besoin, l'adaptateur parent lui injecte
  l'action ; le composant métier ne dépend pas d'une surface `app`.

## 9. DB et transactions

L'abstraction de la persistance passe par les modules. **Il n'est pas nécessaire de masquer Drizzle derrière des "Repositories" stricts si cela reste encapsulé**.

- `app` **n'a pas le droit d'importer** la DB directement. Cette règle est absolue et sans baseline.
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
- `modules/events` possède l'enveloppe causale et l'outbox PostgreSQL. Un
  événement et ses effets attendus sont écrits dans la transaction de la
  commande ; le consommateur verrouille avec `SKIP LOCKED`, rejoue sans
  doublon, puis conserve un reçu d'effet minimal après purge de l'outbox.
- `modules/notifications` gère la création et le format produit. Il possède
  `persistNotification()`, les destinations typées et leur résolution. Une
  cible supprimée ou une résidence archivée supprime sa projection ; aucune
  notification ne conserve volontairement un lien cassé.
- Audit et Notifications consomment les effets d’un même événement corrélé.
  Les reçus conservent le payload minimal nécessaire à
  `rebuild_causal_projections()` ; la projection peut donc être recréée après
  une suppression ou un incident sans rejouer la commande métier.
- L'infrastructure (`push`, `realtime`) gère l'acheminement Expo, WebPush et
  SSE sans posséder le sens métier de la notification.
- Les payloads causaux ne contiennent ni secrets, ni coordonnées personnelles,
  ni texte libre sensible. Audit et événements sont conservés cinq ans ; une
  outbox réussie trente jours ; une dead-letter résolue un an. Une dead-letter
  non résolue n'est jamais purgée automatiquement.

## 14. Cache

`infrastructure/cache` possède Redis, Next cache, les clés et les opérations
techniques. Le module qui modifie une donnée possède la décision sémantique
sur les projections à invalider. Un cache global ne doit pas connaître toutes
les règles des domaines.

## 15. Tests d'architecture

`npm run test:architecture` utilise l'API TypeScript installée pour analyser
les sources JavaScript et TypeScript, les réexports, imports dynamiques
statiques, imports de type et `require` statiques. Les cibles sont résolues
avec `tsconfig.json`, y compris `@/*` et les chemins relatifs. Le scan exclut
dépendances et sorties de build ; les migrations ne sont jamais analysées.

La règle `app -> DB` est absolue : toute arête directe vers
`infrastructure/db` échoue. La baseline historique a été supprimée après
résorption complète de la dette en Phase 12.

Les autres règles partent de zéro : module vers app, internal étranger, app
vers internal, Client Component vers module server/DB, shared vers module,
infrastructure vers module et barrel racine de module.

La Phase 2 ajoute trois contrôles complémentaires sans remplacer ce scan
TypeScript :

- ESLint classe `app`, chaque surface de module, `shared` et `infrastructure`
  avec `eslint-plugin-boundaries` et bloque aussi les imports privés avec
  `no-restricted-imports` ;
- dependency-cruiser refuse les cycles et les mêmes dépendances de couche ;
- Husky exécute lint-staged sur les fichiers JavaScript/TypeScript modifiés,
  puis relance les contrôles d'architecture avant chaque commit.

Les baselines d'imports `app -> DB`, de surfaces privées et de matrice module,
leur générateur et le registre de violations Dependency Cruiser ont été
supprimés. Toute violation échoue directement. `npm run ci:quality` bloque la
CI sur typecheck, lint sans avertissement, tests d'architecture, Dependency
Cruiser et tests ciblés de la Phase 13 ; la suite complète est ensuite exigée.
Le hook `.husky/pre-commit` exécute lint-staged puis
`npm run architecture:check`.

## 16. Bridges temporaires

La Phase 12 a supprimé `src/lib` et tous les bridges A3 enregistrés. Ce chemin
est retiré et ne doit pas être recréé. Il n'existe plus de bridge actif.

Le module `service-markets` ne dépend d'aucun vertical. Une activité choisit
elle-même le contexte faisant autorité (`currentLocation`,
`destinationLocation` ou `serviceLocation`) et possède sa règle de transaction.
Les associations sont des clés étrangères dans chaque table verticale ; une
table polymorphe générique d'entités géographiques est interdite.

Tout futur bridge exceptionnel doit être enregistré avant usage avec son
propriétaire et une date de suppression. Il peut seulement réexporter ou
déléguer à l'implémentation canonique unique.

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

## 18. Étendre le monolithe sans contourner les propriétaires

### Ajouter une commande métier

1. Identifier le module propriétaire et lire `model.ts`, `contracts.ts`, puis
   `server.ts` ; ne créer aucun service dans `app`.
2. Définir l'input public et sa validation dans `contracts.ts`, puis les
   invariants déterministes dans `model.ts`.
3. Exposer un verbe métier explicite dans `server.ts`. La façade valide
   l'input et délègue à `_internal` seulement si une persistance est requise.
4. Effectuer dans une même transaction l'écriture métier, son audit et son
   événement causal lorsque l'action est critique. L'idempotence et les
   effets attendus font partie du contrat de la commande.
5. Faire de la Route Handler ou Server Action un adaptateur : auth, transport,
   appel de la commande et revalidation Next.js uniquement.
6. Ajouter tests du modèle, de la commande, de persistance si nécessaire et
   contrôles d'architecture ; exécuter `npm run ci:quality`.

### Ajouter un événement causal

1. Le producteur métier choisit un type versionné
   `domaine.fait.vN`, un `eventId` et un `correlationId` stables.
2. Construire un payload JSON minimal et non sensible ; les interdictions et
   limites de `events/model.ts` s'appliquent sans exception.
3. Déclarer les effets attendus (`audit.project`,
   `notification.project`) et appeler `persistBusinessEvent()` avec
   l'exécuteur de la transaction métier. Ne jamais publier après commit par un
   appel isolé.
4. Rendre chaque consommateur idempotent, conserver son reçu d'effet et
   couvrir succès, retry et dead-letter. Une évolution incompatible crée une
   nouvelle version d'événement.

### Ajouter une table

1. Identifier le module propriétaire et nommer la table dans le vocabulaire
   du domaine. Le schéma Drizzle reste central dans
   `src/infrastructure/db/schema.ts` pendant cette architecture.
2. Définir clés étrangères, unicité, checks, index et comportement de
   suppression à partir des invariants du modèle ; ne pas compter uniquement
   sur une validation applicative.
3. Accéder à la table uniquement depuis le propriétaire via `_internal` ou sa
   façade serveur. `app`, `shared`, `model`, `contracts` et `presentation` ne
   dépendent jamais du schéma.
4. Générer la migration avec `npm run db:generate`, relire le SQL, puis suivre
   `expand → audit → backfill → verify → enforce → contract`. Ne jamais éditer
   le journal de migrations à la main.
5. Ajouter un test d'invariant DB et les diagnostics/backfills réexécutables
   requis avant d'appliquer la migration à un environnement autorisé.

### Ajouter une projection

1. Nommer le propriétaire de la lecture et le producteur de chaque donnée ;
   une projection transverse d'administration appartient à
   `admin-projections`, pas à `app`.
2. Définir le DTO public dans `model.ts` ou `contracts.ts`, puis exposer la
   query dans `server.ts`. L'UI consomme ce DTO et ne joint jamais la DB.
3. Pour une projection matérialisée, écrire sa mise à jour dans la transaction
   du producteur ou via un effet causal idempotent avec reçu. Documenter son
   ordre de traitement et sa tolérance au retard.
4. Fournir une reconstruction déterministe et réexécutable depuis les sources
   de vérité, ainsi qu'un contrôle de cohérence et la suppression des lignes
   orphelines.
5. Tester la lecture, l'idempotence, la reconstruction et les frontières, puis
   déclarer toute nouvelle arête dans la carte autorisée.

## 19. Décisions différées

Les nouveaux modules transversaux doivent être ajoutés uniquement dans leur lot
dédié et avec un propriétaire, des contrats et des dépendances explicités.

Ne pas anticiper leur conception interne avant leur lot dédié.

---

# How to change Toutci

Pour toute intervention de l'IA (Antigravity ou autre agent), suivez ces règles cardinales :
1. **Identifier le concept métier** concerné.
2. **Identifier le propriétaire** (voir table ci-dessous).
3. **Lire dans l'ordre** : `model.ts` → `contracts.ts` → `server.ts`.
4. Ne consulter les `_internal` que si vous modifiez activement la persistance du module.
5. **Ne jamais recréer `src/lib` ni y ajouter un bridge de compatibilité.**

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
| Événement corrélé / outbox | Events | `@/modules/events/server` |
