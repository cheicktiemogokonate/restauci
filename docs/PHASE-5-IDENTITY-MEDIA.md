# Phase 5 — Identity et Media

## Résultat

La phase 5 sécurise la consultation des justificatifs KYC et introduit un cycle
de vie explicite pour tous les nouveaux médias publics. Un établissement
Restaurant ou Résidence n'est désormais publiquement visible que si l'identité
de son propriétaire est vérifiée. Les nouveaux uploads publics sont temporaires
pendant 24 heures, puis rattachés dans la transaction de leur ressource ou
supprimés par le nettoyage planifié.

## Décisions appliquées

- Le KYC vérifié conditionne la visibilité publique de tous les établissements.
- L'administrateur consulte les justificatifs KYC dans la plateforme ; aucune
  action de téléchargement n'est exposée.
- Un média public temporaire non rattaché expire après 24 heures.

## Changements

### KYC privé

- Les routes partenaire et administrateur ne servent que la copie assainie d'un
  document après autorisation et statut antivirus/CDR `clean`.
- Les réponses sont `inline`, `private`, `no-store`, protégées contre le
  sniffing et l'intégration cross-origin. La clé de stockage privée n'est jamais
  exposée au navigateur.
- La revue administrateur utilise le composant Tabs beUI déjà installé pour
  afficher les images et PDF à l'intérieur de la page, sans lien Télécharger.
- Validation et rejet KYC écrivent atomiquement la décision, une notification
  et un événement causal projetant l'audit. Le motif libre de rejet reste dans
  le dossier KYC et n'est copié ni dans l'événement ni dans l'audit.
- Les caches et chemins publics concernés sont invalidés après chaque décision ;
  les recherches, fiches, sitemap et contrôles de commande Restaurant exigent
  maintenant une identité vérifiée, comme le parcours Résidence.

### Médias publics

- La migration `0038_identity_media_lifecycle.sql` crée un registre contraint
  `public_media_assets` avec les états `temporary`, `attached`, `deleting` et
  `deleted`, le propriétaire, l'empreinte SHA-256 et la cible métier.
- L'upload crée un asset temporaire avec une échéance à 24 heures. Le client
  reçoit son `assetId`, nécessaire pour toute nouvelle image.
- Les logos, bannières, photos de plats et photos de résidences sont rattachés
  avec vérification du propriétaire dans la même transaction que la ressource
  cible. Les images remplacées redeviennent temporaires et sont purgées après
  leur délai de grâce.
- Un cron horaire revendique les assets expirés sans concurrence, supprime les
  objets R2 et retente les échecs. Le script de réconciliation détecte les
  expirations, suppressions bloquées et rattachements incohérents.
- Le script de reprise Cloudinary enregistre désormais chaque photo migrée comme
  asset déjà rattaché, dans la même transaction que la mise à jour du plat.

## Validation

- `npm run db:migrate` : migration `0038` appliquée sur la Neon de
  développement/test désignée.
- `npm run typecheck` : réussi.
- `npm run lint` : réussi.
- `npm run architecture:check` : 5 fichiers et 18 tests réussis ; 717 modules et
  2 316 dépendances analysés, aucune nouvelle violation.
- `npm run test:phase5` : 4 fichiers et 13 tests réussis.
- `npm run test:phase5:db` : 3 scénarios d'intégration réussis sur Neon
  (visibilité KYC, rattachement atomique, rejet sans fuite du motif).
- `npm test` : 83 fichiers réussis, 13 ignorés ; 384 tests réussis, 51 ignorés.
- `npm run media:reconcile` : zéro asset expiré, en suppression ou rattaché sans
  ressource.
- `npm run build` : compilation et TypeScript réussis, puis échec du prérendu de
  `/restaurateur` sur `PartnerAuthorizationError: Session partenaire requise`.
  Le chemin fautif appartient à la garde d'authentification livrée en phase 4 et
  n'a pas été modifié dans cette phase, conformément à l'autorisation limitée.
- `git diff --check` : réussi.

## Point de contrôle

La sortie fonctionnelle de la phase 5 est atteinte. Avant d'autoriser la phase 6,
la correction ciblée du prérendu authentifié `/restaurateur` doit faire l'objet
d'une autorisation distincte, puisqu'elle concerne une phase déjà terminée.
