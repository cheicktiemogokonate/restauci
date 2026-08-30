# Livraison V1 — contrat opérationnel et runbook

**Date de référence : 29 août 2026**

**Périmètre : flotte propre à chaque restaurant, sans mutualisation**

## Règles produit actives

- Un livreur peut avoir au plus une mission `assignee` ou `en_route`.
- Le restaurant propose une mission ; le livreur accepte ou refuse avant
  expiration, fixée à cinq minutes.
- Un livreur qui passe indisponible refuse atomiquement sa proposition active.
- La proposition est autorisée à partir de `en_preparation`; le départ exige
  que la commande soit `prete`.
- Une réassignation est possible uniquement avant le retrait du colis.
- Après le départ, une annulation ordinaire est refusée. Le livreur signale un
  échec motivé.
- La remise exige soit le code client à six chiffres, soit une confirmation
  depuis le compte client.
- Pour une commande cash, le livreur confirme le montant canonique encaissé.
  Ce montant reste `held` jusqu'à confirmation exacte de la remise au restaurant.
- Le restaurant peut enregistrer un montant fixe facultatif par livraison.
  Aucun pourcentage n'est pris en charge.
- Le montant est copié sur l'offre, puis figé sur la mission uniquement lors de
  son acceptation. Une modification du tarif ne réécrit jamais une offre ou une
  mission existante.
- Seule une livraison `livree` produit un dû. Sans montant configuré, RestauCI
  ne calcule aucun dû et l'accord reste géré hors plateforme.
- Le restaurant peut déclarer les dus réglés, mais RestauCI ne collecte ni ne
  transfère les fonds et ne modifie jamais le prix client.

## Cloisonnement des données

- Le restaurant ne peut gérer que les livreurs et commandes de sa session.
- Le livreur utilise une audience JWT dédiée et ne lit que ses offres, missions,
  notifications et solde cash dans son restaurant.
- Avant acceptation, l'offre ne révèle pas l'adresse complète du client.
- Après clôture, l'historique livreur masque téléphone, adresse, coordonnées et
  instructions du client.
- Le client voit nom, téléphone, photo éventuelle, véhicule, immatriculation,
  restaurant, statut et heures de son propre livreur.
- Les secrets, sessions, documents d'identité et missions d'autres clients ne
  figurent dans aucun DTO.

## Preuve de remise

Le serveur crée un nonce aléatoire et dérive un code de six chiffres avec HMAC.
Seul le digest du code est stocké ; ni le code ni le secret HMAC ne sont écrits
dans le journal d'événements. Le compte client peut confirmer directement la
remise. Le code devient inutilisable après vérification et il est renouvelé
pour toute nouvelle proposition après échec. Dix tentatives incorrectes sont
autorisées au maximum avant de demander un signalement de problème.

## Comptabilité des espèces

`driver_cash_collections` contient un snapshot exact du total de commande :

1. la livraison cash terminée crée une collecte `held` ;
2. le solde visible du livreur est la somme des collectes `held` ;
3. le restaurant sélectionne les livraisons effectivement remises ;
4. `driver_cash_remittances` exige `received_amount_fcfa = expected_amount_fcfa` ;
5. toutes les collectes sélectionnées deviennent `remitted` dans la même
   transaction et un événement immuable est ajouté par livraison.

Ce registre représente la garde physique des espèces. Il ne remplace ni le
paiement de commande, ni le registre de commissions du restaurant.

## Suivi des rémunérations fixes

`fixed_delivery_compensation_fcfa` est le tarif facultatif courant du livreur.
Chaque `delivery_offer` reçoit un snapshot de ce tarif. En cas d'acceptation,
le snapshot est copié dans `livraisons.driver_compensation_amount_fcfa`.

Le total dû correspond exclusivement aux livraisons `livree` dont le snapshot
est non nul et `driver_compensation_paid_at` encore nul. L'action de règlement
horodate les lignes, identifie l'utilisateur restaurant et ajoute un événement
immuable par livraison. Elle constitue une déclaration de suivi, pas une preuve
bancaire ni un transfert d'argent.

## Endpoints principaux

### Restaurant

- `GET|POST /api/v1/restaurateur/livreurs`
- `GET|PATCH /api/v1/restaurateur/livreurs/{id}`
- `POST /api/v1/restaurateur/livreurs/{id}/acces`
- `POST /api/v1/restaurateur/livreurs/{id}/desactivation`
- `POST /api/v1/restaurateur/livreurs/{id}/remises-especes`
- `POST /api/v1/restaurateur/livreurs/{id}/remunerations`
- `GET|PUT|DELETE /api/v1/restaurateur/commandes/{id}/livraison/assignation`

### Livreur

- `POST /api/v1/livreur/auth/login|activation|refresh|logout`
- `GET /api/v1/livreur/me`
- `PATCH /api/v1/livreur/disponibilite`
- `GET /api/v1/livreur/offres/courante`
- `POST /api/v1/livreur/offres/{id}/reponse`
- `GET /api/v1/livreur/livraisons[/{id}]`
- `POST /api/v1/livreur/livraisons/{id}/depart|remise|echec`
- `GET|PATCH /api/v1/livreur/notifications`
- `POST|DELETE /api/v1/livreur/push/expo`

### Client

- `GET /api/v1/client/commandes/{id}/livraison`
- `POST /api/v1/client/commandes/{id}/livraison/confirmation`

Le contrat détaillé est généré dans `docs/openapi-v1.json`.

## Interfaces opérationnelles

- `/restaurateur/livreurs` : création de flotte, accès temporaires,
  désactivation, états, mission active, tarif fixe, rémunérations dues et remise
  exacte des espèces ;
- `/restaurateur/commandes/{id}` : proposition ou réassignation avant départ et
  suivi de la mission ;
- `/livreur` : connexion, activation, disponibilité, proposition, retrait,
  remise avec preuve, échec et historique responsive ;
- `/commandes/{id}` : identité opérationnelle du livreur, code de remise et
  confirmation directe par le client connecté.

## Déploiement

1. Créer une sauvegarde vérifiée de PostgreSQL.
2. Vérifier l'ordre des migrations locales `0030` à `0033` ; `0033` ajoute le
   suivi de rémunération fixe après le socle livraison `0031`.
3. Appliquer `npm run db:migrate` sur une base de recette isolée.
4. Exécuter :

   ```bash
   RUN_DELIVERY_DB_TESTS=true TEST_DATABASE_URL='postgresql://…' \
     npx vitest run tests/delivery-driver-db.test.ts
   npm run test:e2e -- e2e/restaurateur-commandes.spec.ts
   npm run typecheck
   npm run lint
   npm test
   npm run build
   ```

5. Tester le parcours complet avec une commande cash et une commande prépayée.
6. Déployer le code seulement après réussite de la migration et de la recette.

La migration est additive mais crée des types enum PostgreSQL, des index
partiels et un trigger append-only. Un retour arrière applicatif est possible ;
la suppression de ces objets DB ne doit pas être automatisée et exige un plan
de restauration contrôlé.

## Signaux à surveiller

- erreurs `DRIVER_ALREADY_REQUESTED` ou `DRIVER_BUSY` anormalement fréquentes ;
- propositions expirées sans réponse ;
- échecs par motif et taux de codes incorrects ;
- collectes `held` anciennes ou montant cumulé élevé ;
- rémunérations livrées non réglées anciennes ou montant cumulé élevé ;
- échecs de diffusion Expo (la notification persistée reste la source fiable) ;
- violations SQL `23505`/`23514` et indisponibilité du registre Redis de sessions.

## Tests disponibles

- domaine pur : transitions, disponibilité, expiration, preuve et contrats ;
- séparation stricte des audiences JWT et activation ;
- migration statique et architecture ;
- synchronisation exacte entre routes et OpenAPI ;
- invariants DB opt-in dans `tests/delivery-driver-db.test.ts`.
- contrat et migration de rémunération fixe dans
  `tests/delivery-driver-compensation-migration.test.ts`.
- parcours multi-acteur restaurant/livreur/client dans
  `e2e/restaurateur-commandes.spec.ts`, incluant le refus du retrait avant
  `prete` et la remise par code client.

La migration n'est jamais appliquée automatiquement à une base partagée ou de
production par le processus de validation local.
