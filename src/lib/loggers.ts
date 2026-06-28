import { createLogger } from "@/lib/logger";

// Un logger par domaine métier
export const authLogger       = createLogger("auth");
export const commandeLogger   = createLogger("commande");
export const menuLogger       = createLogger("menu");
export const restaurantLogger = createLogger("restaurant");
export const cacheLogger      = createLogger("cache");
export const apiLogger        = createLogger("api");