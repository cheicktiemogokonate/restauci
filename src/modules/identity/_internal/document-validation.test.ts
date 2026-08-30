import { describe, expect, it } from "vitest";
import { validateIdentityDocument } from "./document-validation";

describe("private identity document validation", () => {
  it("detects PDF content from its signature", async () => {
    const result = await validateIdentityDocument(
      Buffer.from("%PDF-1.7\nfixture\n%%EOF", "utf8"),
    );
    expect(result).toMatchObject({ contentType: "application/pdf", extension: "pdf" });
    expect(result?.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects a file whose content is not supported", async () => {
    await expect(
      validateIdentityDocument(Buffer.from("<html>not a document</html>")),
    ).resolves.toBeNull();
  });

  it("rejects a PDF containing an active action", async () => {
    await expect(
      validateIdentityDocument(
        Buffer.from("%PDF-1.7\n/OpenAction 1 0 R\n%%EOF", "utf8"),
      ),
    ).resolves.toBeNull();
  });
});
