# Déploiement VPS sécurisé et portable

Ce socle garde PostgreSQL/Neon et le stockage S3-compatible indépendants de
Vercel. Le conteneur web n'expose que Caddy en 80/443 ; Next.js, Valkey et le
bridge REST restent sur des réseaux Docker privés. ClamAV n'est joignable que
sur `127.0.0.1:3310` par le worker KYC de l'hôte.

## Dimensionnement minimal

- Ubuntu 24.04 LTS ou Debian stable, 4 vCPU, **8 Go de RAM** et swap chiffré.
- Les images applicatives et ClamAV choisies sont multi-architecture
  (AMD64/ARM64) ; vérifier néanmoins le support Dangerzone du VPS retenu.
- ClamAV a besoin d'environ 3 à 4 Go lors du rechargement des signatures.
- Un DNS `A/AAAA` du domaine vers le VPS ; seuls TCP 22, 80, 443 et UDP 443
  sont autorisés par le pare-feu. Restreindre SSH à une IP/VPN si possible.
- Conserver PostgreSQL et le bucket KYC hors de ce VPS mono-instance évite
  qu'une compromission ou perte disque emporte à la fois l'app et les preuves.

## Préparation des secrets

Depuis la racine du dépôt :

```bash
node scripts/security/generate-vps-env.mjs
```

Éditer ensuite `deploy/vps/.env.production` et remplacer le domaine, l'e-mail
ACME, `DATABASE_URL`, `ADMIN_TOTP_SECRET` et les identifiants du stockage KYC.
Le fichier est ignoré par Git et créé en mode `0600`. Ne jamais y ajouter
`DATABASE_MIGRATION_URL` : les migrations sont une tâche opérateur séparée.

Valider la configuration sans démarrer :

```bash
docker compose --env-file deploy/vps/.env.production \
  -f deploy/vps/compose.yml config --quiet
```

## Démarrage de l'application

```bash
docker compose --env-file deploy/vps/.env.production \
  -f deploy/vps/compose.yml up -d --build
docker compose --env-file deploy/vps/.env.production \
  -f deploy/vps/compose.yml ps
```

Caddy obtient et renouvelle automatiquement les certificats TLS. Le proxy
limite les headers à 32 Ko, les corps à 10 Mo, désactive TLS 0-RTT et conserve
14 jours de journaux JSON avec rotation.

Le service `hiett/serverless-redis-http` est un bridge de migration compatible
avec le SDK Upstash existant. Il est épinglé et non exposé, mais son rythme de
maintenance est faible : remplacer à terme le SDK REST par un client Valkey
natif, puis supprimer ce service.

## Worker antivirus et CDR libre

Le pipeline est : quarantaine privée → ClamAV → Dangerzone pour les PDF →
nouveau scan ClamAV → zone propre. Les images sont déjà décodées/réencodées par
Sharp avant la quarantaine, puis rescannées. Un document n'est jamais lisible
ni vérifiable tant que son statut n'est pas `clean`. Après décision atomique en
base, le worker supprime au mieux l'objet de quarantaine ; ajouter aussi une
règle de cycle de vie courte sur le préfixe `identity/quarantine/` couvre une
panne ponctuelle de suppression.

Installer sur l'hôte, sous un compte distinct, les paquets officiels signés de
Dangerzone et Podman rootless. Vérifier la clé GPG indiquée par le projet et ne
pas désactiver la vérification Sigstore de son image :

```bash
sudo useradd --system --create-home --home-dir /var/lib/toutci-kyc \
  --shell /usr/sbin/nologin toutci-kyc
sudo apt install podman
# Installer ensuite le paquet dangerzone/dangerzone-full officiel et signé.
sudo -u toutci-kyc dangerzone-cli --set-container-runtime podman
sudo -u toutci-kyc dangerzone-image upgrade
```

Le code et ses dépendances de production doivent être présents sous
`/opt/toutci/current` (`npm ci --omit=dev`). Copier l'environnement en dehors du
dépôt et le service systemd :

```bash
sudo install -d -m 0750 -o root -g toutci-kyc /etc/toutci
sudo install -m 0640 -o root -g toutci-kyc \
  deploy/vps/.env.production /etc/toutci/toutci.env
sudo install -m 0644 deploy/vps/systemd/toutci-kyc-worker.service \
  /etc/systemd/system/toutci-kyc-worker.service
sudo systemctl daemon-reload
sudo systemctl enable --now toutci-kyc-worker
```

Ne jamais monter `/var/run/docker.sock` dans le worker. Dangerzone lance ses
sandboxes avec Podman rootless et réseau désactivé ; le worker n'a besoin que
de PostgreSQL, du stockage S3-compatible et de ClamAV en loopback.

## Pare-feu, mises à jour et sauvegardes

Exemple UFW à adapter avant activation afin de ne pas perdre l'accès SSH :

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from VOTRE_IP_ADMIN to any port 22 proto tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
```

Activer les correctifs automatiques de sécurité de l'OS et tester chaque mois
la restauration d'un backup PostgreSQL ainsi que le cycle de vie du bucket
KYC. Les originaux rejetés doivent être supprimés selon la politique légale de
rétention, sans jamais devenir publics.

## Contrôles après chaque déploiement

```bash
curl --fail --silent --show-error https://VOTRE_DOMAINE/api/health
docker compose --env-file deploy/vps/.env.production \
  -f deploy/vps/compose.yml logs --since=10m --no-log-prefix app caddy
sudo systemctl status --no-pager toutci-kyc-worker
```

Les migrations s'exécutent explicitement avec `DATABASE_MIGRATION_URL` depuis
un poste opérateur ou une CI protégée, jamais au démarrage du conteneur web.

## Passage du pilote Hobby à la production VPS

La configuration Vercel Hobby regroupe volontairement la causalité et le
nettoyage média dans `/api/cron/daily-maintenance`, exécuté une fois par jour.
Cette cadence convient au pilote à faible trafic, mais pas à une production
réelle : sur le VPS, planifier les routes protégées par `CRON_SECRET` avec des
timers systemd distincts, toutes les 5 minutes pour la causalité, toutes les
heures pour les médias et une fois par jour pour les abonnements.

Avant la bascule publique :

- utiliser une base de production isolée, appliquer les migrations avec le rôle
  opérateur et prouver une restauration de sauvegarde ;
- remplacer le bridge Redis HTTP temporaire par un client Valkey natif ;
- superviser l'application, les timers, l'outbox, les dead-letters, le worker
  KYC, PostgreSQL, Valkey et l'espace disque avec alertes ;
- tester le rollback applicatif et base, la rotation des secrets et le
  renouvellement TLS avant le changement DNS ;
- valider un paiement et un versement réels à faible montant, puis rapprocher
  le journal financier avec le fournisseur avant l'ouverture générale.
