const TRANSIENT_DB_ERROR_PATTERN =
  /fetch failed|error connecting to database|connection terminated|client network socket|econnreset|econnrefused|enotfound|etimedout|eai_again|socket hang up|und_err_connect_timeout/i;

function isTransientDatabaseError(error: unknown): boolean {
  let current: unknown = error;

  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (current instanceof Error) {
      if (TRANSIENT_DB_ERROR_PATTERN.test(current.message)) return true;
      current = current.cause;
      continue;
    }
    break;
  }

  return false;
}

/**
 * Rejoue une lecture jusqu'à deux fois lors d'une coupure réseau transitoire.
 * Ne jamais utiliser ce helper pour une écriture non idempotente.
 */
export async function withDatabaseReadRetry<T>(
  operation: () => PromiseLike<T>,
): Promise<T> {
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientDatabaseError(error) || attempt === maxAttempts) {
        throw error;
      }

      const delayMs = 250 * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
