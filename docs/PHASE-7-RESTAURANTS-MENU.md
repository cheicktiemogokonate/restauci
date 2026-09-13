# Phase 7 — Restaurants et Menu

## Résultat

La verticale Restaurant/Menu est désormais portée par ses modules métier : un
compte Restaurant ne lit et ne modifie que son établissement, ses catégories,
ses plats, ses créneaux et ses droits effectifs. Les adaptateurs migrés ne
touchent plus directement Drizzle et les écrans métier vivent dans les surfaces
`presentation/` de leurs propriétaires.

La réorganisation demandée regroupe aussi les espaces partenaires sous le route
group Next.js `src/app/(dashboard)/(partenaire)/`. Les sous-arbres
`partenaire/` et `restaurateur/` restent explicites pour distinguer les rôles ;
les URL publiques `/partenaire/*` et `/restaurateur/*` ne changent pas.

## Changements principaux

- `restaurants` possède maintenant l'accès propriétaire, le profil, les
  horaires, les états de visibilité/commande, les lectures publiques, les
  métriques et l'administration Restaurant.
- `menu` possède catégories, plats, créneaux, disponibilité, publication,
  quotas et lectures publiques. Une catégorie ou un créneau d'un autre
  Restaurant est refusé dans le domaine et par des contraintes DB composites.
- La migration `0040_restaurant_menu_ownership.sql` renforce l'appartenance des
  catégories, plats et créneaux, et garantit l'unicité normalisée des catégories
  dans un Restaurant.
- Les quotas Restaurant/Menu utilisent une sélection déterministe des ressources
  publiées. Désactiver une ressource ne libère pas artificiellement sa place ;
  sa suppression le fait.
- Visibilité administrative, disponibilité horaire et capacité à accepter une
  commande sont conservées comme trois notions distinctes.
- Les actions Restaurant/Menu, les routes publiques et les consommateurs Orders
  migrés passent par les surfaces publiques des modules. Les anciens services et
  validations métier correspondants sous `src/lib` ont été retirés.
- Les compositions UI Menu et Restaurant ont été déplacées dans
  `src/modules/*/presentation`. La résolution a été refaite avec BeUI en premier :
  Input, Select, Switch, Tabs et Table sont utilisés lorsqu'ils correspondent au
  besoin ; les primitives shadcn restent réservées aux fondations et aux
  confirmations/dialogues dont la sémantique est plus exacte.
- Les écritures réelles d'onboarding ne parlent plus de plat de démonstration.

## Validation de la propriété

Les tests d'intégration vérifient :

1. le rejet applicatif d'une catégorie appartenant à un autre Restaurant ;
2. le rejet DB par les clés étrangères composites ;
3. l'unicité du nom normalisé d'une catégorie par Restaurant ;
4. le cloisonnement de l'espace de gestion Menu par propriétaire ;
5. le détachement transactionnel d'un créneau avant sa suppression.

## Validations exécutées

- `npm run typecheck` : réussi.
- `npm run lint` : réussi.
- `npm run test:phase7` : 5 fichiers, 30 tests réussis.
- `npm run test:phase7:db` : 5 tests Neon réussis.
- `npm run architecture:check` : 5 fichiers, 18 tests réussis ; 719 modules et
  2 326 dépendances analysés, aucune nouvelle violation.
- `npm test` : 83 fichiers réussis, 15 ignorés ; 394 tests réussis, 61 ignorés.
- `npm run db:migrate` : migration `0040` appliquée sur la base de
  développement autorisée.
- `npm run build` : compilation et TypeScript réussis ; prérendu global encore
  bloqué par la garde authentifiée de `/restaurateur/commandes`, hors du domaine
  migré dans cette phase.
- `git diff --check` : réussi.

`npm run db:generate` n'a pas été utilisé pour produire `0040` : Drizzle
demandait une décision interactive ambiguë sur un ancien changement d'enum/audit
hors Phase 7. La migration SQL ciblée a donc été écrite et appliquée sans
réinterpréter une phase terminée.

## Décisions et point d'arrêt

- `(partenaire)` est un regroupement structurel sans segment d'URL ; les dossiers
  internes conservent les noms de rôle `partenaire` et `restaurateur`.
- Une plage de nuit reste disponible après minuit via le jour précédent. Un
  créneau référencé mais absent bloque la disponibilité au lieu de l'autoriser.
- Les lectures/projections relevant encore de Commandes, Facturation,
  Notifications ou des agrégats Admin restent en place pour leurs phases
  propriétaires ; aucune règle Restaurant/Menu nouvelle n'y a été ajoutée.
- Le blocage de build appartient à la route Commandes et n'autorise pas à
  commencer ou refaire une autre phase.
- Phase 7 terminée. Prochaine phase du plan : Phase 8 — Résidences, uniquement
  après autorisation explicite.
