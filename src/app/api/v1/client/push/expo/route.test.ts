import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST, DELETE } from "./route";

vi.mock("@/app/api/_shared/auth-client", () => ({
  getClientSession: vi.fn().mockImplementation((req: NextRequest) => {
    const auth = req.headers.get("authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return {
        session: null,
        error: new Response(
          JSON.stringify({ success: false, error: "Token Bearer manquant" }),
          { status: 401, headers: { "content-type": "application/json" } },
        ),
      };
    }
    return {
      session: { clientId: "client-uuid-123", type: "client" },
      error: null,
    };
  }),
}));

vi.mock("@/modules/notifications/server", () => ({
  registerClientExpoSubscription: vi.fn().mockResolvedValue({ registered: true }),
  unregisterClientExpoSubscription: vi.fn().mockResolvedValue({ unregistered: true }),
}));

describe("POST & DELETE /api/v1/client/push/expo", () => {
  const validExpoToken = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]";

  it("rejette les requêtes sans authentification client (401)", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/client/push/expo", {
      method: "POST",
      body: JSON.stringify({ expoToken: validExpoToken }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("enregistre avec succès le token Expo pour un compte client (200)", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/client/push/expo", {
      method: "POST",
      body: JSON.stringify({ expoToken: validExpoToken }),
      headers: {
        "content-type": "application/json",
        authorization: "Bearer valid-client-token",
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ registered: true });
  });

  it("rejette un token Expo invalide avec une erreur de validation 422", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/client/push/expo", {
      method: "POST",
      body: JSON.stringify({ expoToken: "not-an-expo-token" }),
      headers: {
        "content-type": "application/json",
        authorization: "Bearer valid-client-token",
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(422);
  });

  it("supprime le token Expo lors d'un appel DELETE (200)", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/client/push/expo", {
      method: "DELETE",
      body: JSON.stringify({ expoToken: validExpoToken }),
      headers: {
        "content-type": "application/json",
        authorization: "Bearer valid-client-token",
      },
    });

    const response = await DELETE(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ unregistered: true });
  });
});
