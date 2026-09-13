# Phase 6 — Transactions, abonnements, quotas et remboursements

## Résultat

La phase 6 unifie la finalisation des abonnements payés par Paystack et hors
ligne. Une seule commande idempotente confirme la tentative, solde
l'obligation, crée la période et ses limites, produit l'événement causal,
alimente le journal financier et notifie le partenaire dans une même
transaction. Les remboursements sont désormais des obligations financières
réelles reliées au paiement confirmé d'origine.

## Décisions appliquées

- `transactions` reste la source unique des obligations ; `payments` conserve
  l'historique des tentatives. Lorsqu'une tentative gagne, les autres tentatives
  encore en attente sont annulées.
- Le compte initiateur d'une souscription est le Partner Account dérivé de la
  session, puis conservé sur la demande et la transaction. Une garde DB vérifie
  la concordance avec la source métier.
- Les remboursements partiels sont permis, mais leur cumul non annulé ne peut
  jamais dépasser le paiement confirmé d'origine. Un remboursement de
  remboursement est interdit.
- Aucun rattachement historique n'est inféré : le diagnostic est strictement en
  lecture seule.
- Le journal d'administration expose les flux produits depuis la Phase 6 ; les
  flux historiques restent consultables par le diagnostic sans backfill non
  prouvé.

## Changements

### Finalisation et cycle de vie des abonnements

- `finalizeSubscriptionPaymentInTransaction` est l'unique commande de
  finalisation payante. Paystack et la validation administrateur hors ligne
  l'appellent avec leur acteur et leur canal propres.
- Paiement confirmé, transaction payée, période active, instantané des limites,
  événement causal, journal et notification sont atomiques et rejouables.
- Le refus, la suspension et la réactivation sont revenus dans le module
  `subscriptions`; les Server Actions ne sont plus que des adaptateurs.
- L'expiration traite les périodes actives ou suspendues et attribue la décision
  à `toutci:subscription-lifecycle`, acteur système. Le cron ne contient plus de
  règle métier.

### Journal financier et administration

- La migration `0039_financial_unification.sql` crée un journal financier
  contraint et append-only pour les confirmations et obligations de
  remboursement. Un mode de maintenance transactionnel explicite permet les
  nettoyages contrôlés des tests.
- Les références de règlements hors ligne sont conservées sur la tentative de
  paiement elle-même.
- L'onglet Finances de l'administration affiche montant, canal, fournisseur,
  moyen, référence, date, source, Partner Account et droit d'abonnement créé.
- La page Abonnements ne lit plus Drizzle directement ; ses lectures passent
  par les surfaces serveur des modules propriétaires.

### Remboursements et diagnostic

- Une transaction `remboursement` référence le paiement d'origine, possède une
  clé d'idempotence et reste sur le Partner Account d'origine.
- Des gardes DB empêchent les croisements de comptes, les remboursements d'un
  paiement non confirmé et les cumuls supérieurs au montant d'origine.
- Le signal Support ne repose plus sur un zéro fictif : il compte les
  obligations de remboursement non annulées et retrouve leurs commandes
  d'origine.
- `finance:diagnose` inspecte en lecture seule le paiement de 25 000 FCFA et les
  incohérences de propriété, de paiement, de période et de remboursement.

## Validation

- `npm run db:migrate` : migration `0039` appliquée sur la Neon de
  développement/test désignée.
- `npm run typecheck` : réussi.
- `npm run lint` : réussi.
- `npm run architecture:check` : 5 fichiers et 18 tests réussis ; 718 modules
  et 2 315 dépendances analysés, aucune nouvelle violation.
- `npm run test:phase6` : 4 fichiers et 19 tests réussis.
- `npm run test:phase6:db` : 5 scénarios réussis sur Neon, dont le vrai point
  d'entrée Paystack, le hors-ligne, l'idempotence, le cloisonnement, le
  remboursement et l'expiration système.
- Régression DB Transactions/Paystack : 2 fichiers et 13 tests réussis.
- `npm test` : 84 fichiers réussis, 14 ignorés ; 387 tests réussis, 56 ignorés.
- `npm run finance:diagnose` : le paiement de 25 000 FCFA est cohérent et les
  neuf contrôles d'anomalies sont à zéro ; aucune écriture n'a été effectuée.
- Audit du registre UI : imports et dépendances existantes vérifiés ; lint et
  TypeScript réussis. La vérification navigateur n'a pas été lancée, selon la
  demande explicite de l'utilisateur.
- `npm run build` : compilation et TypeScript réussis, puis échec du prérendu de
  `/restaurateur` sur `PartnerAuthorizationError: Session partenaire requise`,
  blocage antérieur de Phase 4 laissé intact.
- `git diff --check` : réussi.

## Point de contrôle

La sortie fonctionnelle de la phase 6 est atteinte : les paiements en ligne et
hors ligne produisent le même état et aucun droit ne traverse un autre compte.
La Phase 7 — Restaurants et Menu — n'est pas démarrée et requiert une nouvelle
autorisation explicite.
