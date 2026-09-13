import * as path from "node:path";
import type { FileMetadata, ImportMetadata } from "./engine";

export interface ArchitectureViolation {
  file: string;
  target: string;
}

function normalize(filePath: string) {
  return path.resolve(filePath).replaceAll(path.sep, "/");
}

export function relativeToProject(filePath: string) {
  return path.relative(process.cwd(), filePath).replaceAll(path.sep, "/");
}

function targetRelativePath(dependency: ImportMetadata) {
  return dependency.resolvedFilePath
    ? relativeToProject(dependency.resolvedFilePath)
    : null;
}

function isInside(relativePath: string | null, directory: string) {
  return Boolean(
    relativePath &&
      (relativePath === directory || relativePath.startsWith(`${directory}/`)),
  );
}

function violation(file: FileMetadata, dependency: ImportMetadata) {
  return { file: relativeToProject(file.filePath), target: dependency.target };
}

function moduleName(relativePath: string | null) {
  return relativePath?.match(/^src\/modules\/([^/]+)(?:\/|$)/)?.[1] ?? null;
}

function internalModuleName(relativePath: string | null) {
  return relativePath?.match(
    /^src\/modules\/([^/]+)\/_internal(?:\/|$)/,
  )?.[1] ?? null;
}

function isModuleServer(relativePath: string | null) {
  return Boolean(
    relativePath?.match(/^src\/modules\/[^/]+\/server(?:\.[cm]?[jt]sx?)?$/),
  );
}

function moduleSurface(relativePath: string | null) {
  return relativePath?.match(
    /^src\/modules\/([^/]+)\/(.+)$/,
  ) ?? null;
}

function isPublicModuleSurface(moduleRelativePath: string) {
  return /^(?:server|model|contracts|presentation)(?:\.[cm]?[jt]sx?|\/)/.test(
    moduleRelativePath,
  );
}

function isDbTarget(relativePath: string | null) {
  return (
    isInside(relativePath, "src/lib/db") ||
    isInside(relativePath, "src/infrastructure/db")
  );
}

export function findAppDbViolations(files: FileMetadata[]) {
  return files.flatMap((file) => {
    if (!isInside(relativeToProject(file.filePath), "src/app")) return [];
    return file.imports
      .filter((dependency) => isDbTarget(targetRelativePath(dependency)))
      .map((dependency) => violation(file, dependency));
  });
}

export function findModulesToAppViolations(files: FileMetadata[]) {
  return files.flatMap((file) => {
    if (!isInside(relativeToProject(file.filePath), "src/modules")) return [];
    return file.imports
      .filter((dependency) =>
        isInside(targetRelativePath(dependency), "src/app"),
      )
      .map((dependency) => violation(file, dependency));
  });
}

export function findForeignInternalViolations(files: FileMetadata[]) {
  return files.flatMap((file) => {
    const owner = moduleName(relativeToProject(file.filePath));
    if (!owner) return [];

    return file.imports.flatMap((dependency) => {
      const targetOwner = internalModuleName(targetRelativePath(dependency));
      return targetOwner && targetOwner !== owner
        ? [violation(file, dependency)]
        : [];
    });
  });
}

export function findAppInternalViolations(files: FileMetadata[]) {
  return files.flatMap((file) => {
    if (!isInside(relativeToProject(file.filePath), "src/app")) return [];
    return file.imports
      .filter((dependency) =>
        Boolean(internalModuleName(targetRelativePath(dependency))),
      )
      .map((dependency) => violation(file, dependency));
  });
}

export function findNonPublicModuleSurfaceViolations(files: FileMetadata[]) {
  return files.flatMap((file) => {
    const sourceOwner = moduleName(relativeToProject(file.filePath));

    return file.imports.flatMap((dependency) => {
      const target = moduleSurface(targetRelativePath(dependency));
      if (!target) return [];

      const [, targetOwner, targetRelativePathValue] = target;
      return sourceOwner !== targetOwner &&
        !isPublicModuleSurface(targetRelativePathValue)
        ? [violation(file, dependency)]
        : [];
    });
  });
}

export function findClientServerViolations(files: FileMetadata[]) {
  return files.flatMap((file) => {
    if (!file.isClientComponent) return [];
    return file.imports
      .filter((dependency) => {
        const target = targetRelativePath(dependency);
        return isModuleServer(target) || isInside(target, "src/infrastructure/db");
      })
      .map((dependency) => violation(file, dependency));
  });
}

export function findSharedToModulesViolations(files: FileMetadata[]) {
  return files.flatMap((file) => {
    if (!isInside(relativeToProject(file.filePath), "src/shared")) return [];
    return file.imports
      .filter((dependency) =>
        isInside(targetRelativePath(dependency), "src/modules"),
      )
      .map((dependency) => violation(file, dependency));
  });
}

function isPureSchemaEnumException(
  sourceRelativePath: string,
  targetRelativePathValue: string | null,
) {
  const schemaSource =
    sourceRelativePath === "src/infrastructure/db/schema.ts" ||
    sourceRelativePath.startsWith("src/infrastructure/db/schema/");
  const pureModelTarget = Boolean(
    targetRelativePathValue?.match(
      /^src\/modules\/[^/]+\/model(?:\.[cm]?[jt]sx?)?$/,
    ),
  );
  return schemaSource && pureModelTarget;
}

export function findInfrastructureToModulesViolations(files: FileMetadata[]) {
  return files.flatMap((file) => {
    const source = relativeToProject(file.filePath);
    if (!isInside(source, "src/infrastructure")) return [];

    return file.imports.flatMap((dependency) => {
      const target = targetRelativePath(dependency);
      if (!isInside(target, "src/modules")) return [];
      return isPureSchemaEnumException(source, target)
        ? []
        : [violation(file, dependency)];
    });
  });
}

export function findRootBarrelViolations(files: FileMetadata[]) {
  return files
    .map((file) => relativeToProject(file.filePath))
    .filter((file) => /^src\/modules\/[^/]+\/index\.[cm]?[jt]sx?$/.test(file))
    .map((file) => ({ file, target: "root module barrel" }));
}

export function createSyntheticFile(
  filePath: string,
  imports: Array<{ target: string; resolvedFilePath: string }>,
  options: { client?: boolean } = {},
): FileMetadata {
  return {
    filePath: normalize(filePath),
    isClientComponent: options.client ?? false,
    imports: imports.map(({ target, resolvedFilePath }) => ({
      sourceFile: normalize(filePath),
      target,
      resolvedFilePath: normalize(resolvedFilePath),
      kind: "import",
    })),
  };
}
