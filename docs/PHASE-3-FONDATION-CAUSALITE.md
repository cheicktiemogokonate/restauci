# Phase 3 — Fondation de causalité et de traçabilité

## Résultat

La création d'un compte administrateur est le flux pilote de cette phase. Sa
transaction écrit désormais ensemble le compte canonique, un événement métier
corrélé et l'effet attendu dans l'outbox. Un consommateur rejouable projette
ensuite l'audit et conserve un reçu minimal de l'effet, sans produire de doublon.

Cette phase ne migre aucun paiement et ne généralise pas encore l'outbox aux
autres domaines.

## Contrat causal

Un événement `business_events` contient obligatoirement :

- `id` (`eventId`) et `correlation_id` ;
- un type versionné, par exemple `admin.account.created.v1` ;
- l'acteur typé et son identifiant ;
- le Partner Account concerné lorsqu'il existe ;
- une cible typée et son identifiant ;
- la date métier, un payload borné et sa date de fin de rétention.

Les acteurs autorisés sont `admin`, `partner`, `client`, `driver`, `system` et
`provider`. L'audit utilise le même vocabulaire. `admin_id` reste une référence
legacy nullable avec `ON DELETE RESTRICT`, tandis que `actor_type` et `actor_id`
sont obligatoires. Le cron d'expiration d'abonnement porte maintenant l'acteur
réel `system` au lieu d'emprunter un compte administrateur arbitraire.

## Outbox, reprise et idempotence

`outbox_messages` suit les états `pending`, `processing`, `retry`, `completed`
et `dead_letter`.

- Le claim utilise `FOR UPDATE SKIP LOCKED`.
- Un verrou de traitement devient récupérable après cinq minutes.
- Une erreur est retentée après 5, 10, 20 puis 40 secondes.
- La cinquième erreur place le message en dead-letter.
- Seul un code d'erreur borné est persisté, jamais le message brut susceptible
  de contenir une donnée sensible.
- La remise en file est explicite et conserve la date du premier passage en
  dead-letter.
- L'audit et `event_effect_receipts` sont écrits dans la même transaction que
  le passage de l'outbox à `completed`.
- Les contraintes uniques `(event_id, effect_type)` et `audit.event_id`
  garantissent l'absence de doublon lors d'un rejeu.

Le Route Handler `/api/cron/causality`, protégé par `CRON_SECRET`, traite au
maximum cinquante messages toutes les cinq minutes, applique la rétention et
renvoie le résultat de réconciliation. Le déploiement Vercel doit accepter une
fréquence cron infra-journalière ; sinon un ordonnanceur équivalent devra appeler
la même route avec le même secret.

## Politique de rétention validée

| Donnée | Conservation | Suppression |
| :--- | :--- | :--- |
| Événements métier | 5 ans | seulement si aucun message d'outbox n'est encore ouvert |
| Audits | 5 ans | purge automatique à échéance |
| Outbox réussie sans incident | 30 jours | purge automatique |
| Dead-letter résolue | 1 an après résolution | purge automatique |
| Dead-letter non résolue | sans limite automatique | jamais masquée par la purge |
| Reçu minimal d'effet | durée de l'événement | suppression en cascade avec l'événement |

Les payloads sont limités à 16 Kio, six niveaux et des valeurs JSON bornées. Le
contrat refuse notamment mots de passe, secrets, jetons, cookies, sessions,
documents KYC, coordonnées personnelles, données de carte et champs de texte
libre comme message, motif ou description. Les événements doivent conserver
uniquement les identifiants, types, statuts, montants et références nécessaires.

## Flux pilote

`createAdminAccount()` génère un `eventId` et un `correlationId`, puis la
transaction :

1. crée l'utilisateur administrateur ;
2. écrit `admin.account.created.v1` avec l'acteur administrateur et la cible ;
3. écrit l'effet `audit.project` dans l'outbox ;
4. valide ou annule les trois écritures ensemble.

Le consommateur crée ensuite l'audit `admin_account_created`. L'adresse email et
le mot de passe temporaire ne sont jamais copiés dans l'événement ou l'outbox.

## Outils opérateur

- `npm run causality:reconcile` : lecture seule des statuts, dead-letters,
  événements sans effet, audits manquants et comptes pilotes manquants ; code de
  sortie `2` si une anomalie ou une dead-letter est présente.
- `CAUSALITY_MESSAGE_ID=<uuid> npm run causality:requeue -- --confirmed` : remet
  exactement une dead-letter en file.
- `npm run test:phase3:db` : scénario d'intégration sur la Neon de
  développement/test explicitement autorisée.

## Schéma et fichiers principaux

- `drizzle/migrations/0035_causality_outbox.sql`
- `drizzle/migrations/0036_causality_effect_receipts.sql`
- `src/modules/events/`
- `src/modules/audit/`
- `src/shared/causality.ts`
- `src/app/api/cron/causality/route.ts`
- `scripts/causality/`
- `tests/phase3-causality-db.test.ts`

La migration `0036` complète `0035` avec un reçu d'effet durable : cela permet
de supprimer l'outbox réussie après trente jours tout en conservant pendant cinq
ans la preuve que l'effet a bien été exécuté.

## Validations exécutées

- `npm run db:migrate` : migrations `0035` et `0036` appliquées sur la Neon de
  développement/test.
- `npm run typecheck` : réussi.
- `npm run lint` : réussi.
- `npm run architecture:check` : 5 fichiers et 18 tests réussis ; 708 modules et
  2 283 dépendances analysés, aucune nouvelle violation.
- `npm test` : 80 fichiers réussis, 11 ignorés ; 373 tests réussis, 42 ignorés.
- `npm run test:phase3:db` : 7 tests réussis couvrant atomicité, audit différé,
  rejeu, rollback, acteurs système, dead-letter/remise en file et rétention.
- `npm run test:phase1:db -- --suite=a15` : 9 tests DB historiques réussis.
- `npm run causality:reconcile` : aucune anomalie et aucune dead-letter.

La première tentative de `0035` a été annulée intégralement par PostgreSQL car
le type initial du Partner Account ne correspondait pas à son UUID canonique.
Le type a été corrigé avant l'application réussie ; aucune migration partielle
n'est restée en base.

Une commande locale de vérification d'environnement mal échappée a inclus l'URL
Neon complète dans sa sortie d'erreur. Cette valeur n'a pas été écrite dans le
dépôt par la commande, mais son mot de passe doit être renouvelé dans Neon puis
remplacé dans `.env.local` avant la prochaine phase.

## Point de contrôle

La Phase 3 est terminée. Après rotation du secret Neon, la Phase 4 pourra être
autorisée explicitement ; elle n'est ni lue ni démarrée ici.
