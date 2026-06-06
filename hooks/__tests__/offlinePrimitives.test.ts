import { mediaFilesFor } from '../mediaFiles';
import { canPrefetch } from '../prefetchPolicy';
import { useDownloadProgress } from '../useDownloadProgress';

describe('mediaFilesFor', () => {
  it('always includes the thumbnail', () => {
    expect(mediaFilesFor({ has_video: false, has_preview: false })).toEqual(['thumbnail']);
  });
  it('adds preview and video when present', () => {
    expect(mediaFilesFor({ has_video: true, has_preview: true })).toEqual(['thumbnail', 'preview', 'video']);
  });
  it('adds only what exists', () => {
    expect(mediaFilesFor({ has_video: true, has_preview: false })).toEqual(['thumbnail', 'video']);
  });
});

describe('canPrefetch', () => {
  it('blocks when disconnected', () => {
    expect(canPrefetch({ connected: false, isWifi: true, allowCellular: true })).toBe(false);
  });
  it('allows on wifi', () => {
    expect(canPrefetch({ connected: true, isWifi: true, allowCellular: false })).toBe(true);
  });
  it('blocks on cellular unless allowed', () => {
    expect(canPrefetch({ connected: true, isWifi: false, allowCellular: false })).toBe(false);
    expect(canPrefetch({ connected: true, isWifi: false, allowCellular: true })).toBe(true);
  });
});

describe('useDownloadProgress', () => {
  beforeEach(() => useDownloadProgress.setState({ inflight: {}, version: 0 }));

  it('flags inflight on start and clears + bumps version on finish', () => {
    useDownloadProgress.getState().start('ex1');
    expect(useDownloadProgress.getState().inflight.ex1).toBe(true);
    useDownloadProgress.getState().finish('ex1');
    expect(useDownloadProgress.getState().inflight.ex1).toBeUndefined();
    expect(useDownloadProgress.getState().version).toBe(1);
  });

  it('bump() advances version without touching inflight', () => {
    useDownloadProgress.getState().bump();
    expect(useDownloadProgress.getState().version).toBe(1);
    expect(useDownloadProgress.getState().inflight).toEqual({});
  });
});
