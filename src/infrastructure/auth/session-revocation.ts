import "server-only";

export {
  blacklistToken,
  consumeTokenOnce,
  isOwnerSessionRevoked,
  isSessionRevoked,
  isTokenBlacklisted,
  revokeOwnerSessions,
  revokeSession,
} from "@/lib/api/token-blacklist";
