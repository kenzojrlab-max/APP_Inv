export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      // Don't retry permission or auth errors
      const code = (error as { code?: string }).code;
      if (code && ['permission-denied', 'auth/invalid-credential', 'auth/user-not-found',
        'auth/wrong-password', 'not-found', 'already-exists'].includes(code)) {
        throw error;
      }
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}
