# Phase 14 — Réconciliation finale et pilote de test réel

Date du contrôle final : 13 septembre 2026
Environnement muté : base Neon déclarée développement/test, données de recette
uniquement. La connexion TEST a un identifiant distinct mais vise le même
endpoint et la même base que `.env.local` ; elle n'est pas physiquement isolée.
Sauvegarde préalable : explicitement dispensée par le propriétaire de la base.

## Verdict

**GO pour l’ouverture d’un pilote contrôlé.** Le provisionnement autonome du
sous-compte Wave XOF et un paiement Résidence Paystack TEST réel avec split ont
été confirmés de bout en bout. Les 18 scénarios E2E planifiés disposent d'une
preuve verte après correction et relance ciblée des deux scénarios en échec lors
du passage global. La causalité finale est propre, les invariants payout sont
respectés et aucune dead-letter ne subsiste. Les phases historiques ne sont pas
rouvertes et aucune phase suivante n'est ouverte.

## Changements de réconciliation

- Deux migrations additives ont été ajoutées :
  - `0044_notification_projection_retirement` retire durablement le reçu d’une
    notification supprimée avec sa cible, afin que le reconstructeur ne la
    recrée pas ;
  - `0045_order_reconciliation_legacy_guard` permet de rafraîchir les commandes
    valides sans réécrire les livraisons historiques incompatibles avec la
    contrainte géographique `NOT VALID`.
- Le worker d’outbox traite désormais au plus cinq effets simultanément. Le
  même lot qui avait produit 25 retries de connexion a ensuite traité 37/37
  effets, sans retry ni dead-letter.
- Les réparations causales élaguent d’abord les notifications orphelines, puis
  reconstruisent les projections dans un statement distinct.
- La réconciliation média sait détacher les actifs dont la cible a disparu ;
  le worker R2 a supprimé 9/9 objets de recette, sans échec.
- Le login API client ne transmet plus les options propres à l’adaptateur au
  schéma strict des identifiants métier.
- Les fixtures E2E sont explicitement bornées à `development|test`, stables et
  rejouables. Les documents KYC de preuve couvrent une image et un PDF propres.
- Les réponses KYC privées sont rendues inline avec `no-store`,
  `X-Frame-Options: SAMEORIGIN` et une CSP sandboxée ; aucun lien de
  téléchargement n’est exposé.
- `0046_partner_payout_onboarding` ajoute le provisionnement autonome d'une
  destination bancaire ou Mobile Money après KYC, avec états `pending`,
  `active` et `disabled`, distinction TEST/live et contraintes d'acteur et de
  vérification.
- `0047_payout_actor_ownership_guard` impose en base que l'acteur partenaire
  soit le propriétaire exact du Partner Account et que l'acteur de secours ait
  réellement le rôle admin.
- `0048_payout_actor_existing_audit` bloque une future application si une
  association antérieure enfreint déjà l'une de ces deux règles.
- Le Partner Account conserve la référence subaccount, l'établissement et les
  quatre derniers caractères uniquement. Le numéro complet est envoyé à
  Paystack puis oublié ; les cartes de paiement compatibles Luhn sont refusées.
- L'interface partenaire réutilise le Select beUI et les contrôles shadcn/ui.
  Elle explique que Wave, Orange Money, MTN Money, Djamo ou une banque sont
  admissibles, contrairement à un numéro de carte Visa/Mastercard.
- Le scénario Paystack live sait provisionner Wave depuis cette interface ; la
  fixture réelle conserve ensuite le subaccount au lieu de le remplacer par la
  référence factice du serveur Paystack simulé.
- La création et le passage ultérieur de `pending` à `active` produisent des
  événements causaux et une projection d'audit. L'association admin reste un
  mécanisme de secours.
- La confirmation d'une réservation Résidence produit désormais, via la
  commande canonique Transactions, une écriture de journal financier
  idempotente. L'événement de confirmation précède les notifications client et
  partenaire, qui portent sa corrélation.
- Les fixtures et assertions E2E distinguent le vrai checkout Paystack TEST du
  fournisseur simulé, conservent le subaccount réel et tolèrent explicitement
  le retour local du callback lorsque le navigateur ne suit pas la redirection.
- Le parcours livreur attend maintenant les réponses métier exactes et
  l'hydratation de l'interface avant chaque transition.
- La réserve de build causée par le lot UI `story-landing` a été levée : ses
  imports ciblent les composants locaux existants et le portail de toast
  détecte le client sans mise à jour d'état synchrone dans un effet.

## Rapport d’anomalies anonymisé

### Base TEST au contrôle final

- Causalité : 155 effets `completed`, 0 pending, 0 retry, 0 dead-letter ; les
  cinq compteurs d’anomalies sont à 0.
- Payout : 49 migrations appliquées, 0 compte live actif non vérifié et
  0 association portée par un acteur incohérent.

### Snapshot de réconciliation avant les pilotes E2E

- Médias : 0 temporaire, 0 expiré, 1 attaché valide, 0 en suppression,
  0 orphelin.
- Partenaires : 0 compte possédé par un non-partenaire, 0 croisement
  Restaurant/Résidence, 0 compte Restaurant multi-établissements. Les comptes
  sans activité encore créée sont des états d’onboarding, pas des anomalies.
- Finance : deux paiements TEST de 25 000 FCFA retrouvés, chacun avec une seule
  tentative Paystack confirmée, une transaction payée et une période
  Croissance ; les neuf contrôles financiers sont à 0.
- Commandes : 37 chaînes, dont 1 complète et 36 historiques quarantainées
  `legacy_incomplete`. Les motifs connus sont : commission absente (34),
  livraison cash incohérente (10), fin de livraison incohérente (10), mode de
  collecte commission incohérent (2), paiement absent (2), transaction absente
  (2). Seize lignes structurellement valides ont été rafraîchies. Les compteurs
  hérités divergent encore sur 2 clients, 1 restaurant et 7 plats ; aucune
  transaction, commission, preuve de livraison ou collecte n’a été fabriquée.

### Snapshot développement avant corrections Phase 14

- 15 utilisateurs, 11 comptes partenaires, 6 restaurants, 2 résidences,
  37 commandes Restaurant, 36 transactions, 36 paiements et 88 notifications.
- Les incohérences de chaînes de commandes correspondent au lot historique
  quarantainé ci-dessus. Le diagnostic financier 25 000 FCFA était déjà sans
  anomalie.

## Pilotes réels et parcours

- **Restaurant / Paystack TEST réel : réussi.** Offre Croissance à 25 000 FCFA,
  Orange Money TEST, paiement confirmé, transaction `paid`, période active,
  taux figé à 12 %, affichage partenaire cohérent et ligne active contrôlée dans
  l’administration. Les identifiants fournisseur et internes ne sont pas
  reproduits dans ce rapport.
- **Résidence / parcours produit déterministe : réussi.** Création, correction,
  validation, publication, suspension/réactivation, découverte, réservation,
  modification avant paiement, callback Paystack simulé, annulation avec
  obligation de remboursement et gestion du calendrier : 1 scénario réussi en
  4,9 minutes.
- **Provisionnement Paystack TEST réel : réussi.** Le catalogue XOF expose 32
  destinations actives, dont Wave, Orange Money, MTN Money et Djamo. Paystack a
  créé un subaccount Wave XOF actif avec `percentage_charge: 0`. Comme attendu
  dans le bac à sable, `is_verified` reste faux ; `0046` autorise cet état en
  TEST seulement et l'interdit pour un compte live actif.
- **Résidence / Paystack TEST réel avec split : réussi.** Un paiement Orange
  Money TEST de 135 000 FCFA a été approuvé avec le subaccount attendu. Paystack
  a attribué 114 750 FCFA au partenaire (85 %), 17 145 FCFA nets à
  l'intégration et 3 105 FCFA de frais fournisseur. Le paiement, la transaction
  et la réservation sont confirmés ; la commission figée est de 20 250 FCFA à
  15 %. Les vues client, partenaire et administration, le journal, les deux
  notifications, l'audit, l'événement et l'effet d'outbox ont été contrôlés.
- Le premier webhook réel a atteint la base partagée avant le callback local et
  avait confirmé les objets sans créer l'écriture financière nouvellement
  attendue. Une réparation TEST bornée et transactionnelle a restauré cette
  causalité une seule fois ; le code rend désormais ce traitement idempotent.
- **KYC inline : réussi.** Une image et un PDF privés ont été lus dans
  l’administration sans téléchargement involontaire ; le probe R2
  écriture/lecture/suppression est réussi.

Références fournisseur utilisées :
`https://paystack.com/docs/payments/test-payments/`,
`https://paystack.com/docs/api/transaction/` et
`https://paystack.com/docs/api/subaccount/`.

## Validations exécutées

- Typecheck et lint : réussis sans avertissement.
- Architecture : 5 fichiers / 18 tests réussis ; 747 modules / 2 405
  dépendances sans violation.
- `npm test` : 90 fichiers réussis, 19 ignorés ; 428 tests réussis,
  74 ignorés.
- Tests payout ciblés : 3 fichiers / 17 tests réussis. Test DB `0046`–`0048` :
  4/4 assertions réussies, incluant propriété de l'acteur, commande canonique
  et outbox.
- `npm run build` final : réussi ; compilation, typecheck et génération de
  83 pages statiques terminés.
- DB Phase 1 : 8 assertions réussies. DB Phase 3 : 7/7 réussies après
  isolation de l’outbox ; rejeu idempotent, retries, dead-letter et requeue
  couverts.
- Migration TEST : `0044` à `0048` appliquées ; audit final à 49
  migrations, 0 compte live actif non vérifié, 0 acteur incohérent et
  0 fixture de validation résiduelle.
- API Paystack TEST réelle : création Wave XOF réussie avec commission implicite
  à 0 %, subaccount actif et référence de forme valide non consignée.
- Matrice DB Phase 4–10 + Paystack + payout tentée : 7/9 fichiers réussis et
  37 assertions métier réussies. Les deux échecs sont des teardowns qui
  supprimaient les événements avant les notifications liées par `0044` ; ordre
  corrigé et 6 utilisateurs / 4 Partner Accounts résiduels nettoyés. Le rerun
  global a été refusé car il réexécuterait des phases terminées et un ancien
  `TRUNCATE` hors périmètre.
- `git diff --check` : réussi.
- Passage E2E global : 11 réussis, 4 ignorés intentionnellement car couverts par
  leurs pilotes réels séparés, 1 flaky récupéré et 2 échecs. Après correction,
  Résidence complet et livraison ont chacun été relancés avec succès ; les 18
  scénarios planifiés disposent donc d'une preuve verte, sans prétendre à un
  passage global final entièrement vert en une seule exécution.
- KYC inline : 1/1 réussi. Pilotes Paystack réels Restaurant, provisionnement
  payout et Résidence avec split : réussis.
- Réconciliation causale finale en lecture seule : 155 effets terminés, aucune
  anomalie, aucun retry, aucune dead-letter. Audit final : 49 migrations,
  0 compte live actif non vérifié et 0 acteur payout incohérent.

## Clôture et limites

- Le checkout Paystack réel a dû être piloté interactivement parce que la voie
  headless rencontrait la protection Cloudflare ; ce n'est pas un échec du
  produit ni du paiement.
- Les deux teardowns historiques corrigés des phases 5 et 6 n'ont pas été
  rejoués : les relancer aurait rouvert des phases terminées, hors autorisation.

La Phase 14 est close avec un verdict GO. Après autorisation explicite, le
pilote contrôlé `phase14-controlled-test-2026-09-13` a été ouvert le
13 septembre 2026 sur la base TEST avec sa cohorte et ses jeux de données
identifiés. Son état initial, ses commandes et ses conditions d'arrêt sont
consignés dans `docs/PILOTE_CONTROLE_TEST.md`. Cette ouverture n'autorise ni une
exposition publique, ni un passage en production, ni une nouvelle phase de
migration.
