/* eslint-disable @typescript-eslint/no-require-imports */
const { readdirSync } = require("node:fs");

const moduleNames = readdirSync("src/modules", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const allowedModuleDependencies = {
  "admin-accounts": ["auth", "events"],
  "admin-projections": [],
  audit: [],
  auth: [],
  clients: ["audit", "auth"],
  commissions: ["audit", "notifications", "subscriptions", "transactions"],
  deliveries: ["notifications", "orders", "transactions"],
  discovery: ["residences", "restaurants", "subscriptions"],
  events: ["audit", "notifications"],
  identity: ["events", "media", "notifications"],
  media: [],
  menu: ["media", "quotas"],
  notifications: ["partners"],
  orders: [
    "clients",
    "commissions",
    "menu",
    "notifications",
    "restaurants",
    "service-markets",
    "transactions",
  ],
  partners: ["audit", "auth"],
  payments: ["clients", "commissions", "orders", "subscriptions", "transactions"],
  quotas: ["subscriptions"],
  residences: [
    "audit",
    "clients",
    "commissions",
    "events",
    "identity",
    "media",
    "notifications",
    "partners",
    "payments",
    "quotas",
    "service-markets",
    "subscriptions",
    "transactions",
  ],
  restaurants: [
    "events",
    "media",
    "notifications",
    "orders",
    "partners",
    "service-markets",
    "subscriptions",
  ],
  "service-markets": ["audit"],
  subscriptions: ["audit", "events", "notifications", "transactions"],
  transactions: ["audit", "events", "notifications"],
};

const declaredModuleNames = Object.keys(allowedModuleDependencies).sort();
if (JSON.stringify(declaredModuleNames) !== JSON.stringify(moduleNames)) {
  throw new Error(
    "The module dependency allowlist must declare every src/modules directory exactly once.",
  );
}

const sourceExtension = "[.](?:js|jsx|mjs|cjs|ts|tsx|mts|cts)$";
const publicSurface = `(?:server|model|contracts)${sourceExtension}|presentation(?:${sourceExtension}|/)`;

function moduleSurfaceRules(moduleName) {
  const moduleRoot = `^src/modules/${moduleName}/`;
  const ownPublicOrPrivate = `${moduleRoot}(?:${publicSurface}|_internal/|[^/]+${sourceExtension})`;

  return [
    {
      name: `no-private-${moduleName}-imports`,
      severity: "error",
      comment: "Only the owning module may import its private implementation.",
      from: { pathNot: moduleRoot },
      to: {
        path: moduleRoot,
        pathNot: `${moduleRoot}(?:${publicSurface})`,
      },
    },
    {
      name: `pure-${moduleName}-surfaces`,
      severity: "error",
      comment: "model and contracts stay pure and depend only on their own pure surfaces.",
      from: {
        path: `${moduleRoot}(?:model|contracts)${sourceExtension}`,
      },
      to: {
        path: "^src/modules/",
        pathNot: `${moduleRoot}(?:model|contracts)${sourceExtension}`,
      },
    },
    {
      name: `presentation-${moduleName}-surface`,
      severity: "error",
      comment: "presentation may use models, contracts, and its own presentation only.",
      from: {
        path: `${moduleRoot}presentation(?:${sourceExtension}|/)`,
      },
      to: {
        path: "^src/modules/",
        pathNot: [
          `^src/modules/[^/]+/(?:model|contracts)${sourceExtension}`,
          `${moduleRoot}presentation(?:${sourceExtension}|/)`,
        ],
      },
    },
    {
      name: `server-private-${moduleName}-surface`,
      severity: "error",
      comment: "server and private implementation use public foreign APIs only.",
      from: {
        path: [
          `${moduleRoot}server${sourceExtension}`,
          `${moduleRoot}_internal/`,
          `${moduleRoot}(?!(?:server|model|contracts|presentation)${sourceExtension})[^/]+${sourceExtension}`,
        ],
      },
      to: {
        path: "^src/modules/",
        pathNot: [
          `^src/modules/[^/]+/(?:server|model|contracts)${sourceExtension}`,
          ownPublicOrPrivate,
        ],
      },
    },
  ];
}

function moduleDependencyRule(moduleName) {
  const allowedTargets = [moduleName, ...allowedModuleDependencies[moduleName]];
  return {
    name: `declared-${moduleName}-module-dependencies`,
    severity: "error",
    comment: "Every inter-module dependency must be explicitly declared.",
    from: { path: `^src/modules/${moduleName}/` },
    to: {
      path: "^src/modules/",
      pathNot: `^src/modules/(?:${allowedTargets.join("|")})(?:/|$)`,
    },
  };
}

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies are forbidden.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-modules-to-app",
      severity: "error",
      from: { path: "^src/modules/" },
      to: { path: "^src/app/" },
    },
    {
      name: "no-app-to-db",
      severity: "error",
      from: { path: "^src/app/" },
      to: {
        path: "^src/(?:lib/db(?:/|[.]ts$)|infrastructure/db(?:/|[.]ts$))",
      },
    },
    {
      name: "no-shared-to-app-modules-infrastructure",
      severity: "error",
      from: { path: "^src/shared/" },
      to: { path: "^src/(?:app|modules|infrastructure)/" },
    },
    {
      name: "no-infrastructure-to-app",
      severity: "error",
      from: { path: "^src/infrastructure/" },
      to: { path: "^src/app/" },
    },
    {
      name: "no-infrastructure-to-modules",
      severity: "error",
      from: {
        path: "^src/infrastructure/",
        pathNot: "^src/infrastructure/db/schema(?:[.]ts$|/)",
      },
      to: { path: "^src/modules/" },
    },
    {
      name: "schema-only-imports-pure-models",
      severity: "error",
      from: { path: "^src/infrastructure/db/schema(?:[.]ts$|/)" },
      to: {
        path: "^src/modules/",
        pathNot: `^src/modules/[^/]+/model${sourceExtension}`,
      },
    },
    {
      name: "no-presentation-to-infrastructure",
      severity: "error",
      from: { path: "^src/modules/[^/]+/presentation(?:[.]tsx?$|/)" },
      to: { path: "^src/infrastructure/" },
    },
    {
      name: "no-pure-surface-to-infrastructure",
      severity: "error",
      from: { path: "^src/modules/[^/]+/(?:model|contracts)[.]tsx?$" },
      to: { path: "^src/infrastructure/" },
    },
    ...moduleNames.map(moduleDependencyRule),
    ...moduleNames.flatMap(moduleSurfaceRules),
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    includeOnly: "^src/",
    moduleSystems: ["cjs", "es6"],
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      extensions: [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"],
    },
    reporterOptions: {
      dot: { collapsePattern: "node_modules/[^/]+" },
    },
  },
};
