import { migrationPool } from "../drizzle/db-pool.ts";

const client = await migrationPool.connect();

try {
  await client.query("BEGIN");

  const schema = await client.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('partner_identity_verifications', 'partner_identity_documents')
    ORDER BY table_name
  `);
  if (schema.rowCount !== 2) throw new Error("Tables KYC manquantes");

  const partnerUserId = crypto.randomUUID();
  const adminUserId = crypto.randomUUID();
  const partnerAccountId = crypto.randomUUID();
  const verificationId = crypto.randomUUID();
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;

  await client.query(
    `INSERT INTO users (id, email, password, role, nom, telephone, created_at, updated_at)
     VALUES ($1, $2, 'fixture-not-a-real-password', 'partner', 'Fixture KYC', '+225000000000', NOW(), NOW()),
            ($3, $4, 'fixture-not-a-real-password', 'admin', 'Admin Fixture KYC', '+225000000001', NOW(), NOW())`,
    [partnerUserId, `kyc-partner-${suffix}@example.test`, adminUserId, `kyc-admin-${suffix}@example.test`],
  );
  await client.query(
    `INSERT INTO partner_accounts (id, user_id, activity_type, created_at, updated_at)
     VALUES ($1, $2, 'residence', NOW(), NOW())`,
    [partnerAccountId, partnerUserId],
  );
  await client.query(
    `INSERT INTO partner_identity_verifications
      (id, partner_account_id, status, legal_name, document_type, document_country_code, document_expires_on, created_at, updated_at)
     VALUES ($1, $2, 'not_submitted', 'Fixture KYC', 'national_id', 'CI', '2035-01-01', NOW(), NOW())`,
    [verificationId, partnerAccountId],
  );
  await client.query(
    `INSERT INTO partner_identity_documents
      (id, verification_id, side, storage_key, content_type, size_bytes, sha256, uploaded_at)
     VALUES (gen_random_uuid(), $1, 'front', $2, 'image/jpeg', 128, $3, NOW()),
            (gen_random_uuid(), $1, 'back', $4, 'application/pdf', 256, $5, NOW())`,
    [verificationId, `identity/test/${suffix}/front.jpg`, "a".repeat(64), `identity/test/${suffix}/back.pdf`, "b".repeat(64)],
  );
  await client.query(
    `UPDATE partner_identity_verifications
     SET status = 'pending', submitted_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [verificationId],
  );
  await client.query(
    `UPDATE partner_identity_verifications
     SET status = 'verified', reviewed_at = NOW(), reviewed_by_admin_id = $2,
         verified_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [verificationId, adminUserId],
  );

  await client.query("SAVEPOINT invalid_lifecycle");
  let lifecycleRejected = false;
  try {
    await client.query(
      `UPDATE partner_identity_verifications SET status = 'pending' WHERE id = $1`,
      [verificationId],
    );
  } catch (error) {
    lifecycleRejected = (error as { code?: string }).code === "23514";
    await client.query("ROLLBACK TO SAVEPOINT invalid_lifecycle");
  }
  if (!lifecycleRejected) throw new Error("La contrainte de cycle de vie KYC n'a pas refusé un état incohérent");

  const indexes = await client.query<{ indexname: string }>(`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'partner_identity_verifications_partner_unique',
        'partner_identity_verifications_pending_review_idx',
        'partner_identity_verifications_reviewed_by_admin_idx',
        'partner_identity_documents_verification_side_unique',
        'partner_identity_documents_storage_key_unique'
      )
  `);
  if (indexes.rowCount !== 5) throw new Error("Index KYC manquant");

  console.log(JSON.stringify({
    tables: schema.rows.map((row) => row.table_name),
    indexes: indexes.rowCount,
    residencePartnerSupported: true,
    lifecycleConstraintRejectedInvalidState: lifecycleRejected,
    fixturePersistence: "rolled_back",
  }));
} finally {
  await client.query("ROLLBACK").catch(() => undefined);
  client.release();
  await migrationPool.end();
}
