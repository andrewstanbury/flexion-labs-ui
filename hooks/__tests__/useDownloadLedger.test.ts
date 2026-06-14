import { useDownloadLedger } from '../useDownloadLedger';

const reset = () => useDownloadLedger.setState({ entries: {} });

describe('useDownloadLedger', () => {
  beforeEach(reset);

  it('records and merges entries (richer metadata wins, updatedAt bumps)', () => {
    const { record } = useDownloadLedger.getState();
    record([{ exerciseId: 'a', has_video: true }], 100);
    record([{ exerciseId: 'a', name_en: 'Squat' }], 200);
    const e = useDownloadLedger.getState().entries.a;
    expect(e).toMatchObject({ exerciseId: 'a', has_video: true, name_en: 'Squat', updatedAt: 200 });
  });

  it('ignores entries without an exerciseId', () => {
    useDownloadLedger.getState().record([{ exerciseId: '' }], 1);
    expect(Object.keys(useDownloadLedger.getState().entries)).toHaveLength(0);
  });

  it('removes specific exercises', () => {
    const { record, remove } = useDownloadLedger.getState();
    record([{ exerciseId: 'a' }, { exerciseId: 'b' }], 1);
    remove(['a']);
    expect(Object.keys(useDownloadLedger.getState().entries)).toEqual(['b']);
  });

  it('reconcile drops entries with no file and adds minimal entries for new cached ids', () => {
    const { record, reconcile } = useDownloadLedger.getState();
    record([{ exerciseId: 'a', name_en: 'Keep' }, { exerciseId: 'gone' }], 1);
    reconcile(['a', 'fresh'], 500);
    const { entries } = useDownloadLedger.getState();
    expect(Object.keys(entries).sort()).toEqual(['a', 'fresh']);
    expect(entries.a.name_en).toBe('Keep'); // preserved
    expect(entries.fresh).toEqual({ exerciseId: 'fresh', updatedAt: 500 }); // minimal
    expect(entries.gone).toBeUndefined(); // dropped — file no longer on disk
  });

  it('reconcile is a no-op when the cached set already matches', () => {
    const { record, reconcile } = useDownloadLedger.getState();
    record([{ exerciseId: 'a', name_en: 'X' }], 1);
    const before = useDownloadLedger.getState().entries;
    reconcile(['a'], 999);
    expect(useDownloadLedger.getState().entries).toBe(before); // same reference
  });

  it('clear empties the ledger', () => {
    useDownloadLedger.getState().record([{ exerciseId: 'a' }], 1);
    useDownloadLedger.getState().clear();
    expect(Object.keys(useDownloadLedger.getState().entries)).toHaveLength(0);
  });
});
