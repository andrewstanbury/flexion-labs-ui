import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the cache layer (no expo-file-system) so we can drive resolution paths.
jest.mock('../mediaCache', () => ({
  localPath: jest.fn((id: string, file: string) => `file:///cache/${id}.${file}`),
  isFileCached: jest.fn(),
  downloadToCache: jest.fn(() => Promise.resolve(null)),
}));

import { isFileCached } from '../mediaCache';
import { configureMediaApi } from '../mediaApi';
import { useMediaUri } from '../useMediaUri';

const cachedMock = isFileCached as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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
});
