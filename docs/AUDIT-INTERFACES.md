# Toutci — Audit des interfaces, Phase 0

- **Date :** 4 septembre 2026
- **Méthode :** analyse statique exhaustive des routes et composants ; aucune refonte exécutée pendant cette phase
- **Règle cible :** `app-components-registry`, beUI en priorité, shadcn/ui en repli, dashboard shadcn/ui obligatoire

## Verdict

L'interface actuelle ne constitue pas une cible de migration. Elle juxtapose plusieurs langages visuels et plusieurs manières d'implémenter la même interaction. La refonte doit donc accompagner chaque phase métier, à partir d'une fondation commune, plutôt que reproduire les écrans existants.

L'audit a volontairement été mené depuis le code. Il ne prétend pas remplacer une recette visuelle finale sur les parcours réécrits ; cette recette sera pertinente seulement quand une phase aura effectivement produit une nouvelle interface.

## Couverture exhaustive

| Inventaire | Résultat |
|---|---:|
| Surfaces App Router | 72 |
| Pages | 58 |
| Layouts | 5 |
| Fichiers `loading.tsx` | 5 |
| Fichiers `error.tsx` | 3 |
| `not-found.tsx` | 1 |
| Composants TSX | 235 |
| Primitives `src/components/ui` | 31 |
| Composants d'animation `src/components/motion` | 26 |
| Composants déjà placés dans `modules/*/presentation` | 3 |

Les chemins, propriétaires et signaux par fichier sont dans [`audits/phase-0-screen-inventory.csv`](audits/phase-0-screen-inventory.csv) et [`audits/phase-0-ui-inventory.csv`](audits/phase-0-ui-inventory.csv).

## Familles d'écrans et propriétaire cible

| Famille | Propriétaire / composition | Reprise attendue |
|---|---|---|
| Accueil, recherche et fiches publiques | plateforme + Restaurants/Residences/Discovery | langage public unique, états d'éligibilité réels, mobile prioritaire |
| Connexion, inscription, onboarding | Auth + Partners + vertical choisi | parcours unifié et discriminé par activité, sans dupliquer les shells |
| Espace client | Clients + Orders + Residences + Transactions | navigation et statuts cohérents entre commande, réservation et paiement |
| Administration | composition de DTO publics de tous les modules | base `dashboard-01` shadcn/ui, projections discriminées, aucune logique métier locale |
| Espace Restaurant | Restaurants + Menu + Orders + Commissions + Deliveries | base dashboard commune et écrans métier dans les présentations de modules |
| Espace Résidence | Residences + Quotas + Subscriptions + Notifications | collection multi-résidences, quota visible explicite, raisons de blocage |
| Espace Livreur | Deliveries | parcours opérationnel court, touch targets mobiles, statuts et preuves |

## Ruptures constatées

### Cohérence visuelle et architecture UI

- 97 fichiers utilisent des couleurs Tailwind codées en dur, soit 1 396 occurrences. Les états métier n'ont donc pas une sémantique visuelle globale fiable.
- `globals.css` superpose plusieurs familles de variables, dont des tokens shadcn en OKLCH et des variables de marque redéfinies. La configuration Tailwind les consomme avec des conventions différentes. La fondation doit être normalisée avant les refontes de domaine.
- 31 primitives shadcn coexistent avec 26 wrappers d'animation, des contrôles HTML directs et plusieurs shells spécifiques aux écrans.
- 41 fichiers hors primitives contiennent 121 contrôles HTML bruts (`button`, `input`, `select`, `textarea`, `table`) au lieu d'une primitive partagée.
- 42 fichiers utilisent des styles inline. Certains sont justifiés par une valeur dynamique, d'autres contournent le système de tokens.
- Seulement 3 composants de présentation vivent déjà dans un module. La majorité des compositions métier se trouve encore dans `src/components` ou directement dans `app`.

### États et ergonomie

- 53 pages sur 58 n'ont pas de `loading.tsx` local et 55 n'ont pas de `error.tsx` local. Cela ne prouve pas que tous les états manquent dans les composants, mais révèle une couverture App Router très inégale.
- Les états vide, succès, erreur, désactivé et permissions insuffisantes ne suivent pas un contrat transversal.
- Les écrans d'authentification et de dashboard répètent des structures proches avec des détails visuels divergents.
- Des libellés et composants transportent un vocabulaire Restaurant dans des surfaces censées être génériques ; la projection admin « Restaurant & offre » en est le cas métier le plus important.
- Certains noms de composants ne reflètent plus leur rôle réel, ce qui augmente le risque de réutilisation incohérente.

### Responsive et accessibilité

- Les contrôles bruts et les styles locaux rendent les focus, zones tactiles, erreurs de champ et interactions clavier non uniformes.
- Le scan statique relève une occurrence d'image potentiellement sans alternative ; ce signal doit être confirmé lors de la reprise du composant, pas considéré comme un audit WCAG complet.
- Les tables administratives riches devront fournir navigation clavier, intitulés de colonnes, actions explicites et stratégie mobile ; le simple débordement horizontal ne suffit pas pour toutes les tâches.
- Les animations doivent respecter `prefers-reduced-motion` et ne pas mélanger plusieurs moteurs pour une même interaction.

## Résolution des composants

La recherche du registre a été effectuée avec plusieurs mots-clés courts, conformément à `app-components-registry`. Aucun composant n'est installé pendant la Phase 0.

| Besoin | Résultat de recherche / existant | Décision de base |
|---|---|---|
| Shell de dashboard | shadcn/ui `dashboard-01` : sidebar, graphiques et table | obligatoire pour Admin, Restaurant et Résidence, adapté aux tokens Toutci |
| Table de données dense | beUI `table` : virtualisation, tri, sélection, redimensionnement, réordonnancement, en-tête fixe | candidat prioritaire pour les grands volumes ; vérifier les dépendances au moment de la phase concernée |
| Tables simples | primitive shadcn `table` déjà installée | conserver pour les lectures courtes sans interaction complexe |
| Formulaires standards | `form`, `field`, `input`, `select`, `textarea`, `checkbox`, `radio-group`, `switch` déjà installés | composer ces primitives, avec validation et états communs |
| Sélecteur de date | `date-picker`, `calendar` et `popover` déjà installés | réutiliser l'existant ; aucune nouvelle primitive maison |
| Wizard d'onboarding | aucun bloc beUI/shadcn trouvé avec les recherches courtes réalisées | composer les primitives existantes seulement après définition du parcours ; ne pas créer de widget isolé |
| Dialogues, sheets, menus, toasts | primitives shadcn déjà installées | conserver et normaliser |
| Carte géographique | primitive partagée existante issue du registre configuré | conserver comme primitive partagée, puis auditer clavier, contrastes et fallback |
| Motion décoratif | wrappers Motion existants | usage sélectif ; aucune animation concurrente sur la même interaction |

Le projet configure les registres `@beui`, `@mapcn` et `@kokonutui`. React Bits ou Kokonut UI peuvent être recherchés lorsqu'un besoin expressif le justifie, mais ne remplacent pas les contrôles accessibles shadcn ni la priorité beUI fixée par le registre.

## Fondation visuelle cible

Avant la première réécriture d'écran, la phase métier autorisée devra définir un socle minimal partagé :

1. une seule grammaire de couleurs sémantiques, typographie, espacement, rayons, ombres et niveaux de surface ;
2. des composants de feedback communs pour vide, chargement, erreur, succès, désactivé et accès refusé ;
3. un shell de dashboard commun dérivé de shadcn `dashboard-01` ;
4. des conventions de formulaire, table, navigation, focus et validation ;
5. une stratégie responsive explicite par famille d'écran ;
6. des présentations métier dans `modules/<domaine>/presentation`, composées à partir des primitives partagées.

La cohérence ne signifie pas que toutes les surfaces sont identiques : les espaces public, client, partenaire et admin peuvent avoir une hiérarchie adaptée, mais partagent les mêmes tokens, états et comportements de base.

## Ordre recommandé de reprise

La refonte reste liée aux phases métier du plan, sans lot UI autonome lancé maintenant :

1. fondation et composants d'état lors de la première phase qui modifie réellement une interface ;
2. Auth, Partners et projection Comptes et accès en Phase 4 ;
3. KYC et médias en Phase 5 ;
4. facturation, quotas et journal financier en Phase 6 ;
5. dashboard Restaurant et Menu en Phase 7 ;
6. dashboard Résidence, collection et publication en Phase 8 ;
7. parcours Client, commandes, commissions et livraison en Phase 9 ;
8. administration transverse et notifications au rythme de leurs modules propriétaires ;
9. surfaces publiques et découverte lorsque les contrats d'éligibilité sont stabilisés.

Chaque phase qui touche une interface devra : définir le travail de l'écran, inventorier et rechercher ses composants, présenter un choix si plusieurs solutions conviennent, implémenter la composition réutilisable, puis vérifier états, responsive, clavier, focus et accessibilité.

## Limites et point de contrôle

La Phase 0 ne contient ni installation de composant, ni modification d'écran, ni validation visuelle de production. L'inventaire statique est suffisant pour planifier la refonte et empêcher la duplication ; les contrôles visuels et interactifs seront exécutés sur chaque interface effectivement réécrite, lorsque cette phase sera explicitement autorisée.
