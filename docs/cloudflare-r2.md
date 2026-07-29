# Configuration du stockage média Cloudflare R2

## Ressources à créer

1. Créer un bucket R2, par exemple `toutci-media`.
2. Créer un jeton S3 limité à ce bucket avec la permission de lecture et
   d’écriture des objets.
3. Relier le bucket à un domaine personnalisé, par exemple
   `media.toutci.ci`.
4. Conserver le bucket non listable : seuls les objets dont l’URL est connue
   doivent être accessibles.

L’URL publique `r2.dev` peut servir pendant le développement, mais Cloudflare
la réserve aux usages non productifs. La production doit utiliser un domaine
personnalisé relié directement au bucket.

## Variables d’environnement

```dotenv
R2_ACCOUNT_ID="identifiant-du-compte-cloudflare"
R2_ACCESS_KEY_ID="access-key-du-jeton-r2"
R2_SECRET_ACCESS_KEY="secret-key-du-jeton-r2"
R2_BUCKET_NAME="toutci-media"
R2_PUBLIC_URL="https://media.toutci.ci"
```

`R2_PUBLIC_URL` doit également être présent pendant le build Next.js afin que
le domaine soit autorisé par l’optimiseur d’images.

## Comportement de l’application

- Les uploads passent par `POST /api/media/upload`.
- La route exige une session restaurateur ou administrateur valide.
- La limite est de 20 uploads par utilisateur et par heure.
- Un fichier ne peut pas dépasser 5 Mio.
- Seules les signatures réelles JPEG, PNG et WebP sont acceptées.
- Les objets reçoivent un nom aléatoire et un cache public immuable d’un an.
- Les clés suivent le format
  `restaurants/<utilisateur>/<année>/<mois>/<uuid>.<extension>`.

L’upload est réalisé côté serveur. Aucune clé secrète R2 n’est envoyée au
navigateur et aucune configuration CORS S3 n’est nécessaire pour ce parcours.
