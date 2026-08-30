# Inventaire fonctionnel vérifié de RestauCI

**État au 29 août 2026 — application et base Neon de test**

## 1. Périmètre et méthode de classement

Cet inventaire décrit ce qui existe réellement dans le dépôt et ce qui est utilisable aujourd'hui. Il ne présente pas les idées futures comme des fonctionnalités déjà disponibles.

Les statuts demandés sont appliqués ainsi :

- **Fonctionnelle en production (FP)** : déployée, configurée et vérifiée avec ses vrais services de production.
- **Fonctionnelle mais non testée en production (FNT)** : implémentée et cohérente, mais l'application n'étant pas encore en production, elle n'a pas de validation de production. La preuve disponible est précisée : **E2E Neon**, **matrice API**, **tests automatisés ciblés** ou **inspection du code**.
- **En développement partiel (DP)** : interface simulée, acteur manquant, intégration externe non aboutie ou parcours métier incomplet.

### Conclusion de statut

| Statut | Nombre certifié | Conclusion |
|---|---:|---|
| Fonctionnelle en production | **0** | RestauCI est toujours en phase de test. La base Neon en ligne est la base de test, pas une preuve de fonctionnement en production. |
| Fonctionnelle mais non testée en production | Plusieurs parcours majeurs | Les parcours client, restaurateur, résidence et administrateur détaillés ci-dessous ont des preuves sur l'environnement de test. |
| En développement partiel | Plusieurs fonctions périphériques | Principalement livraison côté livreur, réservations de table, avis, connexions sociales, remboursements et promotions. |

> Une fonctionnalité marquée FNT n'est donc pas « non testée du tout ». Elle est fonctionnelle sur l'environnement de test, mais pas encore certifiée en production.

## 2. Côté client — restaurants et commandes

| Fonctionnalité actuellement présente | Statut | Niveau de preuve et limites actuelles |
|---|---|---|
| Inscription d'un client | **FNT — E2E Neon + API** | Création de compte, validation des données, mot de passe chiffré et ouverture de session vérifiées. |
| Connexion, déconnexion et maintien de session client web | **FNT — E2E Neon + API** | Connexion web réelle utilisée dans les parcours de commande et de résidence. |
| Authentification API mobile : inscription, connexion, jeton d'accès, rafraîchissement, déconnexion et révocation | **FNT — matrice API + tests ciblés** | Les routes existent et les rotations/révocations de jetons ont été vérifiées. Aucun binaire mobile n'est présent dans ce dépôt. |
| Consultation et modification du nom et de l'adresse e-mail du profil web | **FNT — E2E Neon** | Sauvegarde réelle en base vérifiée. |
| Adresse par défaut, coordonnées et changement de mot de passe via l'API client | **FNT — matrice API / inspection** | Le contrat API existe, mais toutes ces options ne sont pas exposées dans l'écran web de profil actuel. |
| Géolocalisation du client et résolution d'une position/adresse | **FNT — E2E Neon + API** | Utilisée pour la recherche et la validation de la zone de livraison. Dépend du service de géocodage configuré. |
| Recherche publique de restaurants par zone et distance | **FNT — E2E Neon + API** | Recherche, pagination, distance et marchés de service vérifiés. |
| Vue liste et vue carte des restaurants | **FNT — E2E Neon** | Navigation et sélection d'un établissement vérifiées. |
| Recherche textuelle et filtres par cuisine/mode de consommation | **FNT — E2E Neon + inspection** | Les restaurants compatibles restent proposés selon les critères de recherche. |
| Classement organique et mise en avant sponsorisée avec attribution | **FNT — tests ciblés + API** | Le moteur de découverte, les quotas d'exposition et l'attribution sont implémentés. Pas de mesure de charge ou d'efficacité en production. |
| Visibilité publique d'un restaurant hors ligne | **FNT — E2E Neon** | **Règle métier confirmée : le restaurant reste visible publiquement.** Son menu demeure consultable. |
| Blocage d'une commande vers un restaurant fermé/hors ligne | **FNT — E2E Neon + serveur** | La prévalidation renvoie actuellement une erreur 422 indiquant que le restaurant n'accepte pas les commandes. Sa visibilité publique n'est pas supprimée. |
| Consultation de la fiche restaurant | **FNT — E2E Neon** | Informations, galerie, contact, adresse, itinéraire, modes, horaires et délais accessibles. |
| Consultation du menu public, catégories et plats disponibles | **FNT — E2E Neon + API** | Les plats masqués ou indisponibles ne sont pas commandables publiquement. |
| Panier limité à un restaurant | **FNT — E2E Neon** | Ajout, retrait et changement des quantités implémentés. |
| Choix livraison, à emporter ou sur place | **FNT — E2E Neon + API** | Le type de commande est conservé et validé côté serveur. |
| Numéro de table pour une commande sur place | **FNT — E2E Neon + API** | Pris en charge dans la commande. Il ne s'agit pas d'une réservation de table. |
| Notes/instructions de commande | **FNT — E2E Neon + API** | Enregistrées avec la commande. |
| Adresse et coordonnées de livraison | **FNT — E2E Neon + API** | Sélection par carte/géocodage et contrôle de la zone desservie. |
| Calcul du minimum de commande, frais de livraison, sous-total et total | **FNT — E2E Neon + tests métier** | Les valeurs sont recalculées et vérifiées côté serveur. |
| Prévalidation avant commande | **FNT — E2E Neon + API** | Vérifie restaurant, ouverture des commandes, plats, zone, mode, minimum et montant. |
| Création idempotente d'une commande | **FNT — matrice API + tests métier** | Évite la duplication lors d'une répétition de la même demande. |
| Paiement en espèces d'une commande restaurant | **FNT — E2E Neon** | Le parcours de commande et le cycle restaurateur ont été validés sur la base de test. |
| Paiement Paystack d'une commande restaurant | **FNT — tests ciblés / inspection** | Initialisation, retour et webhook existent. Le flux n'a pas été certifié avec un compte Paystack réel de production. |
| Liste et historique des commandes client | **FNT — E2E Neon + API** | Pagination, recherche et consultation du détail disponibles. |
| Suivi du statut d'une commande | **FNT — E2E Neon + API** | Statut lisible dans le détail ; diffusion SSE implémentée. |
| Annulation client d'une commande lorsque son état l'autorise | **FNT — API + règles métier** | Les transitions non autorisées sont refusées côté serveur. |
| Relance d'un paiement de commande | **FNT — API + inspection** | Route dédiée présente pour les commandes payables. Pas de validation avec le fournisseur en production. |
| Notifications client dans l'application | **FNT — API + tests ciblés** | Liste/lecture et événements applicatifs implémentés. |
| Enregistrement d'un appareil Expo pour les notifications push | **FNT — matrice API** | Le jeton peut être enregistré. L'arrivée sur un vrai appareil via l'infrastructure de production n'est pas certifiée. |
| Abonnement web push | **FNT — tests ciblés / inspection** | Endpoint et validation implémentés. Livraison réelle dépend des clés VAPID et du navigateur de production. |
| Fonctionnement hors connexion / écran de perte réseau | **FNT — inspection** | Un fournisseur détecte la perte réseau et affiche l'état hors ligne. Pas d'usage complet de l'application sans réseau. |

## 3. Côté client — résidences

| Fonctionnalité actuellement présente | Statut | Niveau de preuve et limites actuelles |
|---|---|---|
| Recherche de résidences par destination | **FNT — E2E Neon + API** | Recherche publique et filtrage dans un marché où la capacité résidence est active. |
| Choix des dates et du nombre de voyageurs | **FNT — E2E Neon** | Les paramètres alimentent disponibilité et devis. |
| Pagination des résultats | **FNT — API + inspection** | Implémentée dans la recherche publique. |
| Consultation du détail et des photos d'une résidence | **FNT — E2E Neon** | Une résidence publiée et active est accessible publiquement. |
| Calcul d'un devis de séjour | **FNT — E2E Neon + API** | Contrôle des dates, nuits, capacité, disponibilité et montant. |
| Vérification de disponibilité | **FNT — E2E Neon + API** | Prend en compte les réservations et les blocages manuels du calendrier. |
| Création d'une réservation de résidence | **FNT — E2E Neon + API** | Parcours réalisé avec un vrai enregistrement Neon. |
| Paiement d'une réservation | **FNT — E2E Neon avec Paystack local simulé** | Le cycle complet application/base est vert ; le fournisseur Paystack était remplacé par un serveur local contrôlé. Ce n'est pas une validation Paystack de production. |
| Confirmation de réservation après paiement | **FNT — E2E Neon** | Réservation `confirmee`, transaction `paid` et paiement `confirmed` constatés directement en base. |
| Liste et détail des réservations du client | **FNT — E2E Neon + API** | Données du séjour et statut consultables. |
| Relance du paiement d'une réservation | **FNT — API + inspection** | Route dédiée présente ; fournisseur de production non certifié. |
| Annulation d'une réservation encore annulable sans remboursement | **FNT — API + règles métier** | Le cas simple est implémenté. |
| Annulation d'une réservation payée avec restitution financière | **DP** | Une réservation peut changer d'état, mais le remboursement réel n'est pas orchestré. Cette partie est volontairement reportée. |

## 4. Côté client — fonctions simulées ou incomplètes

| Fonctionnalité | Statut | État exact aujourd'hui |
|---|---|---|
| Réservation de table | **DP** | La modale publique simule une confirmation avec un délai local. Aucune réservation de table n'est persistée, transmise au restaurant ou administrable. |
| Avis clients | **DP** | L'interface publique utilise des données/retours locaux. Le schéma et des mutations existent, mais le parcours client complet n'est pas relié. |
| Connexions sociales | **DP** | L'étape d'onboarding utilise un comportement simulé et des URL fictives pour l'OAuth. |
| Promotions et codes promotionnels | **DP** | Des structures et mutations existent, mais il n'y a pas de parcours client complet appliquant réellement un code au panier. |
| Favoris | **DP** | Évoqués dans certains contenus, mais aucun parcours persistant complet n'est implémenté. |
| Messagerie client–restaurant/livreur | **DP** | Aucun canal bidirectionnel fonctionnel. Le bouton de contact livreur est désactivé/annoncé comme futur. |
| Remboursement automatisé | **DP** | Non implémenté de bout en bout pour les commandes ou les réservations payées. |

## 5. Côté restaurateur

| Fonctionnalité actuellement présente | Statut | Niveau de preuve et limites actuelles |
|---|---|---|
| Inscription d'un partenaire restaurateur | **FNT — E2E Neon + API** | Création du compte et des données initiales vérifiée. |
| Connexion/déconnexion et session restaurateur | **FNT — E2E Neon + API** | Utilisée dans tous les parcours dashboard testés. |
| Onboarding du restaurant : informations, adresse, horaires, menu et réglages | **FNT — E2E Neon + inspection** | Les données principales sont persistées. Les connexions sociales de l'onboarding restent simulées. |
| Soumission des justificatifs d'identité/KYC | **FNT — tests ciblés + inspection** | Téléversement privé, contrôles de contenu, quarantaine et revue existent. Le traitement antivirus externe complet n'a pas été validé en production. |
| Suivi du statut KYC et des demandes de correction | **FNT — tests ciblés + interface** | Le partenaire voit le statut et peut renvoyer des documents. Pas de parcours navigateur complet dans la suite finale. |
| Activation, suspension et réactivation du restaurant par l'administrateur | **FNT — E2E Neon** | Le cycle de modération a été validé. |
| Modification du nom public, description, cuisines et coordonnées | **FNT — E2E Neon** | Sauvegarde réelle et réaffichage public vérifiables. |
| Modification de l'adresse et des coordonnées géographiques | **FNT — E2E Neon** | Recalcul/affectation du marché de service implémenté. |
| Téléphone, e-mail, site et liens sociaux manuels | **FNT — E2E Neon / inspection** | Les URL saisies manuellement sont persistées ; cela ne rend pas l'OAuth social fonctionnel. |
| Téléversement du logo et des images du restaurant | **FNT — E2E Neon + stockage test** | Téléversement R2 utilisé dans les parcours concernés. La configuration de production n'est pas certifiée. |
| Modes de service, minimum de commande et frais de livraison | **FNT — E2E Neon + règles métier** | Réglages pris en compte lors de la prévalidation. |
| Délai estimé de préparation | **FNT — E2E Neon / inspection** | Affiché au client et modifiable. |
| Mise en ligne/hors ligne du restaurant | **FNT — E2E Neon** | Fermer les commandes ne masque pas le restaurant. |
| Activation/désactivation de l'acceptation des commandes | **FNT — E2E Neon + inspection** | Le modèle contient encore un réglage distinct. Aucune fusion de règles n'a été faite sans validation métier. |
| Gestion des horaires d'ouverture | **FNT — E2E Neon** | Ajout/suppression et affichage vérifiés. Les horaires ne forcent pas automatiquement le bouton en ligne/hors ligne. |
| Création, modification, ordre et suppression de catégories | **FNT — API + inspection** | Routes et interface de gestion présentes. |
| Création et modification d'un plat | **FNT — E2E Neon + API** | Nom, description, prix, catégorie, image et réglages persistés. |
| Masquage/restauration et disponibilité d'un plat | **FNT — E2E Neon** | L'effet sur le menu public a été vérifié. |
| Plages de disponibilité d'un plat | **FNT — inspection + règles métier** | Modèle et interface présents. Pas de scénario E2E temporel prolongé. |
| Quotas de menu selon l'abonnement | **FNT — tests ciblés** | Contrôles côté serveur implémentés. |
| Tableau de bord avec chiffre d'affaires, volumes, statuts, catégories et tendances | **FNT — E2E d'accès + API stats** | Les vues s'affichent avec les données Neon. Pas de validation analytique en production. |
| Liste, recherche, filtres et pagination des commandes | **FNT — E2E Neon + API** | Parcours dashboard vérifié. |
| Consultation du détail d'une commande et des coordonnées client | **FNT — E2E Neon** | Articles, montants, mode, client, adresse et suivi affichés. |
| Cycle d'une commande : accepter, préparer, prête, servir/terminer | **FNT — E2E Neon + API** | Le cycle autorisé a été exécuté et les transitions illégales sont refusées. |
| Annulation restaurateur d'une commande | **FNT — E2E Neon + API** | Transition et motif gérés selon l'état. Le remboursement éventuel reste partiel. |
| Impression/présentation d'un reçu | **FNT — inspection** | Vue d'impression présente, sans validation sur une imprimante physique. |
| Notifications restaurateur dans le dashboard | **FNT — E2E d'accès + API** | Liste et compteur disponibles. |
| Temps réel des commandes par SSE | **FNT — API + tests ciblés** | Flux et protections présents. Pas de test de charge de production. |
| Notifications web/Expo des événements de commande | **FNT — tests ciblés / inspection** | Génération et enregistrement présents ; remise réelle sur appareils de production non certifiée. |
| Suivi des commissions par commande | **FNT — tests métier + interface** | Écritures, instantanés et vues administratives présents. |
| Dette de commissions sur paiements en espèces et règlement | **FNT — tests ciblés + interface** | Règles et initiation de paiement implémentées. Pas de paiement fournisseur réel de production. |
| Compte marchand Paystack et partage/split des paiements | **FNT — tests ciblés / inspection** | Gestion des comptes fournisseur et paramètres présents. Non certifié auprès de Paystack en production. |
| Consultation des offres d'abonnement et demande/souscription | **FNT — tests d'intégration + interface** | Catalogue, quotas, demandes et paiements sont implémentés. Pas de parcours E2E complet avec fournisseur réel. |
| Reprise d'un paiement d'abonnement | **FNT — tests ciblés / inspection** | Interface et cycle de retour présents. |
| Effets de l'abonnement sur quotas et exposition | **FNT — tests métier** | Le contrôle est centralisé côté serveur. |
| Gestion d'une réservation de table entrante | **DP** | Absente, car la réservation publique de table n'est pas persistée. |
| Gestion et réponse aux avis | **DP** | Modèle partiel, mais pas de parcours opérationnel complet. |
| Création et application de promotions | **DP** | Couche de données partielle, sans expérience complète restaurateur/client. |

## 6. Côté résidence / propriétaire

| Fonctionnalité actuellement présente | Statut | Niveau de preuve et limites actuelles |
|---|---|---|
| Choix de l'activité « résidence » pour un partenaire | **FNT — E2E Neon + inspection** | Le compte partenaire commun peut accéder à l'espace résidence. |
| Authentification et navigation propriétaire | **FNT — E2E Neon** | Connexion, pages protégées et navigation utilisées dans le parcours complet. |
| Contrôle KYC avant publication/exploitation | **FNT — tests ciblés + E2E avec propriétaire déjà vérifié** | La barrière est implémentée. Le scénario KYC propriétaire complet n'a pas été rejoué dans le parcours final. |
| Création d'une résidence en brouillon | **FNT — E2E Neon** | Création réelle avec données, géolocalisation et photos. |
| Téléversement et ordre des photos | **FNT — E2E Neon + stockage test** | Fichiers réellement envoyés au stockage configuré pour le test. |
| Saisie/modification de l'adresse et de la position | **FNT — E2E Neon** | Coordonnées persistées et marché de service déterminé. |
| Saisie du type, capacité, chambres, lits, équipements, description et tarif | **FNT — E2E Neon** | Données persistées dans le brouillon. |
| Soumission à la vérification administrateur | **FNT — E2E Neon** | Le brouillon est envoyé en modération. |
| Demande de correction par l'administrateur | **FNT — E2E Neon** | Le motif revient au propriétaire. |
| Correction et nouvelle soumission par le propriétaire | **FNT — E2E Neon** | Le cycle a été rejoué jusqu'à approbation. |
| Approbation de la résidence par l'administrateur | **FNT — E2E Neon** | Statut final vérifié. |
| Publication manuelle d'une résidence approuvée | **FNT — E2E Neon** | L'intention et l'éligibilité de publication ont rendu la résidence visible publiquement. |
| Retrait manuel de la publication | **FNT — inspection + logique serveur** | Commande présente. Non incluse dans le scénario final, qui a conservé la résidence publiée. |
| Contrôle de publication par marché, capacité et quota d'abonnement | **FNT — tests métier + E2E Neon** | Une zone réellement compatible a été utilisée, sans changer la configuration métier existante. |
| Suspension et réactivation administrateur | **FNT — E2E Neon** | La résidence disparaît puis revient dans la recherche publique. |
| Consultation des réservations reçues | **FNT — E2E Neon** | Le propriétaire voit le client, les dates, les voyageurs, le montant et le statut après paiement. |
| Calendrier propriétaire | **FNT — E2E Neon** | Affiche réservations et indisponibilités. |
| Ajout/suppression d'un blocage manuel de calendrier | **FNT — E2E Neon** | Ajout puis suppression vérifiés ; aucun bloc de test résiduel. |
| Détection des conflits de dates | **FNT — E2E Neon + règles métier** | Réservations et blocs empêchent la double disponibilité. |
| Libellés temporels à venir/en cours/terminé | **FNT — inspection** | Calculés à partir des dates. Il n'existe pas encore d'action opérationnelle de check-in/check-out. |
| Abonnements et facturation propriétaire | **FNT — tests d'intégration + interface** | Utilise la plateforme d'abonnement commune. Pas de paiement de production certifié. |
| Acceptation ou refus manuel d'une demande de réservation par le propriétaire | **DP / absent du parcours actuel** | Le paiement réussi confirme actuellement la réservation automatiquement. Aucun écran d'approbation propriétaire n'intervient. |
| Modification/annulation/remboursement d'une réservation par le propriétaire | **DP** | Parcours opérationnel complet non disponible. |
| Tarification saisonnière, durée minimale, frais additionnels et coupons | **DP / non implémenté** | Le tarif actuel repose sur le prix par nuit et les paramètres de base. |
| Check-in et check-out opérationnels | **DP / non implémenté** | Les périodes sont classées par date, mais il n'y a pas d'actions métier dédiées. |

## 7. État exact du parcours de livraison aujourd'hui

### 7.1 Parcours effectivement implémenté

1. **Le client** choisit « livraison », indique son adresse et passe sa commande.
2. **Le restaurant** accepte la commande, la prépare puis la marque prête.
3. **Un opérateur du restaurant** ouvre le détail et choisit manuellement un livreur dans une liste de livreurs déjà présents en base et actifs pour ce même restaurant.
4. **Le même opérateur restaurant**, dans l'interface actuelle, déclenche « Démarrer la livraison ».
5. **Le même opérateur restaurant** confirme ensuite la livraison. La commande peut alors être terminée selon les transitions prévues.

Le cycle commande + livraison et le refus d'une clôture prématurée ont été vérifiés en **E2E Neon**.

### 7.2 Qui déclenche la mise en relation avec un livreur ?

**Personne ne déclenche une mise en relation externe aujourd'hui, parce que cette étape n'existe pas dans le produit.**

Il existe seulement une **assignation manuelle interne par le restaurant** vers un livreur déjà enregistré dans la base. Il n'existe actuellement :

- ni marketplace de livreurs ;
- ni recherche d'un livreur externe ;
- ni notification/acceptation de mission par un vrai compte livreur ;
- ni connexion livreur ;
- ni écran ou application livreur ;
- ni identifiants remis au livreur ;
- ni preuve que le livreur, en tant qu'acteur distinct, a lui-même marqué le retrait et la livraison.

### 7.3 Ce qui existe déjà dans le modèle de données

- Un livreur appartient à un restaurant par un `restaurantId` obligatoire.
- Il possède notamment nom, téléphone, véhicule, état actif et indicateur en ligne.
- Une livraison appartient à une commande et peut référencer un livreur.
- Les états de livraison couvrent l'attente, l'assignation, le trajet et la livraison.
- Le serveur vérifie actuellement l'appartenance du livreur au restaurant et son état actif lors de l'assignation.

### 7.4 Lacunes du parcours livreur

| Élément | Statut | État exact |
|---|---|---|
| Sélection manuelle d'un livreur existant par le restaurant | **FNT — E2E Neon** | Fonctionne depuis le détail de commande. |
| Création/modification/suppression de livreurs dans la base | **DP** | Des mutations de données existent, mais aucune interface ni API restaurateur complète ne les expose. |
| Contrôle réel de disponibilité à l'assignation | **DP** | L'interface affiche l'indicateur en ligne, mais la commande d'assignation ne refuse pas encore explicitement un livreur hors ligne ; elle vérifie surtout restaurant et état actif. |
| Compte et connexion du livreur | **DP / absent** | Aucun système d'identifiants ou de session livreur. |
| Vue livreur limitée à son restaurant | **DP / absent** | La contrainte de données prépare ce modèle, mais aucun espace livreur n'existe. |
| Acceptation de mission par le livreur | **DP / absent** | Non implémentée. |
| Marquage « colis récupéré / en route » par le livreur | **DP / absent** | L'action actuelle est réalisée côté restaurant. |
| Marquage « livré » par le livreur | **DP / absent** | L'action actuelle est réalisée côté restaurant. |
| Notification du livreur | **DP / absent** | Aucun canal livreur opérationnel. |
| Assignation automatique | **DP / non implémentée** | À envisager plus tard seulement. |

### 7.5 Recommandation V1 à valider avant toute modification métier

L'assignation manuelle est le choix le plus simple et le plus contrôlable pour une première version :

1. le restaurant crée ses propres livreurs ;
2. la plateforme génère une invitation ou un mot de passe temporaire affiché une seule fois ;
3. le livreur change son mot de passe à la première connexion ;
4. le livreur ne peut voir que les livraisons de son restaurant et uniquement celles qui lui sont assignées ;
5. l'assignation manuelle exige un livreur du même restaurant, actif et disponible ;
6. l'assignation le rend occupé ;
7. le livreur marque « colis récupéré / en route », puis « livré » ;
8. la fin de mission le remet disponible ;
9. le restaurant peut révoquer ou réinitialiser ses accès.

Cette proposition **n'est pas annoncée comme déjà implémentée**. Elle nécessite un accord explicite sur les états, les droits et les transitions avant de modifier les règles métier. L'assignation automatique peut venir ensuite.

## 8. Côté administrateur — fonctions transversales déjà présentes

Même si la demande porte principalement sur les trois acteurs métier, ces fonctions conditionnent leurs parcours.

| Fonctionnalité actuellement présente | Statut | Niveau de preuve et limites actuelles |
|---|---|---|
| Connexion administrateur et protection des pages | **FNT — E2E Neon** | Accès anonyme refusé et pages administrateur parcourues. |
| Tableau de bord et file « à traiter » | **FNT — E2E d'accès + inspection** | Agrège les éléments nécessitant une action. |
| Liste, détail, activation, suspension et réactivation des restaurants | **FNT — E2E Neon** | Modération complète vérifiée. |
| Liste, détail, correction, approbation, suspension et réactivation des résidences | **FNT — E2E Neon** | Cycle complet vérifié. |
| Revue KYC et téléchargement privé des documents | **FNT — tests ciblés + interface** | Droits et validation implémentés ; chaîne antivirus/infrastructure de production non certifiée. |
| Consultation des utilisateurs | **FNT — E2E d'accès + inspection** | Table administrative présente. |
| Consultation des commandes et détail | **FNT — E2E d'accès + inspection** | Recherche/filtres et détails disponibles. |
| Gestion/consultation des commissions | **FNT — tests ciblés + E2E d'accès** | Politiques, écritures et règlements présents. |
| Catalogue et demandes d'abonnement | **FNT — tests d'intégration + E2E d'accès** | Plans, politiques, historique et demandes gérés. |
| Paramétrage des marchés/zones et capacités de service | **FNT — tests ciblés + E2E d'accès** | Délimitation, capacités restaurants/résidences et résolution géographique présentes. |
| Configuration des comptes fournisseur Paystack | **FNT — tests ciblés + interface** | Non validée avec les secrets et comptes de production. |
| Journal d'audit | **FNT — E2E d'accès + inspection** | Vue, recherche et filtres présents. |
| Espace support | **FNT — E2E d'accès** | L'écran est accessible ; aucun centre de messagerie externe complet n'a été certifié. |

## 9. Résultats de vérification exécutés

Les vérifications suivantes ont été exécutées avec la configuration de test et la base Neon désignée comme base de test :

| Vérification | Résultat final |
|---|---:|
| TypeScript (`npm run typecheck`) | **Réussi** |
| ESLint (`npm run lint`) | **Réussi** |
| Tests automatisés (`npm test`) | **66 fichiers réussis, 8 ignorés ; 276 tests réussis, 29 ignorés — 305 au total** |
| Playwright complet | **14 scénarios sur 14 réussis, sans retry** |
| Matrice API | **66 contrôles sur 66 réussis** |
| Build Next.js de production avec configuration de test | **Réussi ; 67 pages statiques générées** |

La suite Playwright couvrait notamment :

- protection administrateur et accès à toutes les pages admin ;
- modération d'un restaurant ;
- commande client ;
- cycle commande/restaurateur/annulation/livraison ;
- restaurant hors ligne toujours visible et commande refusée ;
- masquage/restauration d'un plat ;
- modification du profil, de l'adresse et des horaires ;
- création/modération/publication/suspension/réactivation d'une résidence ;
- recherche, devis, réservation et paiement de résidence avec Paystack local ;
- visibilité de la réservation côté propriétaire ;
- ajout et suppression d'un blocage de calendrier.

La matrice API couvrait notamment authentification, rotation/révocation, contrôles anonymes, droits administrateur, CRUD restaurant/menu, cycle de commande, prévalidation client, protections IDOR, validations de schéma et signature magique des fichiers.

Les entités temporaires de la matrice API ont été nettoyées. Le blocage de calendrier créé par l'E2E a été supprimé. La résidence E2E conservée est active, non suspendue et publiée ; sa réservation de test est confirmée et payée dans Neon.

## 10. Réserves avant une mise en production

- Les résultats prouvent le comportement de l'environnement de test, pas celui d'une infrastructure de production.
- Paystack, notifications push, e-mails éventuels, stockage R2, géocodage et antivirus doivent encore être validés avec leurs configurations finales et des scénarios de retour en erreur.
- Il faut une décision métier explicite avant de fusionner ou supprimer les deux notions actuelles « en ligne » et « accepte les commandes ».
- Le restaurant hors ligne doit rester publiquement visible tant que la règle métier reste celle confirmée par le propriétaire du produit.
- Le parcours livreur ne doit pas être présenté comme opérationnel tant qu'un vrai acteur livreur ne peut pas être créé, s'authentifier et agir lui-même.
- Les annulations de paiements confirmés ne doivent pas être présentées comme complètes sans orchestration et traçabilité du remboursement.
- Les réservations de table, avis et connexions sociales doivent rester étiquetés comme simulations tant qu'ils ne sont pas reliés à un parcours persistant réel.
- Le serveur de développement a émis quelques avertissements non bloquants lors de la navigation intensive (fermeture anticipée de flux, nombre d'écouteurs et LCP). Ils n'ont provoqué aucun échec de test, mais restent une dette technique à surveiller avant la production.
