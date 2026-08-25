# Guide d’utilisation complet de Toutci

**Version du guide :** MVP — 25 août 2026  
**Application Web :** <https://restauci.vercel.app>  
**Public concerné :** visiteurs, clients, partenaires Restaurant, partenaires Résidence et administrateurs

---

## 1. Comprendre les différents comptes

Toutci distingue les profils suivants :

| Profil | Interface principale | Fonctions essentielles |
| --- | --- | --- |
| Visiteur | Web et mobile | Rechercher et consulter les restaurants et résidences |
| Client consommateur | Web et application mobile | Commander des repas, réserver des résidences, payer et suivre son activité |
| Partenaire Restaurant | Web | Configurer un restaurant, gérer le menu, les commandes, l’abonnement et la facturation |
| Partenaire Résidence | Web | Créer et publier des logements, gérer les réservations, le calendrier, l’abonnement et la facturation |
| Administrateur | Web | Vérifier, modérer et piloter l’ensemble de la plateforme |

Dans le MVP, un compte partenaire choisit une seule activité : **Restaurant** ou **Résidence**. La vérification d’identité appartient au compte partenaire : une identité validée est donc rattachée au propriétaire du compte, et non à une fiche de restaurant ou de résidence en particulier.

Il n’existe pas encore de compte autonome **Livreur** avec sa propre application. Les informations de livraison peuvent apparaître dans les commandes, mais la gestion d’une flotte de livreurs indépendante ne fait pas partie du parcours utilisateur actuel.

---

## 2. Règles communes de connexion

### Client consommateur

Le client utilise l’espace client du Web ou l’application mobile. Son compte est distinct d’un compte partenaire.

- Créer un compte avec son nom, son téléphone, son mot de passe et éventuellement son adresse électronique.
- Se connecter avec ses identifiants client.
- Se déconnecter depuis **Profil**.
- Une commande ou une réservation exige une connexion, mais la consultation du catalogue reste possible sans compte.

### Partenaire Restaurant ou Résidence

Le partenaire utilise l’espace professionnel Web.

1. Ouvrir <https://restauci.vercel.app/register>.
2. Créer le compte avec les informations personnelles demandées.
3. À l’étape suivante, choisir l’activité **Restaurant** ou **Résidence**.
4. Terminer l’onboarding adapté à l’activité choisie.
5. Pour quitter le compte, utiliser **Changer de compte** dans la navigation.

### Administrateur

1. Ouvrir <https://restauci.vercel.app/login>.
2. S’authentifier avec un compte ayant le rôle Administrateur.
3. L’application redirige automatiquement vers l’administration.
4. Utiliser **Changer de compte** ou l’icône de déconnexion dans la barre supérieure pour fermer la session.

### Bonnes pratiques

- Ne jamais partager son mot de passe ou une clé de paiement.
- Toujours se déconnecter sur un appareil partagé.
- Ne pas utiliser le bouton retour du navigateur comme preuve qu’un paiement a été annulé ou confirmé : vérifier le statut dans **Mes commandes** ou **Mes séjours**.

---

# Partie A — Visiteur

## 3. Consulter Toutci sans compte

Un visiteur peut parcourir les offres avant de s’inscrire.

### Restaurants

Depuis l’espace de découverte des restaurants, le visiteur peut :

- autoriser la localisation pour voir les établissements proches ;
- rechercher un restaurant ou un plat ;
- filtrer selon les cuisines disponibles ;
- utiliser la carte ou la liste ;
- ouvrir la fiche publique d’un restaurant ;
- consulter ses informations, ses horaires et son menu.

La recherche de restaurants est liée aux zones de service configurées pour l’activité Restaurant. La position du client et la zone du restaurant peuvent donc déterminer sa disponibilité pour une commande.

### Résidences

Depuis <https://restauci.vercel.app/residences>, le visiteur peut :

- rechercher une ville ou une destination ;
- indiquer le nombre de voyageurs ;
- ouvrir la fiche d’une résidence ;
- consulter ses photos, sa description, son prix et sa capacité ;
- choisir des dates afin de voir la disponibilité et le montant estimé.

Une résidence n’est pas soumise aux mêmes contraintes géographiques qu’une livraison de restaurant. Sa localisation doit appartenir à une destination activée pour l’hébergement, mais le voyageur n’a pas besoin de se trouver lui-même dans cette zone au moment de réserver.

### Quand faut-il créer un compte ?

Le compte client devient obligatoire pour :

- ajouter et confirmer une commande ;
- payer une commande en ligne ;
- réserver une résidence ;
- consulter l’historique personnel ;
- reprendre ou annuler un paiement en attente.

---

# Partie B — Client consommateur sur le Web

## 4. Créer et gérer son compte client

1. Depuis l’espace client, sélectionner **Se connecter**.
2. Choisir la création de compte si aucun compte client n’existe.
3. Renseigner le nom complet, le numéro de téléphone, le mot de passe et, si souhaité, l’adresse électronique.
4. Après connexion, ouvrir **Mon profil** pour modifier le nom ou l’adresse électronique.
5. Utiliser la déconnexion pour changer de compte.

## 5. Commander dans un restaurant

### 5.1 Trouver un restaurant

1. Ouvrir l’espace Restaurants.
2. Autoriser la géolocalisation lorsque le navigateur la demande.
3. Rechercher un restaurant ou un plat, ou sélectionner un marqueur sur la carte.
4. Ouvrir la fiche du restaurant.

Si aucun restaurant n’apparaît, vérifier :

- que la localisation est autorisée ;
- que la connexion Internet fonctionne ;
- que le restaurant dessert la zone actuelle ;
- que les filtres de cuisine ne sont pas trop restrictifs.

### 5.2 Constituer le panier

1. Parcourir le menu.
2. Ajouter les plats souhaités.
3. Ouvrir le panier.
4. Modifier les quantités si nécessaire.
5. Choisir un mode proposé par le restaurant :
   - **Livraison** : saisir ou sélectionner une adresse ;
   - **À emporter** : retirer la commande au restaurant ;
   - **Sur place** : indiquer le numéro de table lorsque nécessaire.
6. Ajouter éventuellement une note destinée au restaurant.

Le panier ne peut contenir que les articles d’un même restaurant. Le minimum de commande et les frais de livraison sont calculés avant la confirmation.

### 5.3 Choisir le paiement

Les moyens présentés sont :

- **Sur place / espèces** : règlement directement au restaurant ou au livreur ;
- **Mobile Money** : paiement sécurisé par Paystack ;
- **Carte bancaire** : paiement sécurisé par Paystack.

Pour Mobile Money ou Carte :

1. Sélectionner le moyen de paiement.
2. Confirmer la commande.
3. Terminer le paiement sur la page Paystack.
4. Attendre la redirection vers Toutci.
5. Vérifier que le statut n’est plus **Paiement requis**.

La commande en ligne n’est transmise comme payée au restaurant qu’après confirmation serveur de Paystack.

### 5.4 Suivre ou annuler une commande

Ouvrir **Mes commandes**, puis sélectionner une commande.

Les principaux statuts sont :

| Statut | Signification |
| --- | --- |
| Paiement requis | Paiement Paystack non terminé ou non confirmé |
| Reçue | Commande acceptée dans le flux du restaurant |
| En préparation | Restaurant en train de préparer la commande |
| Prête | Commande prête pour le retrait, le service ou la livraison |
| Servie | Commande terminée |
| Annulée | Commande arrêtée |

Lorsqu’une commande attend encore son paiement, le client peut **Reprendre le paiement Paystack** ou l’annuler. Pour une commande déjà avancée dans son traitement, les possibilités d’annulation dépendent de son état et des contrôles affichés par l’application.

## 6. Réserver une résidence

### 6.1 Rechercher et calculer le séjour

1. Ouvrir <https://restauci.vercel.app/residences>.
2. Rechercher la destination.
3. Ouvrir une résidence.
4. Choisir la date d’arrivée et la date de départ.
5. Indiquer le nombre de voyageurs sans dépasser la capacité maximale.
6. Vérifier le prix total affiché.

Les dates déjà réservées ou bloquées par le propriétaire ne peuvent pas être choisies.

### 6.2 Réserver et payer

Les résidences acceptent actuellement les paiements électroniques suivants :

- Mobile Money ;
- Carte bancaire.

Il n’y a pas de réservation de résidence avec paiement en espèces dans ce parcours.

1. Sélectionner le moyen de paiement.
2. Cliquer sur **Réserver et payer**.
3. Terminer le paiement Paystack.
4. Attendre le retour vers Toutci.
5. Ouvrir **Mes séjours** pour confirmer le statut.

Une résidence peut être visible mais temporairement non réservable si son compte de règlement Paystack n’est pas encore activé. Dans ce cas, l’interface l’indique et aucun paiement n’est lancé.

### 6.3 Gérer un séjour

Dans **Mes séjours**, le client peut :

- consulter les dates, le nombre de voyageurs et le montant ;
- reprendre un paiement interrompu ;
- annuler une réservation encore en attente de paiement ;
- annuler un séjour confirmé à venir lorsque l’action est autorisée ;
- consulter le statut temporel : à venir, en cours ou terminé.

L’annulation libère les dates lorsque la réservation est effectivement annulable.

---

# Partie C — Client consommateur sur mobile

## 7. Navigation principale de l’application mobile

L’application mobile comporte quatre onglets :

| Onglet | Utilisation |
| --- | --- |
| Carte | Restaurants proches, recherche, filtres, itinéraire et accès au menu |
| Commandes | Commandes en cours et historique |
| Séjours | Recherche de résidences et réservations personnelles |
| Profil | Compte, notifications, favoris, adresses et déconnexion |

## 8. Utiliser la carte des restaurants

1. Autoriser Toutci à accéder à la position pendant l’utilisation de l’application.
2. Utiliser la barre de recherche pour trouver un restaurant ou une adresse.
3. Filtrer par cuisine.
4. Passer du mode carte au mode liste selon le besoin.
5. Sélectionner un restaurant pour afficher sa fiche.
6. Utiliser **Itinéraire** lorsque le tracé est disponible.
7. Ouvrir le menu, ajouter des plats et poursuivre vers le panier.

La localisation est nécessaire pour vérifier les restaurants disponibles autour du client et pour valider la zone d’une commande.

## 9. Commander depuis le mobile

Le parcours est le même que sur le Web :

1. choisir un restaurant ;
2. ajouter les plats ;
3. choisir Livraison, À emporter ou Sur place selon les options disponibles ;
4. renseigner l’adresse ou la table si nécessaire ;
5. sélectionner le paiement ;
6. confirmer.

Pour un paiement électronique, l’application ouvre Paystack. Après vérification par le serveur, le lien sécurisé `toutci://payments/callback` rouvre automatiquement l’application et affiche le résultat. L’application recharge ensuite la commande depuis l’API : le simple retour dans l’application n’est jamais considéré comme une preuve de paiement.

Si l’application n’est pas rouverte automatiquement, la fermer puis la relancer et consulter **Commandes**. Le webhook Paystack peut avoir confirmé le paiement côté serveur même si la redirection visuelle a été interrompue.

## 10. Réserver une résidence depuis le mobile

1. Ouvrir **Séjours**.
2. Dans **Explorer**, rechercher une destination.
3. Ouvrir une résidence et choisir les dates et le nombre de voyageurs.
4. Se connecter si l’application le demande.
5. Choisir Mobile Money ou Carte.
6. Terminer le paiement Paystack.
7. Revenir dans **Séjours → Mes séjours** pour consulter la réservation.

Le détail d’une réservation permet de reprendre un paiement en attente ou d’annuler lorsque le statut l’autorise.

## 11. Profil, adresses, favoris et notifications

Dans **Profil**, le client peut :

- se connecter ou se déconnecter ;
- consulter le nombre de commandes ;
- enregistrer des restaurants favoris ;
- ajouter, modifier, supprimer et choisir une adresse par défaut ;
- consulter les notifications ;
- marquer les notifications comme lues ;
- accéder aux informations À propos.

Les favoris et les adresses sont actuellement conservés sur l’appareil et séparés par utilisateur. Ils ne doivent pas être considérés comme synchronisés automatiquement entre plusieurs téléphones.

Les sections **Coupons**, **Moyens de paiement** et **Support** indiquées comme « bientôt disponibles » ne constituent pas encore des fonctions opérationnelles du MVP. Les cartes bancaires ne sont pas enregistrées dans Toutci : le paiement est traité sur l’interface Paystack.

### Notifications mobiles

Après connexion, l’application demande l’autorisation d’envoyer des notifications. Si elle est acceptée, les changements importants de commandes et de séjours apparaissent dans l’app et peuvent être envoyés en push lorsque les identifiants Firebase/Apple de production sont configurés.

---

# Partie D — Partenaire Restaurant

## 12. Créer un compte Restaurant

1. Créer un compte partenaire depuis <https://restauci.vercel.app/register>.
2. Après l’inscription, sélectionner **Restaurant** comme activité.
3. Terminer les cinq étapes de configuration :
   1. informations générales et type d’établissement ;
   2. adresse, position sur la carte et contacts ;
   3. jours et horaires d’ouverture ;
   4. premier plat du menu ;
   5. vérification et enregistrement.

La latitude et la longitude sont récupérées au moyen de la carte et de la géolocalisation ; elles ne doivent pas être saisies arbitrairement.

Après l’enregistrement, le dossier du restaurant est transmis à l’administration. Le statut apparaît sur le tableau de bord.

## 13. Vérification d’identité du partenaire

Ouvrir **Vérification** puis :

1. recopier le nom légal du propriétaire ;
2. choisir Carte nationale d’identité ou Passeport ;
3. indiquer le pays d’émission et la date d’expiration ;
4. envoyer le recto et le verso de la carte, ou la page d’identité du passeport ;
5. enregistrer le brouillon si le dossier n’est pas prêt ;
6. sélectionner **Soumettre pour vérification**.

Formats acceptés : PDF, JPEG ou PNG, avec une taille maximale de 8 Mo par fichier. Les justificatifs sont stockés dans un espace privé et ne sont jamais publiés sur les fiches commerciales.

Après soumission, le dossier est verrouillé pendant l’examen. En cas de rejet, lire le motif, corriger les éléments demandés et soumettre à nouveau.

## 14. Gérer le profil et la disponibilité du restaurant

Dans **Profil**, le partenaire peut gérer notamment :

- le nom et la description ;
- les coordonnées et l’adresse ;
- la position géographique ;
- les modes de commande proposés ;
- les horaires d’ouverture ;
- les médias et informations publiques disponibles.

Les états de validation sont :

- **En attente** : l’équipe Toutci examine le dossier ;
- **Validé** : le restaurant peut être rendu disponible selon sa configuration ;
- **Corrections nécessaires** : corriger le profil puis utiliser **Renvoyer pour validation** ;
- **Suspendu** : l’activité est temporairement bloquée et le motif est affiché.

Les restaurants utilisent les contraintes de zone nécessaires aux commandes et à la livraison. La disponibilité dépend donc de leur position, du marché de service actif et des modes de commande proposés.

## 15. Gérer le menu

Dans **Menu**, le partenaire peut :

- créer et organiser les catégories ;
- ajouter un plat ;
- renseigner son nom, sa description, son prix, sa catégorie et sa photo ;
- modifier un plat ;
- rendre un plat disponible ou indisponible ;
- supprimer un plat ;
- filtrer les plats disponibles ou indisponibles.

Les quotas de catégories et de plats dépendent de l’offre d’abonnement active. Les valeurs exactes ne sont pas figées dans ce guide car l’administrateur peut modifier et publier le catalogue commercial sans modifier le code.

## 16. Traiter les commandes

Dans **Commandes** :

1. surveiller les nouvelles commandes ;
2. ouvrir une commande pour voir le client, le mode, les articles, le paiement et le montant ;
3. utiliser le contrôle de statut proposé par l’écran ;
4. faire progresser la commande de Reçue vers En préparation, puis Prête et enfin Servie ;
5. annuler uniquement lorsque l’action est disponible et fournir le motif demandé.

Pour un paiement Paystack, ne jamais considérer la commande comme payée sur la seule présentation d’une capture d’écran du client. Le statut serveur de Toutci fait foi.

Les notifications de nouvelle commande et les mises à jour en temps réel sont affichées dans l’espace professionnel. Les notifications du navigateur peuvent être activées depuis la barre de navigation.

## 17. Abonnement, quotas et exposition

Dans **Offre et facturation**, le partenaire peut :

- consulter son offre effective ;
- voir les quotas et avantages actuellement publiés ;
- comparer Découverte, Croissance et Partenaire Fier ;
- demander un changement d’offre ;
- suivre l’état de la demande ;
- consulter les périodes et informations de facturation disponibles.

Une offre supérieure peut accorder davantage de quotas et d’exposition dans les résultats. Le classement payant ne supprime toutefois pas les contrôles fondamentaux : un restaurant suspendu, non disponible ou hors zone ne devient pas éligible grâce à son abonnement.

## 18. Facturation et commissions Restaurant

Les paiements électroniques peuvent utiliser un compte de règlement Paystack associé au restaurant. Pour les règlements en espèces, Toutci enregistre la commission due après le service.

Dans **Facturation**, le partenaire peut consulter :

- les commissions ;
- les règlements enregistrés ;
- les montants éventuellement dus ;
- les alertes liées au seuil de dette cash ;
- l’historique financier affiché.

L’association du sous-compte Paystack est actuellement réalisée par l’administration. Le partenaire ne doit pas saisir une clé secrète Paystack dans son profil.

---

# Partie E — Partenaire Résidence

## 19. Créer un compte Résidence

1. Créer un compte partenaire.
2. Après l’inscription, choisir **Résidence**.
3. Configurer la première résidence en quatre étapes :
   1. **Le logement** : titre, description, prix par nuit et capacité ;
   2. **La localisation** : rechercher l’adresse et confirmer le marqueur sur la carte ;
   3. **Les photos** : ajouter les médias du logement ;
   4. **Vérifier et enregistrer** : enregistrer un brouillon ou envoyer la fiche en vérification.

La progression du brouillon d’onboarding est conservée dans le navigateur utilisé jusqu’à la création de la résidence.

Une photo est obligatoire pour demander la vérification, mais le brouillon peut être enregistré sans photo.

## 20. Comprendre vérification et publication

La vérification administrative et la publication sont deux décisions distinctes.

1. Le partenaire crée un brouillon.
2. Il sélectionne **Demander la vérification de la fiche**.
3. L’administrateur valide la résidence ou demande une correction.
4. Le partenaire termine sa vérification d’identité si nécessaire.
5. La destination, le quota et le compte partenaire doivent être éligibles.
6. Une fois tous les prérequis satisfaits, le bouton **Publier la résidence** apparaît.
7. Le partenaire choisit lui-même le moment de la mise en ligne.

Une résidence validée n’est donc pas publiée automatiquement.

Les causes possibles empêchant une publication sont notamment :

- fiche jamais envoyée en vérification ;
- vérification administrative en attente ou corrections demandées ;
- résidence suspendue ;
- identité non soumise, en attente ou rejetée ;
- localisation absente ou destination non reconnue ;
- service Résidence indisponible dans la destination ;
- quota de résidences publiées atteint ;
- publication désactivée par le partenaire.

## 21. Gérer les résidences

Dans **Mes résidences**, le partenaire peut :

- créer une nouvelle résidence ;
- consulter le statut de chaque fiche ;
- ouvrir et modifier une résidence ;
- ajouter jusqu’à 12 photos ;
- demander une nouvelle vérification après une modification ;
- publier une résidence éligible ;
- retirer une résidence du catalogue ;
- ouvrir sa fiche publique lorsqu’elle est visible.

Toute modification importante d’une résidence déjà approuvée déclenche une nouvelle vérification. Une résidence suspendue n’est pas modifiable tant que l’administration ne l’a pas réactivée.

Retirer une résidence du catalogue ne supprime ni sa fiche ni son historique. Elle peut être republiée ultérieurement si les prérequis restent satisfaits.

## 22. Gérer les réservations et le calendrier

Dans **Réservations et calendrier**, deux onglets sont disponibles.

### Réservations

Le partenaire voit :

- la résidence concernée ;
- le nom et le téléphone du voyageur ;
- les dates du séjour ;
- le nombre de voyageurs ;
- le statut du paiement ou de la réservation ;
- le montant total.

### Calendrier

1. Choisir la résidence à gérer.
2. Ajouter une période d’indisponibilité pour un usage personnel, des travaux ou un autre motif.
3. Vérifier qu’elle ne chevauche pas une réservation ou une autre période bloquée.
4. Retirer un blocage manuel lorsqu’il n’est plus nécessaire.

Les séjours confirmés rendent automatiquement leurs dates indisponibles. Le calendrier manuel ne sert donc pas à recréer une réservation client.

## 23. Paiements et compte de règlement Résidence

Une résidence peut être publiée mais ne pas encore accepter de réservation si aucun sous-compte Paystack actif ne lui est associé.

L’administration associe le code du sous-compte Paystack depuis la fiche administrative de la résidence. Lorsque ce compte est actif :

- le client peut payer par Mobile Money ou Carte ;
- Toutci vérifie le paiement ;
- la réservation passe à Confirmée ;
- les dates restent bloquées ;
- le partenaire voit la réservation dans son espace.

Le partenaire ne doit jamais communiquer sa clé secrète Paystack. Seule la référence du sous-compte vérifié est associée par l’administration.

## 24. Offre et quota Résidence

Dans **Offre et facturation**, le quota porte sur le nombre de résidences **publiées simultanément**, et non sur le nombre total de brouillons conservés.

Le partenaire peut donc :

- garder des résidences en brouillon ;
- retirer une résidence du catalogue pour libérer une place ;
- publier une autre résidence si son quota le permet ;
- demander une offre supérieure pour augmenter les avantages disponibles.

Les prix, quotas et avantages sont administrables et peuvent évoluer. Les informations affichées dans l’application constituent la référence commerciale courante.

---

# Partie F — Administrateur

## 25. Vue d’ensemble et actions à traiter

La page **Vue d’ensemble** présente les indicateurs principaux et des accès rapides vers les opérations.

La page **À traiter** centralise les éléments nécessitant une décision, notamment les vérifications, les demandes ou les dossiers en attente. Commencer la journée par cette page permet de traiter les blocages avant les contrôles de routine.

## 26. Administrer les restaurants

Dans **Restaurants** :

1. filtrer par Tous, En attente, Actifs, Suspendus ou Rejetés ;
2. ouvrir la fiche d’un restaurant ;
3. vérifier les informations, la localisation et les éléments du dossier ;
4. choisir **Valider**, **Rejeter**, **Suspendre** ou **Réactiver** selon l’état ;
5. fournir un motif clair lors d’un rejet ou d’une suspension ;
6. associer ou désactiver le sous-compte Paystack lorsque nécessaire.

Un rejet demande une correction au partenaire. Une suspension bloque une activité déjà validée et doit être utilisée pour un motif opérationnel ou de conformité clairement documenté.

## 27. Administrer les résidences

Dans **Résidences** :

1. ouvrir une fiche en attente ;
2. contrôler le contenu, les photos, le prix, la capacité et la localisation ;
3. valider la résidence ou demander une correction avec un motif suffisamment précis ;
4. suspendre une résidence approuvée lorsqu’un problème apparaît ;
5. réactiver une résidence suspendue après résolution ;
6. associer le sous-compte Paystack vérifié pour rendre le paiement disponible.

La validation administrative de la fiche ne doit pas forcer sa publication : le propriétaire conserve la maîtrise du bouton **Publier la résidence**.

## 28. Vérifier l’identité des partenaires

Dans **Vérifications** :

1. ouvrir un dossier en attente ;
2. comparer le nom légal et les informations déclarées aux justificatifs ;
3. ouvrir les documents privés ;
4. choisir **Valider l’identité** si le dossier est conforme ;
5. choisir **Demander une correction** et saisir un motif explicite en cas d’anomalie.

Une validation s’applique au compte partenaire. Elle ne doit pas être dupliquée séparément pour chaque résidence ou pour chaque fiche commerciale appartenant au même compte.

## 29. Configurer les zones de service

Dans **Zones de service**, l’administrateur gère des marchés géographiques versionnés.

Pour chaque marché :

1. définir son code et son nom ;
2. sélectionner les frontières géographiques ;
3. préparer une version ;
4. vérifier la comparaison cartographique ;
5. publier la version ;
6. activer indépendamment les capacités Restaurant et Résidence.

Différence essentielle :

- **Restaurant** : la zone sert à la disponibilité locale et aux contraintes de commande/livraison ;
- **Résidence** : la zone qualifie une destination où l’hébergement est autorisé, sans imposer au voyageur d’être physiquement dans cette zone pour réserver.

Ne jamais appliquer automatiquement une contrainte de rayon de livraison d’un restaurant à une résidence.

## 30. Comptes et accès

Dans **Comptes et accès**, l’administrateur peut :

- consulter séparément les partenaires et les clients ;
- rechercher un compte ;
- examiner son état ;
- suspendre un compte avec un motif ;
- réactiver un compte lorsque le problème est résolu.

La suspension du compte est plus large que la suspension d’un seul restaurant ou d’une seule résidence. Choisir l’action la plus ciblée possible.

## 31. Support opérationnel

La page **Support** permet de repérer notamment :

- les commandes potentiellement bloquées ;
- les paiements échoués ;
- les paiements remboursés ;
- les commandes annulées récemment ;
- une commande précise au moyen de la recherche.

Avant toute correction manuelle, vérifier le statut de la transaction, la référence Paystack, l’historique de la commande et le journal d’audit. Une capture d’écran client ne remplace pas la vérification serveur.

## 32. Finance et commissions

Dans **Finance**, l’administrateur peut :

- consulter les commissions globales et par restaurant ;
- filtrer par restaurant, statut et période ;
- suivre les montants dus ;
- enregistrer un règlement encaissé ;
- gérer la politique de dette de commissions cash ;
- examiner l’historique des règlements.

L’enregistrement manuel d’un règlement doit correspondre à un encaissement réel et comporter une référence vérifiable. Les paiements électroniques confirmés suivent le circuit Paystack et ne doivent pas être recréés manuellement.

## 33. Administrer les abonnements

La page **Abonnements** contient les fonctions suivantes :

### Demandes

- consulter les demandes des partenaires Restaurant et Résidence ;
- valider une souscription en renseignant les informations requises ;
- refuser une demande avec un motif ;
- éviter de créer deux périodes actives concurrentes pour le même partenaire.

### Partenaires abonnés et historique

- consulter les périodes actives ;
- suspendre ou réactiver un abonnement ;
- suivre les périodes expirées ou terminées ;
- contrôler la rétrogradation automatique vers Découverte à l’échéance.

### Catalogue commercial

L’administrateur peut préparer puis publier les paramètres des offres :

- nom et présentation ;
- prix ;
- taux ou règles de commission ;
- quotas par activité ;
- avantages affichés ;
- poids et avantages d’exposition dans la découverte.

Les offres sont Découverte, Croissance et Partenaire Fier. Les paramètres Restaurant et Résidence doivent être vérifiés dans leurs onglets respectifs avant publication.

La publication d’un nouveau catalogue modifie les informations commerciales visibles pour les nouvelles décisions. Les valeurs déjà figées dans une période d’abonnement existante restent conservées dans cette période.

Une offre payante peut améliorer l’exposition, mais ne doit jamais contourner :

- la suspension ;
- la modération ;
- la vérification d’identité requise ;
- l’indisponibilité géographique ou opérationnelle ;
- l’absence d’un produit publiable.

## 34. Journal d’audit et paramètres

Dans **Journal d’audit**, utiliser les filtres pour retrouver les actions liées aux restaurants, comptes, clients, finances ou opérations système.

Le journal sert à répondre aux questions suivantes :

- qui a pris la décision ;
- quelle ressource a été modifiée ;
- quand l’action a eu lieu ;
- quel motif ou détail a été enregistré.

Dans **Paramètres**, modifier uniquement les réglages explicitement proposés par l’interface. Les secrets Paystack, Vercel, Cloudflare, Firebase ou Apple ne sont pas des paramètres ordinaires de l’application et ne doivent jamais être copiés dans un champ métier.

---

# Partie G — Paiements, notifications et résolution de problèmes

## 35. Comprendre le résultat d’un paiement

| Situation | Action recommandée |
| --- | --- |
| Retour avec « Paiement confirmé » | Ouvrir le détail de la commande ou du séjour et vérifier le statut |
| Paiement encore en attente | Attendre quelques instants puis actualiser ; utiliser Reprendre le paiement si disponible |
| Page Paystack fermée | Revenir dans Mes commandes ou Mes séjours |
| Montant débité mais statut non confirmé | Ne pas repayer immédiatement ; transmettre la référence au support |
| Paiement échoué ou annulé | Relancer depuis le détail si l’opération reste payable |

Le callback remet l’utilisateur dans Toutci. Le webhook Paystack confirme l’événement côté serveur même si le navigateur ou l’application a été fermé avant la redirection.

## 36. Notifications

Toutci utilise plusieurs canaux :

- notifications internes visibles dans l’application ;
- notifications Web du navigateur, protégées par les clés VAPID ;
- notifications mobiles Expo, relayées par Firebase sur Android et Apple APNs sur iOS.

Si aucune notification push n’arrive :

1. vérifier l’autorisation dans les réglages du téléphone ou du navigateur ;
2. vérifier que l’utilisateur est connecté ;
3. consulter la page Notifications, car la notification interne peut exister même si le push externe a échoué ;
4. sur mobile, vérifier que le build de production dispose des identifiants Firebase ou Apple nécessaires.

## 37. Problèmes fréquents

### La carte ne trouve pas ma position

- Autoriser la localisation précise.
- Activer le GPS.
- Réessayer depuis une zone avec une connexion Internet stable.
- Utiliser la recherche d’adresse ou placer le marqueur lorsque l’écran le permet.

### Je ne peux pas publier une résidence

Lire le message affiché sous la résidence. Vérifier successivement : fiche approuvée, identité validée, localisation admissible, capacité Résidence active, quota disponible et publication non désactivée.

### Une résidence est visible mais non réservable

Le sous-compte de règlement Paystack peut être absent ou inactif. L’administrateur doit vérifier la section **Compte de règlement Paystack** de la résidence.

### Mon restaurant n’apparaît pas

Vérifier : validation administrative, absence de suspension, zone de service, modes de commande, horaires, menu et disponibilité des plats.

### Je dois changer de compte

- Client mobile : **Profil → Se déconnecter**.
- Client Web : ouvrir le profil puis se déconnecter.
- Partenaire : **Changer de compte** en bas du menu.
- Administrateur : **Changer de compte** dans la barre supérieure.

---

## 38. Périmètre fonctionnel actuel du MVP

Fonctions opérationnelles documentées :

- authentification et déconnexion par profil ;
- recherche et consultation des restaurants ;
- panier, commande et suivi ;
- paiement espèces pour les commandes lorsqu’il est proposé ;
- paiement Paystack Mobile Money ou Carte ;
- recherche, réservation et suivi des résidences ;
- parcours partenaire Restaurant et Résidence ;
- vérification d’identité ;
- modération administrative ;
- abonnements, quotas et exposition administrables ;
- commissions et règlements ;
- zones de service différenciées par activité ;
- notifications internes, Web et infrastructure mobile ;
- API mobile versionnée et contrat OpenAPI.

Éléments qui ne doivent pas être présentés comme terminés aux utilisateurs :

- application autonome pour les livreurs ;
- coupons mobiles réellement utilisables ;
- portefeuille ou cartes bancaires enregistrées dans Toutci ;
- support conversationnel mobile complet ;
- notifications push réelles sur les builds Store tant que les identifiants Firebase et Apple ne sont pas installés ;
- paiements en argent réel tant que la clé Paystack de test n’est pas remplacée par une clé Live et que le dispositif Live n’a pas été vérifié.

---

## 39. Checklist de prise en main

### Client

- [ ] Créer le compte client.
- [ ] Autoriser la localisation.
- [ ] Tester une recherche de restaurant.
- [ ] Tester une commande.
- [ ] Tester une recherche de résidence.
- [ ] Tester une réservation.
- [ ] Vérifier Commandes, Séjours, Profil et déconnexion.

### Partenaire Restaurant

- [ ] Créer le compte et choisir Restaurant.
- [ ] Terminer l’onboarding.
- [ ] Soumettre la vérification d’identité.
- [ ] Faire valider le restaurant.
- [ ] Compléter le menu et les horaires.
- [ ] Contrôler l’offre et les quotas.
- [ ] Recevoir et traiter une commande de test.
- [ ] Vérifier la facturation et la déconnexion.

### Partenaire Résidence

- [ ] Créer le compte et choisir Résidence.
- [ ] Créer la première fiche avec localisation et photo.
- [ ] Soumettre la vérification d’identité.
- [ ] Demander la vérification de la résidence.
- [ ] Faire valider la fiche et le compte Paystack.
- [ ] Publier manuellement la résidence.
- [ ] Tester calendrier, réservation et retrait du catalogue.
- [ ] Vérifier l’offre, le quota et la déconnexion.

### Administrateur

- [ ] Vérifier le tableau À traiter.
- [ ] Tester une décision KYC.
- [ ] Tester une validation Restaurant.
- [ ] Tester une validation Résidence sans publication automatique.
- [ ] Vérifier les capacités géographiques séparées.
- [ ] Associer un sous-compte Paystack de test.
- [ ] Valider une demande d’abonnement.
- [ ] Examiner Finance, Support et Journal d’audit.
- [ ] Vérifier la déconnexion et le changement de compte.

