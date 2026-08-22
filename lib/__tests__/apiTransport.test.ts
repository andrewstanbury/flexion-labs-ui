import {
  APP_CONTEXT_HEADER,
  REQUEST_TIMEOUT_MS,
  ApiError,
  apiHeaders,
  createApiTransport,
  errorDetailFrom,
  withTimeout,
} from '../apiTransport';

describe('apiHeaders', () => {
  it('always carries auth and content type', () => {
    const h = apiHeaders('tok');
    expect(h.Authorization).toBe('Bearer tok');
    expect(h['Content-Type']).toBe('application/json');
  });

  it('sends the app context only when one is configured', () => {
    expect(apiHeaders('tok', 'client')[APP_CONTEXT_HEADER]).toBe('client');
    expect(apiHeaders('tok')[APP_CONTEXT_HEADER]).toBeUndefined();
  });

  it('lets a caller add headers without dropping the app context', () => {
    // The declaration is one line in a spread; re-ordering it has no visible
    // symptom, so the ordering is pinned here.
    const h = apiHeaders('tok', 'client', { 'X-Custom': '1' });
    expect(h['X-Custom']).toBe('1');
    expect(h[APP_CONTEXT_HEADER]).toBe('client');
  });
});

describe('errorDetailFrom', () => {
  it('surfaces a structured message', () => {
    expect(errorDetailFrom('{"message":"Patient not linked"}')).toBe('Patient not linked');
    expect(errorDetailFrom('{"error":"nope"}')).toBe('nope');
  });

  it('drops a non-JSON body rather than surfacing raw text', () => {
    // A raw body can echo back PII or a stack trace into a user-facing string.
    expect(errorDetailFrom('<html>500 Internal Server Error</html>')).toBe('');
  });

  it('drops an over-long field', () => {
    expect(errorDetailFrom(JSON.stringify({ message: 'x'.repeat(201) }))).toBe('');
  });

  it('ignores a non-string field', () => {
    expect(errorDetailFrom('{"message":{"nested":true}}')).toBe('');
  });
});

describe('withTimeout', () => {
  it('passes a value through', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 50, 'late')).resolves.toBe('ok');
  });

  it('rejects with status 0, NOT a 4xx', async () => {
    // isPermanentFailure() treats every 4xx as poison and DROPS the queued
    // write, so a 4xx here would turn a hang into silent data loss.
    const hang = new Promise<string>(() => {});
    await expect(withTimeout(hang, 10, 'late')).rejects.toMatchObject({ status: 0, message: 'late' });
  });

  it('clears its timer when the work settles first', async () => {
    // A leaked timer keeps the JS runtime awake and, under jest, fails the run.
    jest.useFakeTimers();
    const p = withTimeout(Promise.resolve('ok'), 1000, 'late');
    await expect(p).resolves.toBe('ok');
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });
});

describe('createApiTransport', () => {
  const okResponse = { ok: true, json: async () => ({ hello: 'world' }) };

  it('rejects an empty baseUrl rather than silently hitting a relative path', () => {
    expect(() => createApiTransport({ baseUrl: '   ', fetchIdToken: async () => 't' })).toThrow(/baseUrl/);
  });

  it('strips a trailing slash so paths do not double up', async () => {
    const seen: string[] = [];
    global.fetch = jest.fn(async (url: string) => {
      seen.push(url);
      return okResponse;
    }) as never;

    const t = createApiTransport({ baseUrl: 'https://api.test/', fetchIdToken: async () => 'tok' });
    await t.request('/profile');

    expect(seen[0]).toBe('https://api.test/profile');
  });

  it('sends the token and the app context', async () => {
    let headers: Record<string, string> = {};
    global.fetch = jest.fn(async (_u: string, init: RequestInit) => {
      headers = init.headers as Record<string, string>;
      return okResponse;
    }) as never;

    const t = createApiTransport({
      baseUrl: 'https://api.test',
      appContext: 'client',
      fetchIdToken: async () => 'tok',
    });
    await t.request('/profile');

    expect(headers.Authorization).toBe('Bearer tok');
    expect(headers[APP_CONTEXT_HEADER]).toBe('client');
  });

  it('throws an ApiError carrying the status', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 404,
      text: async () => '{"message":"not found"}',
    })) as never;

    const t = createApiTransport({ baseUrl: 'https://api.test', fetchIdToken: async () => 'tok' });
    await expect(t.request('/nope')).rejects.toMatchObject({ status: 404, message: 'not found' });
    await expect(t.request('/nope')).rejects.toBeInstanceOf(ApiError);
  });

  it('falls back to a generic message when the body carries none', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 500, text: async () => 'boom' })) as never;

    const t = createApiTransport({ baseUrl: 'https://api.test', fetchIdToken: async () => 'tok' });
    await expect(t.request('/x')).rejects.toMatchObject({ message: 'Request failed (500).' });
  });

  it('bounds a hanging token fetch instead of hanging forever', async () => {
    // The refresh underneath takes no AbortSignal, so a stall there never
    // settles and the caller's mutation stays pending with no request in flight
    // to fail — the worst failure shape available. Driven with fake timers
    // because the real bound is REQUEST_TIMEOUT_MS, three times jest's default
    // test timeout; shortening the bound to suit the test would test something
    // other than the shipped behaviour.
    jest.useFakeTimers();
    global.fetch = jest.fn(async () => okResponse) as never;

    const t = createApiTransport({
      baseUrl: 'https://api.test',
      fetchIdToken: () => new Promise<string>(() => {}),
    });
    const pending = t.request('/profile');
    const assertion = expect(pending).rejects.toMatchObject({ status: 0 });
    await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await assertion;
    jest.useRealTimers();
  });
});
