import { describe, expect, it } from "vitest";
import { validateIdentityDocument } from "./document-validation";

describe("private identity document validation", () => {
  it("detects PDF content from its signature", () => {
    const result = validateIdentityDocument(Buffer.from("%PDF-1.7\nfixture", "utf8"));
    expect(result).toMatchObject({ contentType: "application/pdf", extension: "pdf" });
    expect(result?.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects a file whose content is not supported", () => {
    expect(validateIdentityDocument(Buffer.from("<html>not a document</html>"))).toBeNull();
  });
});
