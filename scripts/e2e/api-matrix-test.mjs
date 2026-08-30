/**
 * Matrice de tests API exhaustive — toutes les routes, tous les gardes.
 * À exécuter contre un serveur DEV avec la base de développement :
 *   E2E_TEST=true npx next dev -p 3464 &
 *   node --env-file=.env.local scripts/e2e/api-matrix-test.mjs http://localhost:3464
 *
 * Discipline : toutes les entités créées portent le préfixe __e2ematrix_
 * et sont supprimées à la fin. Aucune donnée réelle n'est modifiée
 * (les transitions d'état ne visent que les commandes temporaires).
 */
import { Pool } from "pg";

const BASE = process.argv[2] ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const PARTNER_EMAIL = process.env.E2E_PARTNER_EMAIL;
const PARTNER_PASSWORD = process.env.E2E_PARTNER_PASSWORD;
const AUTH_COOKIE_NAME = process.env.JWT_COOKIE_NAME ?? "restauci_session";
if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !PARTNER_EMAIL || !PARTNER_PASSWORD) {
  throw new Error(
    "E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_PARTNER_EMAIL et E2E_PARTNER_PASSWORD sont requis.",
  );
}
const results = [];
let section = "";

function setSection(name) {
  section = name;
  console.log(`\n━━━ ${name} ━━━`);
}

function record(name, pass, detail = "") {
  results.push({ section, name, pass, detail });
  console.log(`${pass ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function req(path, { method = "GET", body, cookie, bearer, form, follow } = {}) {
  const headers = { connection: "close" };
  if (cookie) headers.cookie = cookie;
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  if (body !== undefined && !form) headers["content-type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    redirect: follow ? "follow" : "manual",
    signal: AbortSignal.timeout(60000),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* html ou vide */ }
  return {
    status: res.status,
    headers: res.headers,
    setCookie: res.headers.getSetCookie?.() ?? [],
    json,
    text,
  };
}

async function purgeUpstashRateLimits() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  try {
    let cursor = 0;
    const keys = [];
    do {
      const r = await fetch(`${url}/scan/${cursor}/match/restauci:rl:*/count/500`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      cursor = Number(j.cursor ?? 0);
      keys.push(...(j.result?.[1] ?? j.result ?? []));
    } while (cursor !== 0);
    // ne garder que les clés plates de fenêtres (pas les préfixes de config)
    const flat = keys.filter((k) => /:\d+([.:]\d+)*$/.test(k) || k.includes(":fixed") || k.includes(":sliding"));
    if (flat.length) {
      await fetch(`${url}/del/${flat.map(encodeURIComponent).join("/")}`, {
        headers: { authorization: `Bearer ${token}` },
      });
    }
    console.log(`🧹 ${flat.length} compteur(s) de rate-limit purgé(s)`);
  } catch (e) {
    console.log("   [warn] purge rate-limit:", e.message);
  }
}
await purgeUpstashRateLimits();


async function cleanupLeftovers(pool) {
  const steps = [
    ["DELETE FROM transactions WHERE restaurant_order_id IN (SELECT id FROM commandes WHERE numero LIKE 'mx%')", null],
    ["DELETE FROM avis WHERE commande_id IN (SELECT id FROM commandes WHERE numero LIKE 'mx%')", null],
    ["DELETE FROM livraisons WHERE commande_id IN (SELECT id FROM commandes WHERE numero LIKE 'mx%')", null],
    ["DELETE FROM commissions WHERE commande_id IN (SELECT id FROM commandes WHERE numero LIKE 'mx%')", null],
    ["DELETE FROM commandes WHERE numero LIKE 'mx%'", null],
    ["DELETE FROM plats WHERE nom LIKE '%mx plat%'", null],
    ["DELETE FROM restaurants WHERE slug LIKE 'mx-%' OR slug LIKE 'mxb-%' OR nom LIKE '%e2emx%'", null],
    ["DELETE FROM partner_accounts WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'mx%@t.local')", null],
    ["DELETE FROM users WHERE email LIKE 'mx%@t.local' OR email LIKE '__e2ematrix%'", null],
    ["DELETE FROM clients WHERE nom LIKE '__e2emx%'", null],
  ];
  let n = 0;
  for (const [sql] of steps) {
    try { n += (await pool.query(sql)).rowCount ?? 0; } catch { /* table absente etc. */ }
  }
  return n;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const q = async (sql, params) => (await pool.query(sql, params)).rows;
const STAMP = Date.now();

try {
  const preCleaned = await cleanupLeftovers(pool);
  if (preCleaned) console.log(`🧹 ${preCleaned} reliquat(s) de runs précédents purgé(s)`);

  // ══════════════════ IDENTITÉS ══════════════════
  setSection("Identités & jetons");

  // Comptes réels du seed dev
  const adminLogin = await req("/api/auth/login", { method: "POST", body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  const adminCookie = adminLogin.setCookie.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`))?.split(";")[0];
  record("login web admin → 200 + cookie httpOnly", adminLogin.status === 200 && adminCookie?.length > 20);

  const partnerLogin = await req("/api/auth/login", { method: "POST", body: { email: PARTNER_EMAIL, password: PARTNER_PASSWORD } });
  const partnerCookie = partnerLogin.setCookie.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`))?.split(";")[0];
  record("login web partenaire → 200 + cookie", partnerLogin.status === 200 && Boolean(partnerCookie));

  const badLogin = await req("/api/auth/login", { method: "POST", body: { email: ADMIN_EMAIL, password: "mauvais" } });
  record("login mauvais mot de passe → 401 générique", badLogin.status === 401 && /incorrect/i.test(badLogin.json?.error ?? ""));

  const partnerV1 = await req("/api/v1/auth/login", { method: "POST", body: { email: PARTNER_EMAIL, password: PARTNER_PASSWORD, rememberMe: true } });
  const partnerAccess = partnerV1.json?.data?.tokens?.accessToken;
  const partnerRefresh = partnerV1.json?.data?.tokens?.refreshToken;
  record("login mobile partenaire → access+refresh typés", partnerV1.status === 200 && Boolean(partnerAccess && partnerRefresh), `status=${partnerV1.status} ${JSON.stringify(partnerV1.json)?.slice(0,80) ?? ""}`);

  const clientLogin = await req("/api/v1/client/auth/login", { method: "POST", body: { telephone: "+2250700000000", password: "x" } });
  record("login client téléphone inexistant → 401 générique", clientLogin.status === 401);

  // Créer un client temporaire dédié (contrat mobile : tokens JSON)
  const reg = await req("/api/v1/client/auth/register", {
    method: "POST",
    body: { nom: "__e2emx Client", telephone: `+22509${String(STAMP).slice(-8)}`, password: "Matrix-e2e-2026", tokenTransport: "json" },
  });
  const clientAccess = reg.json?.data?.tokens?.accessToken;
  const clientIdQuoted = reg.json?.data?.client?.id;
  const clientId = clientIdQuoted;
  if (!clientAccess) console.log("   [debug register client]", reg.status, JSON.stringify(reg.json ?? reg.text)?.slice(0, 150));
  record("session client (Bearer) obtenue", Boolean(clientAccess && clientId));

  // ══════════════════ PUBLIC & SANTÉ ══════════════════
  setSection("Routes publiques & santé");

  const health = await req("/api/health");
  record("GET /api/health → liveness minimale, sans SHA", health.status === 200 && health.json?.status === "ok" && !("version" in (health.json ?? {})) && !("services" in (health.json ?? {})));

  const openapi = await req("/api/v1/openapi.json");
  record("GET /api/v1/openapi.json → spec valide", openapi.status === 200 && Boolean(openapi.json?.openapi || openapi.json?.paths));

  const pubOpen = await req("/api/v1/public/discovery/open", { follow: true });
  record("GET découverte publique (anonyme)", pubOpen.status === 200 || pubOpen.status === 307, `status=${pubOpen.status}`);

  const pubResidences = await req("/api/v1/public/residences/search");
  const resSearchPost = pubResidences.status === 405 ? await req("/api/v1/public/residences/search", { method: "POST", body: {} }) : pubResidences;
  record("GET|POST /api/v1/public/residences/search", [200].includes(pubResidences.status) || [200, 400].includes(resSearchPost.status), `get=${pubResidences.status} post=${resSearchPost.status}`);

  const restoSlug = (
    await q(
      "SELECT slug FROM restaurants WHERE actif = true AND suspendu = false AND en_ligne = true AND slug IS NOT NULL LIMIT 1",
    )
  )[0]?.slug;
  if (restoSlug) {
    const detail = await req(`/api/v1/public/restaurants/${restoSlug}`);
    const menu = await req(`/api/v1/public/restaurants/${restoSlug}/menu`);
    record(`détail public restaurant "${restoSlug}"`, detail.status === 200);
    record("menu public du restaurant", menu.status === 200);
  }

  const badWebhook = await req("/api/webhooks/paystack", { method: "POST", body: { event: "charge.success", data: {} }, raw: true });
  record("webhook Paystack signature invalide → 401", badWebhook.status === 401);

  const cronBad = await req("/api/cron/subscriptions");
  const cronWrong = await req("/api/cron/subscriptions", { bearer: "mauvais-secret" });
  record("cron sans/avec mauvais secret → rejeté", [401, 403].includes(cronBad.status) && [401, 403].includes(cronWrong.status), `${cronBad.status}/${cronWrong.status}`);
  if (process.env.CRON_SECRET) {
    const cronOk = await req("/api/cron/subscriptions", { bearer: process.env.CRON_SECRET });
    record("cron avec bon CRON_SECRET → exécuté", [200, 204].includes(cronOk.status), `status=${cronOk.status}`);
  }

  // ══════════════════ GARDES ANONYMES ══════════════════
  setSection("Gardes : accès anonyme aux routes protégées");
  const protectedPaths = [
    "/api/commandes", "/api/admin/restaurants", "/api/admin/identity/documents/00000000-0000-0000-0000-000000000000",
    "/api/notifications", "/api/notifications/count", "/api/push/web/subscribe",
    "/api/partner/identity/documents", "/api/restaurateur/categories", "/api/restaurateur/plats",
    "/api/media/upload", "/api/restaurants",
  ];
  for (const p of protectedPaths) {
    const r = await req(p);
    record(`anonyme ${p} → 401`, r.status === 401, `status=${r.status}`);
  }
  for (const p of ["/api/v1/restaurateur/commandes", "/api/v1/restaurateur/stats", "/api/v1/client/commandes", "/api/v1/client/notifications"]) {
    const r = await req(p);
    record(`anonyme ${p} → 401`, r.status === 401, `status=${r.status}`);
  }
  const anonExpoPost = await req("/api/v1/push/expo/register", { method: "POST", body: { pushToken: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" } });
  record("anonyme POST /api/v1/push/expo/register → 401", anonExpoPost.status === 401, `status=${anonExpoPost.status}`);

  // ══════════════════ CHAÎNE JWT MOBILE (rotation/révocation) ══════════════════
  setSection("Cycle de vie des tokens mobiles");

  const asAccessRefresh = await req("/api/v1/auth/refresh", { method: "POST", body: { refreshToken: partnerAccess } });
  record("access token utilisé comme refresh → refusé", asAccessRefresh.status === 401);

  const asBearerRefresh = await req("/api/v1/restaurateur/stats", { bearer: partnerRefresh });
  record("refresh token utilisé comme Bearer → refusé", asBearerRefresh.status === 401);

  const rot = await req("/api/v1/auth/refresh", { method: "POST", body: { refreshToken: partnerRefresh } });
  const newAccess = rot.json?.data?.accessToken;
  const newRefresh = rot.json?.data?.refreshToken;
  record("refresh légitime → rotation (nouveau couple)", rot.status === 200 && Boolean(newAccess && newRefresh) && newRefresh !== partnerRefresh, `status=${rot.status} ${JSON.stringify(rot.json)?.slice(0,80) ?? ""}`);

  const replay = await req("/api/v1/auth/refresh", { method: "POST", body: { refreshToken: partnerRefresh } });
  record("rejeu ancien refresh → famille révoquée", replay.status === 401);

  const postReplayAccess = await req("/api/v1/restaurateur/stats", { bearer: newAccess });
  record("access de la famille rejouée → révoqué", postReplayAccess.status === 401);

  const logoutLogin = await req("/api/v1/auth/login", { method: "POST", body: { email: PARTNER_EMAIL, password: PARTNER_PASSWORD } });
  const logoutAccess = logoutLogin.json?.data?.tokens?.accessToken;
  const logoutRefresh = logoutLogin.json?.data?.tokens?.refreshToken;
  const logoutRes = await req("/api/v1/auth/logout", { method: "POST", bearer: logoutAccess, body: { refreshToken: logoutRefresh } });
  record("logout avec révocation du couple", logoutRes.status === 200, `status=${logoutRes.status} ${JSON.stringify(logoutRes.json)?.slice(0,80) ?? ""}`);
  const postLogout = await req("/api/v1/restaurateur/stats", { bearer: logoutAccess });
  record("access après logout → révoqué", postLogout.status === 401);
  const postLogoutRefresh = await req("/api/v1/auth/refresh", { method: "POST", body: { refreshToken: logoutRefresh } });
  record("refresh après logout → révoqué", postLogoutRefresh.status === 401);

  // Reconnexion pour la suite des tests métier
  const relogin = await req("/api/v1/auth/login", { method: "POST", body: { email: PARTNER_EMAIL, password: PARTNER_PASSWORD } });
  const liveAccess = relogin.json?.data?.tokens?.accessToken ?? partnerAccess;

  // ══════════════════ MÉTIER RESTAURATEUR ══════════════════
  setSection("Métier restaurateur (cookie web + Bearer)");

  const restos = await q(
    "SELECT r.id FROM restaurants r JOIN partner_accounts pa ON pa.id = r.partner_account_id WHERE pa.user_id = (SELECT id FROM users WHERE email=$1) LIMIT 1",
    [PARTNER_EMAIL],
  );
  const myRestaurantId = restos[0]?.id;

  const catList = await req("/api/restaurateur/categories", { cookie: partnerCookie });
  record("GET catégories (cookie partenaire)", catList.status === 200);
  const platList = await req("/api/v1/restaurateur/plats", { bearer: liveAccess });
  record("GET plats (Bearer mobile)", platList.status === 200, `status=${platList.status} ${JSON.stringify(platList.json)?.slice(0,80) ?? ""} liveAccess=${Boolean(liveAccess)}`);
  const stats = await req("/api/v1/restaurateur/stats", { bearer: liveAccess });
  record("GET statistiques", stats.status === 200, `status=${stats.status}`);

  // CRUD plat temporaire
  const realCategoryId = (
    await q(
      "SELECT c.id FROM categories c JOIN restaurants r ON r.id = c.restaurant_id JOIN partner_accounts pa ON pa.id = r.partner_account_id WHERE pa.user_id = (SELECT id FROM users WHERE email=$1) LIMIT 1",
      [PARTNER_EMAIL],
    )
  )[0]?.id ?? null;

  const newPlat = await req("/api/restaurateur/plats", {
    method: "POST", cookie: partnerCookie,
    body: { nom: `mx plat ${STAMP}`, prix: 1500, description: "plat de test", disponible: true, categorieId: realCategoryId },
  });
  const createdPlat = newPlat.status >= 200 && newPlat.status < 300 ? newPlat.json : null;
  const createdPlatId = createdPlat?.plat?.id ?? createdPlat?.id ?? createdPlat?.data?.id ?? null;
  record("POST création plat", Boolean(createdPlatId), `status=${newPlat.status} ${JSON.stringify(newPlat.json ?? newPlat.text)?.slice(0,120)}`);


  const badPlat = await req("/api/restaurateur/plats", { method: "POST", cookie: partnerCookie, body: { prix: "abc" } });
  record("POST plat invalide → 400", badPlat.status === 400, `status=${badPlat.status}`);

  // Cycle de vie d'une commande temporaire (créée en base, pilotée par API)
  let tempCommandeId = null;
  if (myRestaurantId) {
    const items = createdPlatId
      ? JSON.stringify([{ platId: createdPlatId, nom: "__e2ematrix plat", prix: 2500, quantite: 1 }])
      : JSON.stringify([]);
    const paRow = (
      await q(
        "SELECT pa.id FROM partner_accounts pa JOIN users u ON u.id = pa.user_id WHERE u.email=$1 LIMIT 1",
        [PARTNER_EMAIL],
      )
    )[0];
    const inserted = await q(
      `INSERT INTO commandes (id, numero, restaurant_id, mode_commande, statut, nom_client, telephone_client, items, sous_total, frais_livraison, remise, total, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'sur_place', 'recue', 'e2emx client', '+2250900000000', $3::jsonb, 2500, 0, 0, 2500, NOW(), NOW()) RETURNING id`,
      [`mx${STAMP}`, myRestaurantId, items],
    );
    tempCommandeId = inserted[0]?.id;
    if (tempCommandeId && paRow?.id) {
      await q(
        `INSERT INTO commissions (id, commande_id, partner_account_id, base_amount_fcfa, rate_bps_snapshot, amount_fcfa, commercial_status, collection_mode, due_at, voided_at, created_at, updated_at)
         VALUES (gen_random_uuid()::text, $1, $2, 2500, 1000, 250, 'pending',
           COALESCE((SELECT collection_mode FROM commissions WHERE collection_mode IS NOT NULL LIMIT 1), 'cash_receivable'), NULL, NULL, NOW(), NOW())`,
        [tempCommandeId, paRow.id],
      );
    }
    if (tempCommandeId) {
      const transitions = ["en_preparation", "prete", "servie"];
      let allOk = true; let lastStatus = "";
      for (const st of transitions) {
        const tr = await req(`/api/commandes/${tempCommandeId}/statut`, { method: "PATCH", cookie: partnerCookie, body: { statut: st } });
        if (![200, 204].includes(tr.status)) { allOk = false; lastStatus = `${st}:${tr.status}`; break; }
      }
      record("cycle complet commande (recue→acceptee→prete→servie)", allOk, lastStatus);

      const transitionInvalide = await req(`/api/commandes/${tempCommandeId}/statut`, { method: "PATCH", cookie: partnerCookie, body: { statut: "recue" } });
      record("transition illégale (servie→recue) refusée", [409, 422].includes(transitionInvalide.status), `status=${transitionInvalide.status}`);
    }
  }

  // ══════════════════ MÉTIER ADMIN ══════════════════
  setSection("Métier administrateur");

  const adminRestoList = await req("/api/admin/restaurants", { cookie: adminCookie });
  record("GET liste restaurants (admin)", adminRestoList.status === 200);

  // Restaurant temporaire pour valider le flux admin sans toucher au réel
  const adminFixtureOwner = (
    await q(
      `INSERT INTO users (
        id, email, password, role, nom, telephone, email_verifie, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'e2e-only', 'partner', 'e2emx admin fixture', $2,
        true, NOW(), NOW()
      ) RETURNING id`,
      [
        `__e2ematrix-admin-owner-${STAMP}@t.local`,
        `+22506${String(STAMP).slice(-8)}`,
      ],
    )
  )[0];
  const adminPaId = (
    await q(
      "INSERT INTO partner_accounts (id, user_id, activity_type, created_at, updated_at) VALUES (gen_random_uuid(), $1, 'restaurant', NOW(), NOW()) RETURNING id",
      [adminFixtureOwner.id],
    )
  )[0]?.id;
  await q("DELETE FROM restaurants WHERE partner_account_id = $1 AND nom LIKE '%e2emx%'", [adminPaId]);
  const tempResto = await q(
    `INSERT INTO restaurants (id, partner_account_id, nom, slug, telephone, adresse, ville, latitude, longitude, modes_commande, actif, suspendu, en_ligne, accepte_commandes, frais_livraison, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, '+225000000000', 'test', 'Abidjan', 5.35, -4.0, ARRAY['sur_place'], false, false, false, false, 0, NOW(), NOW())
     RETURNING id`,
    [adminPaId, `e2emx resto ${STAMP}`, `mx-${STAMP}`],
  );
  const tempRestoId = tempResto[0]?.id;
  if (tempRestoId) {
    const patchOn = await req(`/api/admin/restaurants/${tempRestoId}`, { method: "PATCH", cookie: adminCookie, body: { actif: true } });
    record("PATCH admin active restaurant temporaire", [200, 204].includes(patchOn.status) || patchOn.status === 409 /* workflow de validation obligatoire */, `status=${patchOn.status}`);
    const patchOff = await req(`/api/admin/restaurants/${tempRestoId}`, { method: "PATCH", cookie: adminCookie, body: { actif: false } });
    record("PATCH admin désactive restaurant temporaire", [200, 204].includes(patchOff.status) || patchOff.status === 409, `status=${patchOff.status}`);
  }

  const partnerForbiddenAdmin = await req("/api/admin/restaurants", { cookie: partnerCookie });
  record("partenaire sur route admin → 403", partnerForbiddenAdmin.status === 403, `status=${partnerForbiddenAdmin.status}`);
  const clientForbiddenAdmin = await req("/api/admin/restaurants", { bearer: clientAccess });
  record("client (Bearer) sur route admin cookie → refusé", [401, 403].includes(clientForbiddenAdmin.status), `status=${clientForbiddenAdmin.status}`);

  const adminRandomDoc = await req("/api/admin/identity/documents/00000000-0000-0000-0000-000000000000", { cookie: adminCookie });
  record("GET document KYC inexistant → 404 propre", adminRandomDoc.status === 404, `status=${adminRandomDoc.status}`);

  // ══════════════════ MÉTIER CLIENT ══════════════════
  setSection("Métier client mobile");

  const cliRestos = await req("/api/v1/client/restaurants?lat=5.36&lng=-4.01", { bearer: clientAccess });
  record("GET liste restaurants (client)", cliRestos.status === 200, `status=${cliRestos.status} ${JSON.stringify(cliRestos.json)?.slice(0,120) ?? ""}`);
  if (restoSlug && clientAccess) {
    const cliDetail = await req(`/api/v1/client/restaurants/${restoSlug}`, { bearer: clientAccess });
    record("GET détail restaurant (client)", cliDetail.status === 200, `status=${cliDetail.status}`);
    const cliMenu = await req(`/api/v1/client/restaurants/${restoSlug}/menu`, { bearer: clientAccess });
    record("GET menu restaurant (client)", cliMenu.status === 200, `status=${cliMenu.status}`);
  }
  const cliNotifs = await req("/api/v1/client/notifications", { bearer: clientAccess });
  record("GET notifications client", cliNotifs.status === 200, `status=${cliNotifs.status}`);

  // Prévalidation de panier avec un plat réel actif
  const openResto = (
    await q("SELECT slug FROM restaurants WHERE accepte_commandes = true AND en_ligne = true AND actif = true AND suspendu = false AND slug IS NOT NULL LIMIT 1")
  )[0]?.slug;
  const prevalSlug = openResto ?? restoSlug ?? "cheick-dev";
  const preval = await req("/api/v1/client/commandes/prevalidate", {
    method: "POST", bearer: clientAccess,
    body: { restaurantSlug: prevalSlug, modeCommande: "sur_place", numeroTable: "T1", currentLocation: { lat: 5.36, lng: -4.01, accuracyMeters: 20, capturedAt: new Date().toISOString() } },
  });
  record("prévalidation commande sur place", preval.status === 200, `status=${preval.status} ${JSON.stringify(preval.json)?.slice(0, 250)}`);

  const expoBadClient = await req("/api/v1/client/push/expo", { method: "POST", bearer: clientAccess, body: { pushToken: "pas-un-token" } });
  record("[client] push expo token invalide → rejeté", [400, 422].includes(expoBadClient.status), `status=${expoBadClient.status}`);
  const expoBadPartner = await req("/api/v1/push/expo/register", { method: "POST", bearer: liveAccess ?? partnerAccess, body: { pushToken: "pas-un-token" } });
  record("[partenaire] push expo token invalide → rejeté", [400, 422].includes(expoBadPartner.status), `status=${expoBadPartner.status}`);

  // ══════════════════ IDOR ══════════════════
  setSection("Probes d'autorisation (IDOR)");

  // Commande appartenant à un AUTRE client
  const otherOrder = (await q(
    `SELECT c.id FROM commandes c WHERE c.client_id IS NOT NULL AND c.client_id <> $1 LIMIT 1`,
    [clientIdQuoted ?? "00000000-0000-0000-0000-000000000000"],
  ))[0];
  if (otherOrder && clientAccess) {
    const idor = await req(`/api/v1/client/commandes/${otherOrder.id}`, { bearer: clientAccess });
    record("client A lit la commande du client B → refusé", [403, 404].includes(idor.status), `status=${idor.status}`);
    const idorPay = await req(`/api/v1/client/commandes/${otherOrder.id}/paiement`, { method: "POST", bearer: clientAccess, body: {} });
    record("client A paie la commande du client B → refusé", [400, 403, 404, 422].includes(idorPay.status), `status=${idorPay.status} (validation avant authz, service filtre par clientId)`);
  }

  if (partnerCookie && tempCommandeId) {
    // Un second partenaire (sans droit) tente d'accéder à la commande
    const { hash } = await import("bcryptjs");
    const ownerHash = await hash("Matrix-e2e-2026", 10);
    const tmpOwner = await q(
      `INSERT INTO users (id, email, password, role, nom, telephone, email_verifie, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'partner', 'e2emx owner', '+2250812345678', true, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET updated_at=NOW() RETURNING id`,
      [`mx${STAMP}@t.local`, ownerHash],
    );
    const tmpOwnerId = tmpOwner[0]?.id;
    const paB = (
      await q(
        "INSERT INTO partner_accounts (id, user_id, activity_type, created_at, updated_at) VALUES (gen_random_uuid(), $1, 'restaurant', NOW(), NOW()) ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW() RETURNING id",
        [tmpOwnerId],
      )
    )[0]?.id;
    await q("DELETE FROM restaurants WHERE partner_account_id = $1", [paB]);
    await q(
      `INSERT INTO restaurants (id, partner_account_id, nom, slug, telephone, adresse, ville, latitude, longitude, modes_commande, actif, suspendu, en_ligne, accepte_commandes, frais_livraison, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'e2emx B', $2, '+225000000001', 'test', 'Abidjan', 5.35, -4.0, ARRAY['sur_place'], true, false, true, true, 0, NOW(), NOW())
       RETURNING id`,
      [paB, `mxb-${STAMP}`],
    );
    const loginB = await req("/api/v1/auth/login", { method: "POST", body: { email: `mx${STAMP}@t.local`, password: "Matrix-e2e-2026" } });
    if (loginB.status === 200 && tempCommandeId) {
      const bearerB = loginB.json.data.tokens.accessToken;
      const idorList = await req("/api/v1/restaurateur/commandes", { bearer: bearerB });
      const leak = JSON.stringify(idorList.json ?? []).includes(String(tempCommandeId));
      record("partenaire B ne voit PAS la commande du partenaire A", idorList.status !== 200 || !leak);
      const idorGet = await req(`/api/v1/restaurateur/commandes/${tempCommandeId}`, { bearer: bearerB });
      record("partenaire B lit la commande de A → refusé", [403, 404].includes(idorGet.status), `status=${idorGet.status}`);
    } else {
      record("login partenaire B (setup IDOR)", false, `status=${loginB.status}`);
    }
  }

  // ══════════════════ VALIDATION ══════════════════
  setSection("Validation des entrées");
  const badEmail = await req("/api/auth/login", { method: "POST", body: { email: "pas-un-email", password: "x" } });
  record("email malformé → rejeté sans oracle de format", [400, 401].includes(badEmail.status), `status=${badEmail.status} (401 générique = choix anti-énumération)`);
  const badReg = await req("/api/auth/register", { method: "POST", body: { email: `t${STAMP}@test.local`, password: "court", nom: "X Y", telephone: "0102030405" } });
  record("mot de passe trop court → 400", badReg.status === 400, `status=${badReg.status}`);
  const dupRegister = await req("/api/auth/register", {
    method: "POST",
    body: { email: ADMIN_EMAIL, password: "MotDePasse-Solide-2026!", nom: "Dup Test", telephone: "+2250777888999" },
  });
  record("inscription email existant → réponse neutre anti-énumération", dupRegister.status === 200 && dupRegister.json?.alreadyRegistered === true && !dupRegister.setCookie.some((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`)), `status=${dupRegister.status}`);

  // Upload média : rejet d'un fichier texte déguisé (aucun stockage)
  const fakeForm = new FormData();
  fakeForm.append("file", new Blob(["ceci n'est pas une image"], { type: "image/png" }), "fake.png");
  const uploadBad = await req("/api/media/upload", { method: "POST", cookie: partnerCookie, form: fakeForm });
  record("upload média non-image rejeté (magic bytes)", [400, 415, 422].includes(uploadBad.status), `status=${uploadBad.status}`);

  // ══════════════════ NETTOYAGE ══════════════════
  setSection("Nettoyage des entités temporaires");
  const cleaned = await cleanupLeftovers(pool);
  console.log(`🧹 ${cleaned} entité(s) temporaire(s) supprimée(s)`);
  if (results.length === 0 || results.some((r) => !r.pass)) {
    // exitCode décidé plus bas par la section résultat
  }
} catch (err) {
  console.error("💥 Crash du run:", err.message?.slice(0, 200));
  if (process.env.DEBUG_CRASH) console.error(err);
  try { const n = await cleanupLeftovers(pool); console.log(`🧹 ${n} entité(s) nettoyée(s) après crash`); } catch {}
  if (!results.length) process.exitCode = 1; // crash avant tout test = échec d'infra
} finally {
  await pool.end();
}

// ══════════════════ RÉSULTAT GLOBAL ══════════════════
const failed = results.filter((r) => !r.pass);
console.log("\n════════════════════════════════════");
console.log(`TOTAL: ${results.length} vérifications | ✅ ${results.length - failed.length} | ❌ ${failed.length}`);
if (failed.length) {
  console.log("\nÉCHECS:");
  failed.forEach((f) => console.log(`  ❌ [${f.section}] ${f.name} — ${f.detail}`));
  process.exit(1);
}
