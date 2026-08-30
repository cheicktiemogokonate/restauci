import { createServer } from "node:http";

const port = 4100;
const transactions = new Map();

function json(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

function html(response, body) {
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(`<!doctype html><html lang="fr"><body>${body}</body></html>`);
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);

  if (url.pathname === "/health") {
    json(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && url.pathname === "/transaction/initialize") {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    transactions.set(payload.reference, {
      amount: payload.amount,
      currency: payload.currency,
      callbackUrl: payload.callback_url,
      channel: payload.channels?.[0] ?? "card",
    });
    json(response, 200, {
      status: true,
      message: "Authorization URL created",
      data: {
        authorization_url: `http://127.0.0.1:${port}/checkout?reference=${encodeURIComponent(payload.reference)}`,
        access_code: `access-${payload.reference}`,
        reference: payload.reference,
      },
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/checkout") {
    const reference = url.searchParams.get("reference") ?? "";
    if (!transactions.has(reference)) {
      html(response, "<h1>Paiement introuvable</h1>");
      return;
    }
    html(
      response,
      `<main><h1>Paystack E2E</h1><p>Transaction de test, aucun débit réel.</p><a href="/complete?reference=${encodeURIComponent(reference)}">Confirmer le paiement de test</a></main>`,
    );
    return;
  }

  if (request.method === "GET" && url.pathname === "/complete") {
    const reference = url.searchParams.get("reference") ?? "";
    const transaction = transactions.get(reference);
    if (!transaction) {
      response.writeHead(404).end();
      return;
    }
    const callback = new URL(transaction.callbackUrl);
    callback.searchParams.set("reference", reference);
    response.writeHead(302, { Location: callback.toString() });
    response.end();
    return;
  }

  if (
    request.method === "GET" &&
    url.pathname.startsWith("/transaction/verify/")
  ) {
    const reference = decodeURIComponent(
      url.pathname.slice("/transaction/verify/".length),
    );
    const transaction = transactions.get(reference);
    if (!transaction) {
      json(response, 404, { status: false, message: "Not found" });
      return;
    }
    json(response, 200, {
      status: true,
      message: "Verification successful",
      data: {
        status: "success",
        reference,
        amount: transaction.amount,
        currency: transaction.currency,
        channel: transaction.channel,
        authorization: {
          bank: transaction.channel === "mobile_money" ? "Wave" : null,
        },
      },
    });
    return;
  }

  json(response, 404, { status: false, message: "Unknown E2E route" });
}).listen(port, "127.0.0.1", () => {
  process.stdout.write(`Paystack E2E mock listening on ${port}\n`);
});
