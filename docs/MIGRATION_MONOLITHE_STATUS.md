# Toutci — État synthétique de la migration

> Fichier de reprise entre deux discussions. Il doit rester court et représenter
> uniquement l'état courant. Après chaque phase, remplacer les sections devenues
> obsolètes au lieu d'accumuler un journal détaillé.

## Références

- Plan directeur : `docs/PLAN_MONOLITHE_MODULAIRE_COHERENCE_METIER_2026-09-04.md`
- Architecture canonique : `ARCHITECTURE.md`
- Authentification à préserver : `docs/architecture-auth.md`
- Référentiel causal : `docs/TOUTCI_RELATIONS_METIER_2026-09-04.md`

## État courant

- **Dernière mise à jour :** 13 septembre 2026
- **Dernière étape terminée :** validation du lot de clôture destiné à
  synchroniser `main` et Vercel Production après la Phase 14
- **Phase courante :** aucune ; pilote contrôlé TEST ouvert
- **Verdict courant :** pilote TEST prêt, validations locales complètes vertes ;
  lot de clôture autorisé pour publication sur Git et Vercel Production ; aucune
  phase suivante ouverte
- **Autorisation consommée :** validation automatisée, remise en conformité du
  pilote TEST et synchronisation du code par Git/Vercel
- **Code / DB modifiés par la Phase 14 :** migrations `0044` à `0048`
  appliquées à la base Neon déclarée non-production. `DATABASE_URL_TEST` et
  `.env.local` utilisent des identifiants distincts mais le même endpoint et la
  même base Neon ; ne plus qualifier cette cible d'isolée.

## Acquis à ne pas rediscuter sans demande explicite

- Un Partner Account porte une seule activité immuable.
- Un compte Restaurant gère un seul Restaurant autonome.
- Un compte Résidence gère plusieurs Résidences ; seules celles publiées et
  visibles consomment son quota, les brouillons et non-visibles n'en consomment pas.
- Abonnement, KYC et paiements appartiennent au Partner Account exact.
- Le schéma Drizzle reste central pendant la résorption de `app → DB`.
- Les modules exposent des surfaces A3 explicites sans barrel `index.ts` racine.
- Les Résidences d'un même compte partagent un profil de versement en V1.
- Une destination de versement appartient au Partner Account, est créée après
  validation KYC à partir d'un compte bancaire ou Mobile Money, et ne conserve
  que les quatre derniers caractères du numéro dans Toutci.
- Les paiements de commandes Restaurant et réservations Résidence utilisent le
  split du Partner Account ; les abonnements sont encaissés à 100 % par Toutci.
- Un numéro de carte Visa/Mastercard, CVV, PIN ou code secret n'est jamais une
  destination de versement acceptée.
- Aucun droit ni paiement ne se synchronise entre deux comptes distincts.
- Toute action critique doit avoir une transaction, une trace corrélée et des
  conséquences vérifiables.
- Aucune simulation métier ne doit être accessible dans le produit.
- Toute création durable de fixtures exige une confirmation explicite et
  `TOUTCI_DATA_ENVIRONMENT=development|test` ; un environnement marqué
  production est refusé.
- Le comportement d'authentification documenté ne doit pas changer pendant la migration.
- La refonte de toutes les interfaces est autorisée et requise pendant la
  migration de leur domaine ; l'UI actuelle n'est pas une cible visuelle.
- Toute UI applicative suit `app-components-registry` : beUI d'abord,
  shadcn/ui ensuite, avec le bloc dashboard shadcn/ui pour les dashboards.
- Les primitives et règles visuelles sont partagées ; les compositions métier
  restent dans la surface `presentation/` de leur module propriétaire.
- La `DATABASE_URL` Neon courante est la base de développement/test autorisée.
  Ne plus demander une `DATABASE_URL_TEST` distincte tant que cette décision
  n'est pas explicitement révoquée ; un environnement marqué production reste
  toujours interdit aux tests et migrations de développement.
- Audit et événements sont conservés cinq ans, l'outbox réussie trente jours et
  une dead-letter résolue un an ; une dead-letter non résolue n'est jamais
  purgée automatiquement.
- Aucun payload causal ne contient de secret, jeton, document KYC, coordonnée
  personnelle ou texte libre sensible.
- Une identité vérifiée conditionne la visibilité publique de tout établissement.
- Les justificatifs KYC restent consultables dans la plateforme sans action de
  téléchargement administrateur.
- Un média public temporaire non rattaché est supprimable après 24 heures.
- Une commande historique incohérente est marquée `legacy_incomplete` avec ses
  motifs ; un backfill ne fabrique jamais une transaction, un paiement, une
  commission, une preuve de livraison ou une collecte d'espèces.

## Résultats courants du pilote contrôlé

1. Le pilote `phase14-controlled-test-2026-09-13` est ouvert sur la base TEST
   avec une cohorte interne et des jeux de données explicitement identifiés.
2. Un passage Playwright complet a réussi en une exécution : 14 scénarios verts
   et 4 scénarios spéciaux ignorés intentionnellement, déjà prouvés séparément
   pour Paystack TEST réel et KYC inline pendant la Phase 14.
3. Le seed E2E a temporairement remplacé la Résidence et son payout ; la commande
   canonique d'ouverture a restauré le pilote à 16/16 contrôles, sans nouvel
   encaissement fournisseur.
4. La santé de l'artefact standalone est `healthy` (base et cache `up`) ; la
   causalité compte 181 effets terminés, sans anomalie ni dead-letter, et les
   médias E2E orphelins ont été nettoyés par les mécanismes canoniques.
5. Qualité, 428 tests, build de 83 pages et audit npm à zéro vulnérabilité sont
   verts ; aucun contrôle local ne bloque la préparation Git/Vercel.

## Fichiers principaux

- `docs/PHASE-14-RECONCILIATION-PILOTE.md`
- `docs/PILOTE_CONTROLE_TEST.md`
- `scripts/pilot/controlled-test.ts`
- `scripts/copy-maplibre-worker.mjs`
- `eslint.config.mjs`
- `drizzle/migrations/0044_notification_projection_retirement.sql`
- `drizzle/migrations/0045_order_reconciliation_legacy_guard.sql`
- `drizzle/migrations/0046_partner_payout_onboarding.sql`
- `drizzle/migrations/0047_payout_actor_ownership_guard.sql`
- `drizzle/migrations/0048_payout_actor_existing_audit.sql`
- `src/modules/transactions/_internal/provider-accounts.ts`
- `src/modules/transactions/server.ts`
- `src/modules/residences/_internal/payment-lifecycle.ts`
- `src/modules/transactions/presentation/payout-destination-card.tsx`
- `e2e/kyc-inline.spec.ts`, `e2e/paystack-live.spec.ts` et
  `e2e/residences.spec.ts`
- `scripts/causality/reconcile.ts` et `scripts/media/reconcile.ts`

## Validations

- `npm run pilot:check:test` final : statut `ready`, 16/16 invariants satisfaits ;
  49 migrations, deux destinations Wave TEST actives, aucune anomalie payout,
  outbox ouverte ou dead-letter.
- Typecheck et lint : réussis sans avertissement. Architecture : 5 fichiers /
  18 tests, 747 modules et 2 405 dépendances sans violation.
- Suite complète : 90 fichiers réussis, 19 ignorés ; 428 tests réussis,
  74 ignorés. Ciblage payout : 3 fichiers / 17 tests réussis.
- Build final Next.js 16.3.5 réussi : compilation, typecheck et 83 pages
  statiques générées ; worker MapLibre 6 copié et empaqueté.
- DB payout Phase 14 : 4/4 assertions réussies. Migrations `0046`–`0048` et
  audit final réussis ; 49 migrations présentes, zéro invariant payout en
  défaut.
- Matrice DB historique tentée : 7 fichiers réussis sur 9 et 37 assertions
  métier réussies ; deux échecs de teardown 0044 ont été corrigés et leurs
  6 utilisateurs / 4 Partner Accounts de test supprimés transactionnellement.
- E2E standard post-ouverture : un passage complet en 11,4 minutes, 14 scénarios
  réussis et 4 ignorés intentionnellement ; Paystack réel et KYC inline restent
  couverts par leurs preuves dédiées réussies de Phase 14.
- Santé de l'artefact standalone : public `200 ok`, interne `200 healthy`, base
  et cache `up`.
- Causalité finale : 181 effets terminés, 0 anomalie et 0 dead-letter. Les cinq
  notifications et quatre médias devenus orphelins par le reset E2E ont été
  confirmés comme fixtures TEST puis nettoyés par les commandes canoniques.
- Audit des dépendances de production : 0 vulnérabilité.
- `git diff --check` réussi.

## Décisions, blocages et action requise

- Toute nouvelle dépendance inter-module exige une décision d'architecture,
  sa déclaration dans `.dependency-cruiser.cjs` et la mise à jour simultanée
  de `ARCHITECTURE.md`.
- `npm run ci:quality` est la porte de qualité canonique ; aucune baseline ou
  violation connue ne peut être réintroduite pour contourner un échec.
- Les Server Actions restent dans `app` et sont injectées aux Client Components
  de domaine ; aucun module ne dépend d'un adaptateur `app`.
- Aucun navigateur ne doit être ouvert sans autorisation explicite dans le
  message courant ; cette préférence est persistée dans `AGENTS.md`.
- La Phase 14 reste close. Le pilote contrôlé et ses données restent en TEST ;
  l'autorisation de publication concerne le code validé, pas la copie de cette
  cohorte ni de ses données vers la production.
- Le passage à MapLibre 6 adopte son exigence WebGL2 et son chargement ESM ; le
  worker et son module partagé sont copiés avant `dev` et `build` conformément
  à l'intégration Next.js recommandée.
- La matrice historique ne doit pas être rejouée comme moyen de rouvrir les
  phases 4 à 10.
- Si elle n'a pas déjà été faite, confirmer la rotation du secret Neon exposé
  lors de la Phase 3 et maintenir `.env.local` à jour.
- Les propriétaires finaux de `promotions`, `avis` et des bénéfices
  d'exposition restent à décider avant les phases qui les migrent.
- Le passage automatisé post-ouverture est vert ; aucun suivi périodique n'est
  requis pour établir ce verdict ponctuel. Le contrôle `pilot:check:test` reste
  le diagnostic à exécuter après toute future mutation de la cohorte TEST.
- Prochaine étape hors migration : exploitation normale et observation du
  déploiement Vercel associé au lot de clôture. Ne pas ouvrir de phase suivante ;
  tout futur déploiement exige sa propre demande explicite.

## Règle de reprise

Au début d'une nouvelle discussion :

1. lire ce fichier ;
2. lire uniquement la section de la phase courante dans le plan directeur ;
3. lire ensuite seulement les fichiers nécessaires à cette phase ;
4. ne pas refaire les phases terminées ;
5. exécuter une seule phase et s'arrêter au point de contrôle.

Si une décision humaine requise n'est pas consignée ici, ne pas l'inventer.

## Mise à jour obligatoire en fin de phase

Remplacer dans ce fichier :

- la dernière phase terminée et la prochaine phase ;
- le résultat concret en cinq points maximum ;
- les fichiers ou migrations principaux ;
- les validations exécutées et leurs résultats ;
- les décisions prises, blocages et actions utilisateur nécessaires.

Conserver les détails complets dans le rapport de la phase, pas dans ce fichier.
Ne jamais démarrer automatiquement la phase suivante.

## Mini-prompt de reprise

> Reprends la migration Toutci depuis `docs/MIGRATION_MONOLITHE_STATUS.md`. Lis seulement la phase courante du plan référencé et les fichiers nécessaires. Ce message autorise uniquement cette phase : ne refais aucune phase terminée et n'enchaîne pas. Si une décision manque, demande-la. À la fin, lance les validations prévues, actualise le statut synthétique et rends un bref compte rendu : résultat, changements, tests, décisions ou blocages, prochaine phase.
