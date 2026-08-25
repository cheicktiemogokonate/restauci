# Plan d'implémentation des zones géographiques de service

## 1. Objet du chantier

Ce document décrit la mise en place d'un système de marchés géographiques pour Toutci.

Le système doit permettre de :

- lancer le service en priorité à Abidjan et Bouaké ;
- étendre ensuite la même architecture à toute la Côte d'Ivoire ;
- préparer une extension ultérieure à d'autres pays africains ;
- déterminer dynamiquement le marché associé à une position actuelle, une destination choisie ou une adresse de service ;
- rechercher tous les restaurants du même marché, sans exclusion à 10 km ;
- conserver les restaurants hors ligne dans les résultats ;
- empêcher une commande restaurant entre des marchés différents sans empêcher une réservation distante de résidence ou d'événement ;
- utiliser des données et logiciels open source, sans Google ni Mapbox ;
- éviter les frontières dessinées manuellement et les noms de ville libres comme autorité.

Le chantier ne modifie pas la définition existante d'un restaurant publiquement visible : un restaurant actif et non suspendu reste visible, même s'il est hors ligne. Le statut hors ligne continue seulement d'empêcher la création d'une commande.

## 2. Décisions fonctionnelles définitives

### 2.1 Marché de service

Le concept métier central est le **marché de service** (`ServiceMarket`).

Un marché de service n'est pas automatiquement une commune, une sous-préfecture, un département ou une région. C'est un périmètre géographique commercial réutilisable par plusieurs activités de Toutci.

Un marché peut être composé d'une ou plusieurs unités géographiques importées depuis OpenStreetMap.

Le marché répond seulement à la question « à quel périmètre appartient ce point ? ». Il ne décide pas à lui seul si une activité est ouverte ni si une transaction est autorisée.

### 2.2 Premiers marchés

Les deux premiers marchés à préparer sont :

- `CI-ABIDJAN` : union initiale des 13 communes Abobo, Adjamé, Attécoubé, Cocody, Koumassi, Marcory, Plateau, Port-Bouët, Treichville, Yopougon, Anyama, Bingerville et Songon ;
- `CI-BOUAKE` : commune de Bouaké uniquement, sans importer automatiquement tout le département, la région du Gbêkê ni les sous-préfectures environnantes.

Les identifiants OpenStreetMap et les géométries exactes devront être confirmés sur une carte avant publication. Aucune frontière ne sera activée sur la seule base de son nom.

### 2.3 Position actuelle du client

La ville enregistrée dans le compte client n'est jamais une autorité de commande.

La position courante est récupérée et actualisée :

- à l'entrée dans l'espace client ;
- au retour sur l'application après inactivité ;
- après un déplacement significatif ;
- à la demande du client avec « Me localiser » ;
- avant la validation d'une commande.

Le compte peut conserver une adresse par défaut pour le confort, mais cette adresse et ses coordonnées sont revalidées au moment de leur utilisation.

### 2.4 Découverte et recherche Restaurants

Avec une position valide :

- sans texte de recherche, afficher tous les restaurants publiquement visibles du marché courant et les trier par distance ;
- avec un nom, une cuisine ou un autre filtre, rechercher uniquement dans le même marché ;
- ne jamais appliquer le rayon de 10 km comme filtre d'éligibilité ;
- conserver la distance pour le classement, la carte, le trajet et l'information utilisateur.

Un lien direct vers la fiche d'un restaurant d'un autre marché peut rester consultable, mais la fiche doit indiquer que la commande est indisponible depuis la zone courante.

### 2.5 Commande restaurant

Dans la politique initiale stricte convenue, une commande exige :

1. un restaurant affecté à un marché publié dont la capacité Restaurants est `active` ;
2. une position actuelle du client suffisamment fraîche ;
3. le marché de la position actuelle identique à celui du restaurant ;
4. pour une livraison, une adresse matérialisée par des coordonnées ;
5. le marché du point de livraison identique à celui du restaurant.

Pour `sur_place` et `emporter`, la position actuelle doit également appartenir au marché du restaurant.

Cette politique est propre aux restaurants et services locaux. Elle pourra être assouplie ultérieurement si Toutci permet explicitement de commander pour une autre personne, mais ce ne sera pas le comportement initial.

### 2.6 Transversalité des activités

La géographie est partagée, mais chaque activité conserve sa politique de découverte et de transaction.

| Activité | Contexte de découverte par défaut | Changement de destination | Règle transactionnelle initiale |
|---|---|---|---|
| Restaurants | Position actuelle | Non dans le parcours local principal | Position actuelle, livraison et restaurant dans le même marché |
| Résidences | Position actuelle | Oui, choix explicite d'une destination | Réservation distante autorisée |
| Événements | Position actuelle ou ville sélectionnée | Oui | Achat/réservation distante autorisé |
| Service ou livraison locale futur | Adresse où le service sera exécuté | Selon le métier | Prestataire et adresse de service dans le même marché |

Trois contextes doivent rester distincts dans les contrats :

```text
currentLocation      : position actuelle de l'appareil
destinationLocation  : ville ou point que le client souhaite explorer
serviceLocation      : adresse où la prestation ou la livraison sera exécutée
```

Le module géographique résout chacun de ces points de la même manière. Le module vertical décide ensuite lequel fait autorité.

Une personne située à Bouaké doit donc pouvoir choisir Abidjan comme destination et y réserver une résidence. À l'inverse, le domaine Restaurants applique la restriction locale définie à la section 2.5.

## 3. Choix technologiques open source

| Besoin | Choix | Rôle |
|---|---|---|
| Données géographiques | OpenStreetMap | Frontières et métadonnées sources |
| Extrait national | Geofabrik Côte d'Ivoire | Snapshot reproductible des données OSM |
| Extraction | Osmium Tool | Filtrage et export des relations administratives |
| Stockage spatial | PostgreSQL + PostGIS | Géométries, index et point-dans-polygone |
| Carte | MapLibre | Affichage des marchés et restaurants |
| Géocodage textuel | Photon, facultatif | Transformer une adresse en point ; jamais autorité de marché |
| Routage | OSRM, best-effort | Distance routière et itinéraire ; jamais autorité de marché |

Neon supporte PostGIS, mais l'extension devra être activée et testée indépendamment sur chaque base. `ST_Covers` sera utilisé pour inclure aussi un point situé exactement sur la frontière. Les frontières auront un index GiST.

Références : [PostGIS — ST_Covers](https://postgis.net/docs/manual-3.7/en/ST_Covers.html), [index spatiaux PostGIS](https://postgis.net/documentation/faq/spatial-indexes/), [compatibilité Neon](https://neon.com/docs/reference/compatibility), [extrait Côte d'Ivoire Geofabrik](https://download.geofabrik.de/africa/ivory-coast.html), [Osmium tags-filter](https://docs.osmcode.org/osmium/latest/osmium-tags-filter.html).

Le service public Photon peut rester une commodité pendant le pilote, mais il ne doit pas devenir une dépendance d'autorisation. À volume significatif, Photon ou un équivalent open source devra être auto-hébergé. Le même audit devra être fait séparément pour l'instance OSRM et le fournisseur de tuiles.

## 4. Architecture métier cible

### 4.1 Nouveau propriétaire métier

Créer `src/modules/service-markets`.

Surfaces prévues :

```text
src/modules/service-markets/
├── model.ts
├── contracts.ts
├── server.ts
└── _internal/
    ├── persistence.ts
    ├── resolution.ts
    ├── capabilities.ts
    ├── publication.ts
    └── import.ts
```

- `model.ts` : statuts, résultats discriminés, erreurs et règles déterministes ;
- `contracts.ts` : coordonnées, DTOs, commandes administratives et schémas Zod ;
- `server.ts` : façade `server-only` ;
- `_internal` : requêtes PostGIS, publication et persistance privées.

### 4.2 Dépendances autorisées

Le graphe cible devient :

```text
Restaurants ─────→ ServiceMarkets
Orders ──────────→ ServiceMarkets
Residences ──────→ ServiceMarkets
Events ──────────→ ServiceMarkets
ServiceMarkets ──→ infrastructure/db
ServiceMarkets ──→ Audit, uniquement pour les publications administratives
```

`ServiceMarkets` ne dépend d'aucun vertical. Restaurants, Résidences, Événements et futurs services l'utilisent sans lui déléguer leurs règles transactionnelles, ce qui évite les cycles et les couplages.

Chaque domaine conserve sa propre association :

```text
restaurants.service_market_id
residences.service_market_id
events.service_market_id
```

Ne pas créer de table polymorphe générique `entity_market`. Une telle table masquerait les propriétaires métier, compliquerait les contraintes référentielles et mélangerait des cycles de vie différents.

`ARCHITECTURE.md` devra être mis à jour avant l'introduction du module.

### 4.3 Migration A3 nécessaire

Les règles nouvelles ne doivent pas être ajoutées dans `src/lib`.

Avant l'intégration fonctionnelle :

- matérialiser la surface minimale `modules/restaurants` et y déplacer la politique de visibilité, les DTOs publics et les commandes de création/changement d'adresse concernées ;
- matérialiser la surface minimale `modules/orders` et y déplacer la création canonique de commande, son intention, ses erreurs et ses effets ;
- laisser dans `src/lib` uniquement des bridges temporaires de délégation, enregistrés dans `ARCHITECTURE.md` avec leur lot de suppression ;
- faire appeler les modules publics par les routes et Server Actions, sans nouvel import DB depuis `app`.

## 5. Modèle de données

### 5.1 Enums

Créer dans `service-markets/model.ts` :

```text
ServiceMarketStatus
- draft       : frontière en préparation administrateur
- published   : frontière publiée et utilisable par les activités
- archived    : marché géographique historique

ServiceMarketCapabilityStatus
- disabled    : activité non proposée dans ce marché
- prelaunch   : recrutement/préparation autorisé selon le vertical
- active      : activité ouverte aux clients
- paused      : activité temporairement suspendue

ServiceActivityType
- restaurant
- residence
- event

GeoAssignmentStatus
- assigned
- outside_published_market
- ambiguous
- pending_review
```

### 5.2 `geo_source_areas`

Stocke les unités géographiques importées, sans décision commerciale.

Champs principaux :

- `id` UUID ;
- `source = osm` ;
- `source_type = relation` ;
- `source_ref` texte unique, par exemple `osm:relation:<id>` ;
- `source_version` ;
- `name` et `name_local` ;
- `country_code` ISO 3166-1 alpha-2, initialement `CI` ;
- `admin_level`, nullable car il varie selon les pays ;
- `tags` JSONB ;
- `geometry geometry(MultiPolygon, 4326)` ;
- `geometry_checksum` ;
- `source_updated_at` et `imported_at`.

Contraintes : géométrie non vide, SRID 4326, géométrie valide après normalisation. Ajouter un index GiST sur `geometry` et un index unique sur `(source, source_ref, source_version)`.

### 5.3 `service_markets`

Stocke l'identité et le cycle de vie du marché.

Champs principaux :

- `id` UUID ;
- `code` immuable et unique, par exemple `CI-ABIDJAN` ;
- `name` ;
- `country_code` ;
- `status`, limité au cycle de vie géographique ;
- `active_version_id`, nullable avant publication ;
- `created_at`, `updated_at`, `published_at`, `archived_at`.

Un marché n'est jamais supprimé physiquement après avoir reçu une commande.

### 5.4 `service_market_capabilities`

Sépare l'existence géographique d'un marché de l'ouverture d'une activité.

Champs principaux :

- `service_market_id` ;
- `activity_type` ;
- `status` ;
- `created_at`, `updated_at`, `prelaunch_at`, `activated_at`, `paused_at` ;
- clé unique `(service_market_id, activity_type)`.

Exemple :

```text
CI-ABIDJAN / restaurant / active
CI-ABIDJAN / residence  / prelaunch
CI-ABIDJAN / event      / active
CI-BOUAKE  / restaurant / active
CI-BOUAKE  / residence  / active
CI-BOUAKE  / event      / paused
```

Un changement de capacité est une commande métier auditée. Il ne crée pas une nouvelle version de frontière.

### 5.5 `service_market_versions`

Chaque publication de frontière est immuable.

Champs principaux :

- `id` UUID ;
- `service_market_id` ;
- `version` entier croissant ;
- `geometry geometry(MultiPolygon, 4326)` ;
- `geometry_checksum` ;
- `source_manifest` JSONB ;
- `created_by_user_id` ;
- `created_at`, `published_at`, `retired_at`.

Ajouter un index GiST sur `geometry` et une unicité `(service_market_id, version)`.

La géométrie publiée est calculée par union des unités incluses, avec possibilité future de soustraire une unité explicitement exclue.

### 5.6 `service_market_version_areas`

Table de provenance entre une version de marché et ses unités OSM :

- `service_market_version_id` ;
- `geo_source_area_id` ;
- `operation = include | exclude` ;
- clé primaire composite.

Cette table explique précisément comment une frontière commerciale a été construite.

### 5.7 Associations par vertical

Chaque module vertical conserve son association au marché dans sa propre table :

- `restaurants.service_market_id` ;
- `residences.service_market_id` lors de l'intégration Résidences ;
- `events.service_market_id` lors de l'intégration Événements.

La version géographique utilisée lors de l'affectation peut aussi être conservée par le vertical. Le module `service-markets` fournit la résolution, mais n'enregistre pas lui-même une entité étrangère.

### 5.8 Restaurants

Ajouter progressivement à `restaurants` :

- `service_market_id`, nullable pendant le backfill puis requis pour toute publication ;
- `service_market_version_id` ;
- `geo_assignment_status` ;
- `geo_assigned_at`.

Conserver temporairement `ville` comme champ d'affichage legacy, mais :

- ne plus l'utiliser pour filtrer ou autoriser ;
- ne plus laisser le restaurateur l'écrire librement ;
- remplacer les index `ville` par un index composite/partiel sur le marché et la visibilité ;
- programmer sa suppression ou sa transformation en libellé dérivé après stabilisation.

Index principal envisagé : restaurants publiquement visibles par `service_market_id`, avec conditions `actif = true` et `suspendu = false`.

### 5.9 Clients

Ne pas ajouter de ville d'autorisation au profil client.

L'adresse par défaut reste une préférence. Un éventuel `default_address_market_id` ne pourra servir que de cache d'affichage et devra toujours être recalculé au checkout.

### 5.10 Commandes restaurant

Ajouter à `commandes` :

- `service_market_id` ;
- `service_market_version_id` ;
- `client_location_captured_at` ;
- `client_location_accuracy_m` ;
- éventuellement `geo_policy_version` pour identifier la politique appliquée.

Les coordonnées actuelles brutes du client ne sont pas conservées par défaut. Seul le marché résolu, la fraîcheur et la précision nécessaires à l'audit sont stockés. Les coordonnées de livraison existantes restent conservées puisqu'elles sont nécessaires à l'exécution de la livraison.

Ajouter une contrainte DB garantissant que, pour `mode_commande = livraison`, adresse, latitude et longitude de livraison sont toutes présentes. Pour les autres modes, elles peuvent être nulles.

## 6. Résolution géographique

### 6.1 API métier

La façade du module expose notamment :

```text
resolveServiceMarketAtPoint(input, options)
resolvePublishedServiceMarketAtPoint(input, executor?)
getServiceMarketCapability(marketId, activityType, executor?)
requireActiveServiceMarketCapability(marketId, activityType, executor?)
buildServiceMarketVersion(command)
publishServiceMarketVersion(command)
```

Entrée de position :

```text
lat
lng
accuracyMeters
capturedAt
```

Résultat discriminé :

```text
resolved
invalid_coordinates
stale_location
imprecise_location
unserved_area
ambiguous_market
```

La résolution géographique ne retourne pas `market_paused`, car une pause appartient à une activité. Après `resolved`, le vertical interroge sa capacité et peut obtenir `disabled`, `prelaunch`, `active` ou `paused`.

### 6.2 Requête PostGIS

La résolution utilise une requête paramétrée équivalente à :

```sql
SELECT market_id, version_id
FROM published_service_market_boundaries
WHERE status = 'published'
  AND ST_Covers(
    geometry,
    ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)
  );
```

Règles :

- zéro résultat : zone non desservie ;
- un résultat : marché résolu ;
- plusieurs résultats : configuration ambiguë, requête refusée et alerte interne ;
- un point sur la frontière appartient au marché grâce à `ST_Covers` ;
- la publication d'une frontière qui chevauche un autre marché publié est bloquée avant d'atteindre la production.

La requête de résolution ne filtre jamais directement sur `activity_type`. La vérification de `service_market_capabilities` est une deuxième opération métier explicite afin de ne pas confondre la frontière et l'ouverture commerciale.

### 6.3 Précision et fraîcheur

Valeurs initiales à tester sur appareils réels :

- découverte : position âgée de 15 minutes maximum ;
- checkout : position âgée de 5 minutes maximum ;
- précision maximale indicative : 1 000 m pour la découverte, 500 m pour commander.

Ces seuils doivent vivre dans le modèle propriétaire ou dans une configuration administrable clairement identifiée, pas dans les composants UI.

À proximité d'une frontière, si le cercle d'incertitude de la position traverse la limite, retourner `imprecise_location` et demander une nouvelle localisation plus précise.

## 7. Import OpenStreetMap

### 7.1 Principe

L'import est une tâche administrative hors du runtime Next.js. Aucun téléchargement PBF ni traitement Osmium ne doit être exécuté dans une requête Vercel.

Créer :

```text
scripts/geo/
├── download-country-extract.sh
├── extract-admin-boundaries.sh
├── import-boundaries.ts
├── validate-boundaries.ts
└── fixtures/
```

Les scripts shell utilisent Osmium dans un conteneur versionné. Le script TypeScript charge uniquement un fichier préparé et validé dans une table de staging.

### 7.2 Pipeline reproductible

1. Télécharger un snapshot Geofabrik explicitement daté, pas un `latest` publié aveuglément.
2. Vérifier taille et somme SHA-256.
3. Enregistrer URL, date OSM, date de téléchargement, outils et versions dans un manifeste.
4. Filtrer les relations `boundary=administrative` avec leurs objets référencés.
5. Exporter en GeoJSON/GeoJSONSeq.
6. Normaliser en `MultiPolygon`, SRID 4326, orientation et validité.
7. Charger dans une table de staging.
8. Comparer aux unités déjà importées par `source_ref`, version et checksum.
9. Produire un rapport : ajout, modification, suppression, aire et validité.
10. Promouvoir les lignes validées dans `geo_source_areas` dans une transaction.

### 7.3 Contrôles obligatoires

- aucun polygone vide ;
- `ST_IsValid = true` après `ST_MakeValid` contrôlé ;
- aire plausible et variation expliquée ;
- pays attendu ;
- relation et nom attendus ;
- aucun marché publié ne devient vide ;
- aucun chevauchement entre marchés publiés ;
- liste des restaurants qui changeraient de marché ;
- liste des restaurants qui sortiraient de toute zone.

Une mise à jour OSM ne publie jamais automatiquement une nouvelle frontière commerciale. Elle crée un brouillon à vérifier.

### 7.4 Licence et attribution

- conserver le manifeste de source avec chaque version ;
- ajouter `© OpenStreetMap contributors` sur la carte ou dans l'attribution visible ;
- documenter l'ODbL et la procédure de redistribution des données dérivées ;
- ne pas mélanger silencieusement une frontière propriétaire avec la version OSM.

## 8. Administration des marchés

Créer une vue `/admin/zones` ou `/admin/marches` permettant :

- lister les marchés et leur statut ;
- voir la version géographique publiée et la provenance OSM ;
- voir et modifier séparément les capacités Restaurants, Résidences, Événements et futures activités ;
- créer une version brouillon à partir d'unités importées ;
- afficher le polygone et ses unités sur MapLibre ;
- comparer la version publiée et la version brouillon ;
- afficher les restaurants affectés, déplacés ou non classés ;
- lancer les validations géométriques ;
- publier avec confirmation explicite ;
- publier ou archiver une frontière géographique ;
- passer une activité de `disabled` à `prelaunch`, `active` ou `paused` sans affecter les autres activités ;
- consulter l'historique des versions et l'audit.

La publication d'une frontière et le changement d'une capacité sont deux commandes métier distinctes, atomiques, réservées à l'administrateur et auditées. Une publication reste impossible si les validations géographiques sont rouges.

## 9. Parcours restaurant

### 9.1 Onboarding

1. Le restaurateur saisit l'adresse ou choisit « utiliser ma position ».
2. Un marqueur MapLibre est affiché et ajustable.
3. Les coordonnées sont obligatoires.
4. Le serveur résout le marché depuis ces coordonnées.
5. Le nom du marché est affiché en lecture seule.
6. La commande de création écrit restaurant et affectation géographique de façon atomique.

Résultats :

- marché publié avec capacité Restaurants `active` : onboarding normal ;
- marché publié avec capacité Restaurants `prelaunch` : dossier accepté comme préinscription, non publié aux clients ;
- capacité Restaurants `disabled` ou `paused` : comportement explicite selon la politique de recrutement, sans déduire l'état des autres activités ;
- aucune zone connue : proposition de liste d'attente ou refus explicite, jamais attribution à Abidjan ;
- plusieurs marchés : blocage et signalement administrateur.

### 9.2 Modification de l'adresse

Créer une commande dédiée, distincte de la mise à jour générique du profil :

```text
changeRestaurantLocation()
```

Elle doit :

- valider les coordonnées ;
- recalculer le marché ;
- écrire adresse, coordonnées et affectation ensemble ;
- invalider les caches de l'ancien et du nouveau marché ;
- remettre le restaurant en revue administrateur si le marché change ;
- empêcher une incohérence partielle en cas d'échec.

Le texte `ville` ne doit plus être modifiable directement.

### 9.3 Backfill des restaurants existants

Créer un script dry-run puis apply :

1. lire chaque restaurant et valider ses coordonnées ;
2. résoudre sa position avec les frontières publiées ;
3. classer en `assigned`, `outside_published_market` ou `ambiguous` ;
4. générer un CSV/rapport avant toute écriture ;
5. faire vérifier les cas anormaux ;
6. appliquer les affectations par lots idempotents ;
7. ne rendre obligatoire `service_market_id` pour un restaurant public qu'après résolution de tous les cas actifs.

## 10. Contextes de localisation et parcours client

### 10.1 Choix du contexte par activité

Le socle client manipule un `LocationContext`, mais ne choisit pas à la place du vertical la localisation qui fait autorité.

- Restaurants : `currentLocation` détermine la découverte ; `serviceLocation` représente la livraison.
- Résidences : `currentLocation` propose le marché initial ; `destinationLocation` choisie par le client détermine la recherche.
- Événements : `currentLocation` ou `destinationLocation` selon le parcours.
- Services locaux futurs : `serviceLocation` détermine prioritairement l'éligibilité.

Le changement de destination est une action explicite et visible. Il ne modifie pas artificiellement la position GPS courante.

### 10.2 Nouveau hook de position actuelle

Remplacer le hook actuel par une machine d'état dont les coordonnées sont nulles avant autorisation :

```text
idle
requesting
resolved
permission_denied
unavailable
stale
imprecise
unserved
```

L'état `resolved` contient coordonnées, précision, date de capture et marché retourné par le serveur.

Supprimer totalement le fallback silencieux vers le centre d'Abidjan.

### 10.3 Politique de rafraîchissement

- permission déjà accordée : actualisation automatique à l'ouverture ;
- permission inconnue : écran explicatif puis bouton déclenchant la demande ;
- retour de l'onglet au premier plan : actualisation si la position est ancienne ;
- déplacement significatif observé : nouvelle résolution ;
- checkout restaurant : acquisition fraîche obligatoire ;
- `watchPosition` uniquement lorsque la carte est active et visible, avec nettoyage à la fermeture ;
- ne pas appeler PostGIS ou Photon à chaque variation GPS insignifiante.

### 10.4 Changement du marché courant

Si le client passe de Bouaké à Abidjan :

- remplacer le catalogue par celui d'Abidjan ;
- fermer la sélection d'un restaurant de Bouaké ;
- conserver le panier sans le supprimer automatiquement ;
- afficher que ce panier n'est plus commandable depuis la zone actuelle ;
- proposer de le vider avec confirmation ;
- bloquer de toute façon la commande côté serveur.

Un marché de destination Résidences ou Événements sélectionné manuellement n'est pas remplacé automatiquement lors d'un mouvement GPS. L'interface peut proposer « revenir près de moi », mais ne doit pas détruire le choix de destination.

### 10.5 Absence de localisation

Pour le parcours Restaurants local, conformément à la décision produit actuelle :

- ne pas charger de restaurants en utilisant un centre par défaut ;
- afficher pourquoi la localisation est nécessaire ;
- permettre de redemander la permission ;
- distinguer refus, absence d'API, timeout, précision insuffisante et zone non desservie ;
- offrir éventuellement une inscription à l'ouverture future d'une zone, sans permettre de commander.

Pour les Résidences et Événements, l'absence de GPS ne doit pas bloquer toute l'activité : le client peut sélectionner explicitement une destination. La réservation reste soumise à la capacité du vertical dans le marché choisi, pas au marché de la position courante.

## 11. APIs client

### 11.1 Résolution de position

Ajouter un adaptateur :

```text
POST /api/v1/client/location/resolve
```

Corps : coordonnées, précision, date de capture et type de contexte indicatif. Réponse : résultat géographique, DTO minimal du marché et capacités commerciales consultables. Le type de contexte n'altère jamais le calcul point-dans-polygone.

La route accepte les visiteurs anonymes avec un rate limit dédié. Elle ne stocke pas leur position.

### 11.2 Recherche restaurants

Créer progressivement :

```text
POST /api/v1/client/restaurants/search
```

Le corps contient localisation, recherche, cuisine, mode, page et limite. Utiliser POST évite de placer les coordonnées dans l'URL, l'historique et certains journaux intermédiaires.

Le serveur :

1. résout le marché ;
2. exige la capacité Restaurants `active` ;
3. requête seulement les restaurants de ce marché ;
4. applique visibilité, cuisine, mode et recherche en SQL ;
5. calcule ou trie la distance ;
6. pagine après le tri ;
7. renvoie le marché et la capacité dans les métadonnées.

L'ancien `GET /restaurants` reste temporairement compatible, puis est déprécié après migration du web et des clients mobiles documentés.

### 11.3 Détail restaurant

La fiche publique par slug reste accessible. Avec une localisation fournie, elle expose :

- `sameServiceMarket` ;
- `orderable` ;
- `orderabilityReason` ;
- distance et itinéraire best-effort.

Le DTO ne doit jamais confondre hors ligne, suspension administrative et marché différent.

### 11.4 Recherche SQL et cache

Remplacer le chargement global de tous les restaurants par une requête possédée par `modules/restaurants`.

Index :

- B-tree/partiel sur `service_market_id` pour les restaurants visibles ;
- index sur les filtres réellement utilisés ;
- `pg_trgm` sur le nom seulement si les mesures nationales le justifient.

Le cache, s'il reste activé, est segmenté par marché et filtres non personnels. La distance dépendant du client n'est pas mise en cache dans une liste globale.

### 11.5 Futures recherches Résidences et Événements

Les futurs endpoints utilisent le même résolveur mais des contrats différents :

- recherche Résidences : `destinationLocation` ou `serviceMarketCode` issu d'un sélecteur de destination, capacité Résidences `active` ;
- recherche Événements : marché courant ou destination sélectionnée, capacité Événements `active` ;
- réservation : validation possédée par le vertical, sans règle automatique `currentLocation = destinationLocation`.

Un code de marché choisi dans un sélecteur peut servir à rechercher une destination car il exprime une intention explicite, mais il ne remplace jamais une résolution serveur lorsqu'une adresse physique doit être validée.

## 12. Validation de commande restaurant

### 12.1 Contrat

Ajouter à l'intention HTTP une `currentLocation` :

```text
lat
lng
accuracyMeters
capturedAt
```

Pour une livraison, exiger ensemble :

- `adresseLivraison` ;
- `latitudeLivraison` ;
- `longitudeLivraison`.

Le client n'envoie pas de `serviceMarketId` faisant autorité.

### 12.2 Prévalidation UX

Avant l'écran final ou avant le choix du paiement, appeler une prévalidation sans écriture qui vérifie :

- fraîcheur et précision de la position ;
- marché actuel ;
- marché du point de livraison ;
- marché et disponibilité du restaurant.

Cette prévalidation améliore l'expérience mais n'autorise rien. La commande canonique répète toutes les vérifications.

### 12.3 Validation transactionnelle définitive

Dans `createRestaurantOrder()` migré vers `modules/orders` :

1. normaliser l'intention et vérifier l'idempotence ;
2. verrouiller/lire le restaurant ;
3. charger son `service_market_id` et sa version ;
4. vérifier visibilité, statut en ligne et mode de commande ;
5. résoudre la position actuelle avec le même exécuteur transactionnel ;
6. pour une livraison, résoudre le point de livraison ;
7. exiger l'égalité de tous les marchés ;
8. seulement ensuite valider menu, montants et paiements ;
9. insérer la commande avec snapshot du marché ;
10. créer transaction financière et effets existants.

Aucune tentative Paystack et aucune commission ne doivent être créées après un échec géographique.

La position courante est une donnée d'autorisation éphémère et doit être exclue du hash d'intention idempotent. Les coordonnées de livraison, elles, restent dans le hash de l'intention commerciale.

### 12.4 Erreurs métier

Ajouter des codes stables :

```text
CURRENT_LOCATION_REQUIRED
CURRENT_LOCATION_STALE
CURRENT_LOCATION_IMPRECISE
DELIVERY_LOCATION_REQUIRED
LOCATION_OUTSIDE_SERVICE_MARKET
RESTAURANT_OUTSIDE_SERVICE_MARKET
SERVICE_MARKET_MISMATCH
SERVICE_MARKET_AMBIGUOUS
RESTAURANT_ACTIVITY_UNAVAILABLE
```

Chaque route traduit ces codes en statuts HTTP et messages cohérents sans reconstruire la règle.

## 13. Sécurité et confidentialité

- ne jamais faire confiance à un nom de ville ou un identifiant de marché envoyé par le client pour autoriser une adresse physique ;
- accepter un code de marché explicitement sélectionné uniquement comme intention de destination pour les verticals qui autorisent la recherche distante ;
- résoudre les coordonnées côté serveur ;
- valider latitude, longitude, précision et date ;
- reconnaître que les coordonnées navigateur peuvent être simulées : ce contrôle est une cohérence de service, pas une preuve anti-fraude absolue ;
- ne jamais écrire les coordonnées courantes anonymes dans les logs ;
- journaliser seulement résultat, marché, version et code d'échec ;
- utiliser POST pour les coordonnées sensibles ;
- conserver les coordonnées de livraison selon la politique de rétention des commandes ;
- ne pas conserver l'historique des mouvements du client ;
- protéger publication/import avec le garde administrateur et l'audit transactionnel ;
- protéger séparément les changements de capacité de chaque activité ;
- conserver les règles d'autorisation dans le module vertical propriétaire ;
- appliquer rate limiting à la résolution et à la recherche.

## 14. Observabilité

Ajouter des métriques sans coordonnées brutes :

- résolutions par résultat et marché ;
- état des capacités par marché et activité ;
- taux de permission refusée côté client ;
- positions trop anciennes ou imprécises ;
- zones non desservies ;
- ambiguïtés et chevauchements ;
- restaurants sans marché ;
- changements de marché de restaurants ;
- commandes refusées pour mismatch ;
- recherches et réservations distantes Résidences/Événements par destination ;
- version de frontière utilisée par les commandes ;
- latence de résolution PostGIS et de recherche par marché.

Alertes :

- apparition d'un résultat ambigu en production ;
- hausse brutale des zones non desservies dans un marché connu ;
- restaurant public sans marché ;
- activité utilisée dans un marché dont la capacité n'est pas `active` ;
- publication rendant des restaurants actifs non classés ;
- régression importante de latence.

## 15. Stratégie de tests

### 15.1 Tests purs

- validation des coordonnées et de la fraîcheur ;
- transitions du cycle géographique et des capacités par activité ;
- indépendance des capacités : suspendre Événements ne suspend pas Restaurants ou Résidences ;
- classification visibilité/commandabilité/marché ;
- mapping des erreurs ;
- politique de panier lors d'un changement de marché.

### 15.2 Tests PostGIS

Sur une base de test distincte avec extension activée :

- point central dans Abidjan ;
- point central dans Bouaké ;
- point extérieur ;
- point exactement sur une frontière ;
- trou dans un multipolygone ;
- deux marchés chevauchants refusés ;
- géométrie invalide refusée ou normalisée explicitement ;
- index GiST utilisé avec `EXPLAIN` sur la requête de résolution ;
- résolution identique avec client Neon HTTP et exécuteur transactionnel.

### 15.3 Tests import

- fixtures GeoJSON petites et versionnées ;
- import idempotent ;
- changement de checksum ;
- source supprimée ;
- manifeste incomplet ;
- mauvais pays ;
- variation d'aire anormale ;
- dry-run sans écriture.

### 15.4 Tests restaurants

- onboarding dans un marché publié avec capacité Restaurants `active` ;
- préinscription avec capacité Restaurants `prelaunch` ;
- capacité Résidences active mais Restaurants désactivée : onboarding restaurant refusé/préinscrit selon la politique ;
- coordonnées hors zone ;
- changement d'adresse dans le même marché ;
- changement de marché avec revue ;
- invalidation des deux caches ;
- restaurant hors ligne toujours visible ;
- restaurant suspendu invisible.

### 15.5 Tests recherche

- sans texte : tous les restaurants du marché, triés par distance ;
- avec nom : restaurant éloigné du même marché trouvé ;
- restaurant homonyme d'un autre marché absent ;
- aucun rayon de 10 km ;
- cuisine et mode composés avec le marché ;
- pagination stable ;
- aucune requête avant résolution de localisation.

### 15.6 Tests commandes

- client Abidjan + restaurant Abidjan + livraison Abidjan : accepté ;
- client Bouaké + restaurant Bouaké + livraison Bouaké : accepté ;
- client Abidjan + restaurant Bouaké : refusé ;
- livraison d'un autre marché : refusée ;
- coordonnées manquantes ou partielles : refusées ;
- position ancienne ou imprécise : refusée ;
- restaurant hors ligne : visible mais commande refusée ;
- aucune écriture financière après refus géographique ;
- idempotence conservée ;
- snapshot du marché et de la version enregistré.

### 15.7 Tests navigateur

- permission inconnue, accordée, refusée et timeout ;
- suppression du fallback Abidjan ;
- déplacement simulé Abidjan vers Bouaké ;
- changement de catalogue ;
- panier provenant de l'ancien marché ;
- prévalidation checkout ;
- carte, zoom +/- et focus restaurant préservés ;
- messages accessibles et utilisables sur mobile.

### 15.8 Tests transversaux Résidences et Événements

- client à Bouaké recherchant volontairement une résidence à Abidjan : résultats Abidjan ;
- réservation de cette résidence autorisée sans exiger `currentLocation = destinationLocation` ;
- changement GPS sans écraser une destination explicitement choisie ;
- GPS refusé mais destination Résidences choisie manuellement : recherche autorisée ;
- capacité Résidences `paused` à Abidjan : réservation bloquée sans modifier Restaurants ;
- capacité Événements `active` et Restaurants `paused` dans le même marché : comportements indépendants ;
- adresse physique d'un futur service local : résolution serveur obligatoire malgré un code de destination fourni.

## 16. Déploiement progressif

### Lot 0 — Cadrage et preuve géographique

- identifier les relations OSM exactes ;
- générer les deux périmètres sur une carte ;
- valider visuellement les 13 communes d'Abidjan et la commune de Bouaké ;
- tester des coordonnées de restaurants existants et des points aux limites ;
- figer un manifeste OSM initial.

**Critère de sortie :** périmètres approuvés et aucun doute sur les zones exclues.

### Lot 1 — Socle PostGIS et architecture

- mettre à jour `ARCHITECTURE.md` ;
- créer `service-markets` ;
- activer PostGIS en migration ;
- créer tables, capacités par activité, contraintes et index ;
- ajouter tests de migration et d'architecture.

**Critère de sortie :** migrations réversibles testées, résolution point-polygone opérationnelle en test.

### Lot 2 — Import OSM et administration

- construire l'import staging/dry-run/apply ;
- importer les unités initiales ;
- créer les versions brouillon ;
- ajouter la visualisation admin, la matrice des capacités et les validations ;
- publier Abidjan et Bouaké en mode non bloquant.

**Critère de sortie :** versions publiées, provenance et audit consultables.

### Lot 3 — Restaurants et backfill

- migrer la surface Restaurants A3 nécessaire ;
- configurer la capacité Restaurants indépendamment des futures capacités ;
- ajouter affectation géographique à la création et au changement d'adresse ;
- exécuter le dry-run de backfill ;
- corriger les coordonnées anormales ;
- appliquer le backfill ;
- segmenter les caches.

**Critère de sortie :** tous les restaurants publics sont affectés sans ambiguïté.

### Lot 4 — Localisation et recherche client Restaurants

- remplacer le hook et supprimer le fallback ;
- ajouter résolution serveur ;
- créer la recherche par marché ;
- migrer web puis clients API ;
- conserver distance, carte, zoom et itinéraires ;
- activer d'abord un mode d'observation comparant ancienne et nouvelle sélection.

**Critère de sortie :** recherche par nom et découverte cohérentes dans les deux marchés.

### Lot 5 — Commandes restaurant

- migrer la surface Orders A3 nécessaire ;
- renforcer les contrats de livraison ;
- ajouter prévalidation ;
- ajouter validation transactionnelle et snapshots ;
- observer les refus potentiels sans bloquer pendant une courte phase ;
- activer ensuite l'enforcement.

**Critère de sortie :** aucune commande inter-marché et aucune écriture financière après refus.

### Lot 6 — Nettoyage

- retirer `rayon` des contrats et hooks ;
- déprécier puis retirer l'ancien endpoint de recherche ;
- supprimer les index fondés sur `ville` ;
- cesser l'écriture libre de `ville` ;
- supprimer les bridges A3 arrivés à échéance ;
- mettre à jour la documentation API et opérationnelle.

**Critère de sortie :** aucune autorisation ou recherche ne dépend du texte ville ou d'un rayon.

### Lot 7 — Extension nationale

Pour chaque nouvelle ville :

1. importer/mettre à jour ses unités OSM ;
2. créer le marché en `draft` ;
3. vérifier le périmètre avec une personne connaissant le terrain ;
4. publier la version géographique ;
5. créer les capacités nécessaires, initialement `disabled` ;
6. passer uniquement Restaurants en `prelaunch` si le recrutement commence ;
7. contrôler coordonnées et couverture ;
8. passer Restaurants en `active` sans modifier Résidences ou Événements ;
9. surveiller les métriques par activité.

L'extension à un autre pays ajoute une configuration de source, des marchés et leurs capacités ; elle ne change pas l'algorithme. Aucun `admin_level` universel ne doit être codé pour toute l'Afrique.

### Lot 8 — Intégration d'un nouveau vertical

Pour Résidences, Événements ou une autre activité :

1. déclarer son `ServiceActivityType` ;
2. ajouter la clé `service_market_id` dans la table possédée par ce vertical ;
3. définir explicitement le contexte par défaut et le contexte faisant autorité ;
4. créer ses capacités par marché sans toucher aux autres activités ;
5. intégrer le sélecteur de destination si les transactions distantes sont autorisées ;
6. conserver les règles de réservation/commande dans le module vertical ;
7. ajouter tests d'indépendance, de destination et d'autorisation ;
8. activer le vertical marché par marché.

**Critère de sortie :** le nouveau vertical réutilise la géographie sans importer les restrictions propres aux restaurants.

## 17. Mode d'observation, activation et retour arrière

Ajouter un mode technique temporaire :

```text
off      : ancien comportement du vertical, seulement pendant sa migration
shadow   : calcul de sa politique de marché et métriques, sans blocage
enforce  : politique géographique du vertical obligatoire
```

Le mode technique est appliqué par vertical. `restaurant=enforce` ne doit pas imposer l'enforcement à Résidences ou Événements. Les statuts géographiques et capacités commerciales restent des données métier en base ; le mode technique est une variable temporaire et documentée.

Retour arrière avant nettoyage :

- repasser de `enforce` à `shadow` ;
- ne pas supprimer les données géographiques ni snapshots ;
- conserver les colonnes nullable pendant la période d'observation ;
- restaurer l'ancien adaptateur uniquement si nécessaire, sans annuler les migrations de données.

Après validation du Lot 6, le retour au rayon n'est plus un scénario métier supporté. Une panne PostGIS doit produire une indisponibilité explicite, jamais un fallback silencieux vers Abidjan ou une recherche nationale.

## 18. Critères d'acceptation globaux

Le chantier est terminé lorsque :

- Abidjan et Bouaké disposent de versions de frontière publiées et validées ;
- chaque restaurant public appartient à un marché publié dont la capacité Restaurants est `active` ;
- aucun client sans localisation valide n'est silencieusement placé à Abidjan ;
- un client déplacé obtient automatiquement le catalogue de son marché courant ;
- la recherche par nom reste limitée au marché mais ignore le rayon ;
- tous les restaurants visibles du marché peuvent être trouvés, même hors ligne ;
- un restaurant hors ligne ne peut pas recevoir de commande ;
- une commande inter-marché est refusée avant toute écriture financière ;
- une résidence peut être recherchée et réservée dans une destination différente du marché GPS courant ;
- l'activation, la pause ou le pré-lancement d'une activité n'altère aucune autre activité ;
- chaque vertical choisit explicitement entre `currentLocation`, `destinationLocation` et `serviceLocation` ;
- le marché et sa version sont figés sur chaque commande ;
- les mises à jour OSM passent par brouillon, diff, validation et publication ;
- les cartes portent l'attribution OpenStreetMap ;
- lint, typecheck, tests unitaires, tests DB, architecture, build et recette navigateur passent ;
- la procédure d'ajout d'une nouvelle ville ou activité ne nécessite aucune modification de l'algorithme géographique.

## 19. Points de validation humaine avant le premier développement

Les choix suivants ne doivent pas être devinés par le code :

1. validation visuelle du périmètre des 13 communes d'Abidjan ;
2. validation visuelle de la commune de Bouaké et de ses parties rurales éventuelles ;
3. décision finale sur l'acceptation des préinscriptions Restaurants quand sa capacité n'est pas active ;
4. test réel des seuils de précision GPS sur plusieurs téléphones à Abidjan et Bouaké ;
5. validation du message présenté lorsqu'une zone n'est pas encore desservie ;
6. validation de la politique stricte imposant que position actuelle et adresse de livraison soient toutes deux dans le marché du restaurant.
7. matrice initiale des capacités Restaurants, Résidences et Événements pour Abidjan et Bouaké ;
8. politiques de destination et de réservation distante propres à Résidences et Événements.

Ces validations ne remettent pas en cause l'architecture. Elles déterminent seulement la configuration initiale et quelques règles de produit.
