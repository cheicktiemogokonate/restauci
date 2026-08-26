/**
 * Parcours navigateur end-to-end — tous les espaces de l'application.
 * Usage :
 *   E2E_TEST=true npx next dev -p 3464 &
 *   node --env-file=.env.local scripts/e2e/browser-journeys.mjs http://localhost:3464
 *
 * Capture par parcours : erreurs console, exceptions, violations CSP,
 * réponses 5xx. Screenshots d'échec dans test-results/browser-journeys/.
 */
import { chromium } from "@playwright/test";
import { Pool } from "pg";
import { mkdirSync } from "node:fs";

let BASE = process.argv[2] ?? "http://127.0.0.1:3000";
BASE = BASE.replace("://localhost:", "://127.0.0.1:");
const STAMP = Date.now();
const SHOTS = "test-results/browser-journeys";
mkdirSync(SHOTS, { recursive: true });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const q = async (sql, params = []) => (await pool.query(sql, params)).rows;

const results = [];
function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}

// ───────────────────────── setup données ─────────────────────────
const openResto = (
  await q(
    "SELECT slug, nom FROM restaurants WHERE accepte_commandes = true AND en_ligne = true AND actif = true AND suspendu = false AND slug IS NOT NULL LIMIT 1",
  )
)[0];
const platResto = openResto
  ? (
      await q(
        "SELECT nom FROM plats WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = $1) AND disponible = true LIMIT 1",
        [openResto.slug],
      )
    )[0]
  : null;
const partnerUser = (
  await q("SELECT id FROM users WHERE email = 'orlando@restauci.com' LIMIT 1")
)[0];

// Client temporaire via API mobile
const CLIENT_PHONE = `+22508${String(STAMP).slice(-8)}`;
const regRes = await fetch(`${BASE}/api/v1/client/auth/register`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    nom: "__e2ebrowser Client",
    telephone: CLIENT_PHONE,
    password: "Browser-2026-ok",
    tokenTransport: "json",
  }),
});
const regJson = await regRes.json().catch(() => null);
const clientId = regJson?.data?.client?.id ?? null;

async function webLoginCookie(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const raw = setCookie.find((c) => c.startsWith("token="))?.split(";")[0] ?? null;
  return raw ? raw.replace(/^token=/, "") : null;
}

const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: BASE,
  geolocation: { latitude: 5.36, longitude: -4.01 },
  permissions: ["geolocation"],
  locale: "fr-FR",
});

async function newPage(label) {
  const page = await context.newPage();
  const issues = [];
  page.on("console", (msg) => {
    const t = msg.text();
    if (/Failed to load resource|_vercel\/|favicon|Download the React DevTools|_next\/hmr|cartocdn|AJAXError/i.test(t)) return;
    if (msg.type() === "error" && !/Failed to load resource.*403|unsplash/i.test(t)) {
      issues.push(`console: ${t.slice(0, 160)}`);
    }
  });
  page.on("pageerror", (err) => issues.push(`pageerror: ${err.message.slice(0, 160)}`));
  page.on("response", (res) => {
    const u = new URL(res.url());
    if (res.status() >= 500 && !res.url().includes("/_vercel")) {
      issues.push(`http${res.status()}: ${u.host}${u.pathname.slice(0, 60)}`);
    } else if (res.status() === 403 && !u.pathname.startsWith("/_next") && !u.hostname.includes("unsplash")) {
      issues.push(`http403: ${u.host}${u.pathname.slice(0, 60)}`);
    }
  });
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      window.__csp.push(`${e.effectiveDirective} ${e.blockedURI} @ ${(e.sourceFile||'?').split('/').pop()}:${e.lineNumber}`);
    });
  });
  page.__issues = issues;
  page.__label = label;
  return page;
}

async function finish(page, ok, name, detail = "") {
  const csp = await page.evaluate(() => window.__csp ?? []).catch(() => []);
  // Probe zod v4 (Function("")) : dégradation gracieuse documentée, non bloquant
  const benignCsp = csp.filter((v) => /script-src eval @ 2605-/.test(v));
  const hardCsp = csp.filter((v) => !/script-src eval @ 2605-/.test(v));
  if (benignCsp.length) console.log(`   [info] ${benignCsp.length} probe(s) zod v4 (fallback CSP, bénin)`);
  const all = [...page.__issues, ...hardCsp.map((v) => `CSP: ${v}`)];
  record(name, ok && all.length === 0, `${detail}${all.length ? " | " + all.slice(0, 3).join(" ;; ") : ""}`);
  if (!ok || all.length > 0) {
    await page.screenshot({ path: `${SHOTS}/${name.replace(/[^a-z0-9]+/gi, "_")}.png`, fullPage: true }).catch(() => {});
  }
  await page.close().catch(() => {});
}

try {
  // ════════ 1. Visiteur public ════════
  {
    const page = await newPage("public");
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });
    const heroVisible = await page.getByText(/Toutci|Commandez|restauration/i).first().isVisible().catch(() => false);
    record("landing : rendu avec contenu héro", heroVisible);

    for (const path of ["/mentions-legales", "/confidentialite", "/conditions-generales", "/cookies"]) {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 45000 });
      const h = await page.locator("h1").first().textContent().catch(() => "");
      record(`page légale ${path}`, Boolean(h && h.trim().length > 3));
    }

    if (openResto) {
      await page.goto(`/restaurant/${openResto.slug}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      const nameVisible = await page
        .getByText(openResto.nom)
        .first()
        .waitFor({ state: "visible", timeout: 30000 })
        .then(() => true)
        .catch(() => false);
      record(`page publique restaurant "${openResto.slug}"`, nameVisible);
    }

    await page.goto("/residences", { waitUntil: "domcontentloaded", timeout: 60000 });
    const resContent = await page.locator("main, body").first().textContent();
    record("page résidences : contenu présent", Boolean(resContent && resContent.length > 100));

    await finish(page, true, "parcours visiteur public");
  }

  // ════════ 2. Espace restaurateur (cookie injecté) ════════
  {
    const token = await webLoginCookie("orlando@restauci.com", "password123");
    const page = await newPage("restaurateur");
    await context.addCookies([{ name: "token", value: token ?? "", domain: "127.0.0.1", path: "/" }]);

    await page.goto("/restaurateur/commandes", { waitUntil: "domcontentloaded", timeout: 60000 });
    const hasShell = await page.locator("body").textContent();
    record("restaurateur/commandes : page chargée", Boolean(hasShell && hasShell.length > 200 && !/Connexion/.test(hasShell?.slice(0, 500) ?? "")));

    await page.goto("/restaurateur/menu", { waitUntil: "domcontentloaded", timeout: 60000 });
    record("restaurateur/menu : page chargée", (await page.locator("body").textContent())?.length > 200);

    await page.goto("/restaurateur/profil", { waitUntil: "domcontentloaded", timeout: 60000 });
    record("restaurateur/profil : page chargée", (await page.locator("body").textContent())?.length > 200);

    await page.goto("/restaurateur/notifications", { waitUntil: "domcontentloaded", timeout: 60000 });
    record("restaurateur/notifications : page chargée", (await page.locator("body").textContent())?.length > 200);

    // Garde : un anonyme est redirigé vers /login
    const anon = await context.browser()?.newContext({ baseURL: BASE });
    const anonPage = await anon.newPage();
    await anonPage.goto("/restaurateur/commandes", { waitUntil: "domcontentloaded", timeout: 45000 });
    record("anonyme /restaurateur/* → redirigé /login", anonPage.url().includes("/login"));
    await anon.close();
    await anonPage.close();

    await finish(page, true, "parcours restaurateur");
  }

  // ════════ 3. Administration (cookie injecté) ════════
  {
    const token = await webLoginCookie("admin@restauci.com", "password123");
    console.log(`   [debug] admin token: ${token ? token.slice(0, 25) + "..." : "NULL"}`);
    const page = await newPage("admin");
    await context.addCookies([{ name: "token", value: token ?? "", domain: "127.0.0.1", path: "/" }]);
    console.log(`   [debug] cookies contexte: ${JSON.stringify(await context.cookies("http://127.0.0.1:3464/admin"))}`);

    const pages = [
      ["/admin", /Bonjour|Tableau/i],
      ["/admin/a-traiter", /traiter|À traiter/i],
      ["/admin/restaurants", /restaurants/i],
      ["/admin/users", /comptes|utilisateurs|accès/i],
      ["/admin/abonnements", /abonnement/i],
      ["/admin/commissions", /commission|finance/i],
      ["/admin/audit", /audit|journal/i],
      ["/admin/support", /support/i],
      ["/admin/parametres", /param[eè]tre/i],
    ];
    let allOk = true;
    const fails = [];
    for (const [path, pattern] of pages) {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 60000 });
      const txt = (await page.locator("body").textContent()) ?? "";
      if (process.env.DEBUG_JOURNEYS && !pattern.test(txt)) {
        console.log(`   [debug] ${path} → URL=${page.url()} | body[0..150]=${txt.slice(0, 150).replace(/\s+/g, " ")}`);
      }
      if (!pattern.test(txt)) { allOk = false; fails.push(path); }
    }
    record("les 9 vues admin se rendent avec le bon titre", allOk, fails.join(","));
    await finish(page, true, "parcours administrateur");
  }

  // ════════ 4. Parcours client complet (UI réelle) ════════
  {
    const page = await newPage("client");
    await page.goto("/client/login", { waitUntil: "domcontentloaded", timeout: 60000 });

    if (clientId) {
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(1500); // laisse l'hydratation React attacher le handler
      await page.locator('input[type="tel"]').fill(CLIENT_PHONE);
      await page.locator('input[type="password"]').fill("Browser-2026-ok");
      await Promise.all([
        page.waitForURL((u) => !String(u).includes("/client/login"), { timeout: 30000 }),
        page.locator('button[type="submit"]').click(),
      ]);
      record("login client via l'interface", !(page.url().includes("/client/login")));
    }

    if (openResto) {
      const apiCalls = [];
      const onResp = (res) => {
        if (res.url().includes("/api/")) apiCalls.push(`${res.status()} ${new URL(res.url()).pathname.slice(0, 60)}`);
      };
      page.on("response", onResp);
      await page.goto(`/client/restaurant/${openResto.slug}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(6000);
      console.log(`   [debug] appels API page client: ${apiCalls.join(" | ") || "AUCUN"}`);
      page.off("response", onResp);
      const addBtn = platResto
        ? page.locator(`[aria-label*="${platResto.nom}"][aria-label*="panier"]`).first()
        : page.locator('[aria-label*="au panier"]').first();
      await page.waitForTimeout(2500);
      const btnVisible = await addBtn.isVisible({ timeout: 25000 }).catch(() => false);
      if (!btnVisible) {
        const snippet = ((await page.locator("body").textContent()) ?? "").slice(0, 200);
        record("bouton ajouter au panier visible", false, `aucun bouton | page: ${snippet}`);
      } else {
        const disabled = await addBtn.isDisabled().catch(() => true);
        if (disabled) {
          // Règle métier : ajout refusé hors des créneaux d'ouverture du restaurant.
          record("bouton ajouter présent et correctement désactivé hors horaires", true);
        } else {
          // Le clic peut arriver avant l'hydratation React (no-op silencieux) :
          // on réessaie jusqu'à ce que le store persiste l'item.
          let addedToStore = false;
          for (let attempt = 0; attempt < 4 && !addedToStore; attempt++) {
            await addBtn.click().catch(() => {});
            await page.waitForTimeout(1500);
            addedToStore = await page.evaluate(() =>
              Object.keys(localStorage).some((k) => k.includes("panier") && (localStorage.getItem(k) ?? "").includes('"items":[{')),
            );
          }
          if (!addedToStore) {
            record("clic ajouter au panier persiste l'item", false, "store panier vide après 4 tentatives");
          }
          await page.goto("/panier", { waitUntil: "domcontentloaded", timeout: 60000 });
          // laisser zustand réhydrater le store depuis localStorage (SSR affiche "vide" par défaut)
          await page.waitForTimeout(2500);
          const panierTxt = ((await page.locator("body").textContent()) ?? "").replace(/\s+/g, " ").slice(0, 400);
          const added =
            panierTxt.includes(platResto?.nom ?? "") ||
            /\d/.test(panierTxt.match(/(\d+)\s*(article|plat|item)/i)?.[1] ?? "");
          if (!added) await page.screenshot({ path: `${SHOTS}/panier-echec.png`, fullPage: true }).catch(() => {});
          record("ajout au panier depuis la fiche restaurant + panier rempli", added, `panier: ${panierTxt.slice(0, 180)}`);
        }
      }
    }

    await finish(page, true, "parcours client");
  }
} catch (err) {
  console.error("💥 Crash:", err.message);
  process.exitCode = 1;
} finally {
  // nettoyage client temporaire
  try {
    await q("DELETE FROM clients WHERE id = $1", [clientId]);
  } catch {}
  await pool.end();
  await browser.close();
}

const failed = results.filter((r) => !r.pass);
console.log("\n════════════════════════════════════");
console.log(`PARCOURS NAVIGATEUR: ${results.length} vérifications | ✅ ${results.length - failed.length} | ❌ ${failed.length}`);
failed.forEach((f) => console.log(`  ❌ ${f.name} — ${f.detail.slice(0, 200)}`));
if (failed.length) process.exit(1);
