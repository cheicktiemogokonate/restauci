import { Pool } from "pg";

const messageId = process.env.CAUSALITY_MESSAGE_ID;
const confirmed = process.argv.includes("--confirmed");
const databaseUrl = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;

if (!confirmed) throw new Error("Ajoutez --confirmed pour autoriser la remise en file.");
if (!messageId || !/^[0-9a-f-]{36}$/i.test(messageId)) {
  throw new Error("CAUSALITY_MESSAGE_ID doit être un UUID.");
}
if (!databaseUrl) throw new Error("DATABASE_MIGRATION_URL ou DATABASE_URL est requis.");

const pool = new Pool({ connectionString: databaseUrl, max: 1 });
try {
  const result = await pool.query<{ id: string; event_id: string }>(
    `UPDATE outbox_messages
     SET status = 'retry', attempts = 0, available_at = NOW(), locked_at = NULL,
         resolved_at = NULL, last_error_code = NULL, updated_at = NOW()
     WHERE id = $1 AND status = 'dead_letter'
     RETURNING id, event_id`,
    [messageId],
  );
  const message = result.rows[0];
  if (!message) throw new Error("Dead letter introuvable ou déjà remise en file.");
  console.log(JSON.stringify({ requeued: true, ...message }, null, 2));
} finally {
  await pool.end();
}
