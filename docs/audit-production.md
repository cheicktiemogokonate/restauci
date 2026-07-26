# Audit de préparation à la production — plateforme Toutci

Date de validation technique : 26 juillet 2026

## Périmètre

Cet audit couvre :

- la vitrine publique et le référencement ;
- l’inscription et la connexion restaurateur ;
- l’onboarding restaurant ;
- le tableau de bord restaurateur, les menus, les commandes et les livraisons ;
- la découverte des restaurants, le panier, la commande et le suivi côté client ;
- l’authentification client ;
- les pages juridiques publiques ;
- l’administration, les validations, les comptes, les abonnements, les
  commissions, le support et le journal d’audit ;
- la sécurité, les performances et la capacité de déploiement.

## État fonctionnel

| Domaine | État | Validation |
| --- | --- | --- |
| Vitrine Toutci | Prêt | Identité Toutci unifiée, contenus factuels, CTA actifs |
| SEO public | Prêt | Métadonnées, robots.txt, sitemap dynamique et données structurées restaurant |
| Auth restaurateur | Prêt | Email/mot de passe, Google retiré, rôles publics verrouillés |
| Onboarding | Prêt | Données réelles persistées dans une transaction |
| Dashboard restaurateur | Prêt | Routes protégées, commandes et menu connectés aux données |
| Commandes client | Prêt | Création atomique et idempotente, panier et suivi |
| Annulation | Prêt | Limitée au statut `recue`, avec contrôle de propriété |
| Livraison | Prêt | Affectation, départ, livraison et clôture de commande cohérents |
| Temps réel | Prêt | Flux authentifié, reconnexion et repli par interrogation de la base |
| Auth client | Prêt | Access token court, refresh token HTTP-only rotatif, révocation |
| Administration | Prêt | Accès protégé, workflows atomiques, audit et responsive |
| Finance admin | Prêt | Commissions regroupées, reçus liés et références obligatoires |
| Abonnements admin | Prêt | Validation atomique, suspension et réactivation traçables |
| Pages juridiques | Brouillon intégré | Publication finale bloquée par les informations légales manquantes |

## Corrections structurantes

- Les routes client utiles sont réellement publiques, tandis que l’onboarding et le dashboard restaurateur restent protégés.
- La création d’un restaurant enregistre désormais le profil, les horaires, le menu et la demande d’abonnement de manière atomique.
- Les écrans d’onboarding factices et les délais simulés ont été supprimés.
- La création d’une commande utilise une clé d’idempotence unique afin d’empêcher les doublons lors des nouvelles tentatives réseau.
- Les transitions de commande et de livraison sont validées côté serveur et réalisées de manière atomique.
- Le suivi client n’expose plus de jeton dans l’URL.
- Les refresh tokens client ne sont plus stockés dans le stockage local du navigateur.
- Les anciennes sessions peuvent être révoquées et les comptes désactivés ne peuvent plus continuer à utiliser l’API.
- L’inscription restaurateur publique ne permet plus de choisir un rôle privilégié.
- Les erreurs Redis critiques sont contrôlées ; les notifications et invalidations non critiques ne dupliquent plus les commandes.
- Les en-têtes CSP, HSTS, anti-framing, anti-MIME-sniffing et Permissions Policy sont configurés en production.
- Les contrôles sans effet, témoignages inventés, partenaires fictifs et promesses non vérifiables ont été retirés de la vitrine active.
- Les formulaires principaux ont des libellés, noms, règles d’autocomplétion et exigences de mot de passe cohérents.
- Les restaurants rejetés sont distingués des nouvelles demandes et ne
  faussent plus le centre d’actions.
- Les comptes administrateurs suspendus sont refusés par les pages et les API.
- Les doubles traitements concurrents des demandes d’abonnement sont empêchés.
- Les suspensions d’abonnement sont réversibles et l’échéance est prolongée de
  la durée de suspension.
- Chaque encaissement de commissions crée un reçu et relie les commissions
  concernées à ce règlement.
- Les requêtes de support ne dupliquent plus les commandes qui possèdent
  plusieurs tentatives de paiement.
- L’API des restaurants administrateur est paginée, filtrée et limitée.
- Les statistiques factices ont été retirées de l’écran de connexion.

## Validations exécutées

- `npm run lint` : réussi ;
- `npm run typecheck` : réussi ;
- `npm test -- --run` : 5 fichiers et 15 tests réussis ;
- `npm run build` : réussi, 66 pages générées ;
- `npx drizzle-kit check` : schéma et migrations cohérents ;
- `/api/health` : base PostgreSQL et cache Redis disponibles ;
- recette du build production dans le navigateur : accueil, carte client, authentification client et restaurateur, pages juridiques et redirections protégées sans erreur console ;
- recette administration : protection anonyme, connexion admin, huit vues
  principales, affichage mobile 390 × 844 et absence d’erreur console ;
- vérification HTTP : pages publiques en `200`, en-têtes de sécurité présents et en-tête `X-Powered-By` absent.

## Blocages avant mise en ligne

### 1. Informations légales à fournir

Les documents de `public/docs` contiennent encore des champs à compléter :

- raison sociale, forme juridique, capital, RCCM et NCC ;
- adresse du siège, téléphone et directeur de publication ;
- hébergeur, adresse et pays d’hébergement ;
- email de contact et email dédié à la confidentialité ;
- juridiction compétente ;
- durées exactes de conservation des données ;
- modalités de commission, calendrier et conditions de reversement ;
- pièces de vérification exigées des restaurants ;
- moyens et prestataires de paiement futurs, ainsi que les délais de remboursement ;
- inventaire final des cookies.

La page des mentions légales reste volontairement exclue de l’indexation tant que ces données ne sont pas renseignées.

### 2. Base de tests E2E

La suite Playwright ne peut pas démarrer : l’identifiant actuellement présent dans `.env.test.local` est refusé par la base de tests PostgreSQL. Une nouvelle valeur `DATABASE_URL_TEST` valide et strictement isolée est nécessaire. La suite prépare et nettoie ses propres données de validation, y compris un compte administrateur et un restaurant dédié au cycle validation–suspension–réactivation.

### 3. Migration de déploiement

La migration `0005_freezing_pretty_boy.sql` doit être appliquée sur l’environnement de déploiement avant l’ouverture au trafic. Elle ajoute notamment la protection d’idempotence des commandes. Une sauvegarde et une exécution contrôlée de `npm run db:migrate` sont requises.

### 4. Services optionnels

Les identifiants Cloudinary sont requis si l’upload d’images restaurant doit être disponible dès la première version. Sans eux, l’onboarding reste possible sans image.

## Risques résiduels acceptés pour cette version

- Le paiement reste limité aux modes réellement implémentés ; aucune connexion Google ni promesse de paiement en ligne n’est exposée.
- La CSP autorise encore les styles et scripts inline nécessaires au rendu Next.js actuel. Un passage à une CSP avec nonce peut être planifié après la mise en production initiale.
- L’audit automatisé des dépendances n’a pas été exécuté dans cet environnement ; il doit être ajouté au pipeline CI avec accès sécurisé au registre.

## Décision de sortie

La plateforme complète, administration incluse, est un candidat de mise en
production. Le feu vert final dépend de quatre actions externes : compléter les
mentions légales, fournir une base E2E valide, appliquer les migrations sur
l’environnement cible et configurer les services optionnels retenus pour la
version.
