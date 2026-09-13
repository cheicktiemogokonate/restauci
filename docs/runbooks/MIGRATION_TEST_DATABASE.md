# Migration Toutci — base Neon de développement/test

## Décision persistante

La `DATABASE_URL` actuellement configurée dans `.env.local` pointe vers la base
Neon de développement/test du projet. Tobias a explicitement décidé le
4 septembre 2026 que cette base n'est pas et ne deviendra pas la production.
Elle est donc la cible autorisée des fixtures, tests d'intégration et migrations
de ce chantier. Ne plus demander une `DATABASE_URL_TEST` séparée tant que cette
décision n'est pas révoquée.

Cette autorisation ne permet jamais de viser un environnement marqué
`NODE_ENV=production` ou `VERCEL_ENV=production`.

## Garde-fous des tests Phase 1

- Lancer `npm run test:phase1:db` ; le runner charge `.env.local` et refuse une
  cible non-Neon ou marquée production.
- Les suites DB s'exécutent séquentiellement avec un seul worker.
- Les nouvelles fixtures portent `phase1.<scénario>.<run-id>@test.invalid` et
  `[phase1:<scénario>]` dans leurs libellés.
- Chaque suite annule sa transaction ou supprime ses relations enfants avant
  les parents dans `afterAll`.
- Un échec de nettoyage est un échec de test. Ne jamais élargir un `DELETE` à
  des lignes sans préfixe/identifiant de scénario.
- Le snapshot d'anomalies ne contient que des agrégats et aucune donnée
  personnelle : `npm run audit:phase1:anomalies`.

## Sauvegarde avant une phase avec migration ou réconciliation

La Phase 1 n'altère durablement ni le schéma ni les données : ses écritures sont
nettoyées. Avant toute phase ultérieure qui applique une migration ou corrige
des données :

1. noter le SHA Git, la migration Drizzle courante et l'heure UTC ;
2. créer un point de restauration Neon (branche ou snapshot disponible pour le
   projet) avant l'écriture ;
3. capturer le snapshot anonymisé des invariants et anomalies ;
4. exécuter la migration sur la base désignée ;
5. exécuter les tests d'architecture, d'intégration DB et les requêtes de
   réconciliation ;
6. conserver dans le rapport de phase l'identifiant du point de restauration et
   les comptages avant/après.

Si l'outillage Neon ne permet pas le point de restauration attendu, la phase
mutante s'arrête avant la migration. Il ne faut pas improviser une copie
partielle de tables comme sauvegarde complète.

## Rollback

- Code uniquement : revenir au commit/patch de la phase sans toucher aux autres
  changements du worktree.
- Migration non destructive : appliquer uniquement la migration inverse revue
  et testée, puis relancer les invariants.
- Migration destructive ou réconciliation incorrecte : restaurer le point Neon
  créé avant la phase, remplacer la chaîne de connexion de développement/test,
  puis vérifier les agrégats du snapshot.
- Fixture interrompue : supprimer seulement les identifiants portant le run-id
  concerné, enfants avant parents, puis relancer la suite Phase 1.

## Critères de restauration réussie

- le schéma attendu par Drizzle est présent ;
- les agrégats financiers et de cardinalité correspondent au snapshot attendu ;
- aucune fixture `phase1.%@test.invalid` ne subsiste ;
- typecheck, lint, architecture et tests d'intégration DB passent ;
- aucune donnée d'un autre scénario n'a été supprimée.
