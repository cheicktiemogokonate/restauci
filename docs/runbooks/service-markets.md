# Runbook — marchés géographiques de service

Ce runbook exploite les marchés versionnés de TOUTCI sans coder Abidjan, Bouaké ou une division administrative dans les règles métier. Une frontière administrative OSM devient une unité source ; seule une composition approuvée devient un marché commercial.

## Principes de sécurité

- Utiliser exclusivement une base de test pour les répétitions et une sauvegarde vérifiée avant production.
- Ne jamais importer une URL `latest` ni publier une frontière sur la seule base de son nom.
- Ne jamais lancer un import ou un backfill `--apply` sans avoir lu le rapport dry-run.
- Garder `RESTAURANT_GEO_POLICY_MODE=shadow` tant que tous les restaurants publics ne sont pas affectés sans ambiguïté.
- Laisser Résidences et Événements sur `off` jusqu'à l'implémentation de leurs politiques propres ; leur destination peut différer de la position actuelle.

## 1. Installer le socle

1. Appliquer `npm run db:migrate` pendant une fenêtre de maintenance.
2. Vérifier `SELECT PostGIS_Version();` et la présence de `service_markets`, `service_market_versions`, `service_market_capabilities` et `geo_source_areas`.
3. Sur une base de test dédiée, exécuter `RUN_SERVICE_MARKETS_DB_TESTS=true npm test -- tests/service-markets-db.test.ts`.

## 2. Préparer les données OpenStreetMap

1. Choisir un snapshot Côte d'Ivoire daté et récupérer son SHA-256 auprès de la source.
2. Télécharger et vérifier :

   ```bash
   SOURCE_URL="URL_DATEE" EXPECTED_SHA256="SHA256" OUTPUT_PATH="data/ci-YYYY-MM-DD.osm.pbf" bash scripts/geo/download-country-extract.sh
   ```

3. Extraire les relations administratives avec Osmium :

   ```bash
   bash scripts/geo/extract-admin-boundaries.sh data/ci-YYYY-MM-DD.osm.pbf data/ci-admin-YYYY-MM-DD.geojson
   ```

4. Copier `scripts/geo/manifests/ci-priority-markets.example.json`, renseigner la source et faire vérifier visuellement les relations proposées pour le Grand Abidjan et Bouaké par une personne connaissant le terrain.
5. Valider le fichier :

   ```bash
   npm run geo:validate -- --geojson data/ci-admin-YYYY-MM-DD.geojson --country CI
   ```

## 3. Importer les unités, sans publier

Le dry-run crée une table temporaire PostGIS, normalise les polygones, contrôle validité/vide/doublons et compare les checksums :

```bash
npm run geo:import -- --geojson data/ci-admin-YYYY-MM-DD.geojson --manifest data/ci-YYYY-MM-DD.manifest.json
```

Après revue du rapport :

```bash
CONFIRM_GEO_IMPORT=APPLY npm run geo:import -- --apply --admin-id ADMIN_ID --geojson data/ci-admin-YYYY-MM-DD.geojson --manifest data/ci-YYYY-MM-DD.manifest.json
```

L'import est idempotent. Une même version OSM avec une géométrie différente est refusée au lieu d'être écrasée. Chaque promotion est auditée.

## 4. Composer et publier les marchés

1. Ouvrir `/admin/zones`.
2. Créer les marchés `abidjan` / « Grand Abidjan » et `bouake` / « Bouaké » en brouillon.
3. Sélectionner les unités OSM approuvées et composer une version. PostGIS fusionne les inclusions et conserve leur provenance.
4. Contrôler sur carte les communes incluses, les limites, les trous et des coordonnées connues. La publication doit rester bloquée en cas de géométrie vide/invalide ou de chevauchement avec un marché publié.
5. Publier la version. La précédente est retirée atomiquement et la commande est auditée.
6. Passer uniquement la capacité Restaurants à `prelaunch`, puis `active` après le backfill. Les capacités Résidences et Événements restent indépendantes.

## 5. Affecter les restaurants existants

Dry-run avec rapport CSV :

```bash
npm run geo:backfill-restaurants -- --report data/restaurants-market-report.csv
```

Corriger les coordonnées hors zone ou ambiguës, relancer jusqu'à zéro restaurant public problématique, puis :

```bash
CONFIRM_GEO_BACKFILL=APPLY npm run geo:backfill-restaurants -- --apply --report data/restaurants-market-applied.csv
```

## 6. Passage shadow → enforce

1. En `shadow`, surveiller les événements structurés `service-market-resolution` et `restaurant-order-geography` : résultat, marché, version, durée et code d'échec uniquement ; aucune coordonnée courante n'est loguée.
2. Vérifier pendant la période d'observation : absence d'ambiguïtés, volume des zones non desservies, restaurants sans marché, mismatch de commandes, latence PostGIS.
3. Activer `RESTAURANT_GEO_POLICY_MODE=enforce` seulement quand les critères sont verts.
4. En cas d'incident, revenir à `shadow`. Les frontières et snapshots historiques restent intacts ; il n'est pas nécessaire de supprimer des données.

## 7. Mise à jour OSM et extension nationale

Chaque snapshot suit exactement le même cycle : import → nouvelle version brouillon → diff et recette terrain → publication manuelle. Une mise à jour OSM ne publie jamais automatiquement. Une nouvelle ville de Côte d'Ivoire ajoute des données et une capacité ; elle ne change pas l'algorithme. Pour un autre pays africain, ajouter un manifeste et valider son découpage local sans supposer un `admin_level` universel.

## Licence et attribution

Les unités viennent d'OpenStreetMap et restent accompagnées de leur référence, version, tags, checksum et manifeste. Respecter l'ODbL pour les données dérivées et conserver l'attribution visible `© OpenStreetMap contributors` sur les cartes. OpenFreeMap/MapLibre restent des composants distincts dont les licences et attributions doivent également être conservées.
