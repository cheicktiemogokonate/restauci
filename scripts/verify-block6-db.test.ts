import { describe, it } from "vitest";

describe.skipIf(process.env.RUN_BLOCK6_DB_TEST !== "true")(
  "registre financier Bloc 6 sur base de développement",
  () => {
    it("sérialise deux règlements concurrents et nettoie ses données", async () => {
      await import("./verify-block6-db.ts");
    }, 30_000);
  },
);
