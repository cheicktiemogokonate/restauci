# Phase 2 — Outillage de frontières

## Résultat

La dette d'architecture ne peut plus augmenter silencieusement. Les tests
TypeScript restent le contrôle principal ; ESLint et dependency-cruiser
appliquent en complément la matrice A3 aux imports de `src`.

Aucun fichier métier, schéma ou flux applicatif n'a été déplacé ou modifié.

## Contrôles ajoutés

- `eslint-plugin-boundaries` classe `app`, `modules`, `shared` et
  `infrastructure`, puis applique les droits par surface (`server`, `model`,
  `contracts`, `presentation`, `_internal` et fichiers privés).
- `no-restricted-imports` interdit les `_internal` étrangers et les fichiers
  de module qui ne sont pas une surface publique explicite.
- dependency-cruiser refuse les cycles, `app → DB` et les dépendances de
  couche interdites.
- Husky lance lint-staged sur les fichiers JavaScript/TypeScript modifiés puis
  `npm run architecture:check` avant un commit.
- la CI exécute dependency-cruiser en plus du lint et des tests d'architecture.

## Ratchets exacts

- `app-db-imports.json` reste la baseline principale `app → DB` : 106 arêtes
  d'import TypeScript historiques.
- `non-public-module-imports.json` contient 18 arêtes historiques vers une
  surface privée, dont 16 dans `src` et 2 dans les tests.
- `module-matrix-imports.json` contient 5 arêtes historiques entre surfaces
  pures `model`/`contracts` de modules différents.
- `.dependency-cruiser-known-violations.json` contient 121 constats exacts :
  100 arêtes `app → DB` résolues et 21 constats de surface qui peuvent se
  recouper sur une même arête. Aucun cycle existant n'a été trouvé.

Une suppression de dette reste autorisée. Une nouvelle combinaison
`(règle, source, cible)` échoue.

## Preuve négative

Le test d'architecture synthétique ajoute un import depuis
`src/app/example/page.tsx` vers
`@/modules/transactions/payment-service` et vérifie son rejet.

Une vérification ESLint sur stdin avec un module `orders` important
`@/modules/transactions/_internal/persistence` a également échoué comme
attendu, simultanément via `no-restricted-imports` et
`boundaries/dependencies`.

## Validations

- `npm run lint` : réussi.
- `npm run typecheck` : réussi.
- `npm run architecture:check` : 5 fichiers et 18 tests réussis ; 693 modules
  et 2 254 dépendances analysés, aucune nouvelle violation, 121 constats
  historiques ignorés exactement.
- `npm test` : 77 fichiers réussis, 10 ignorés ; 357 tests réussis,
  35 ignorés.
- hook pré-commit exécuté via `sh .husky/pre-commit` : réussi ; aucun fichier
  n'était indexé pour lint-staged, puis tous les contrôles d'architecture ont
  réussi.
- violation ESLint volontaire : rejetée avec 2 erreurs attendues.

`npm audit --audit-level=high` signale 5 vulnérabilités (2 hautes, 2 modérées
et 1 basse) dans des dépendances transitives préexistantes de `shadcn` et
`@react-three/drei`. Aucun des quatre outils ajoutés par cette phase n'est dans
les chemins concernés. Leur mise à jour n'est pas incluse dans cette phase.
