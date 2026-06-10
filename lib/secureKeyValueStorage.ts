// Shared factory for a key/value store that encrypts values at rest via a
// platform secure store (e.g. expo-secure-store: iOS Keychain / Android
// Keystore). Built to satisfy AWS Amplify v6's KeyValueStorageInterface so the
// apps can persist Cognito tokens encrypted instead of in plaintext
// AsyncStorage — but it's framework-agnostic and has no Amplify or
// expo-secure-store dependency: the native backend is INJECTED by the consumer
// (same pattern as configureMediaApi). Each app provides a thin wrapper:
//
//   import { createSecureKeyValueStorage } from '@flexion-labs/ui';
//   import * as SecureStore from 'expo-secure-store';
//   export const secureTokenStorage = createSecureKeyValueStorage({
//     getItemAsync: SecureStore.getItemAsync,
//     setItemAsync: (k, v) => SecureStore.setItemAsync(k, v),
//     deleteItemAsync: SecureStore.deleteItemAsync,
//   });
//
// Handles two secure-store quirks:
//  1. ~2048-byte value cap on Android — a single Cognito JWT can exceed it, so
//     values are split into <1800-char chunks (token values are ASCII) under
//     `key::flxchunk::<i>`, with the chunk count stored under the (hashed) key.
//  2. No enumerate/clear API — so an index of written keys is kept under
//     INDEX_KEY to implement clear() (needed on sign-out).
//
// Secure-store keys must match [A-Za-z0-9._-], but Amplify keys contain '@', ':'
// etc. (email usernames), so every key is hex-encoded via toSafeKey().

// The native secure-store surface this factory needs (a subset of
// expo-secure-store). Injected so the logic is testable without a native module.
export interface SecureBackend {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

// Structurally compatible with Amplify's KeyValueStorageInterface. The app's
// wrapper annotates the result as KeyValueStorageInterface so tsc verifies the
// match without this package depending on aws-amplify.
export interface KeyValueStore {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Conservative margin under the secure store's ~2048-byte Android limit. Token
// values are ASCII (base64url + JSON), so 1 char ≈ 1 byte.
const MAX_CHUNK_CHARS = 1800;
const CHUNK_SEP = '::flxchunk::';
const INDEX_KEY = '__flx_secure_token_keys__';

// Hex-encode a key to the secure-store-safe charset ([0-9a-f] only).
// Deterministic and collision-free, so round-trips and clear() stay correct.
export function toSafeKey(key: string): string {
  const bytes = new TextEncoder().encode(key);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

function splitChunks(value: string): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += MAX_CHUNK_CHARS) {
    chunks.push(value.slice(i, i + MAX_CHUNK_CHARS));
  }
  // An empty string is one empty chunk, so getItem('') returns '' (not null),
  // preserving the value-present-but-empty case.
  return chunks.length ? chunks : [''];
}

export function createSecureKeyValueStorage(backend: SecureBackend): KeyValueStore {
  const readIndex = async (): Promise<string[]> => {
    const raw = await backend.getItemAsync(toSafeKey(INDEX_KEY));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  };

  const writeIndex = (keys: string[]) =>
    backend.setItemAsync(toSafeKey(INDEX_KEY), JSON.stringify(keys));

  const deleteChunks = async (key: string): Promise<void> => {
    const meta = await backend.getItemAsync(toSafeKey(key));
    if (meta != null) {
      const n = parseInt(meta, 10);
      if (Number.isFinite(n)) {
        for (let i = 0; i < n; i++) {
          await backend.deleteItemAsync(toSafeKey(`${key}${CHUNK_SEP}${i}`));
        }
      }
    }
    await backend.deleteItemAsync(toSafeKey(key));
  };

  const removeItem = async (key: string): Promise<void> => {
    await deleteChunks(key);
    const idx = await readIndex();
    const next = idx.filter((k) => k !== key);
    if (next.length !== idx.length) await writeIndex(next);
  };

  return {
    async setItem(key: string, value: string): Promise<void> {
      // Clear any prior (possibly longer) chunk set for this key first.
      await deleteChunks(key);
      const chunks = splitChunks(value);
      for (let i = 0; i < chunks.length; i++) {
        await backend.setItemAsync(toSafeKey(`${key}${CHUNK_SEP}${i}`), chunks[i]);
      }
      await backend.setItemAsync(toSafeKey(key), String(chunks.length));
      const idx = await readIndex();
      if (!idx.includes(key)) {
        idx.push(key);
        await writeIndex(idx);
      }
    },

    async getItem(key: string): Promise<string | null> {
      const meta = await backend.getItemAsync(toSafeKey(key));
      if (meta == null) return null;
      const n = parseInt(meta, 10);
      if (!Number.isFinite(n) || n < 0) return null;
      let out = '';
      for (let i = 0; i < n; i++) {
        const chunk = await backend.getItemAsync(toSafeKey(`${key}${CHUNK_SEP}${i}`));
        if (chunk == null) return null; // partial/corrupt write → treat as missing
        out += chunk;
      }
      return out;
    },

    removeItem,

    async clear(): Promise<void> {
      const idx = await readIndex();
      for (const key of idx) await deleteChunks(key);
      await backend.deleteItemAsync(toSafeKey(INDEX_KEY));
    },
  };
}
