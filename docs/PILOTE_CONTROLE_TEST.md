# Toutci — Pilote contrôlé TEST

## Statut

- **Identifiant :** `phase14-controlled-test-2026-09-13`
- **Ouverture :** 13 septembre 2026
- **État :** ouvert sur la base déclarée TEST
- **Portée :** cohorte interne contrôlée uniquement ; ce statut n'autorise pas
  une exposition publique ni un passage en production.

## Cohorte et données identifiées

- Administrateur : `Administrateur E2E`
- Partenaires : `Restaurateur E2E` et `Propriétaire Résidence E2E`
- Client : `Client E2E`
- Livreur : `Livreur E2E`
- Restaurant : `restaurant-e2e-restauci`
- Résidence : `residence-paystack-phase-14`
- Versements : deux destinations Wave Paystack TEST actives, suffixe `0000`.

Toutci ne conserve ni le numéro Mobile Money complet ni une référence
fournisseur dans ce document. La fausse destination historique
`ACCT_E2ERESIDENCE` a été supprimée avant l'ouverture.

## Ouverture exécutée

La commande d'ouverture a préparé la Résidence déterministe, créé ou réutilisé
les subaccounts Paystack TEST par la commande métier canonique, puis vidé
l'outbox. Elle refuse une base déclarée production et toute clé Paystack qui ne
commence pas par `sk_test_`.

Le pilote a été ouvert sans nouveau paiement : le paiement TEST Résidence de
135 000 FCFA validé pendant la Phase 14 fournit déjà la preuve du split complet.
Créer une transaction supplémentaire n'était donc pas nécessaire pour établir
l'état initial du pilote.

## Commandes opératoires

```bash
# Contrôle en lecture seule ; commande habituelle de suivi.
npm run pilot:check:test

# Ouverture ou remise en conformité idempotente, TEST uniquement.
npm run pilot:open:test
```

Le contrôle est réussi seulement si les 16 invariants sont satisfaits : 49
migrations, cinq acteurs prêts, KYC et données publiques prêts, deux profils de
versement TEST prêts, aucun payout live actif non vérifié, aucun acteur payout
incohérent, aucune outbox ouverte et aucune dead-letter.

## Conditions d'arrêt

Suspendre le pilote et diagnostiquer avant toute nouvelle transaction si l'un
des cas suivants apparaît :

- `/api/health` ne répond plus `healthy`, ou la base/le cache est indisponible ;
- le contrôle pilote retourne `blocked` ou une liste `failures` non vide ;
- une outbox reste ouverte, une dead-letter apparaît ou la réconciliation
  causale détecte une anomalie ;
- un payout live non vérifié ou une incohérence d'acteur est détecté ;
- l'environnement fournisseur ou de données n'est plus explicitement TEST.

## État vérifié à l'ouverture

- Contrôle pilote : 16/16 invariants satisfaits.
- Santé compilée : API publique `200 ok`, contrôle interne `200 healthy`, base
  et cache `up`.
- Causalité : 157 effets terminés, 0 anomalie, 0 retry et 0 dead-letter.
- Dépendances de production : audit npm à 0 vulnérabilité après mise à jour de
  Next.js, Sharp et MapLibre.
- Qualité, suite complète et build : réussis.

La prochaine action est l'observation et l'exploitation de cette cohorte TEST.
Elle n'ouvre aucune nouvelle phase de migration.
