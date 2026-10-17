import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the cache layer (no expo-file-system) so we can drive resolution paths.
jest.mock('../mediaCache', () => ({
  localPath: jest.fn((id: string, file: string) => `file:///cache/${id}.${file}`),
  isFileCached: jest.fn(),
  isCachedFrom: jest.fn(() => false),
  downloadToCache: jest.fn(() => Promise.resolve(null)),
}));

import { downloadToCache, isCachedFrom, isFileCached } from '../mediaCache';
import { configureMediaApi } from '../mediaApi';
import { useMediaUri } from '../useMediaUri';

const cachedMock = isFileCached as jest.Mock;

// Every client is cleared after each test: a cache hit now asks the server
// too, and a pending query's gc timer would otherwise keep Jest from exiting.
const clients: QueryClient[] = [];
afterEach(() => {
  for (const qc of clients.splice(0)) qc.clear();
});

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(qc);
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useMediaUri', () => {
  beforeEach(() => {
    cachedMock.mockReset();
    // Injected fetcher that never resolves, so the signed-URL query stays pending
    // and these cache/reset assertions are deterministic.
    configureMediaApi({ fetchSignedUrl: () => new Promise(() => {}) });
  });

  it('returns the local path immediately when the file is cached', () => {
    cachedMock.mockReturnValue(true);
    const { result } = renderHook(() => useMediaUri('ex-1', 'video', null), { wrapper });
    expect(result.current).toBe('file:///cache/ex-1.video');
  });

  it('clears the URI to null when the exercise changes (no stale media leak)', () => {
    cachedMock.mockImplementation((id: string) => id === 'ex-1');
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useMediaUri(id, 'video', null),
      { initialProps: { id: 'ex-1' }, wrapper },
    );
    expect(result.current).toBe('file:///cache/ex-1.video');

    rerender({ id: 'ex-2' });
    expect(result.current).toBeNull();
  });

  it('returns null while an uncached exercise is still resolving', () => {
    cachedMock.mockReturnValue(false);
    const { result } = renderHook(() => useMediaUri('ex-3', 'video', null), { wrapper });
    expect(result.current).toBeNull();
  });

  describe('a cache hit still checks what the server serves now', () => {
    const SIGNED = 'https://cdn/content-review/wi/male/panel_1.png?Signature=x';

    beforeEach(() => {
      configureMediaApi({ fetchSignedUrl: () => Promise.resolve({ signedUrl: SIGNED, expiresAt: '' }) });
      (downloadToCache as jest.Mock).mockReset();
      (downloadToCache as jest.Mock).mockResolvedValue('file:///cache/ex-1.thumbnail');
    });

    it('replaces a cached file the server no longer serves (an approved exercise’s old thumbnail)', async () => {
      cachedMock.mockReturnValue(true);
      (isCachedFrom as jest.Mock).mockReturnValue(false);
      const { result } = renderHook(() => useMediaUri('ex-1', 'thumbnail', null), { wrapper });
      // The cached file shows at once, as before.
      expect(result.current).toBe('file:///cache/ex-1.thumbnail');
      await waitFor(() => expect(downloadToCache).toHaveBeenCalledWith('ex-1', 'thumbnail', SIGNED));
      // Then the replacement, under a new URI so images re-read it.
      await waitFor(() => expect(result.current).toMatch(/^file:\/\/\/cache\/ex-1\.thumbnail\?v=\d+$/));
    });

    it('leaves a current cached file alone', async () => {
      cachedMock.mockReturnValue(true);
      (isCachedFrom as jest.Mock).mockReturnValue(true);
      const { result } = renderHook(() => useMediaUri('ex-1', 'thumbnail', null), { wrapper });
      await waitFor(() => expect(isCachedFrom).toHaveBeenCalledWith('ex-1', 'thumbnail', SIGNED));
      expect(downloadToCache).not.toHaveBeenCalled();
      expect(result.current).toBe('file:///cache/ex-1.thumbnail');
    });
  });
});
