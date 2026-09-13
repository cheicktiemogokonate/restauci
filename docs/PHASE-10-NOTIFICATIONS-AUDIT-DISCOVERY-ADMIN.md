# Phase 10 — Notifications, Audit, Discovery et administration

## Résultat

La phase 10 est terminée. Les notifications ont désormais des destinations
typées et vérifiables, Audit et Notifications projettent les mêmes événements
corrélés, l’administration lit des contrats publics ou un read model dédié, et
Discovery classe uniquement les établissements que leurs domaines propriétaires
ont déjà déclarés éligibles. Les projections causales sont contrôlables et
reconstructibles après incident.

## Décisions appliquées

- Les 235 notifications dont la destination n’existait plus ont été supprimées
  définitivement, conformément à la décision explicite donnée pendant la phase.
- Un événement métier est la source de corrélation commune ; les écritures Audit
  et Notifications sont des effets idempotents, inspectables et rejouables.
- Restaurants et Résidences restent propriétaires de leur éligibilité métier,
  géographique, KYC et quota. Discovery ne fait que configurer le classement,
  attribuer les placements et enregistrer l’attribution.
- Les pages admin ne lisent plus directement Drizzle ou l’infrastructure DB.

## Changements principaux

### Notifications et causalité

- Le module `notifications` expose les types, contrats, destinations et commandes
  publiques pour les propriétaires user, client et driver.
- Les notifications persistées portent, lorsqu’ils existent, `eventId` et
  `correlationId`. Une unicité partielle évite de projeter deux fois le même
  effet pour un même destinataire.
- Les événements couvrent les comptes et accès, abonnements, paiements, KYC,
  modérations Restaurant/Résidence, remboursements et actions système migrées.
- La réconciliation détecte les projections Audit/Notifications manquantes, les
  destinations orphelines et les dead letters ; le mode réparation peut rejouer
  les effets et purger les orphelines.

### Administration et Discovery

- `admin-projections` possède les lectures du tableau de bord, de l’activité et
  du centre d’actions ; les autres écrans consomment les serveurs publics de leur
  domaine propriétaire.
- Les anciennes requêtes admin restent seulement comme pont de compatibilité.
- Les recherches Restaurant et Résidence retournent des candidats déjà
  éligibles. Le modèle public Discovery applique ensuite le classement,
  l’exposition par offre et les jetons d’attribution.
- Les conversions Discovery sont enregistrées dans les adaptateurs API après la
  réussite de la commande ou de la réservation, sans cycle vers les domaines.

### Résolution réelle des composants

La recherche registry a été menée par fonction et par pattern, pas par simple
mot-clé visuel : `admin dashboard`, `data table`, `notification list` et
`audit timeline` dans beUI, puis `dashboard`, `sidebar`, `data table` et
`notification` dans shadcn/ui.

- beUI `Table`, déjà installé, reste le composant adapté au journal Audit
  (tri, sélection, colonnes et virtualisation disponibles).
- beUI `Tabs`, déjà installé, structure les vues Toutes / Non lues du centre de
  notifications.
- Le bloc shadcn/ui `dashboard-01` a fourni le shell de référence. Sa composition
  `SidebarProvider` / `Sidebar` / `SidebarInset` a été intégrée via le composant
  registry `sidebar`, sans écraser les primitives produit existantes.
- Les contrôles standards restent les primitives shadcn/ui accessibles : Card,
  Badge, Button, Alert et Tooltip.

## Migration de données

`0043_notifications_audit_discovery_admin.sql` ajoute les contraintes et index
de destination/corrélation, conserve le payload d’effet dans les reçus causaux,
installe les contrôles de destination et les fonctions de reconstruction, puis
supprime les 235 destinations orphelines identifiées. La migration a été
appliquée sur la base de développement autorisée.

## Validations

- `npm run db:migrate` : migration `0043` appliquée.
- `npm run causality:reconcile` : 0 anomalie, 0 réparation nécessaire, aucune
  dead letter et aucune destination orpheline.
- `npm run test:phase10` : 2 fichiers, 7 tests réussis.
- `npm run test:phase10:db` : 1 fichier, 3 tests transactionnels réussis.
- `npm run typecheck`, `npm run lint` et `git diff --check` : réussis.
- `npm run architecture:check` : 5 fichiers, 18 tests réussis ; 746 modules et
  2 391 dépendances analysés, aucune nouvelle violation.
- Suite complète en série : 88 fichiers réussis, 18 ignorés ; 413 tests réussis,
  70 ignorés.
- `npm run build` : réussi, 83 pages statiques générées.
- Diagnostic Next.js 16.3/Turbopack par le point MCP local : aucune erreur
  remontée par `get_compilation_issues`.

## Point de contrôle

Aucun blocage fonctionnel ne reste pour cette phase. La préférence utilisateur
« aucun navigateur sans autorisation explicite dans le message courant » est
désormais persistée dans `AGENTS.md`. La phase 11 n’a été ni lue ni démarrée et
requiert une nouvelle autorisation explicite.
