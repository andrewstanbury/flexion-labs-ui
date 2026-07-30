import { useFeatureFlagsStore, isFeatureEnabled } from '../useFeatureFlagsStore';

describe('isFeatureEnabled', () => {
  it('falls back to the declared default when there is no override', () => {
    expect(isFeatureEnabled({}, 'backendIndicator')).toBe(false);
    expect(isFeatureEnabled({}, 'somethingOnByDefault', true)).toBe(true);
  });

  it('prefers an explicit override over the default', () => {
    expect(isFeatureEnabled({ a: true }, 'a', false)).toBe(true);
    expect(isFeatureEnabled({ a: false }, 'a', true)).toBe(false);
  });

  // The reason overrides are stored rather than resolved values: an override of
  // `false` is a real answer, not an absent one. Using `||` here instead of `??`
  // would silently ignore every switched-off flag.
  it('treats an override of false as a decision, not as absent', () => {
    expect(isFeatureEnabled({ a: false }, 'a', true)).toBe(false);
  });
});

describe('useFeatureFlagsStore', () => {
  beforeEach(() => useFeatureFlagsStore.setState({ overrides: {} }));

  it('records only what was explicitly set', () => {
    useFeatureFlagsStore.getState().setFlag('backendIndicator', true);
    expect(useFeatureFlagsStore.getState().overrides).toEqual({ backendIndicator: true });
  });

  it('keeps flags independent', () => {
    useFeatureFlagsStore.getState().setFlag('a', true);
    useFeatureFlagsStore.getState().setFlag('b', false);
    expect(useFeatureFlagsStore.getState().overrides).toEqual({ a: true, b: false });
  });

  // Reset clears overrides rather than writing defaults, so every flag returns to
  // whatever the code currently declares — including defaults changed since.
  it('reset returns every flag to its declared default', () => {
    useFeatureFlagsStore.getState().setFlag('a', true);
    useFeatureFlagsStore.getState().reset();
    expect(useFeatureFlagsStore.getState().overrides).toEqual({});
    expect(isFeatureEnabled(useFeatureFlagsStore.getState().overrides, 'a', false)).toBe(false);
  });
});
