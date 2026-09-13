# Phase 9 — Clients, Orders, Commissions et Deliveries

## Résultat

La chaîne Restaurant `client → commande → transaction/paiement → commission → livraison` possède désormais des propriétaires métier publics et un état réconciliable. Les créations et transitions de commande passent par Orders, la dette et les règlements par Commissions, les profils par Clients et les missions/preuves/espèces par Deliveries.

Les commandes historiques n'ont pas été réparées artificiellement : la migration `0042` les classe explicitement `complete` ou `legacy_incomplete` avec leurs anomalies. Les nouvelles commandes peuvent être vérifiées par la même projection de santé.

## Changements principaux

- Création du module public Clients et remplacement des accès directs dispersés pour l'authentification, le profil et l'administration.
- Déplacement de la création, des transitions, des projections restaurateur/client/admin et du support dans Orders ; les acteurs restaurant, client, livraison et système ont des droits de transition explicites.
- Déplacement du ledger et des lectures métier dans Commissions. Les règlements manuels et Paystack partagent la même réservation puis la même allocation FIFO transactionnelle.
- Alignement des lectures Transactions et Deliveries sur les surfaces publiques Orders, Clients et Commissions ; suppression des anciennes mutations directes d'affectation de livreur sans appelant.
- Ajout des projections recalculables client, restaurant et plat, et d'une vue de santé couvrant montants, paiements, commissions, cycle de vie, preuve de livraison et espèces.
- Déplacement des compositions UI dans `presentation/` des domaines propriétaires.

## Migration et diagnostic

`drizzle/migrations/0042_order_chain_reconciliation.sql` ajoute :

- l'état et les motifs de réconciliation sur `commandes` ;
- `client_order_projections`, `restaurant_order_projections` et `dish_order_projections` ;
- `restaurant_order_chain_health` ;
- `refresh_restaurant_order_reconciliation()` et le marquage initial de l'historique.

La migration a été appliquée sur la base Neon de développement autorisée. Le diagnostic en lecture seule du 9 septembre 2026 trouve 37 commandes : 1 complète et 36 historiques explicitement incomplètes. Les motifs observés sont 34 commissions absentes, 10 incohérences de collecte d'espèces, 10 incohérences de fin de livraison, 2 modes de collecte de commission incohérents, 2 paiements absents et 2 transactions absentes. La dérive des anciens compteurs concerne 3 clients, 2 restaurants et 8 plats ; les lectures produit utilisent maintenant les projections recalculables.

## Composants réutilisés

La résolution obligatoire a interrogé beUI avant shadcn/ui. Les écrans réutilisent les composants beUI déjà installés `Input`, `Select`, `Table`, `Tabs`, `StatefulButton` et `CenterMorphModal`, avec les primitives shadcn pour boutons, alertes, cartes, dialogues et le shell dashboard existant. Les blocs shadcn `dashboard-01`, `data-table-demo` et `login-04` ont été examinés ; aucun remplacement complet n'était préférable au shell installé et au flux d'authentification téléphone. La timeline de commande existante reste une composition métier Orders. Aucune dépendance ni registre supplémentaire n'a été ajouté.

La checklist du registre a vérifié les imports, les dépendances, les images, l'accessibilité statique, ESLint, TypeScript et le build. Aucun MCP Playwright dédié n'était exposé dans cette session.

## Validations

- `npm run typecheck` : réussi.
- `npm run lint` : réussi.
- `npm run test:phase9` : 4 fichiers, 48 tests réussis.
- `npm run test:phase9:db` : 3 tests transactionnels réussis sur Neon avec nettoyage.
- `npm run architecture:check` : 5 fichiers et 18 tests réussis ; 740 modules et 2 361 dépendances analysés, aucune nouvelle violation.
- Suite complète en série : 87 fichiers réussis, 17 ignorés ; 407 tests réussis, 67 ignorés.
- `npm run db:migrate` : migration `0042` appliquée.
- `npm run orders:reconcile` : diagnostic en lecture seule réussi.
- `npm run build` : réussi ; les routes restaurateur authentifiées sont rendues à la requête.
- `git diff --check` : réussi.

## Décisions et état de sortie

- L'historique incomplet reste visible et explicite ; aucun paiement, commission, preuve ou collecte d'espèces n'est inventé par un backfill.
- Les anciens compteurs restent des écritures de compatibilité temporaires, mais ne sont plus des sources de vérité pour les surfaces migrées.
- Une commande en livraison ne peut être terminée par le restaurant ; sa preuve et, pour le cash, sa collecte restent sous les invariants Deliveries.
- Le règlement manuel et le règlement Paystack utilisent la même allocation FIFO de dette.
- La phase 9 est terminée. La phase 10 n'a pas été lue ni démarrée.
