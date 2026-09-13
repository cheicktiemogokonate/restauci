# Phase 13 — Enforcement bloquant et documentation canonique

## Résultat

La Phase 13 ferme les mécanismes qui permettaient encore d'admettre ou de
réintroduire silencieusement une dette d'architecture. Les contrôles sont
bloquants localement et en CI, le graphe autorisé correspond au code courant et
la documentation explique les extensions canoniques du monolithe.

Aucun schéma, aucune migration et aucune donnée en base n'ont été modifiés.

## Enforcement

- Toutes les règles Dependency Cruiser ont la sévérité `error`.
- Chaque répertoire de `src/modules` possède une allowlist explicite de modules
  cibles ; un module ajouté sans déclaration fait échouer le chargement de la
  configuration.
- Les cycles, imports privés `_internal`, surfaces non publiques, barrels
  racine, dépendances Client Component vers façade serveur/DB et dépendances
  `shared → module` restent refusés sans exception.
- Le scan TypeScript couvre désormais les extensions JavaScript et TypeScript
  supportées par le projet, y compris les barrels `.mts` et `.cts`.
- Le registre vide `.dependency-cruiser-known-violations.json`, le répertoire
  de baselines et le générateur historique de baseline ont été supprimés.

## CI et hook

`npm run ci:quality` est la porte de qualité canonique : typecheck, lint avec
zéro avertissement, architecture TypeScript, Dependency Cruiser et tests ciblés
Phase 13. La CI exécute ensuite la suite Vitest complète et le build de
production.

Le hook Husky a été exécuté avec deux violations temporaires non indexées :

1. `shared → modules/orders/server`, refusée par le test de frontières ;
2. `auth/_internal → orders/model`, refusée par l'allowlist Dependency Cruiser.

Les deux fichiers temporaires ont été supprimés. Le hook a ensuite réussi sur
l'arbre courant.

## Documentation canonique

`ARCHITECTURE.md` décrit désormais :

- les 22 modules effectivement présents ;
- la carte exacte des dépendances inter-modules autorisées ;
- la matrice des surfaces et les garde-fous automatiques ;
- le chemin canonique pour ajouter une commande, un événement causal, une
  table ou une projection.

Toute nouvelle arête inter-module doit être décidée, ajoutée dans
`.dependency-cruiser.cjs` et documentée dans `ARCHITECTURE.md` dans le même
changement.

## Fichiers principaux

- `.dependency-cruiser.cjs`
- `.github/workflows/security-ci.yml`
- `.husky/pre-commit`
- `package.json`
- `tests/architecture/engine.ts`
- `tests/architecture/rules.ts`
- `tests/architecture/rules/module-boundaries.test.ts`
- `tests/phase13-enforcement.test.ts`
- `ARCHITECTURE.md`

## Validations

- `npm run ci:quality` : réussi ; typecheck et lint sans avertissement,
  5 fichiers / 18 tests d'architecture réussis, 726 modules et 2 342
  dépendances sans violation, 1 fichier / 5 tests Phase 13 réussis.
- `npm test` : 89 fichiers réussis, 18 ignorés ; 421 tests réussis, 70 ignorés.
- `npm run build` : réussi ; 83 pages statiques générées. L'avertissement local
  connu sur la région par défaut du client de queue reste non bloquant.
- Hook négatif : refus attendu des deux violations temporaires ; hook propre :
  réussi.
- `git diff --check` : réussi.

## Sortie de phase

La sortie est atteinte : aucune violation réelle, aucun registre de dette actif
et documentation alignée sur l'architecture finale de la migration. La Phase
14 n'est pas démarrée et requiert une autorisation explicite.
