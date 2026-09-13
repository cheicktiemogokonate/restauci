const CLIENT_ROUTE_PREFIXES = ["/client", "/panier", "/commandes", "/profil"];

export function getSafeClientRedirect(value: string | null | undefined, fallback = "/client") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;

  try {
    const url = new URL(value, "https://client.local");
    if (url.origin !== "https://client.local") return fallback;
    const isClientRoute = CLIENT_ROUTE_PREFIXES.some(
      (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
    );
    return isClientRoute ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}
