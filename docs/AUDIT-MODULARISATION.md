# Toutci — Audit de modularisation, Phase 0

- **Date :** 4 septembre 2026
- **Périmètre :** cartographie statique exhaustive du dépôt, sans modification du code produit ni de la base
- **Plan :** Phase 0 de `PLAN_MONOLITHE_MODULAIRE_COHERENCE_METIER_2026-09-04.md`

## Verdict

Le catalogue cible de 19 modules est compatible avec le modèle observé. La migration peut avancer par extraction progressive, mais le filet de sécurité de la Phase 1 reste indispensable avant tout déplacement métier.

La dette structurante mesurée sur l'état courant est la suivante :

- 104 dépendances directes `app → DB` réparties dans 56 fichiers ; la baseline d'architecture conservée dans le dépôt en tolère encore 108 dans 57 fichiers ;
- 18 fichiers d'écriture DB vérifiés vivent encore dans `src/app` ou `src/lib` ;
- un cycle d'import subsiste dans l'onboarding legacy ;
- aucune nouvelle violation `_internal` étrangère, `module → app`, composant client → serveur/DB ou barrel racine de module n'a été trouvée ;
- le quota Résidence implémenté va déjà dans la direction produit désormais validée : il sélectionne les candidates à la visibilité. Le prédicat « publiée et réellement visible » doit toutefois devenir une règle canonique caractérisée par des tests.

## Méthode et preuves exhaustives

L'inventaire a été construit à partir de l'AST TypeScript et complété par une recherche ciblée des écritures Drizzle, simulations, projections et composants. Les rapports CSV constituent la preuve exhaustive ; le présent document en donne la synthèse exploitable.

| Preuve | Couverture |
|---|---|
| [`audits/phase-0-file-ownership.csv`](audits/phase-0-file-ownership.csv) | 760 fichiers classés : 684 sources, 36 scripts opérationnels, 40 tests |
| [`audits/phase-0-table-access.csv`](audits/phase-0-table-access.csv) | 49 tables, propriétaire cible, lecteurs et écrivains |
| [`audits/phase-0-command-surfaces.csv`](audits/phase-0-command-surfaces.csv) | 122 surfaces d'action, route ou commande |
| [`audits/phase-0-app-db-imports.csv`](audits/phase-0-app-db-imports.csv) | 104 arêtes `app → DB` courantes |
| [`audits/phase-0-screen-inventory.csv`](audits/phase-0-screen-inventory.csv) | 72 surfaces App Router |
| [`audits/phase-0-ui-inventory.csv`](audits/phase-0-ui-inventory.csv) | 235 composants TSX et leurs signaux de dette UI |

Comptage des sources : 182 fichiers `app`, 92 `modules`, 138 `lib`, 250 `components` et 14 `infrastructure`. Le projet contient 204 composants client et 3 714 imports analysés. `src/shared` n'existe pas encore physiquement ; les primitives partagées sont surtout dans `src/components/ui`, `src/components/motion` et `src/lib`.

## Catalogue et ownership

Les propriétaires cibles validés sont : `auth`, `admin-accounts`, `partners`, `clients`, `restaurants`, `menu`, `residences`, `service-markets`, `discovery`, `identity`, `subscriptions`, `quotas`, `transactions`, `commissions`, `orders`, `deliveries`, `notifications`, `audit` et `media`.

Les adaptateurs Next.js restent dans `app`, les décisions métier dans le module propriétaire, les intégrations techniques dans `infrastructure` et les primitives réellement transverses dans `shared`. Aucun module « admin » omnipotent n'est créé : l'administration compose les lectures publiques des domaines.

### Matrice des 49 tables

Les colonnes R/W donnent le nombre de fichiers lecteurs/écrivains détectés statiquement. Le détail des chemins figure dans le CSV de table access.

| Table | Propriétaire cible | R | W |
|---|---|---:|---:|
| `users` | `auth / admin-accounts` | 16 | 5 |
| `partner_accounts` | `partners` | 18 | 2 |
| `partner_identity_verifications` | `identity` | 2 | 2 |
| `partner_identity_documents` | `identity` | 1 | 1 |
| `payment_provider_accounts` | `transactions` | 4 | 1 |
| `geo_source_areas` | `service-markets` | 1 | 0 |
| `service_markets` | `service-markets` | 1 | 1 |
| `service_market_versions` | `service-markets` | 1 | 1 |
| `service_market_capabilities` | `service-markets` | 1 | 1 |
| `service_market_version_areas` | `service-markets` | 1 | 1 |
| `restaurants` | `restaurants` | 22 | 7 |
| `residences` | `residences` | 3 | 1 |
| `residence_images` | `residences → media` | 0 | 1 |
| `residence_reservations` | `residences` | 4 | 1 |
| `residence_unavailable_periods` | `residences` | 1 | 1 |
| `subscription_plans` | `subscriptions` | 7 | 2 |
| `subscription_plan_limits` | `subscriptions` | 3 | 2 |
| `subscription_plan_exposure_benefits` | `subscriptions / discovery` | 0 | 1 |
| `subscription_plan_feature_items` | `subscriptions` | 0 | 1 |
| `discovery_policy_settings` | `discovery` | 1 | 1 |
| `discovery_events` | `discovery` | 0 | 1 |
| `subscription_catalogue_draft` | `subscriptions` | 1 | 1 |
| `subscription_catalogue_revisions` | `subscriptions` | 1 | 1 |
| `subscription_requests` | `subscriptions` | 7 | 2 |
| `subscription_periods` | `subscriptions` | 7 | 4 |
| `subscription_period_limits` | `quotas` | 2 | 2 |
| `commission_settlements` | `commissions` | 2 | 1 |
| `commission_policy_settings` | `commissions` | 2 | 1 |
| `commission_debt_cycles` | `commissions` | 1 | 1 |
| `creneaux_horaires` | `restaurants` | 3 | 2 |
| `categories` | `menu` | 8 | 2 |
| `plats` | `menu` | 5 | 2 |
| `clients` | `clients` | 11 | 5 |
| `commandes` | `orders` | 15 | 4 |
| `transactions` | `transactions` | 7 | 1 |
| `payments` | `transactions` | 5 | 2 |
| `livreurs` | `deliveries` | 4 | 3 |
| `livraisons` | `deliveries` | 6 | 3 |
| `delivery_offers` | `deliveries` | 3 | 2 |
| `delivery_events` | `deliveries` | 1 | 1 |
| `driver_cash_remittances` | `deliveries` | 0 | 1 |
| `driver_cash_collections` | `deliveries` | 3 | 1 |
| `promotions` | `menu / orders`, à trancher | 1 | 1 |
| `avis` | `restaurants / clients`, à trancher | 2 | 1 |
| `notifications` | `notifications` | 4 | 4 |
| `audit_log` | `audit` | 1 | 1 |
| `commissions` | `commissions` | 4 | 2 |
| `commission_settlement_allocations` | `commissions` | 0 | 1 |
| `push_subscriptions` | `notifications` | 3 | 4 |

L'absence de lecteur ou d'écrivain détecté pour sept tables n'est pas une preuve d'inutilité : elle signale une lecture absente, un script SQL hors AST ou une projection incomplète à vérifier avant migration.

### Ownership à préciser avant les phases concernées

- `users` reste partagé entre Auth pour l'identité de connexion et Admin Accounts pour le cycle de vie administrateur ; les deux surfaces publiques devront être explicites.
- `promotions` doit être possédé par Menu si la promotion décrit l'offre, ou par Orders si elle devient un agrégat transactionnel ; le parcours actif ne permet pas encore de trancher.
- `avis` doit être réactivé avec une source et un propriétaire explicites, ou retiré du produit.
- `residence_images` doit passer sous Media pour le cycle d'asset, avec la relation métier conservée par Residences.
- `subscription_plan_exposure_benefits` nécessite un contrat entre Subscriptions, qui vend le droit, et Discovery, qui l'applique.

Ces précisions ne bloquent pas la cartographie ni la Phase 1 ; elles bloqueront l'extraction de leurs domaines si elles ne sont pas décidées avant celle-ci.

## Écritures DB legacy

### Adaptateurs `src/app` qui écrivent encore directement

1. `src/app/api/auth/register/route.ts`
2. `src/app/api/cron/subscriptions/route.ts`
3. `src/app/api/notifications/route.ts`
4. `src/app/api/push/web/subscribe/route.ts`
5. `src/app/api/restaurants/[id]/route.ts`
6. `src/app/api/v1/client/auth/me/route.ts`
7. `src/app/api/v1/client/auth/register/route.ts`
8. `src/app/api/v1/push/expo/register/route.ts`

### Fichiers `src/lib` qui écrivent encore directement

1. `src/lib/actions/admin-subscriptions.ts`
2. `src/lib/audit.ts`
3. `src/lib/commissions/ledger.ts`
4. `src/lib/db/commandes-mutations.ts`
5. `src/lib/db/mutations-admin.ts`
6. `src/lib/db/mutations.ts`
7. `src/lib/db/seed.ts`
8. `src/lib/notifications/index.ts`
9. `src/lib/orders/provider-confirmation.ts`
10. `src/lib/orders/restaurant-order.ts`

Ces fichiers sont des ponts de migration, pas des propriétaires. Les phases métier devront rediriger chaque intention vers une commande canonique, sans nouveau comportement dans ces ponts.

## Matrice causale

La matrice fonctionnelle complète reste la section 7 de [`TOUTCI_RELATIONS_METIER_2026-09-04.md`](TOUTCI_RELATIONS_METIER_2026-09-04.md). Elle est croisée avec les 122 surfaces techniques du CSV. Les ruptures prioritaires sont :

| Intention | Commande propriétaire cible | Tables principales | Événement / effets obligatoires | Écrans consommateurs |
|---|---|---|---|---|
| S'inscrire et choisir l'activité | Auth + Partners | `users`, `partner_accounts` | compte créé, onboarding, audit | connexion, inscription, onboarding, Comptes et accès |
| Créer/modérer un Restaurant | Restaurants | `restaurants`, `creneaux_horaires` | audit, notification, éligibilité, projection | partenaire Restaurant, admin, public |
| Créer/publier une Résidence | Residences + Quotas | `residences`, `subscription_period_limits` | quota visible, modération, notification, projection | partenaire Résidence, admin, public |
| Soumettre/décider un KYC | Identity | `partner_identity_*` | audit, notification, recalcul d'éligibilité | partenaire, revue admin |
| Demander/finaliser un abonnement | Subscriptions + Transactions + Quotas | `subscription_*`, `transactions`, `payments` | période, limites, audit, notification, journal financier | facturation partenaire, admin |
| Configurer un versement | Transactions | `payment_provider_accounts` | audit, notification, attribution explicite | facturation, admin |
| Gérer le menu | Menu | `categories`, `plats` | propriété, quota, disponibilité, cache | partenaire Restaurant, commande publique |
| Créer/confirmer une commande | Orders + Transactions | `commandes`, `transactions`, `payments` | commission, notification, compteurs, temps réel | client, Restaurant, admin |
| Créer/annuler une réservation | Residences + Transactions | `residence_reservations`, `transactions`, `payments` | calendrier, commission, remboursement, notifications | client, Résidence, admin |
| Exécuter une livraison | Deliveries + Orders | `livraisons`, `delivery_*`, `driver_cash_*`, `commandes` | événements, preuve, espèces, notifications | livreur, Restaurant, client |
| Régler une commission | Commissions + Transactions | `commissions`, `commission_*`, `transactions`, `payments` | allocations, audit, notification, solde | partenaire, admin |
| Notifier | Notifications | `notifications`, `push_subscriptions` | destination typée, push/SSE idempotents | centres de notifications |
| Auditer une action | Audit | `audit_log` puis modèle d'événement cible | acteur typé, corrélation, réconciliation | journal admin |
| Téléverser/rattacher un média | Media + domaine cible | registre cible + table métier | asset temporaire/rattaché, nettoyage | formulaires, galeries, admin |

## Simulations, données de test et projections sans source

- Simulations métier dormantes : `StepSocials.tsx`, `reviews-section.tsx`, `reserve-modal.tsx` et `gallery-section.tsx`. Elles ne sont pas montées dans les parcours actifs, mais doivent être supprimées ou isolées hors build produit.
- `StepMenu.tsx` et `src/lib/db/mutations.ts` parlent de « plat de démonstration » alors que l'écriture est réelle ; c'est un problème de vocabulaire, pas une simulation de persistance.
- Les fixtures ne portent aucun marqueur structurel d'origine. Les noms/emails ne suffisent pas à distinguer une donnée réelle d'un test.
- La projection Support expose un compteur de remboursements sans registre canonique correspondant.
- Les compteurs Client, Restaurant et Plat peuvent dériver ; les notifications utilisent une destination polymorphe non protégée.

## Cycles, frontières et règles concurrentes

- Cycle unique : `src/lib/actions/onboarding.ts` ↔ `src/lib/onboarding/settings.ts`.
- Violations étrangères : 0 import `_internal` d'un autre module, 0 import `app` depuis un module, 0 import serveur/DB depuis un composant client, 0 barrel `src/modules/*/index.ts`.
- Les finalisations d'abonnement Paystack et hors ligne produisent encore des effets différents.
- Les écritures Orders, Notifications et Audit disposent de chemins concurrents entre modules, routes et `src/lib`.
- La visibilité et les quotas sont encore calculés à plusieurs niveaux. Pour Résidences, la bonne sémantique produit est désormais fixée : seules les Résidences publiées et effectivement visibles comptent.

## Conclusion de la Phase 0

La cartographie est complète et aucun déplacement n'a été effectué. Le prochain travail autorisable est exclusivement la Phase 1 : isoler les données de test et construire le filet de caractérisation. Les décisions `promotions`, `avis` et partage Subscriptions/Discovery pourront attendre leurs phases respectives ; elles ne doivent pas être improvisées.
