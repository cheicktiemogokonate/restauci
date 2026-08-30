# Plan d'implémentation — Livraison V1 RestauCI

**Version de cadrage : 29 août 2026**

**Statut : implémentation, migrations `0030` à `0033` et recette DB/E2E terminées ; déploiement applicatif en cours**

## 1. Objectif de la V1

Rendre le livreur opérationnel comme acteur distinct, tout en conservant un modèle simple :

- chaque restaurant crée et administre sa propre flotte ;
- un livreur appartient à un seul restaurant ;
- le restaurant propose manuellement une livraison ;
- le livreur possède ses propres identifiants ;
- il ne voit que ses missions et uniquement celles de son restaurant ;
- il marque lui-même le départ avec le colis puis la livraison au client ;
- la plateforme conserve une trace fiable de chaque transition.

Cette V1 ne crée ni marketplace ni mutualisation des livreurs entre restaurants.

## 2. Point de départ réel

RestauCI possède déjà :

- les tables `livreurs` et `livraisons` ;
- le rattachement obligatoire d'un livreur à un restaurant ;
- les états de livraison `en_attente`, `assignee`, `en_route`, `livree`, `echouee` ;
- une assignation manuelle depuis le détail d'une commande ;
- les transitions atomiques `assignee → en_route → livree` ;
- la clôture de la commande, du paiement espèces et des commissions lors de la livraison ;
- une timeline client comportant l'étape « En livraison » ;
- un test E2E du cycle actuel.

Mais aujourd'hui :

- le livreur de test est inséré directement en base ;
- aucune page de gestion de flotte n'existe ;
- aucun compte ou jeton livreur n'existe ;
- la disponibilité affichée n'est pas imposée à l'assignation ;
- un livreur peut théoriquement recevoir plusieurs missions simultanées ;
- la réassignation peut réinitialiser une livraison sans garde suffisante ;
- le restaurant déclenche encore lui-même le départ et la livraison ;
- aucune notification ne cible un livreur ;
- aucune trace opérationnelle immuable n'identifie précisément l'acteur de chaque transition.

## 3. Décisions déjà confirmées

Ces éléments proviennent directement du cadrage produit et ne sont pas des initiatives techniques :

1. Le restaurant enregistre ses propres livreurs.
2. Un livreur est rattaché à un seul restaurant dans la V1.
3. Le restaurant vérifie la disponibilité avant l'assignation.
4. La proposition est manuelle dans la V1 et le livreur peut l'accepter ou la refuser.
5. Le livreur reçoit des identifiants et se connecte avec son propre compte.
6. Il ne reçoit et ne voit que les livraisons de son restaurant qui lui sont assignées.
7. Il marque la récupération/départ du colis.
8. Il marque la livraison effectuée.
9. L'assignation automatique et le modèle multi-restaurant sont reportés.
10. La rémunération V1 est un montant fixe facultatif par livraison ; les
    pourcentages et les transferts de fonds restent exclus.

## 4. Lot 0 obligatoire — décisions métier à valider avant le code

Ces décisions influencent directement les transactions et les droits. Elles devront être approuvées avant le premier changement applicatif.

| Sujet | Recommandation V1 | Pourquoi | Conséquence si choix différent |
|---|---|---|---|
| Acceptation de mission | Proposition manuelle acceptée ou refusée par le livreur, expiration après cinq minutes. | Respecte l'autonomie du livreur sans assignation automatique. | Après expiration, le restaurant choisit manuellement un autre livreur. |
| Missions simultanées | Une seule mission `assignee` ou `en_route` par livreur. | Disponibilité compréhensible et impossibilité de double assignation. | Plusieurs missions nécessitent ordonnancement, capacité et itinéraires multiples. |
| Moment de l'assignation | Autoriser à partir de `en_preparation`, mais interdire le départ avant `prete`. | Le livreur peut se rendre au restaurant sans pouvoir annoncer un colis non remis. | N'autoriser qu'à `prete` simplifie encore, mais peut augmenter le délai client. |
| Réassignation | Autorisée tant que le livreur n'est pas parti ; interdite après `en_route`. | Évite qu'une mission active change d'acteur sans trace. | Une réassignation en trajet nécessite un workflow de transfert physique. |
| Échec de livraison | Le livreur signale l'échec avec un motif obligatoire ; le restaurant peut ensuite réassigner ou annuler selon les règles de commande. | Permet de gérer client absent, panne ou adresse inaccessible. | Sans échec, l'équipe devra modifier la base ou marquer faussement la commande livrée. |
| Annulation après départ | Refuser l'annulation ordinaire après `en_route` ; traiter d'abord un échec explicite. | Évite une commande annulée pendant qu'un colis circule. | Une annulation immédiate impose retour du colis, remboursement et responsabilité financière. |
| Preuve de remise | Code client à six chiffres ou confirmation depuis le compte client. | Attribue la remise au client sans stocker le code en clair. | Photo et signature restent hors V1. |
| Paiement en espèces | Le livreur confirme le montant canonique encaissé ; la garde reste suivie jusqu'à sa remise exacte au restaurant. | Permet plusieurs encaissements dans la journée sans fausser paiement ni commission. | La garde des espèces reste séparée de la rémunération du livreur. |
| Rémunération livreur | Montant fixe facultatif, affiché avant acceptation, figé par mission et dû seulement après livraison. | Transparence sans imposer de négociation ni de paiement intégré. | Sans montant, aucun dû n'est calculé et l'accord reste hors plateforme. |
| Visibilité côté client | Afficher nom, téléphone, photo éventuelle, véhicule, immatriculation, restaurant, état et heures. | Transparence opérationnelle demandée par le propriétaire produit. | Identifiants, adresse privée et documents d'identité restent masqués. |
| Disponibilité | Le livreur déclare Disponible/Indisponible ; `Occupé` est calculé par une mission active. Afficher aussi sa dernière activité. | Sépare le choix humain d'accepter des missions de l'état réel d'une mission. | Un heartbeat obligatoire donne une présence plus stricte mais peut déclarer à tort hors ligne un navigateur en arrière-plan. |
| Identifiants initiaux | Identifiant généré + mot de passe temporaire affiché une seule fois, changement obligatoire à la première connexion. | Aucun SMS/e-mail transactionnel n'est requis pour démarrer et aucun secret clair n'est stocké. | Une invitation par SMS/e-mail nécessite d'abord un fournisseur et ses scénarios de panne. |
| Autorité sur les transitions | Départ et livraison réservés au compte livreur ; le restaurant ne conserve pas ces boutons ordinaires. | Chaque action est attribuable au véritable acteur. | Conserver deux acteurs autorisés rend l'audit ambigu et augmente le risque d'erreur. |

### Point financier à ne pas contourner

La décision « qui reçoit l'argent d'une livraison payée en espèces ? » est bloquante. Dans l'état actuel, terminer une livraison confirme le paiement cash, clôture la commande et déclenche la comptabilité de commission. Le nouveau bouton livreur ne doit pas reproduire ce comportement sans afficher le montant à encaisser et obtenir une confirmation explicite, sauf décision contraire documentée.

## 5. Périmètre proposé de la V1

### Inclus

- création, modification et désactivation d'un livreur par son restaurant ;
- génération et réinitialisation des accès ;
- première connexion et changement obligatoire du mot de passe ;
- connexion, rafraîchissement et déconnexion sécurisés ;
- disponibilité déclarée par le livreur ;
- liste des livreurs avec disponibilité réelle côté restaurant ;
- assignation et réassignation manuelles avec contrôle concurrent ;
- espace livreur responsive ;
- liste de la mission courante et historique minimal ;
- départ avec le colis ;
- livraison effectuée ;
- signalement d'un échec avec motif ;
- suivi client et restaurant mis à jour ;
- notifications applicatives/realtime essentielles ;
- historique opérationnel de toutes les actions ;
- montant fixe facultatif, snapshot par mission et déclaration de règlement ;
- tests unitaires, DB, API, E2E, sécurité et architecture.

### Explicitement hors V1

- assignation automatique ;
- livreur partagé par plusieurs restaurants ;
- marketplace ou mise en relation externe ;
- candidature libre d'un livreur ;
- optimisation de tournées ;
- plusieurs missions actives simultanées ;
- suivi GPS temps réel sur une carte ;
- messagerie client–livreur ;
- appels téléphoniques masqués ;
- notation du livreur ;
- pourcentage, commission, collecte ou transfert de la rémunération du livreur ;
- photo et signature de remise ; le code client à usage unique est inclus ;
- application mobile native séparée ;
- remboursement automatique.

## 6. Parcours cible

### 6.1 Création et activation du livreur

1. Le restaurant ouvre **Livreurs**.
2. Il saisit nom, téléphone, type de véhicule et immatriculation facultative.
3. Le serveur crée le livreur sous le `restaurantId` de la session ; le client ne peut jamais envoyer un autre `restaurantId`.
4. Le serveur génère un identifiant global unique et un mot de passe temporaire aléatoire.
5. Seul le hash du mot de passe est enregistré.
6. L'interface affiche les deux secrets une seule fois avec une action Copier.
7. Le restaurant les transmet au livreur hors plateforme.
8. Le livreur se connecte avec ces données.
9. Il est forcé à choisir un mot de passe définitif avant tout accès à une mission.
10. Il choisit Disponible lorsqu'il peut recevoir une assignation.

Si les accès sont perdus, le restaurant ne peut pas relire l'ancien mot de passe : il génère un nouvel accès temporaire, ce qui révoque toutes les sessions précédentes.

### 6.2 Commande et assignation

1. Le client passe une commande en livraison selon les contrôles existants.
2. Le restaurant accepte et prépare la commande.
3. À partir de l'état autorisé au lot 0, le restaurant ouvre l'assignation.
4. L'interface montre :
   - les livreurs disponibles, sélectionnables ;
   - les livreurs occupés, désactivés ;
   - les livreurs indisponibles, désactivés ;
   - la raison exacte de l'indisponibilité.
5. Le serveur revalide atomiquement : même restaurant, compte actif, accès activé, disponibilité déclarée, aucune mission active, commande assignable.
6. Une seule assignation gagne en cas de clics ou requêtes concurrents.
7. La mission apparaît dans l'espace du livreur et une notification lui est adressée.

### 6.3 Retrait, trajet et remise

1. Le livreur consulte le restaurant, la commande, l'adresse client et les instructions nécessaires.
2. Le bouton **J'ai récupéré la commande** reste désactivé tant que la commande n'est pas `prete`.
3. Son activation fait passer la livraison de `assignee` à `en_route`.
4. Le client voit **En livraison** ; le restaurant voit le départ et son heure.
5. À destination, le livreur choisit :
   - **Confirmer la livraison** ;
   - ou **Signaler un problème** avec motif obligatoire.
6. Pour un paiement cash à la livraison, la confirmation exige d'abord la validation du montant encaissé.
7. `livree` clôt atomiquement la commande en `servie`, le paiement cash éventuel et la commission, exactement comme le workflow canonique actuel.
8. Le livreur redevient disponible si son choix Disponible est toujours actif.

## 7. Machines d'état proposées

### 7.1 Disponibilité du livreur

| État présenté | Calcul | Assignable ? |
|---|---|---:|
| Désactivé | `actif = false` ou accès révoqué | Non |
| Accès à activer | aucun mot de passe définitif | Non |
| Indisponible | actif, accès valide, disponibilité déclarée à false | Non |
| Disponible | actif, accès valide, disponibilité déclarée à true, aucune mission active | Oui |
| Occupé | livraison `assignee` ou `en_route` | Non |

`Occupé` doit être calculé à partir de la mission active et protégé par une contrainte DB. Il ne doit pas être un booléen que deux écrans peuvent désynchroniser.

### 7.2 Livraison

```text
en_attente ──assigner──> assignee ──colis récupéré──> en_route ──remise──> livree
                            │                           │
                            ├──réassigner──> assignee   └──problème──> echouee
                            └──annuler avant départ──> annulee

echouee ──nouvelle assignation──> assignee
```

Règles :

- `livree` et `annulee` sont terminaux ;
- une réassignation conserve un événement avec ancien et nouveau livreur ;
- aucune transition n'est réalisée par simple mise à jour sans statut précédent attendu ;
- une répétition du même appel retourne un conflit explicite, sans double commission ni double paiement ;
- la commande reste `prete` pendant `assignee` et `en_route`, puis devient `servie` uniquement avec `livree` ;
- une annulation de commande livraison prête doit passer par l'orchestration livraison autorisée, jamais par la transition générique.

L'ajout de `annulee` à l'enum de livraison est recommandé pour ne pas confondre annulation et échec opérationnel.

## 8. Architecture cible

### 8.1 Nouveau propriétaire métier

Créer `src/modules/deliveries` :

| Surface | Responsabilité |
|---|---|
| `model.ts` | États, transitions pures, calcul de disponibilité, codes d'erreur et constantes d'événements. |
| `contracts.ts` | Schémas Zod et DTOs : flotte, identifiants, assignation, mission et transitions. |
| `server.ts` | Façade publique server-only pour les commandes et projections. |
| `_internal/persistence.ts` | Requêtes et écritures Drizzle transactionnelles. |
| `_internal/auth.ts` | Vérification du hash, activation, changement et révocation des accès. |
| `_internal/projections.ts` | Vues restaurant, livreur et client sans exposer les rows DB. |
| `presentation/` | Badges et libellés client-safe des états. |

Dépendances autorisées à ajouter dans `ARCHITECTURE.md` :

```text
Deliveries → Orders, Restaurants, Notifications, infrastructure/db,
             infrastructure/auth, infrastructure/realtime
```

`Orders` reste propriétaire de la transition de commande, du paiement cash et des commissions. `Deliveries` appelle une API publique Orders dédiée à la clôture ou à l'annulation d'une commande livraison dans la même transaction ; il ne duplique aucun de ces calculs.

### 8.2 API métier publique indicative

#### Pour le restaurant

- `listRestaurantDrivers(restaurantId, filters)`
- `createRestaurantDriver(actor, command)`
- `updateRestaurantDriver(actor, command)`
- `deactivateRestaurantDriver(actor, command)`
- `issueDriverCredentials(actor, command)`
- `resetDriverCredentials(actor, command)`
- `listAssignableDrivers(restaurantId, orderId)`
- `assignDeliveryDriver(actor, command)`
- `reassignDeliveryDriver(actor, command)`
- `getRestaurantDelivery(orderId, restaurantId)`

#### Pour le livreur

- `authenticateDriver(command)`
- `activateDriverCredentials(command)`
- `resolveDriverSession(accessToken)`
- `setDriverAvailability(driverId, command)`
- `listDriverDeliveries(driverId, filters)`
- `getDriverDelivery(driverId, deliveryId)`
- `startDriverDelivery(driverId, command)`
- `completeDriverDelivery(driverId, command)`
- `failDriverDelivery(driverId, command)`

#### Pour les autres projections

- `getClientDelivery(orderId, clientId)`
- `getOrderDeliverySummary(orderId, restaurantId)`

Les DTOs ne doivent jamais contenir `passwordHash`, identifiant de session, adresse d'une autre mission ou données d'un autre restaurant.

### 8.3 Adaptateurs Next.js

Les Route Handlers et Server Actions :

1. extraient la session ;
2. valident le transport ;
3. appellent `deliveries/server.ts` ;
4. traduisent le résultat en HTTP/toast/revalidation.

Ils ne lisent ni n'écrivent Drizzle directement et ne reconstruisent pas les transitions.

## 9. Migration de base de données

La migration doit rester additive dans un premier temps.

### 9.1 Table `livreurs`

Ajouter au minimum :

- `login_id` : identifiant unique généré, jamais choisi par le restaurant ;
- `password_hash` : nullable pour les anciens livreurs non encore invités ;
- `must_change_password` ;
- `credentials_issued_at` ;
- `password_changed_at` ;
- `last_login_at` ;
- `last_seen_at` ;
- `deactivated_at` ;
- éventuellement `deactivated_by_user_id` pour la traçabilité.

Conserver temporairement :

- `actif` pour l'autorisation du compte ;
- `en_ligne` comme disponibilité déclarée, avec un nom métier différent dans les DTOs ;
- les champs de position sans les activer dans la V1.

Contraintes/index :

- unicité globale de `login_id` ;
- aucun secret en clair ;
- index `(restaurant_id, actif, en_ligne)` ;
- interdiction applicative de suppression physique d'un livreur ayant un historique.

### 9.2 Table `livraisons`

Ajouter :

- état `annulee` à l'enum, après approbation ;
- `failure_reason` ;
- `failed_at` ;
- `cancelled_at` ;
- `cash_collected_at` et `cash_collected_amount_fcfa` si le livreur encaisse ;
- contrainte de cohérence entre statut et timestamps ;
- index unique partiel sur `livreur_id` pour `assignee`/`en_route` si une mission active maximum est approuvée.

L'unicité actuelle `commande_id` reste valable : une commande possède un workflow de livraison, et les réassignations sont historisées dans les événements.

### 9.3 Nouvelle table `delivery_events`

Champs recommandés :

- `id` ;
- `delivery_id` ;
- `order_id` ;
- `restaurant_id` ;
- `driver_id` nullable selon l'événement ;
- `event_type` ;
- `actor_type` : `restaurant`, `driver`, `system` ;
- `actor_id` ;
- `from_status` et `to_status` ;
- `metadata` limitée aux données non secrètes ;
- `created_at`.

Cette table est append-only. Elle trace les actions opérationnelles. Le journal `audit_log`, réservé aux actions administrateur, ne doit pas être détourné.

### 9.4 Notifications et push

Pour une notification livreur persistante :

- ajouter `driver_id` à `notifications` ;
- ajouter `driver_id` à `push_subscriptions` ;
- faire évoluer les contraintes de propriétaire vers exactement un parmi `user_id`, `client_id`, `driver_id` ;
- ajouter les types `delivery_assigned`, `delivery_started`, `delivery_completed`, `delivery_failed` depuis le modèle propriétaire.

Ce sous-lot peut être activé après l'API principale. L'échec d'un push ne doit jamais annuler une assignation ou une livraison.

### 9.5 Données historiques

- ne supprimer aucun livreur existant ;
- générer un `login_id` pour chaque ancien livreur mais conserver `password_hash = null` ;
- afficher ces comptes comme **Accès non généré** ;
- exiger la génération d'accès avant leur première assignation dans le nouveau parcours ;
- conserver intacts les statuts et heures des livraisons terminées ;
- ne pas réécrire les paiements ou commissions historiques.

Le numéro de migration devra être choisi au démarrage du chantier ; `0031` est seulement le prochain numéro observé au moment de ce plan.

## 10. Authentification et sécurité du livreur

### 10.1 Jetons séparés

Créer :

- audience JWT `restau-driver-api` ;
- jeton court `driver-access` ;
- refresh rotatif `driver-refresh` ;
- jeton court `driver-activation` pour le premier changement de mot de passe ;
- propriétaire de révocation Redis `driver` ;
- cookie refresh HttpOnly distinct pour le web.

Ne jamais utiliser un jeton partenaire ou client pour le livreur.

### 10.2 Protections minimales

- bcrypt avec le coût déjà retenu par le projet ;
- identifiant et mot de passe temporaires générés avec `crypto` ;
- mot de passe temporaire affiché une seule fois ;
- message générique en cas de mauvais identifiant/mot de passe ;
- comparaison factice pour limiter l'énumération des comptes ;
- limitation par IP et par identifiant haché ;
- rotation anti-rejeu du refresh token ;
- révocation immédiate de toutes les sessions après reset/désactivation ;
- revalidation de `actif`, `restaurantId` et du statut des accès à chaque requête ;
- journaux sans mot de passe, jeton, téléphone complet ou adresse client ;
- échec fermé si le registre de révocation est indisponible ;
- contrôle IDOR sur toutes les routes par `driverId` issu du token, jamais du corps.

### 10.3 Données accessibles au livreur

Mission active seulement :

- numéro de commande ;
- nom du restaurant et point de retrait ;
- adresse et coordonnées de livraison ;
- nom utile et téléphone du client si validé au lot 0 ;
- instructions de livraison ;
- montant à encaisser uniquement si paiement cash à la livraison ;
- état et horaires de la mission.

Historique terminé : masquer téléphone, adresse précise et instructions personnelles ; conserver numéro, date, restaurant et résultat.

## 11. Routes HTTP proposées

### 11.1 Restaurant

| Méthode | Route | Usage |
|---|---|---|
| GET | `/api/v1/restaurateur/livreurs` | Liste et filtres de flotte. |
| POST | `/api/v1/restaurateur/livreurs` | Création du profil. |
| GET | `/api/v1/restaurateur/livreurs/[id]` | Détail et historique minimal. |
| PATCH | `/api/v1/restaurateur/livreurs/[id]` | Coordonnées et véhicule ; la disponibilité reste déclarée par le livreur. |
| POST | `/api/v1/restaurateur/livreurs/[id]/acces` | Génération ou reset d'accès, secret retourné une fois. |
| POST | `/api/v1/restaurateur/livreurs/[id]/desactivation` | Désactivation et révocation des sessions. |
| PUT | `/api/v1/restaurateur/commandes/[id]/livraison/assignation` | Assignation ou réassignation contrôlée. |

### 11.2 Livreur

| Méthode | Route | Usage |
|---|---|---|
| POST | `/api/v1/livreur/auth/login` | Connexion ou émission d'un jeton d'activation. |
| POST | `/api/v1/livreur/auth/activation` | Choix du mot de passe définitif. |
| POST | `/api/v1/livreur/auth/refresh` | Rotation de session. |
| POST | `/api/v1/livreur/auth/logout` | Révocation de session. |
| GET | `/api/v1/livreur/me` | Profil et disponibilité calculée. |
| PATCH | `/api/v1/livreur/me/disponibilite` | Disponible/Indisponible. |
| GET | `/api/v1/livreur/livraisons` | Mission courante et historique paginé. |
| GET | `/api/v1/livreur/livraisons/[id]` | Détail autorisé de la mission. |
| POST | `/api/v1/livreur/livraisons/[id]/depart` | Passage atomique à `en_route`. |
| POST | `/api/v1/livreur/livraisons/[id]/remise` | Passage atomique à `livree`. |
| POST | `/api/v1/livreur/livraisons/[id]/echec` | Échec avec motif. |
| GET | `/api/v1/livreur/livraisons/stream` | Événements temps réel propres au livreur. |

Toutes les routes doivent être ajoutées au document OpenAPI et à la matrice API.

## 12. Interfaces à réaliser

Avant leur implémentation, appliquer le protocole UI du dépôt : mission de l'écran, hiérarchie, responsive, accessibilité, tous les états, inventaire des composants existants et recherche des composants autorisés.

### 12.1 Restaurant — `/restaurateur/livreurs`

- résumé : disponibles, occupés, indisponibles, accès à activer ;
- liste responsive avec nom, téléphone, véhicule, état, dernière activité et mission active ;
- recherche et filtres ;
- création/modification ;
- génération/réinitialisation des accès ;
- modal du secret affiché une seule fois avec avertissement ;
- désactivation confirmée ;
- état vide expliquant comment ajouter le premier livreur.

### 12.2 Restaurant — détail de commande

- liste uniquement les livreurs réellement assignables en premier ;
- montre les non-assignables désactivés avec raison ;
- demande confirmation avant assignation ;
- permet une réassignation avant départ ;
- affiche l'historique de la mission ;
- retire les boutons ordinaires **Démarrer** et **Confirmer la livraison** lorsque le portail livreur est activé.

### 12.3 Livreur — responsive web

Routes proposées :

- `/livreur/login` ;
- `/livreur/activation` ;
- `/livreur` : disponibilité et mission actuelle ;
- `/livreur/livraisons/[id]` : détail/action ;
- `/livreur/historique`.

L'interface est pensée mobile en priorité : gros boutons, confirmation explicite, aucune action destructive proche du bouton principal, lisibilité en extérieur et fonctionnement correct sur réseau lent.

États obligatoires :

- chargement ;
- aucune mission ;
- indisponible ;
- occupé ;
- commande pas encore prête ;
- session expirée ;
- hors connexion ;
- transition déjà réalisée ;
- erreur réseau récupérable ;
- compte désactivé ;
- succès avec nouvel état visible.

### 12.4 Client

- conserver la timeline actuelle ;
- afficher l'assignation et le départ sans exposer de données non validées ;
- actualiser via le canal existant ;
- afficher `livree` seulement après la transaction de clôture réussie.

## 13. Notifications et temps réel

| Événement | Destinataire | Canal minimal |
|---|---|---|
| Livreur assigné | Livreur | In-app/SSE, puis Web Push/Expo. |
| Commande prête | Livreur assigné | In-app/SSE. |
| Départ du livreur | Restaurant et client | SSE + notification existante adaptée. |
| Livraison terminée | Restaurant et client | SSE + notification persistante. |
| Échec signalé | Restaurant | SSE + notification persistante urgente. |
| Accès réinitialisé/désactivé | Livreur | Révocation immédiate ; message à la prochaine requête. |

Les événements métier sont enregistrés dans la transaction. Leur acheminement externe est effectué après la transaction et reste best-effort.

## 14. Découpage d'implémentation

### Lot 0 — Validation métier

- valider toutes les lignes de la section 4 ;
- produire un court compte-rendu de décisions ;
- ne coder aucune transition avant accord.

**Sortie :** machine d'état et droits signés par le propriétaire produit.

### Lot 1 — Domaine et architecture

- créer le module `deliveries` ;
- définir états, erreurs, transitions et disponibilité ;
- exposer les contrats Zod ;
- mettre à jour `ARCHITECTURE.md` et les tests d'architecture ;
- ajouter les tests unitaires exhaustifs de la machine d'état.

**Sortie :** domaine pur vert, sans UI ni migration appliquée.

### Lot 2 — Migration et authentification

- écrire la migration additive ;
- backfiller les identifiants historiques sans secret ;
- implémenter activation, connexion, rotation, déconnexion et révocation ;
- ajouter les gardes Bearer livreur ;
- tester brute force, réutilisation de refresh, désactivation et séparation d'audiences.

**Sortie :** un livreur créé en test peut activer un compte et obtenir une session, sans voir encore de mission.

### Lot 3 — Gestion de flotte restaurant

- créer projections et commandes CRUD/soft-disable ;
- réaliser routes et page `/restaurateur/livreurs` ;
- afficher le secret une seule fois ;
- ajouter reset/révocation ;
- tester isolation entre deux restaurants.

**Sortie :** un restaurant gère entièrement sa flotte sans accès direct à la base.

### Lot 4 — Assignation fiable

- remplacer `assignCommandeDriver`/`assignerLivreur` par la commande canonique ;
- ajouter contrainte de mission active ;
- contrôler état commande, disponibilité, accès et appartenance ;
- implémenter réassignation autorisée ;
- écrire les événements immuables ;
- adapter le détail de commande.

**Sortie :** deux assignations concurrentes ne peuvent jamais réserver le même livreur.

### Lot 5 — Espace et transitions livreur

- réaliser les pages livreur ;
- implémenter disponibilité ;
- implémenter départ, remise et échec ;
- intégrer la confirmation cash décidée au lot 0 ;
- supprimer les transitions ordinaires côté restaurant ;
- préserver la clôture atomique Orders/Transactions/Commissions.

**Sortie :** le livreur est le véritable acteur de `en_route` et `livree`.

### Lot 6 — Client, notifications et temps réel

- exposer les projections minimales ;
- ajouter SSE livreur ;
- étendre les notifications/push ;
- adapter la timeline client et la vue restaurant ;
- vérifier les erreurs de transport sans rollback métier.

**Sortie :** les trois acteurs voient le même état sans fuite de données.

### Lot 7 — Recette complète et préparation au déploiement

- mettre à jour OpenAPI et matrice API ;
- remplacer les inserts E2E directs par le parcours réel ;
- exécuter le scénario trois acteurs ;
- tester migrations sur une copie/branche Neon de test ;
- exécuter lint, types, architecture, tests, E2E et build ;
- documenter rollback, métriques et runbook.

**Sortie :** V1 certifiée sur l'environnement de test, pas encore qualifiée production.

## 15. Plan de tests

### 15.1 Unitaires

- chaque transition autorisée et interdite ;
- calcul Désactivé/Accès à activer/Indisponible/Disponible/Occupé ;
- droits restaurant/livreur/system ;
- règles de réassignation et d'échec ;
- masquage des données après livraison ;
- validation des mots de passe, identifiants et motifs.

### 15.2 Intégration DB

- un livreur ne peut avoir qu'une mission active ;
- deux transactions concurrentes : une seule assignation réussit ;
- un livreur hors ligne, désactivé ou non activé est refusé ;
- un livreur d'un autre restaurant est refusé ;
- un livreur ne peut démarrer la mission d'un autre ;
- `assignee → en_route → livree` est conditionnel et idempotent ;
- livraison, commande, paiement cash, commission et événement sont atomiques ;
- une erreur au milieu annule toute la transaction ;
- une panne de push ne l'annule pas ;
- les données historiques restent lisibles après migration.

### 15.3 API et sécurité

- login correct/incorrect, limitation, message générique ;
- activation temporaire et changement obligatoire ;
- audience partenaire/client refusée sur une route livreur ;
- refresh rotatif et rejet du rejeu ;
- logout et reset révoquent les sessions ;
- IDOR entre livreurs et restaurants ;
- validation stricte des corps et tailles ;
- pagination et filtres bornés ;
- aucun hash ou secret dans les réponses/logs ;
- codes 401/403/404/409/422 cohérents.

### 15.4 E2E Neon de test

Scénario principal :

1. restaurant connecté ;
2. création d'un livreur ;
3. copie des accès temporaires ;
4. connexion du livreur dans un second contexte navigateur ;
5. changement de mot de passe ;
6. passage Disponible ;
7. commande client en livraison ;
8. préparation par le restaurant ;
9. assignation ;
10. mission visible uniquement par le bon livreur ;
11. départ par le livreur ;
12. timeline client en livraison ;
13. confirmation cash éventuelle ;
14. livraison par le livreur ;
15. commande servie, paiement/commission cohérents ;
16. livreur de nouveau disponible ;
17. historique visible et données privées minimisées.

Scénarios négatifs :

- restaurant B ne voit ni ne modifie le livreur A ;
- livreur B ne voit pas la mission A ;
- double assignation concurrente ;
- départ avant commande prête ;
- réassignation après départ ;
- double clic sur départ/remise ;
- compte désactivé pendant une session ;
- signalement d'échec ;
- perte réseau puis reprise ;
- restaurant hors ligne toujours visible publiquement et nouvelles commandes toujours refusées, afin de prévenir toute régression de la règle existante.

## 16. Critères d'acceptation

La V1 est acceptée sur Neon de test seulement si :

1. aucun livreur n'est créé ou administré directement en base ;
2. chaque livreur a un seul restaurant ;
3. les secrets temporaires ne sont ni relisibles ni journalisés ;
4. un compte désactivé perd immédiatement l'accès ;
5. seuls les livreurs réellement disponibles sont assignables ;
6. un livreur ne possède jamais deux missions actives ;
7. l'assignation est atomique et résistante au double clic ;
8. un livreur ne voit que ses propres missions ;
9. seul le livreur assigné peut démarrer et terminer ;
10. le restaurant ne peut plus simuler ces actions ordinaires ;
11. la livraison clôture exactement une fois commande, cash et commission ;
12. tous les changements ont un événement avec acteur et heure ;
13. les vues client, restaurant et livreur convergent vers le même état ;
14. aucun test existant, notamment la visibilité des restaurants hors ligne, ne régresse ;
15. lint, typecheck, architecture, tests, matrice API, Playwright et build sont verts.

## 17. Déploiement et retour arrière

### Déploiement progressif

1. sauvegarder et relever les compteurs/statuts avant migration ;
2. appliquer la migration additive sur Neon de test ;
3. vérifier contraintes, index et backfill ;
4. déployer l'authentification et la gestion de flotte ;
5. activer un livreur pilote ;
6. exécuter la recette complète ;
7. activer l'assignation canonique ;
8. activer les actions livreur ;
9. retirer les boutons restaurant seulement après succès E2E ;
10. préparer séparément une validation de production.

### Retour arrière

- prévoir un drapeau de désactivation du portail/assignation V1 pendant la recette ;
- conserver les colonnes additives en cas de rollback applicatif ;
- ne jamais supprimer les données ou livraisons créées ;
- ne pas appliquer de down migration destructive ;
- conserver le workflow historique uniquement comme secours temporaire clairement identifié, puis le supprimer après stabilisation ;
- traiter toute mission `en_route` avant de désactiver la nouvelle interface.

## 18. Observabilité minimale

Mesures à suivre :

- connexions/activations échouées ;
- comptes désactivés encore utilisés ;
- assignations réussies/refusées et motif ;
- conflits de double assignation ;
- délai commande prête → assignation ;
- délai assignation → départ ;
- délai départ → livraison ;
- livraisons échouées par motif ;
- transitions rejetées ;
- échecs de notification ;
- divergence éventuelle entre `livree` et commande `servie` — doit rester à zéro ;
- divergence entre paiement cash confirmé et preuve d'encaissement — doit rester à zéro.

Les alertes prioritaires concernent les divergences transactionnelles et les accès inter-restaurant, pas les échecs best-effort de push.

## 19. Décisions de cadrage appliquées

1. Une seule mission active par livreur.
2. Proposition manuelle, librement acceptée ou refusée par le livreur.
3. Proposition dès `en_preparation`, retrait seulement à `prete`.
4. Encaissement cash du montant canonique par le livreur, suivi jusqu'à sa
   remise exacte au restaurant.
5. Preuve par code client à six chiffres ou confirmation depuis l'espace client.
6. Téléphone et informations opérationnelles du livreur visibles par le client.
7. Aucun abandon ordinaire après départ : échec motivé obligatoire.
8. Départ et remise réservés au livreur dans le parcours ordinaire.

Le code, le contrat OpenAPI, les interfaces et la recette automatisée reflètent
ces décisions. Les migrations `0030` à `0033` ont été appliquées sur la base
ciblée le 30 août 2026 ; le journal Drizzle contient 34 migrations et les
colonnes de rémunération ont été vérifiées. La recette DB/E2E isolée, le lint,
le typage et le build de production sont réussis.
