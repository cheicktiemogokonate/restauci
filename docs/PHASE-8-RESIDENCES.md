# Phase 8 — Résidences

## Résultat

La verticale Résidences est désormais portée par son module métier de bout en
bout : collection de logements d'un compte, création et modification,
modération, publication, calendrier, réservation et annulation. Les droits
d'abonnement, l'identité et le profil de versement restent ceux du Partner
Account partagé ; aucune résidence ne copie son propre statut d'abonnement.

Une annulation payée ne se limite plus à signaler un remboursement manuel. La
commande d'annulation crée, dans la même transaction, une obligation de
remboursement intégral idempotente dans le journal financier. Elle ne prétend
pas que le remboursement fournisseur a déjà été exécuté.

## Changements principaux

- Les lectures et écritures partenaire/admin sont centralisées dans
  `src/modules/residences/server.ts`, avec des événements métier et audits
  corrélés pour les résidences, réservations, publications et périodes
  indisponibles.
- La migration `0041_residence_vertical_invariants.sql` garantit qu'une
  réservation appartient au même Partner Account que sa résidence et empêche
  en DB deux séjours actifs qui se chevauchent. Les intervalles de nuit restent
  semi-ouverts : un départ et une arrivée le même jour sont autorisés.
- Le quota public est évalué sur la collection du compte au moment transactionnel
  de la publication. Les écrans partenaire et admin montrent l'offre partagée,
  l'usage, le statut réel et la raison exacte d'un blocage.
- Les notifications du compte Résidence ont leur page et leurs destinations
  navigables. Une notification de réservation ouvre la réservation concernée ;
  identité, facturation et fiche Résidence ouvrent leur surface respective.
- Les compositions UI ont été déplacées sous
  `src/modules/residences/presentation/`. Les adaptateurs Next injectent leurs
  Server Actions et n'entrent plus dans la présentation.
- Les états vide, chargement, erreur, succès, désactivé et confirmation sont
  couverts sur les espaces de gestion concernés.

## Résolution des composants

La recherche a suivi l'ordre imposé par `app-components-registry`, sur les
registres eux-mêmes et non par approximation de mots-clés :

1. beUI a été interrogé pour les familles dashboard, table de données,
   calendrier et stepper ; son composant `table` et les contrôles déjà installés
   `Input`, `Select`, `Checkbox` et `Tabs` ont été retenus ;
2. shadcn/ui a été vérifié pour `dashboard-01`, `calendar` et `form`, puis
   conservé comme fondation des dialogues, confirmations, calendriers et
   formulaires structurés ;
3. aucun wizard de formulaire adapté n'existe dans ces résultats. Le
   `adaptive-stepper` beUI trouvé est un sélecteur numérique, pas un parcours
   multi-étapes : il n'a donc pas été détourné de sa sémantique.

Le shell partenaire existant reste cohérent avec le bloc dashboard shadcn. Les
anciens `<table>` et `<select>` écrits à la main dans la liste admin ont été
remplacés par les composants résolus, sans ajouter de nouvelle dépendance.

## Décisions métier

- Toute modification de la fiche d'une Résidence remet sa publication en
  vérification. Une fiche de logement engage le séjour (localisation, capacité,
  prix, photos et description) ; cette remodération est donc une politique
  Résidences explicite. La politique différente du profil Restaurant n'est pas
  modifiée par cette phase.
- Une réservation payée annulée crée une obligation de remboursement du montant
  total, avec la clé idempotente `residence-cancellation:<reservationId>`.
- Une période annulée ne bloque pas le calendrier. Les périodes en attente de
  paiement ou confirmées le bloquent et la contrainte DB protège aussi les
  écritures concurrentes.
- Le diagnostic de reprise sur la base autorisée a trouvé zéro ancienne
  réservation payée annulée sans obligation de remboursement ; aucun backfill
  destructif n'était nécessaire.

## Validations exécutées

- `npm run typecheck` : réussi.
- `npm run lint` : réussi.
- `npm run test:phase8` : 2 fichiers, 21 tests réussis.
- `npm run test:phase8:db` : 3 tests Neon réussis, couvrant propriété,
  anti-chevauchement et annulation payée atomique.
- `npm run architecture:check` : 5 fichiers, 18 tests réussis ; 730 modules et
  2 349 dépendances analysés, aucune nouvelle violation.
- `npm test -- --maxWorkers=1 --no-file-parallelism --testTimeout=600000` :
  84 fichiers réussis, 16 ignorés ; 400 tests réussis, 64 ignorés.
- `npm run db:migrate` : migration `0041` appliquée sur la base Neon de
  développement autorisée.
- Next dev/Turbopack : toutes les routes compilent, zéro erreur de session ou de
  configuration ; recherche publique Résidences manipulée dans un navigateur
  réel avec résultat et état vide vérifiés.
- `npm run build` : compilation et TypeScript réussis ; le prérendu global reste
  bloqué sur `/restaurateur/commandes` par `Session partenaire requise`, blocage
  déjà consigné et hors Phase 8.
- `git diff --check` : réussi.

La vérification navigateur des pages authentifiées s'est arrêtée à la redirection
attendue vers `/login`, faute de session partenaire restaurée. Leur compilation,
leurs frontières, leurs actions et leurs invariants sont couverts par les autres
validations ci-dessus.

## Point d'arrêt

Phase 8 terminée. Prochaine phase du plan : Phase 9 — Clients, Orders,
Commissions et Deliveries, uniquement après autorisation explicite.
