# Phase 1 — Filet de sécurité et données de test isolées

## Résultat

La phase 1 est terminée. La base désignée par la `DATABASE_URL` courante est la
Neon de développement/test du projet. Les tests DB peuvent l'utiliser sans
demander une seconde `DATABASE_URL_TEST`, avec refus explicite des
environnements marqués production.

Aucune migration de schéma ni correction durable de données n'a été appliquée
pendant cette phase. Les écritures de test sont identifiées par scénario et
annulées ou nettoyées dans l'ordre relationnel.

## Filet de sécurité livré

- `scripts/test-data/run-phase1-db-tests.mjs` valide la cible, active les
  garde-fous et isole les suites dans des processus séquentiels ; une suite
  précise peut être rejouée avec `--suite=<nom>`.
- `tests/phase1-db-characterization.test.ts` crée des fixtures portant un
  identifiant de run, les supprime enfants avant parents et vérifie qu'aucune
  adresse `phase1.characterization.%@test.invalid` ne subsiste.
- `scripts/test-data/cleanup-interrupted-phase1-run.mjs` ne nettoie que les
  fixtures legacy connues après une date UTC exacte et exige la confirmation
  de la cible de développement/test.
- `scripts/test-data/capture-phase1-anomalies.mjs` produit seulement des
  agrégats anonymisés, sans identifiant ni donnée personnelle.
- Les connexions des suites longues sont bornées, préchauffées et ne rejouent
  que les erreurs transitoires de transport Neon.

## Couverture de caractérisation et d'intégration

Les sept suites représentent 32 scénarios DB :

| Suite | Scénarios | Résultat |
|---|---:|---|
| Caractérisation comptes/Résidences | 5 | réussi |
| Invariants A15 commandes/commissions | 9 | réussi |
| Concurrence abonnements | 2 | réussi |
| Transactions | 8 | réussi |
| Paystack | 5 | réussi |
| Marchés de service | 2 | réussi |
| Livraison | 1 | réussi |

Les scénarios ajoutés couvrent notamment l'activité immuable, le refus d'une
Résidence pour un compte Restaurant, l'isolation entre deux comptes Résidence,
les unicités compte/utilisateur et Restaurant/compte, et la règle de quota :
seules les Résidences candidates à la publication et à la visibilité
consomment une place.

Chaque suite a réussi dans une exécution isolée. L'enchaînement complet en une
seule session prolongée a subi des réinitialisations/temps d'attente de
connexion du palier Neon gratuit. Le runner lance donc chaque suite dans son
propre processus et permet leur reprise ciblée ; aucun échec d'invariant métier
n'a été observé. Une dernière vérification de nettoyage après l'interruption a
retourné `cleanedUsers: 0`.

## Snapshot anonymisé

Le fichier `docs/audits/phase-1-anomaly-snapshot.json` fige les volumes de
référence et les anomalies historiques sans exposer de ligne individuelle. Il
servira à comparer les futurs scripts de réconciliation. Il ne constitue pas
une autorisation de corriger ces anomalies dans cette phase.

## Sauvegarde et restauration

Le runbook `docs/runbooks/MIGRATION_TEST_DATABASE.md` consigne la décision sur
la base Neon, les garde-fous de fixture, la sauvegarde préalable obligatoire
pour toute future phase mutante, le rollback et les critères de restauration.
Une phase qui modifie durablement le schéma ou les données devra s'arrêter avant
l'écriture si aucun point de restauration Neon vérifiable ne peut être créé.

## Point de contrôle

- Phase 1 terminée ; phase 2 non commencée.
- Aucun résidu de la dernière exécution interrompue.
- Aucun changement durable du schéma ou des données métier.
- L'instabilité de transport Neon reste une contrainte d'infrastructure connue ;
  les suites isolées sont la preuve de validation retenue.

## Validations finales

- `npm run typecheck` : réussi.
- `npm run lint` : réussi.
- `npm run test:architecture` : 4 fichiers et 15 tests réussis.
- `npm run test` : 76 fichiers et 354 tests réussis ; 10 fichiers et 35 tests
  DB conditionnels ignorés hors environnement dédié.
- `git diff --check` : réussi.
- Syntaxe des trois scripts `scripts/test-data/*.mjs` de la phase : réussie.
