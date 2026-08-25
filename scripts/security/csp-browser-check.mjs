/**
 * Vérification navigateur de la CSP à nonce : charge les pages clés dans
 * Chromium headless et collecte les violations CSP réelles (événement
 * securitypolicyviolation) ainsi que les erreurs de script.
 *
 * Usage :
 *   npm run build && npx next start -p 3462 &
 *   node --env-file=.env.local scripts/security/csp-browser-check.mjs http://localhost:3462
 *
 * Optionnel : SLUG_RESTAURANT=/restaurant/xxx pour tester une page JSON-LD.
 */
import { chromium } from "@playwright/test";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PAGES = [
  "/",
  "/login",
  "/register",
  "/panier",
  "/profil",
  ...(process.env.SLUG_RESTAURANT ? [process.env.SLUG_RESTAURANT] : []),
];

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

let violations = [];
let scriptErrors = [];

page.addInitScript(() => {
  window.__cspViolations = [];
  document.addEventListener("securitypolicyviolation", (e) => {
    window.__cspViolations.push({
      directive: e.effectiveDirective,
      blockedURI: e.blockedURI,
      sourceFile: e.sourceFile,
      line: e.lineNumber,
    });
  });
});

for (const path of PAGES) {
  const url = `${BASE}${path}`;
  try {
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

page.on("console", (msg) => {
  const text = msg.text();
  // Artefact local connu : les routes /_vercel/* n'existent qu'infra Vercel.
  if (/_vercel\/(insights|speed-insights)/.test(text)) return;
  if (/Refused to|Content Security Policy/i.test(text)) {
    scriptErrors.push({ path: page.url(), text: text.slice(0, 200) });
  }
});
page.on("pageerror", (err) => {
  scriptErrors.push({ path: page.url(), type: "pageerror", text: err.message.slice(0, 200) });
});

    const cspViolations = await page.evaluate(() => window.__cspViolations ?? []);
    // Hydratation React : le bundle s'exécute-t-il ?
    const hydrated = await page.evaluate(
      () => Boolean(document.querySelector("script[nonce]")),
    );

    console.log(
      `[${response?.status()}] ${path} | scripts nonce: ${hydrated ? "oui" : "NON"} | violations CSP: ${cspViolations.length}`,
    );
    for (const v of cspViolations) {
      violations.push({ path, ...v });
    }
  } catch (err) {
    console.log(`[ERR] ${path} → ${err.message.split("\n")[0]}`);
    violations.push({ path, error: err.message });
  }
}

await browser.close();

console.log("\n═══ RÉSULTAT ═══");
if (violations.length === 0 && scriptErrors.length === 0) {
  console.log("✅ Aucune violation CSP ni erreur de script détectée.");
} else {
  console.log(`🔴 ${violations.length} violation(s), ${scriptErrors.length} erreur(s):`);
  for (const v of [...violations, ...scriptErrors]) {
    console.log(JSON.stringify(v));
  }
  process.exit(1);
}
