import {
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Pool } from "pg";
import { createHash, randomUUID } from "node:crypto";
import {
  MAX_IMAGE_SIZE,
  validateImageType,
} from "../src/modules/media/server";
import { uploadImageToR2 } from "../src/infrastructure/storage/r2";

interface LegacyPlat {
  id: string;
  restaurant_id: string;
  owner_user_id: string;
  photo_url: string;
}

interface MigratedPlat extends LegacyPlat {
  key: string;
  assetId: string;
  newUrl: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  sha256: string;
}

const requiredEnvironment = [
  "DATABASE_URL",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
] as const;

for (const name of requiredEnvironment) {
  if (!process.env[name]) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const bucketName = process.env.R2_BUCKET_NAME!;
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function deleteUploadedObjects(items: MigratedPlat[]) {
  await Promise.allSettled(
    items.map((item) =>
      r2Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: item.key,
        }),
      ),
    ),
  );
}

async function main() {
  const result = await pool.query<LegacyPlat>(`
    select plat.id, plat.restaurant_id, plat.photo_url, account.user_id as owner_user_id
    from plats plat
    join restaurants restaurant on restaurant.id = plat.restaurant_id
    join partner_accounts account on account.id = restaurant.partner_account_id
    where plat.photo_url like 'https://res.cloudinary.com/%'
    order by plat.id
  `);

  if (result.rows.length === 0) {
    console.log("Aucun média Cloudinary à migrer.");
    return;
  }

  console.log(`${result.rows.length} média(s) Cloudinary à migrer.`);
  const migrated: MigratedPlat[] = [];

  try {
    for (const plat of result.rows) {
      const response = await fetch(plat.photo_url);
      if (!response.ok) {
        throw new Error(
          `Téléchargement impossible pour le plat ${plat.id} (${response.status})`,
        );
      }

      const body = Buffer.from(await response.arrayBuffer());
      if (body.length === 0 || body.length > MAX_IMAGE_SIZE) {
        throw new Error(`Taille invalide pour le plat ${plat.id}`);
      }

      const contentType = response.headers.get("content-type")?.split(";")[0];
      const validated = validateImageType(body, contentType ?? "");
      if (!validated) {
        throw new Error(`Format d'image invalide pour le plat ${plat.id}`);
      }

      const assetId = randomUUID();
      const uploaded = await uploadImageToR2({
        body,
        contentType: validated.contentType,
        extension: validated.extension,
        ownerId: plat.owner_user_id,
        assetId,
      });

      migrated.push({
        ...plat,
        key: uploaded.key,
        assetId,
        newUrl: uploaded.url,
        contentType: validated.contentType,
        sizeBytes: body.length,
        sha256: createHash("sha256").update(body).digest("hex"),
      });

      const publicResponse = await fetch(uploaded.url, { cache: "no-store" });
      if (!publicResponse.ok) {
        throw new Error(
          `Lecture publique R2 impossible pour le plat ${plat.id} (${publicResponse.status})`,
        );
      }

      console.log(`Média ${migrated.length}/${result.rows.length} validé.`);
    }

    const databaseClient = await pool.connect();
    try {
      await databaseClient.query("begin");
      for (const item of migrated) {
        await databaseClient.query(
          `
            insert into public_media_assets (
              id, owner_user_id, storage_key, public_url, content_type,
              size_bytes, sha256, status, target_type, target_id,
              attached_at, created_at, updated_at
            ) values ($1, $2, $3, $4, $5, $6, $7, 'attached',
              'dish_photo', $8, now(), now(), now())
          `,
          [
            item.assetId,
            item.owner_user_id,
            item.key,
            item.newUrl,
            item.contentType,
            item.sizeBytes,
            item.sha256,
            item.id,
          ],
        );
        const update = await databaseClient.query(
          `
            update plats
            set photo_url = $1, updated_at = now()
            where id = $2 and photo_url = $3
          `,
          [item.newUrl, item.id, item.photo_url],
        );
        if (update.rowCount !== 1) {
          throw new Error(
            `Le média du plat ${item.id} a changé pendant la migration`,
          );
        }
      }
      await databaseClient.query("commit");
    } catch (error) {
      await databaseClient.query("rollback");
      throw error;
    } finally {
      databaseClient.release();
    }

    console.log(`${migrated.length} média(s) migré(s) vers R2 avec succès.`);
  } catch (error) {
    await deleteUploadedObjects(migrated);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Erreur de migration inconnue",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
    r2Client.destroy();
  });
