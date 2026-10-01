import 'server-only';

const NOVA_BASE_URL = 'https://www.aczen.in/nova-api/v1';

export type NovaResource =
  | 'invoices'
  | 'purchase-bills'
  | 'loan-schedules'
  | 'payroll-runs'
  | 'statutory-dues';

type NovaPage<T> = {
  data: T[];
  pagination: { limit: number; offset: number; total: number; has_more: boolean };
};

export class NovaApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, public readonly requestId: string | null) {
    super(`Nova API error: ${code}`);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function novaGet<T>(resource: NovaResource, offset: number, attempt = 0): Promise<T> {
  const key = process.env.NOVA_API_KEY?.trim();
  if (!key) throw new NovaApiError(503, 'missing_key', null);

  const url = new URL(`${NOVA_BASE_URL}/${resource}`);
  url.searchParams.set('limit', '200');
  url.searchParams.set('offset', String(offset));
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });

  if (response.status === 429 && attempt < 2) {
    const retryAfter = Number(response.headers.get('Retry-After') ?? 60);
    await sleep(Math.max(1, retryAfter) * 1000);
    return novaGet<T>(resource, offset, attempt + 1);
  }
  if (response.status === 502 && attempt < 2) {
    await sleep(1000 * 2 ** attempt);
    return novaGet<T>(resource, offset, attempt + 1);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const code = typeof body?.error?.code === 'string' ? body.error.code : 'upstream_error';
    const requestId = response.headers.get('X-Request-Id');
    throw new NovaApiError(response.status, code, requestId);
  }
  return response.json() as Promise<T>;
}

/** Fetch each page sequentially to respect Nova's per-key rate limit. */
export async function novaListAll<T>(resource: NovaResource): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; ) {
    const page = await novaGet<NovaPage<T>>(resource, offset);
    if (!Array.isArray(page.data) || !page.pagination || !Number.isInteger(page.pagination.limit)) {
      throw new NovaApiError(502, 'invalid_response', null);
    }
    rows.push(...page.data);
    if (!page.pagination.has_more) return rows;
    if (page.pagination.limit <= 0 || page.data.length === 0) {
      throw new NovaApiError(502, 'invalid_response', null);
    }
    offset += page.pagination.limit;
  }
}

export type NovaConnectionStatus =
  | { configured: false; connected: false; reason: 'missing_key' }
  | { configured: true; connected: true }
  | { configured: true; connected: false; reason: 'unauthorized' | 'unavailable' };

/** Check the team key without returning it or Nova's account data to the browser. */
export async function checkNovaConnection(): Promise<NovaConnectionStatus> {
  const key = process.env.NOVA_API_KEY?.trim();
  if (!key) return { configured: false, connected: false, reason: 'missing_key' };

  try {
    const response = await fetch(`${NOVA_BASE_URL}/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) return { configured: true, connected: true };
    if (response.status === 401 || response.status === 403) {
      return { configured: true, connected: false, reason: 'unauthorized' };
    }
    return { configured: true, connected: false, reason: 'unavailable' };
  } catch {
    return { configured: true, connected: false, reason: 'unavailable' };
  }
}
