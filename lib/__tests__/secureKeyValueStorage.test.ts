import {
  createSecureKeyValueStorage,
  toSafeKey,
  type SecureBackend,
} from '../secureKeyValueStorage';

// In-memory stand-in for a native secure store (e.g. expo-secure-store), so the
// chunking / index / key-safety logic is verified without a native module.
function fakeBackend(): SecureBackend & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    async getItemAsync(k) {
      return store.has(k) ? store.get(k)! : null;
    },
    async setItemAsync(k, v) {
      store.set(k, v);
    },
    async deleteItemAsync(k) {
      store.delete(k);
    },
  };
}

const AMPLIFY_KEY = 'CognitoIdentityServiceProvider.abc123.user@example.com.accessToken';

describe('createSecureKeyValueStorage', () => {
  it('round-trips a small value', async () => {
    const be = fakeBackend();
    const s = createSecureKeyValueStorage(be);
    await s.setItem(AMPLIFY_KEY, 'token-value');
    expect(await s.getItem(AMPLIFY_KEY)).toBe('token-value');
  });

  it('returns null for a missing key', async () => {
    const s = createSecureKeyValueStorage(fakeBackend());
    expect(await s.getItem('nope')).toBeNull();
  });

  it('distinguishes an empty-string value from missing', async () => {
    const s = createSecureKeyValueStorage(fakeBackend());
    await s.setItem('k', '');
    expect(await s.getItem('k')).toBe('');
  });

  it('chunks and reassembles a value larger than the secure-store limit', async () => {
    const be = fakeBackend();
    const s = createSecureKeyValueStorage(be);
    const big = 'x'.repeat(5000); // > 2 chunks at 1800 chars
    await s.setItem(AMPLIFY_KEY, big);
    expect(await s.getItem(AMPLIFY_KEY)).toBe(big);
    // Meta records the chunk count; no single stored value exceeds the cap.
    expect(await be.getItemAsync(toSafeKey(AMPLIFY_KEY))).toBe('3');
    for (const v of be.store.values()) expect(v.length).toBeLessThanOrEqual(1800);
  });

  it('clears stale chunks when overwriting a long value with a shorter one', async () => {
    const be = fakeBackend();
    const s = createSecureKeyValueStorage(be);
    await s.setItem(AMPLIFY_KEY, 'y'.repeat(5000)); // 3 chunks
    await s.setItem(AMPLIFY_KEY, 'short'); // 1 chunk
    expect(await s.getItem(AMPLIFY_KEY)).toBe('short');
    expect(await be.getItemAsync(toSafeKey(`${AMPLIFY_KEY}::flxchunk::1`))).toBeNull();
    expect(await be.getItemAsync(toSafeKey(`${AMPLIFY_KEY}::flxchunk::2`))).toBeNull();
  });

  it('removeItem deletes the value, its chunks, and the index entry', async () => {
    const be = fakeBackend();
    const s = createSecureKeyValueStorage(be);
    await s.setItem(AMPLIFY_KEY, 'z'.repeat(4000));
    await s.removeItem(AMPLIFY_KEY);
    expect(await s.getItem(AMPLIFY_KEY)).toBeNull();
    const leftover = [...be.store.keys()].filter(
      (k) => k !== toSafeKey('__flx_secure_token_keys__'),
    );
    expect(leftover).toEqual([]);
  });

  it('clear() wipes every tracked key (sign-out)', async () => {
    const be = fakeBackend();
    const s = createSecureKeyValueStorage(be);
    await s.setItem('a', 'one');
    await s.setItem('b', 'w'.repeat(3000));
    await s.setItem('c', 'three');
    await s.clear();
    expect(be.store.size).toBe(0);
    expect(await s.getItem('a')).toBeNull();
    expect(await s.getItem('b')).toBeNull();
  });

  it('only ever writes secure-store-safe (hex) keys', async () => {
    const be = fakeBackend();
    const s = createSecureKeyValueStorage(be);
    await s.setItem(AMPLIFY_KEY, 'v'.repeat(2500));
    for (const k of be.store.keys()) {
      expect(k).toMatch(/^[0-9a-f]+$/);
    }
  });
});
