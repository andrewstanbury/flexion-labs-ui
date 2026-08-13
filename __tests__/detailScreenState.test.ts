import { detailScreenState } from '../lib/detailScreenState';

const base = { isLoading: false, isError: false, hasData: true, hasForm: true };

describe('detailScreenState', () => {
  it('shows the spinner only while the query is actually in flight', () => {
    expect(detailScreenState({ ...base, isLoading: true })).toBe('loading');
  });

  // THE regression. The patient detail screen checked `isLoading || !form`
  // before `!data`, so a failed first load — network, 404, permissions — left
  // isLoading false, data undefined and form null, and rendered a spinner
  // forever. The not-found branch below it could never be reached.
  it('reports unavailable when a failed query leaves no data and no form', () => {
    expect(
      detailScreenState({ isLoading: false, isError: true, hasData: false, hasForm: false }),
    ).toBe('unavailable');
  });

  it('reports unavailable on an error even if stale data is still around', () => {
    expect(detailScreenState({ ...base, isError: true })).toBe('unavailable');
  });

  it('reports unavailable when the query settled with nothing', () => {
    expect(detailScreenState({ ...base, hasData: false, hasForm: false })).toBe('unavailable');
  });

  // Bounded: data is present, so the effect that derives the form runs next
  // render. This is the ONLY case where a spinner after settling is legitimate.
  it('is preparing only when data has arrived but the form has not been derived', () => {
    expect(detailScreenState({ ...base, hasForm: false })).toBe('preparing');
  });

  it('is ready once data and form are both present', () => {
    expect(detailScreenState(base)).toBe('ready');
  });

  // The invariant behind all of the above: once the query has settled, no
  // combination may resolve to a state the user cannot get out of. 'preparing'
  // is the single exception and it requires hasData.
  it('never lands on a settled state that spins without data', () => {
    for (const isError of [true, false]) {
      for (const hasForm of [true, false]) {
        const state = detailScreenState({ isLoading: false, isError, hasData: false, hasForm });
        expect(state).toBe('unavailable');
      }
    }
  });
});
