# Phase 4 — Partners, Auth et modèle de compte

## Résultat

Le contrat mono-activité est désormais porté par Partners, utilisé par les
adaptateurs authentifiés et protégé en base. Un compte Restaurant ne peut avoir
qu'un Restaurant et aucune Résidence ; un compte Résidence peut avoir plusieurs
Résidences et aucun Restaurant. L'administration projette les deux verticales
sans interpréter l'absence d'un Restaurant comme une anomalie Résidence.

Cette phase ne modifie ni les cookies, ni le format ou la durée des JWT, ni les
refresh tokens, ni les protections de `src/proxy.ts`.

## Contrat Partners et session

- `PARTNER_ACTIVITY_TYPES` est la définition runtime unique de
  `restaurant | residence` et alimente le schéma Drizzle.
- `PartnerAccountDTO` remplace l'exposition d'un row Drizzle sur la façade.
- `requirePartnerAccount()`, `requirePartnerActivity()` et
  `requireCurrentPartnerContext()` dérivent toujours l'utilisateur et le compte
  de la session serveur.
- Le choix d'activité authentifié passe par
  `chooseCurrentPartnerActivity()` ; il reste idempotent pour la même activité
  et refuse tout changement.
- Les anciens fichiers `src/lib/auth/partner-account*.ts` ne sont plus que des
  bridges A3 sans logique métier.

## Cardinalités et commandes

- La création Restaurant appartient désormais à `modules/restaurants` et
  vérifie l'activité du Partner Account avant toute écriture.
- La garde Résidence lit le compte via la façade Partners.
- La contrainte unique Restaurant/Partner Account reste la protection de
  concurrence du second Restaurant.
- La migration `0037_partner_account_invariants.sql` ajoute des triggers qui
  refusent : mutation de l'activité, Partner Account appartenant à un admin,
  changement invalide du rôle propriétaire et rattachement d'une entité au
  mauvais vertical.

## Quota Résidence

`consumesResidencePublicationQuota()` est le prédicat canonique. Une place est
consommée uniquement si la Résidence :

- demande la publication et est explicitement publiée ;
- est validée et non suspendue ;
- appartient à un propriétaire KYC vérifié ;
- se trouve dans une destination éligible.

Les brouillons, éléments retirés, suspendus, non validés, non éligibles ou
archivés ne consomment pas le quota. Le verrou transactionnel du Partner Account
reste utilisé lors de la publication pour empêcher un dépassement concurrent.

## Comptes et accès

La projection partenaire est discriminée en trois états explicites :

- activité non encore choisie ;
- `{ activityType: "restaurant", restaurant }` ;
- `{ activityType: "residence", residenceAccount: { residences, quota } }`.

La table affiche le type d'activité, l'entité ou la collection correspondante,
le nombre de Résidences visibles, le quota, l'offre effective et l'échéance. Les
absences sont nommées « Restaurant non encore créé » ou « Aucune résidence
créée ». L'interface réutilise la table beUI déjà installée et les primitives de
statut existantes ; aucune dépendance UI n'a été ajoutée.

## Réconciliation

Le contrôle initial a trouvé un Partner Account vide rattaché à un
administrateur. Après autorisation explicite de l'utilisateur, la migration a
supprimé uniquement cette ligne ; l'utilisateur administrateur a été conservé.
Une clé étrangère `RESTRICT` aurait annulé la migration si le compte avait eu
une dépendance métier.

Les états d'onboarding ont été conservés sans inventer d'activité ou d'entité :

- 2 partenaires attendent encore leur choix d'activité ;
- 2 comptes Restaurant attendent la création du Restaurant ;
- 1 compte Résidence ne contient encore aucune Résidence.

`npm run partners:reconcile` ne trouve plus aucun compte possédé par un
non-partenaire, aucun croisement de verticale et aucun compte Restaurant avec
plusieurs Restaurants.

## Fichiers principaux

- `drizzle/migrations/0037_partner_account_invariants.sql`
- `src/modules/partners/`
- `src/modules/restaurants/_internal/create.ts`
- `src/modules/residences/model.ts`
- `src/app/(dashboard)/admin/users/page.tsx`
- `src/components/admin/users-admin-table.tsx`
- `scripts/partners/reconcile.ts`
- `tests/phase4-partner-accounts-db.test.ts`

## Validations exécutées

- `npm run db:migrate` : migration `0037` appliquée sur la Neon de
  développement/test.
- `npm run typecheck` : réussi.
- `npm run lint` : réussi.
- `npm run architecture:check` : 5 fichiers et 18 tests réussis ; 710 modules
  et 2 294 dépendances analysés, aucune nouvelle violation.
- `npm run test` : 81 fichiers réussis, 12 ignorés ; 380 tests réussis,
  48 ignorés.
- `npm run test:phase4:db` : 6 scénarios réussis couvrant projection,
  cardinalité, verticales, rôle propriétaire, immutabilité et isolation.
- `npm run partners:reconcile` : zéro anomalie ; états d'onboarding conservés.
- `git diff --check` : réussi.

Deux coupures TLS Neon transitoires ont eu lieu pendant les premières
validations. Les lectures de projection, le test d'intégration et l'outil de
réconciliation utilisent maintenant un retry borné. Une fixture laissée par la
première coupure a été identifiée par son marqueur de test puis supprimée.

## Point de contrôle

La Phase 4 est terminée. La prochaine phase est la Phase 5 — Identity et Media.
Elle n'est ni lue ni démarrée ici et requiert une autorisation explicite.
