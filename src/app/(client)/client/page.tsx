// Wrapper serveur : rendu dynamique exigé par la CSP à nonce posée par le
// proxy (le prerender statique ne peut pas embarquer de nonce par requête).
// L'implémentation interactive reste un Client Component dans ./client.tsx.
import ClientPage from "./client";

export const dynamic = "force-dynamic";

export default function Page() {
  return <ClientPage />;
}
