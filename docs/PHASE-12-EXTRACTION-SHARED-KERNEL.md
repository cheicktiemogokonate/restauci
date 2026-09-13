# Phase 12 — Extraction du shared kernel et extinction de `src/lib`

## Résultat

La séparation physique A3 est achevée : `src/lib` a été supprimé, `app` ne
dépend plus directement de Drizzle ni de `infrastructure/db`, et le graphe de
dépendances ne contient plus aucune violation connue ou réelle.

Cette phase ne modifie ni les tables, ni les migrations, ni les données en base.

## Changements réalisés

### Shared kernel et infrastructure

- Les primitives pures de formatage, monnaie, géographie, sécurité et
  interaction vivent désormais sous `src/shared`.
- La DB, le cache, l'environnement, le logging, le rate limiting, les jetons,
  la révocation, le realtime, le stockage R2 et le géocodage vivent sous
  `src/infrastructure`.
- Le schéma Drizzle canonique est `src/infrastructure/db/schema.ts`; les outils
  Drizzle, le seed et les scripts de maintenance pointent vers cette racine.
- Les derniers bridges Auth/Notifications/Audit/Commissions et les deux bridges
  Infrastructure/Auth ont été supprimés.

### Propriétaires métier

- Auth possède les credentials et l'identité active ; Partners possède les
  comptes partenaires et leur administration.
- Subscriptions possède le plan effectif et les transitions ; Restaurants
  possède les projections du dashboard ; Orders possède l'unique machine de
  transition ; Notifications possède persistance et transports.
- Le module `payments` porte l'orchestration Paystack et les retours de paiement.
  `transactions` reste provider-agnostic, ce qui évite les cycles avec Orders,
  Commissions, Subscriptions et Residences.
- Les contrats partagés entre plusieurs domaines ont été rendus structurels ou
  descendus dans `shared`; aucun `model.ts` ou `contracts.ts` ne dépend d'une
  surface métier étrangère interdite.

### Adaptateurs et présentation

- Les Server Actions historiques ont été déplacées sous `src/app/_actions` et
  ne contiennent plus que l'authentification, l'appel canonique et la
  revalidation Next.js.
- Les actions nécessaires aux composants client de domaine sont injectées
  depuis les pages, conformément au passage de fonctions `use server` documenté
  par Next.js.
- Les quelques compositions client transverses Restaurant/Résidence/Livraison
  vivent dans le shell `src/components/client-app`; les modules ne s'importent
  plus mutuellement par leurs présentations.

## Frontières et baselines

- La baseline `app -> DB` est supprimée et la règle est absolue.
- Les baselines de surfaces privées et de matrice inter-modules sont supprimées.
- `.dependency-cruiser-known-violations.json` est vide.
- `tests/phase12-shared-kernel.test.ts` verrouille l'absence de `src/lib`, des
  imports `@/lib`, des imports DB depuis `app` et des baselines migratoires.

## Validations

- `npm run test:phase12` : 1 fichier, 5 tests réussis.
- `npm run architecture:check` : 5 fichiers, 17 tests réussis ; 726 modules et
  2 342 dépendances analysés, aucune violation.
- `npm run typecheck` : réussi.
- `npm run lint` : réussi, sans avertissement.
- Suite complète en série : 88 fichiers réussis, 18 ignorés ; 415 tests
  réussis, 70 ignorés.
- `npm run build` : réussi, 83 pages statiques générées ; avertissement local
  non bloquant sur la région par défaut du client de queue.
- `git diff --check` : réussi.
- Aucun navigateur n'a été lancé, conformément à la préférence du projet.

## Décisions et blocages

- Un module d'orchestration `payments` distinct a été retenu pour conserver
  `transactions` indépendant des fournisseurs et empêcher un cycle métier.
- Les Server Actions restent des adaptateurs `app`; les composants de domaine
  reçoivent ces fonctions par propriétés au lieu d'importer `app`.
- Les documents d'audit des phases antérieures restent des photographies
  historiques et ne sont pas réécrits pour masquer leurs anciens chemins.
- Aucun blocage restant pour la Phase 12.

## Point d'arrêt

La Phase 12 est terminée. La prochaine étape est la **Phase 13 — Enforcement
bloquant et documentation canonique**. Elle n'est pas démarrée et exige une
nouvelle autorisation explicite.
