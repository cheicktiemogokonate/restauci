import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildOpenApiV1Spec, openApiV1Operations } from "./openapi-v1";

const METHODS = ["GET", "POST", "PATCH", "DELETE", "PUT"] as const;

function findRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? findRouteFiles(absolutePath)
      : entry.name === "route.ts"
        ? [absolutePath]
        : [];
  });
}

function routePath(filePath: string, root: string) {
  return `/${path
    .relative(root, path.dirname(filePath))
    .split(path.sep)
    .map((segment) => segment.replace(/^\[([^\]]+)\]$/, "{$1}"))
    .join("/")}`;
}

function implementedOperations() {
  const root = path.join(process.cwd(), "src/app/api/v1");
  return findRouteFiles(root)
    .filter((filePath) => !filePath.includes(`${path.sep}openapi.json${path.sep}`))
    .flatMap((filePath) => {
      const source = readFileSync(filePath, "utf8");
      const apiPath = routePath(filePath, root);
      return METHODS.filter((method) => {
        const functionExport = new RegExp(
          `export\\s+(?:async\\s+function|const)\\s+${method}\\b`,
        );
        const reExport = new RegExp(
          `export\\s*\\{[^}]*\\b${method}\\b[^}]*\\}`,
        );
        return functionExport.test(source) || reExport.test(source);
      }).map((method) => `${method.toLowerCase()} ${apiPath}`);
    })
    .sort();
}

describe("OpenAPI v1 comme registre des routes", () => {
  it("documente exactement chaque méthode réellement exposée", () => {
    const documented = openApiV1Operations
      .map(({ method, path: apiPath }) => `${method} ${apiPath}`)
      .sort();
    expect(documented).toEqual(implementedOperations());
  });

  it("génère des operationId uniques et un serveur versionné", () => {
    const operationIds = openApiV1Operations.map(({ operationId }) => operationId);
    expect(new Set(operationIds).size).toBe(operationIds.length);
    const spec = buildOpenApiV1Spec("https://toutci.app/");
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.servers).toEqual([{ url: "https://toutci.app/api/v1" }]);
  });

  it("conserve l’artefact JSON versionné synchronisé avec le générateur", () => {
    const artifact = JSON.parse(
      readFileSync(path.join(process.cwd(), "docs/openapi-v1.json"), "utf8"),
    );
    expect(artifact).toEqual(
      buildOpenApiV1Spec("https://restauci.vercel.app"),
    );
  });
});
