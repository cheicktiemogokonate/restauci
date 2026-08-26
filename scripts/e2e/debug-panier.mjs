import { chromium } from "@playwright/test";
const BASE = "http://127.0.0.1:3464";
const browser = await chromium.launch();
const ctx = await browser.newContext({
  baseURL: BASE,
  geolocation: { latitude: 5.36, longitude: -4.01 },
  permissions: ["geolocation"],
});
const page = await ctx.newPage();
page.on("console", (m) => { if (/error/i.test(m.type()) && !/_vercel|Failed to load/.test(m.text())) console.log("console:", m.text().slice(0,150)); });

// login client via API pour poser les tokens comme l'app mobile
const reg = await fetch(`${BASE}/api/v1/client/auth/register`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ nom: "dbg panier", telephone: "+2250877766555", password: "Debug-2026-ok", tokenTransport: "json" }),
});
const j = await reg.json();
const access = j?.data?.tokens?.accessToken;
// l'app web stocke le token où ? inspecter localStorage après login UI serait mieux ;
// ici on simule : certaines clés attendues
await page.goto("/client/login", { waitUntil: "networkidle" });
await page.evaluate((t) => {
  localStorage.setItem("toutci_client_access", t);
  localStorage.setItem("client_access_token", t);
}, access);

await page.goto("/client/restaurant/bella-italia-abidjan", { waitUntil: "networkidle" });
await page.waitForTimeout(4000);
const btn = page.locator('[aria-label*="au panier"]').first();
console.log("bouton visible:", await btn.isVisible().catch(()=>false), "disabled:", await btn.isDisabled().catch(()=>true));
if (await btn.isVisible().catch(()=>false)) {
  await btn.click().catch(e => console.log("click err:", e.message.slice(0,80)));
  await page.waitForTimeout(1200);
  const ls = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))));
  console.log("localStorage keys:", Object.keys(JSON.parse(ls)).join(", "));
  console.log("localStorage:", ls.slice(0, 400));
}
await browser.close();
