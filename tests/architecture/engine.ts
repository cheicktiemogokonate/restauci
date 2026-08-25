import * as fs from "node:fs";
import * as path from "node:path";
import * as ts from "typescript";

const EXCLUDED_DIRECTORIES = new Set([
  ".next",
  "coverage",
  "dist",
  "node_modules",
]);

export type ImportKind =
  | "dynamic-import"
  | "export"
  | "import"
  | "import-type"
  | "require";

export interface ImportMetadata {
  sourceFile: string;
  target: string;
  resolvedFilePath: string | null;
  kind: ImportKind;
}

export interface FileMetadata {
  filePath: string;
  imports: ImportMetadata[];
  isClientComponent: boolean;
}

function normalizePath(filePath: string) {
  return path.resolve(filePath).replaceAll(path.sep, "/");
}

function loadCompilerOptions() {
  const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, "tsconfig.json");
  if (!configPath) throw new Error("tsconfig.json introuvable");

  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) {
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  }

  return ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    path.dirname(configPath),
  ).options;
}

const compilerOptions = loadCompilerOptions();

function fallbackResolution(sourceFile: string, target: string) {
  if (target.startsWith("@/")) {
    return normalizePath(path.join(process.cwd(), "src", target.slice(2)));
  }
  if (target.startsWith(".")) {
    return normalizePath(path.resolve(path.dirname(sourceFile), target));
  }
  return null;
}

function resolveImport(sourceFile: string, target: string) {
  const resolved = ts.resolveModuleName(
    target,
    sourceFile,
    compilerOptions,
    ts.sys,
  ).resolvedModule?.resolvedFileName;

  return resolved ? normalizePath(resolved) : fallbackResolution(sourceFile, target);
}

function addImport(
  imports: ImportMetadata[],
  sourceFile: string,
  target: string,
  kind: ImportKind,
) {
  imports.push({
    sourceFile,
    target,
    resolvedFilePath: resolveImport(sourceFile, target),
    kind,
  });
}

export function parseSourceImports(
  filePath: string,
  content: string,
): FileMetadata {
  const absoluteFilePath = normalizePath(filePath);
  const sourceFile = ts.createSourceFile(
    absoluteFilePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const imports: ImportMetadata[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      addImport(imports, absoluteFilePath, node.moduleSpecifier.text, "import");
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      addImport(imports, absoluteFilePath, node.moduleSpecifier.text, "export");
    } else if (ts.isImportTypeNode(node)) {
      const argument = node.argument;
      if (
        ts.isLiteralTypeNode(argument) &&
        ts.isStringLiteralLike(argument.literal)
      ) {
        addImport(
          imports,
          absoluteFilePath,
          argument.literal.text,
          "import-type",
        );
      }
    } else if (ts.isCallExpression(node) && node.arguments.length === 1) {
      const [argument] = node.arguments;
      if (argument && ts.isStringLiteralLike(argument)) {
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          addImport(imports, absoluteFilePath, argument.text, "dynamic-import");
        } else if (
          ts.isIdentifier(node.expression) &&
          node.expression.text === "require"
        ) {
          addImport(imports, absoluteFilePath, argument.text, "require");
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  const firstStatement = sourceFile.statements[0];
  const isClientComponent = Boolean(
    firstStatement &&
      ts.isExpressionStatement(firstStatement) &&
      ts.isStringLiteral(firstStatement.expression) &&
      firstStatement.expression.text === "use client",
  );

  return {
    filePath: absoluteFilePath,
    imports: imports.sort((left, right) =>
      `${left.target}:${left.kind}`.localeCompare(`${right.target}:${right.kind}`),
    ),
    isClientComponent,
  };
}

export function parseFileImports(filePath: string) {
  return parseSourceImports(filePath, fs.readFileSync(filePath, "utf8"));
}

export function walkSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return EXCLUDED_DIRECTORIES.has(entry.name) ? [] : walkSourceFiles(fullPath);
      }
      return /\.tsx?$/.test(entry.name) ? [normalizePath(fullPath)] : [];
    })
    .sort();
}

export function scanDirectory(dir: string): FileMetadata[] {
  return walkSourceFiles(dir).map(parseFileImports);
}
