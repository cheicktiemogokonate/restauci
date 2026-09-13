# Phase 11 — Suppression des simulations et assainissement des données

## Résultat

La surface produit n'expose plus de parcours qui confirme localement une action
fictive. Les démonstrations inutilisées ont été supprimées, les capacités sans
parcours persistant complet sont masquées et les absences de médias sont rendues
par des états neutres plutôt que par de fausses photos.

Cette phase ne modifie ni le schéma ni les données en base.

## Changements réalisés

### Simulations et contenus de démonstration

- Suppression du faux raccordement aux réseaux sociaux dans l'onboarding.
- Suppression de la fausse réservation de table, des faux avis et de la galerie
  statique de la page publique Restaurant.
- Suppression des anciennes sections de landing page qui présentaient des
  commandes, indicateurs, témoignages et établissements codés en dur.
- Remplacement du faux tableau de bord de la landing page par une présentation
  des garanties réelles du produit.
- Renommage du composant de pied de page `demo.tsx` en `footer.tsx` : son contenu
  était réel, seul son nom le classait à tort comme démonstration.

### Capacités masquées tant qu'elles ne sont pas complètes

- Retrait des notes et compteurs d'avis des pages Restaurant, Menu et Admin.
- Retrait de l'appel à la messagerie et de la promesse de favoris dans les
  surfaces concernées.
- Les notifications historiques `nouveau_avis` et `promotion` restent compatibles
  avec le schéma, mais sont filtrées des listes et compteurs produit.
- Les contrats historiques de note sont conservés pour ne pas élargir cette
  phase à une migration de schéma ; aucune nouvelle présentation ne les consomme.

### Données et états affichés

- Les images de restaurant ou de plat absentes donnent maintenant un état neutre,
  jamais une photographie générique présentée comme celle de l'établissement.
- Le dashboard attend ses statistiques persistées avec un squelette ; il ne
  restaure plus d'indicateurs depuis `localStorage` et ne présente plus de zéros
  de secours comme des valeurs courantes.
- Le reçu affiche les frais de livraison et la remise réellement persistés.
- L'audit des temporisations restantes les classe comme délais d'interface,
  debounce, retry, timeout d'infrastructure ou rafraîchissement après écriture
  réelle. Aucun délai restant ne produit un succès métier fictif.

## Séparation des données d'essai

La stratégie retenue est la séparation stricte par environnement, autorisée par
le plan comme alternative à une colonne `data_origin` :

- le seed exige `--confirmed-development-test` ;
- il refuse `NODE_ENV=production` et `VERCEL_ENV=production` ;
- il exige `TOUTCI_DATA_ENVIRONMENT=development|test` ;
- il affiche l'environnement, l'hôte et le nom de base avant toute écriture ;
- `.env.example` documente le marqueur et la commande explicite.

Impact des fixtures : aucune ligne n'a été supprimée ou modifiée pendant cette
phase. Les anciennes fixtures ne disposent pas d'un marqueur par ligne fiable ;
les supprimer à partir d'un nom ou d'un email serait heuristique et non
récupérable. La base Neon courante étant déjà désignée développement/test, elles
restent isolées hors production et les futures créations durables passent par le
verrou explicite.

## UI et composants

Les écrans concernés doivent afficher uniquement l'établissement et les données
persistées, avec un état neutre pour un média absent et sans action disponible
pour une capacité incomplète. Les composants nécessaires étaient déjà installés :
`Badge`, `Button`, `Card`, `Dialog`, `Skeleton` et les icônes existantes.

La résolution `app-components-registry` a recherché beUI en premier puis
shadcn/ui. Aucun nouveau composant n'était nécessaire ; les primitives shadcn
existantes couvrent les états accessibles et responsifs, sans nouvelle
dépendance ni second système d'animation. L'audit de composants a ensuite été
appliqué aux imports, images, dépendances, lint et types. La vérification
navigateur n'a pas été exécutée, conformément à l'interdiction du projet sans
autorisation explicite dans le message courant.

## Garde de régression

`tests/phase11-product-integrity.test.ts` vérifie :

- l'absence des composants de simulation supprimés ;
- l'interdiction d'importer `demo`, `fixture` ou `mock` depuis une route produit ;
- l'absence des capacités masquées dans les présentations ciblées ;
- l'absence des anciens visuels et compteurs de secours ;
- le refus des fixtures durables sans environnement et confirmation explicites.

## Validations

- `npm run test:phase11` : 1 fichier, 5 tests réussis.
- `npm run typecheck` : réussi.
- `npm run lint` : réussi.
- `npm run architecture:check` : 5 fichiers, 18 tests réussis ; 734 modules et
  2 373 dépendances analysés, aucune nouvelle violation (32 violations connues
  ignorées par la baseline).
- Suite complète en série : 88 fichiers réussis, 18 ignorés ; 416 tests réussis,
  70 ignorés.
- `npm run build` : réussi, 83 pages statiques générées ; avertissement local
  non bloquant sur la région par défaut du client de queue.
- `git diff --check` : réussi.

## Décisions et blocages

- Séparation stricte d'environnement retenue ; aucune colonne `data_origin`
  ajoutée dans cette phase.
- Aucun nettoyage destructif des anciennes fixtures sans identifiant d'origine
  fiable et opération récupérable.
- Compatibilité historique des types de notifications Avis et Promotion
  conservée en base, mais exposition produit désactivée.
- Aucun blocage restant pour la Phase 11.

## Point d'arrêt

La Phase 11 est terminée. La prochaine étape du plan est la **Phase 12 —
Extraction du shared kernel et extinction de `src/lib`**. Elle n'est ni lue ni
démarrée dans cette intervention et exige une nouvelle autorisation explicite.
