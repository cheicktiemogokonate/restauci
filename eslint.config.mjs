import { defineConfig, globalIgnores } from "eslint/config";
import boundaries from "eslint-plugin-boundaries";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const sourceExtensions = "{js,jsx,mjs,cjs,ts,tsx,mts,cts}";
const moduleSurfaceCategories = [
  "module-server",
  "module-model",
  "module-contracts",
  "module-presentation",
];

const entity = (type, categories, captured) => ({
  element: {
    type,
    ...(captured ? { captured } : {}),
  },
  ...(categories ? { file: { categories } } : {}),
});

const boundaryPolicies = [
  {
    from: entity("app"),
    allow: {
      to: [
        entity("app"),
        entity("module", moduleSurfaceCategories),
        entity("shared"),
        entity("infrastructure"),
      ],
    },
  },
  {
    from: entity("module", "module-server"),
    allow: {
      to: [
        entity("module", [
          "module-server",
          "module-model",
          "module-contracts",
        ]),
        entity("shared"),
        entity("infrastructure"),
      ],
    },
  },
  {
    from: entity("module", ["module-server", "module-private"]),
    allow: {
      to: entity(
        "module",
        ["module-internal", "module-private"],
        { module: "{{ from.element.captured.module }}" },
      ),
    },
  },
  {
    from: entity("module", ["module-model", "module-contracts"]),
    allow: {
      to: entity(
        "module",
        ["module-model", "module-contracts"],
        { module: "{{ from.element.captured.module }}" },
      ),
    },
  },
  {
    from: entity("module", ["module-model", "module-contracts"]),
    allow: { to: entity("shared") },
  },
  {
    from: entity("module", "module-presentation"),
    allow: {
      to: [
        entity("module", ["module-model", "module-contracts"]),
        entity("shared"),
      ],
    },
  },
  {
    from: entity("module", "module-presentation"),
    allow: {
      to: entity("module", "module-presentation", {
        module: "{{ from.element.captured.module }}",
      }),
    },
  },
  {
    from: entity("module", ["module-internal", "module-private"]),
    allow: {
      to: [
        entity("module", [
          "module-server",
          "module-model",
          "module-contracts",
        ]),
        entity("shared"),
        entity("infrastructure"),
      ],
    },
  },
  {
    from: entity("module", "module-internal"),
    allow: {
      to: entity(
        "module",
        ["module-internal", "module-private"],
        { module: "{{ from.element.captured.module }}" },
      ),
    },
  },
  {
    from: entity("shared"),
    allow: { to: entity("shared") },
  },
  {
    from: entity("infrastructure"),
    allow: {
      to: [entity("infrastructure"), entity("shared")],
    },
  },
];

const boundaryRule = (extraPolicies = []) => [
  "error",
  {
    default: "disallow",
    checkInternals: true,
    policies: [...boundaryPolicies, ...extraPolicies],
  },
];

const restrictedModuleImportRule = (allowedTargets = []) => {
  const escapedTargets = allowedTargets.map((target) =>
    target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const baselinePrefix = escapedTargets.length
    ? `(?!(?:${escapedTargets.join("|")})$)`
    : "";

  return [
    "error",
    {
      patterns: [
        {
          regex: `${baselinePrefix}^@/modules/[^/]+/(?!(?:server|model|contracts|presentation)(?:\\.[cm]?[jt]sx?)?(?:$|/)).+`,
          message:
            "Importez uniquement une surface publique du module (server, model, contracts ou presentation).",
        },
        {
          regex: "^\\.\\.(?:/\\.\\.)*/[^/]+/_internal(?:/|$)",
          message: "Les _internal d’un autre module sont privés.",
        },
      ],
    },
  ];
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next*/**",
    ".next-e2e/**",
    "out/**",
    "build/**",
    "public/maplibre/**",
    "next-env.d.ts",
  ]),
  {
    plugins: { boundaries },
  },
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "react-compiler/react-compiler": "off",
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/exhaustive-deps": "off"
    }
  },
  {
    files: [
      `src/**/*.${sourceExtensions}`,
      `tests/**/*.${sourceExtensions}`,
      `scripts/**/*.${sourceExtensions}`,
    ],
    rules: {
      "no-restricted-imports": restrictedModuleImportRule(),
    },
  },
  {
    files: [`src/**/*.${sourceExtensions}`],
    settings: {
      "boundaries/root-path": import.meta.dirname,
      "boundaries/include": ["src/**/*"],
      "boundaries/elements-single-match": true,
      "boundaries/files-single-match": true,
      "boundaries/dependency-nodes": [
        "import",
        "export",
        "dynamic-import",
        "require",
      ],
      "boundaries/elements": [
        {
          type: "module",
          pattern: "src/modules/(*)",
          capture: ["module"],
        },
        { type: "app", pattern: "src/app" },
        { type: "shared", pattern: "src/shared" },
        { type: "infrastructure", pattern: "src/infrastructure" },
      ],
      "boundaries/files": [
        {
          category: "module-server",
          pattern: "src/modules/*/server.{ts,tsx}",
        },
        {
          category: "module-model",
          pattern: "src/modules/*/model.{ts,tsx}",
        },
        {
          category: "module-contracts",
          pattern: "src/modules/*/contracts.{ts,tsx}",
        },
        {
          category: "module-presentation",
          pattern: [
            "src/modules/*/presentation.{ts,tsx}",
            "src/modules/*/presentation/**",
          ],
        },
        {
          category: "module-internal",
          pattern: "src/modules/*/_internal/**",
        },
        {
          category: "module-private",
          pattern: "src/modules/**",
        },
      ],
    },
    rules: {
      "boundaries/dependencies": boundaryRule(),
    },
  },
  {
    files: [
      "src/infrastructure/db/schema.ts",
      "src/infrastructure/db/schema/**/*.{ts,tsx}",
    ],
    rules: {
      "boundaries/dependencies": boundaryRule([
        {
          from: entity("infrastructure"),
          allow: { to: entity("module", "module-model") },
        },
      ]),
    },
  },
]);

export default eslintConfig;
