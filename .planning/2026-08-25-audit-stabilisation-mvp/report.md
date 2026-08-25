# Audit de stabilisation MVP Toutci

Date : 25 août 2026  
Périmètre : état actuel des Blocs 1–11, web, API mobile, base de développement et préparation au lancement.  
Méthode : contrôles automatisés sans navigateur, revue statique des parcours et requêtes DB strictement en lecture seule.

## 1. Verdict

Le socle web compile et les règles métier principales sont bien structurées, mais le produit n’est pas encore prêt pour une ouverture commerciale complète ni pour brancher une application mobile consommateur de bout en bout.

- **Web technique : candidat à la stabilisation.** TypeScript, ESLint, 246 tests et le build Webpack de production sont verts.
- **Résidences : domaine largement implémenté, mais pas encore validé en situation réelle.** La base ne contient aucune réservation et aucun partenaire Résidence n’a encore KYC vérifié + sous-compte Paystack actif.
- **Mobile consommateur : incomplet.** Restaurants et commandes sont proches d’un contrat exploitable; Résidences, cycle de session native, notifications et retour de paiement restent incomplets.
- **Mobile partenaire : non paritaire avec le web.** Il ne couvre qu’une partie du métier Restaurant et ne couvre pas Résidences.
- **Lancement commercial : bloqué.** Les mentions légales sont incomplètes et les CGU ne décrivent pas les Résidences, Paystack ni l’annulation sans remboursement.

## 2. Contrôles exécutés

| Contrôle | Résultat | Portée réelle |
| --- | --- | --- |
| `npm run typecheck` | Réussi | 0 erreur TypeScript |
| `npm run lint` | Réussi | 0 erreur ESLint |
| `npm test` | Réussi avec réserves | 246 réussis, 29 ignorés, 0 échec |
| `next build --webpack` | Réussi | 78 pages générées avec `CRON_SECRET` temporaire |
| Build Turbopack | Non concluant | Panic interne de bind de port dans l’environnement d’exécution |
| `git diff --check` | Réussi | Aucun défaut whitespace |
| DB développement en `READ ONLY` | Réussi | 27 migrations enregistrées, tables Blocs 8–11 présentes |
| `drizzle-kit check:pg` | Non exécuté | `drizzle-kit@0.18.1` refuse de fonctionner avec l’état actuel |
| `npm audit --omit=dev` | Non exécuté | Registre inaccessible; accès externe refusé pour ne pas transmettre les métadonnées |
| Tests E2E / navigateur | Non exécutés | Consigne explicite de ne pas utiliser le navigateur |
| Tests DB/concurrence | Non exécutés | Pas de base de test distincte utilisable |

Les tests verts ne doivent donc pas être interprétés comme une recette complète. Plusieurs tests Résidences vérifient la structure du code et des migrations sous forme de texte; ils ne simulent pas réellement deux transactions PostgreSQL concurrentes.

## 3. Alignement avec les décisions produit

### Zones Restaurants et Résidences

La distinction demandée est respectée :

- Restaurants dépend de la position courante et peut refuser une commande entre deux marchés différents;
- Résidences dépend de la destination choisie; un client à Bouaké peut chercher et réserver à Abidjan sans que sa position courante corresponde à la destination;
- les capacités `restaurant` et `residence` sont indépendantes dans chaque marché.

La base confirme cette séparation : 2 marchés publiés, Restaurants actif dans 2 marchés, Résidences actif dans 1 seul.

Réserve : `RESIDENCE_GEO_POLICY_MODE` existe et vaut `off` par défaut, mais le domaine Résidences ne la lit pas. La politique destination est donc appliquée directement. Il faut soit supprimer cette variable devenue trompeuse, soit lui donner une sémantique de déploiement réellement utilisée.

### KYC, publication et réservation

La publication effective d’une résidence exige bien : demande de publication, validation admin, KYC propriétaire vérifié, destination Résidences active, quota disponible et activation manuelle de publication. La réservation exige en plus un sous-compte Paystack actif.

État actuel de la base :

- 1 Partner Account Résidence;
- 1 résidence approuvée avec intention de publication;
- publication manuelle non activée;
- 0 KYC Résidence soumis/vérifié;
- 0 sous-compte Paystack Résidence actif;
- 0 réservation Résidence.

Le code possède les workflows, mais la donnée actuelle ne permet pas encore une recette publique positive.

### Abonnements, quotas et exposition

Le plan Bloc 9 initial disait de ne pas inventer de quotas Résidence. Cette règle a ensuite été remplacée par les décisions prises pendant les étapes 2A–2C et le Bloc 11. L’état actuel est cohérent avec cette décision ultérieure :

- 3 offres administrables;
- limites Résidence 1 / 5 / illimité par défaut;
- taux de commission, prix, limites et avantages modifiables en administration;
- exposition distincte Restaurants/Résidences;
- classement payant appliqué seulement après les critères d’éligibilité métier.

La base contient bien 3 limites Résidence, 6 configurations d’exposition et 2 politiques de découverte.

## 4. Blocages P0 avant lancement

### P0.1 — Parcours mobile Résidences incomplet

Le module métier sait déjà rechercher une résidence et lire son détail, mais aucun Route Handler `/api/v1` ne les expose.

Manquent au minimum :

- recherche/liste Résidences avec destination, dates, voyageurs et pagination;
- détail public par slug;
- contrat de découverte/attribution adapté au mobile.

Les routes disponibilité, devis, création, historique, détail, annulation et retry de réservation existent. Sans liste/détail, elles ne forment cependant pas un parcours mobile navigable.

### P0.2 — Cycle de session consommateur native incomplet

Register/login retournent l’access token mais déposent le refresh token uniquement dans un cookie HttpOnly. Refresh accepte un token JSON, mais ne retourne le nouveau refresh token qu’en cookie. Logout ne sait révoquer que le refresh cookie.

Une application native sans cookie jar fiable ne peut pas :

- conserver la session après 15 minutes;
- recevoir le refresh token rotatif;
- révoquer complètement sa session au logout.

Il faut choisir officiellement un contrat natif : refresh token JSON stocké dans Keychain/Keystore/SecureStore, ou stratégie cookie native testée et documentée.

### P0.3 — Notifications consommateur absentes

La DB sait enregistrer des notifications avec `clientId`, et Résidences en crée déjà. Mais :

- aucun `/api/v1/client/notifications` ne permet de les lire ou marquer comme lues;
- `/api/v1/push/expo/register` authentifie seulement un compte partenaire/admin;
- `push_subscriptions` ne peut référencer qu’un `userId`, pas un `clientId`.

Le consommateur mobile ne peut donc ni enregistrer son token Expo ni recevoir/lire ses notifications.

### P0.4 — OpenAPI inutilisable comme contrat mobile

L’OpenAPI ne documente pas Résidences, réservations, recherche POST Restaurants, localisation, prévalidation, retry paiement, logout client ni découverte. Il contient aussi des contrats faux : mot de passe 6 au lieu de 8 caractères et body de commande sans `paymentMethod` ni `idempotencyKey` obligatoires.

Un client mobile généré depuis cette spécification serait incorrect.

### P0.5 — Annulation Résidence et information consommateur

Le comportement financier est conforme au plan : une réservation payée peut être annulée sans remboursement; Transaction et Payment restent payés/confirmés, et la commission n’est pas inversée.

L’écart est l’information utilisateur : l’écran de réservation ne présente pas clairement, avant paiement, la mention obligatoire « annulation sans remboursement ». Les CGU ne la décrivent pas non plus.

### P0.6 — Réservations de paiement abandonnées sans traitement admin

Conformément au plan, une réservation `en_attente_paiement` bloque immédiatement les dates et ne doit pas expirer arbitrairement. Le plan prévoyait qu’un administrateur puisse traiter les abandons. Ce workflow n’existe pas.

Une tentative abandonnée peut donc immobiliser les dates tant que le client ne revient pas l’annuler. Il faut une action support/admin sûre, accompagnée d’une vérification Paystack avant libération; pas une expiration aveugle.

### P0.7 — Documents juridiques non alignés au produit

- Mentions légales : éditeur, RCCM/NCC, siège, hébergeur et contacts toujours absents.
- CGU : décrivent seulement Restaurants et le paiement sur place, pas Paystack ni Résidences.
- Confidentialité : ne décrit pas précisément KYC, données de réservation, Paystack, stockage R2 privé, géolocalisation et attribution sponsorisée.

Ces textes doivent être validés juridiquement avant ouverture commerciale.

## 5. État de l’API mobile consommateur

| Domaine | État | Conclusion |
| --- | --- | --- |
| Inscription / connexion | Partiel | Access token fonctionnel; refresh natif non finalisé |
| Déconnexion | Partiel | Bearer révoqué; refresh natif hors cookie non pris en charge |
| Profil | Partiel | Lecture/modification de base; pas de téléphone, récupération mot de passe ou suppression de compte |
| Localisation / marché | Fonctionnel | Résolution de marché et capacités disponibles |
| Recherche Restaurants | Fonctionnel | POST canonique disponible; OpenAPI documente encore l’ancien GET |
| Détail / menu Restaurant | Fonctionnel avec dette | DTO public en whitelist; adaptateur détail contient encore de la logique DB legacy |
| Commandes | Fonctionnel avec réserves | Création idempotente, historique, détail, annulation, prévalidation et retry paiement |
| Suivi temps réel | Partiel | SSE Bearer; nécessite une bibliothèque mobile acceptant les headers ou un fallback polling |
| Recherche Résidences | Absent | Service métier présent, Route Handler absent |
| Détail Résidence | Absent | Service métier présent, Route Handler absent |
| Disponibilité / devis | Fonctionnel isolément | Nécessite déjà de connaître l’ID Résidence |
| Réservations | Fonctionnel avec réserves | Création, historique, détail, annulation et retry présents |
| Paiement Paystack | Partiel mobile | Checkout disponible, mais retour final vers pages web uniquement |
| Notifications in-app | Absent | Aucun endpoint client Bearer |
| Push Expo client | Absent | Endpoint existant réservé aux comptes partenaire/admin |
| OpenAPI | Bloquant | Incomplet et contradictoire avec les handlers |

Réserve supplémentaire : `limit` dans l’historique commandes client n’est pas validé proprement; une valeur non numérique/négative peut provoquer une erreur serveur.

## 6. API mobile partenaire

La parité web/mobile n’existe pas aujourd’hui.

Disponible :

- login/refresh/logout partenaire;
- statistiques Restaurant;
- liste/détail/statut de commandes Restaurant;
- liste et création de plats.

Absent ou incomplet :

- onboarding et profil établissement;
- édition/suppression/catégories/disponibilité complète des plats;
- livraisons;
- KYC;
- abonnements, facturation et commissions;
- support et notifications complètes;
- toutes les résidences, calendriers et réservations partenaire.

Un partenaire `activityType=residence` ne peut utiliser aucune route métier partenaire mobile, car le garde actuel exige un restaurant.

L’auth partenaire mobile doit être corrigée avant extension : access token jusqu’à 30 jours, refresh non typé/non rotatif, compte non recontrôlé au refresh, et refresh encore utilisable après logout.

Décision à prendre : pour le MVP, assumer officiellement **mobile consommateur + web partenaire**, ou financer une vraie parité partenaire mobile. L’état actuel ne doit pas être présenté comme paritaire.

## 7. Paiements et robustesse financière

Points solides :

- montants FCFA entiers et conversion Paystack confinée à la gateway;
- Transaction/Payment créés avant Initialize;
- callback et webhook convergent vers une finalisation canonique;
- signature webhook vérifiée;
- contrôles montant/devise/référence;
- confirmation atomique et idempotente;
- retry sans créer une deuxième commande/réservation;
- commande Restaurant payée non annulable automatiquement.

Réserves :

- aucun test Paystack TEST réel n’a été rejoué pendant cet audit;
- le retour Paystack redirige toujours vers le web, sans deep link mobile;
- aucun scénario Résidence positif n’existe encore en base;
- les cas `reversed`, remboursement et litige restent manuels/hors MVP.

## 8. Base, migrations et architecture

La base de développement est migrée jusqu’à `0026` et les agrégats actuels ne révèlent aucun orphelin réservation–Transaction–Commission. Comme la table des réservations est vide, ce contrôle ne valide toutefois aucun cas réel.

Dette à traiter :

- `drizzle-kit@0.18.1` est très en retard sur `drizzle-orm@0.45.2`;
- les snapshots Drizzle s’arrêtent à `0011`, alors que SQL/journal vont jusqu’à `0026`;
- `db:generate`/contrôle de cohérence ne sont pas fiables dans cet état;
- la baseline A3 autorise encore 106 imports DB historiques répartis sur 56 fichiers `app`;
- `map.tsx`, `queries-admin.ts` et plusieurs composants dépassent une taille raisonnable;
- la CSS MapLibre est importée deux fois.

Les nouveaux domaines Résidences, KYC, zones, abonnements et découverte respectent globalement les frontières de module. La dette principale se trouve dans les adaptateurs legacy Restaurant/commandes et l’outillage de migration.

## 9. Configuration et exploitation

À confirmer sur l’hébergeur avant lancement :

- `CRON_SECRET` d’au moins 32 caractères;
- URL publique exacte dans `NEXT_PUBLIC_APP_URL`;
- clés Paystack LIVE uniquement en production et webhook configuré;
- R2 public + bucket KYC privé;
- Upstash Redis;
- Expo Access Token si le push partenaire est utilisé;
- politique géographique finale par vertical;
- surveillance du health check, callbacks/webhooks et cron abonnements.

Le build échoue volontairement sans `CRON_SECRET` en production. `.env.example` utilise bien des placeholders et ne divulgue pas les valeurs locales.

## 10. Plan de stabilisation recommandé

### Lot 1 — Fermer les risques Résidences et juridiques

- afficher l’annulation sans remboursement avant paiement;
- ajouter le traitement admin/provider-aware des réservations abandonnées;
- mettre à jour mentions légales, CGU et confidentialité;
- créer un cas réel contrôlé : KYC vérifié, sous-compte Paystack TEST, résidence publiée, réservation et annulations avant/après paiement.

### Lot 2 — Rendre l’API consommateur complète

- exposer recherche et détail Résidences depuis les services existants;
- finaliser le contrat de refresh/logout natif;
- ajouter notifications client et abonnement Expo par `clientId`;
- prévoir un retour mobile Paystack/deep link et un fallback de vérification par polling.

### Lot 3 — Faire de l’OpenAPI la source de vérité

- documenter toutes les routes réellement supportées;
- définir les schémas d’entrée/sortie et erreurs exacts;
- ajouter des tests de contrat qui comparent OpenAPI et Zod/handlers;
- actualiser ou remplacer `docs/api-mobile-client-v1.md` et `docs/architecture-auth.md`.

### Lot 4 — Validation de lancement

- remettre Drizzle Kit/snapshots en état avant la prochaine migration;
- exécuter tests DB et concurrence sur une base isolée;
- exécuter Paystack TEST de bout en bout;
- faire ensuite la recette visuelle manuelle demandée par l’utilisateur;
- exécuter un audit npm autorisé et vérifier le build sur l’environnement cible.

La parité partenaire mobile doit être un lot séparé seulement si elle est confirmée dans le périmètre du premier MVP. Sinon, documenter clairement le choix **web partenaire, mobile consommateur**.

## 11. Conclusion de décision

Les Blocs fonctionnels sont présents et leur architecture est globalement cohérente. Le principal décalage n’est pas une absence générale du Bloc 9 ou 11 : c’est l’écart entre un web déjà avancé et un contrat mobile encore partiel, aggravé par l’absence de recette DB/Paystack Résidence positive.

La prochaine implémentation recommandée n’est pas une nouvelle fonctionnalité commerciale. Elle doit fermer le **Lot 1**, puis le **Lot 2**, avant de considérer le MVP exploitable sur mobile.
