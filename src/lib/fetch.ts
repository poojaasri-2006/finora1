/**
 * Reliable fetch helper with timeout, retry, and error handling.
 * 
 * Features:
 * - Timeout using AbortController
 * - Retry with exponential backoff for transient failures
 * - Clear handling for HTTP 4xx and 5xx errors
 * - Safe error messages for users
 * - Detailed server-side development logging
 * - No infinite retries
 */

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY = 1000; // 1 second

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export class FetchError extends Error {
  status: number;
  statusText: string;
  url: string;

  constructor(message: string, status: number, statusText: string, url: string) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
    this.statusText = statusText;
    this.url = url;
  }
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is a transient network error that should be retried.
 */
function isTransientError(error: unknown): boolean {
  if (error instanceof FetchError) {
    // Retry on 5xx server errors and certain 4xx errors
    return error.status >= 500 || error.status === 429;
  }
  // Retry on network errors (ECONNRESET, ETIMEDOUT, etc.)
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('econnreset') ||
      message.includes('etimedout') ||
      message.includes('econnrefused') ||
      message.includes('network') ||
      message.includes('socket')
    );
  }
  return false;
}

/**
 * Reliable fetch with timeout, retry, and error handling.
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
): Promise<Response> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    ...fetchOptions
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new FetchError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          response.statusText,
          url,
        );
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      // Don't retry on the last attempt
      if (attempt >= retries) {
        break;
      }

      // Don't retry on client errors (4xx) except 429
      if (error instanceof FetchError && error.status >= 400 && error.status < 500 && error.status !== 429) {
        break;
      }

      // Don't retry if aborted (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        break;
      }

      // Wait before retrying with exponential backoff
      const delay = retryDelay * Math.pow(2, attempt);
      console.log(`[fetchWithRetry] Attempt ${attempt + 1} failed for ${url}, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  // All retries exhausted
  if (lastError instanceof FetchError) {
    throw lastError;
  }

  if (lastError instanceof Error) {
    if (lastError.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw lastError;
  }

  throw new Error('Request failed');
}

/**
 * Fetch JSON with retry and error handling.
 */
export async function fetchJson<T = unknown>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const response = await fetchWithRetry(url, options);
  return response.json();
}
