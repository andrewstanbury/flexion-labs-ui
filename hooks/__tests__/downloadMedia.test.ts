// Mock the file-IO cache layer so this stays a fast node-lane test (no expo-file-system).
jest.mock('../mediaCache', () => ({
  isFileCached: jest.fn(() => false),
  downloadToCache: jest.fn(() => Promise.resolve('/local/path')),
}));

import { configureMediaApi, getFetchSignedUrl } from '../mediaApi';
import { runMediaDownloads } from '../downloadMedia';
import { isFileCached, downloadToCache } from '../mediaCache';

describe('configureMediaApi / getFetchSignedUrl', () => {
  it('throws if the fetcher was never configured', () => {
    // @ts-expect-error reset internal state for the throw case
    configureMediaApi({ fetchSignedUrl: undefined });
    expect(() => getFetchSignedUrl()).toThrow(/configureMediaApi/);
  });
});

describe('runMediaDownloads', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches a signed URL and caches each media file the exercise has', async () => {
    const fetchSignedUrl = jest.fn(() => Promise.resolve({ signedUrl: 'https://signed' }));
    configureMediaApi({ fetchSignedUrl });
    await runMediaDownloads([{ exerciseId: 'ex1', has_video: true, has_preview: false }]);
    // thumbnail (always) + video (has_video) — not preview
    expect(fetchSignedUrl).toHaveBeenCalledWith('ex1', 'thumbnail');
    expect(fetchSignedUrl).toHaveBeenCalledWith('ex1', 'video');
    expect(fetchSignedUrl).not.toHaveBeenCalledWith('ex1', 'preview');
    expect(downloadToCache).toHaveBeenCalledTimes(2);
  });

  it('fetches thumbnail + every panel for a panel-only exercise', async () => {
    const fetchSignedUrl = jest.fn(() => Promise.resolve({ signedUrl: 'https://signed' }));
    configureMediaApi({ fetchSignedUrl });
    await runMediaDownloads([
      { exerciseId: 'ex1', has_video: false, has_preview: false, panel_count: 3 },
    ]);
    expect(fetchSignedUrl).toHaveBeenCalledWith('ex1', 'thumbnail');
    expect(fetchSignedUrl).toHaveBeenCalledWith('ex1', 'panel1');
    expect(fetchSignedUrl).toHaveBeenCalledWith('ex1', 'panel2');
    expect(fetchSignedUrl).toHaveBeenCalledWith('ex1', 'panel3');
    expect(fetchSignedUrl).not.toHaveBeenCalledWith('ex1', 'panel4');
    expect(downloadToCache).toHaveBeenCalledTimes(4);
  });

  it('skips files already cached', async () => {
    (isFileCached as jest.Mock).mockReturnValue(true);
    const fetchSignedUrl = jest.fn(() => Promise.resolve({ signedUrl: 'https://signed' }));
    configureMediaApi({ fetchSignedUrl });
    await runMediaDownloads([{ exerciseId: 'ex1', has_video: true, has_preview: true }]);
    expect(fetchSignedUrl).not.toHaveBeenCalled();
    expect(downloadToCache).not.toHaveBeenCalled();
  });
});
