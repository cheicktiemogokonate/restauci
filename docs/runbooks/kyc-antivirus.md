# Analyse antivirus des justificatifs KYC

## Architecture active sur Vercel

L'upload valide le format réel, réencode les images et rejette les fonctions
PDF actives connues avant de déposer le fichier dans le préfixe privé
`identity/quarantine/`. La base reçoit ensuite un document au statut `pending`.

Quand `KYC_SCAN_BACKEND=vercel_sandbox`, l'application publie dans Vercel
Queues un message ne contenant que l'identifiant du document et son empreinte
SHA-256. Le consommateur réserve atomiquement le document, le relit depuis le
stockage privé, vérifie son intégrité puis lance ClamAV dans une microVM Vercel
Sandbox éphémère. Le réseau est coupé avant que le fichier ne soit écrit dans
la microVM. Un document sain est copié sous `identity/clean/`; un document
infecté est rejeté et supprimé de la quarantaine.

La livraison de la file est au moins une fois. Le traitement est donc
idempotent : une pièce déjà terminée n'est pas rescannée, un ancien message ne
peut pas valider une pièce remplacée et un traitement interrompu devient
reprenable après le délai configuré.

## Première configuration Vercel

Prérequis : Node.js 22 ou plus récent, projet lié avec Vercel CLI et variables
de développement récupérées afin que le SDK dispose d'un jeton OIDC.

```bash
vercel link
vercel env pull .env.local
npm run security:kyc-sandbox:snapshot
```

La dernière commande affiche une valeur `snap_...`. Ajouter ensuite dans les
environnements Vercel concernés :

```dotenv
KYC_SCAN_BACKEND="vercel_sandbox"
KYC_CLAMAV_SANDBOX_SNAPSHOT_ID="snap_..."
KYC_SCAN_MAX_ATTEMPTS="3"
KYC_SCAN_STALE_AFTER_SECONDS="900"
```

Redéployer l'application après l'ajout des variables. En production Vercel,
l'authentification OIDC de Sandbox et Queues est automatique. À chaque scan,
le bac essaie de rafraîchir les signatures auprès de `*.clamav.net` avant
d'activer la politique réseau `deny-all`. Si cette mise à jour ponctuelle
échoue, les signatures intégrées au snapshot restent utilisées ; recréer le
snapshot régulièrement limite l'âge de ce filet de sécurité.

## Vérification

1. Envoyer un petit JPEG, PNG ou PDF depuis le parcours partenaire.
2. Vérifier dans Observability > Queues que le topic
   `identity-document-scan` a reçu puis acquitté le message.
3. Vérifier dans Observability > Sandboxes qu'une microVM `kyc-clamav` s'est
   terminée.
4. Contrôler que le document passe de `pending` à `processing`, puis `clean`.
5. Utiliser uniquement un fichier de test antivirus officiel dans un
   environnement isolé pour valider le chemin `rejected`.

## Passage ultérieur sur VPS

Définir `KYC_SCAN_BACKEND=external_worker`, déployer ClamAV sur le réseau privé
du VPS puis lancer `npm run security:kyc-worker`. Le worker existant reprend les
mêmes lignes `pending/error`, les mêmes contrôles d'intégrité et les mêmes
statuts. Il peut en plus appliquer Dangerzone aux PDF lorsque
`DANGERZONE_CLI_PATH` est configuré. Aucun changement de schéma ou de parcours
client n'est nécessaire.

## Limites

ClamAV recherche des logiciels malveillants ; il ne prouve ni l'authenticité
d'une pièce d'identité ni la concordance de son titulaire. Les images sont
réencodées avant le scan. Les PDF passent une validation structurelle et un
scan antivirus, mais la reconstruction CDR avec Dangerzone reste réservée au
worker VPS actuel.
