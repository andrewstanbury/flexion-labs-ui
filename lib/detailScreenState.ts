// Which of a detail screen's four states to render, given a query's status and
// whether the derived form has been built yet.
//
// Extracted because getting the ORDER wrong is invisible: it type-checks,
// lints, and passes every test that does not simulate a failing query. The
// patient detail screen had `isLoading || !form` first, which swallowed the
// failure path — `form` is only set by an effect that returns early when there
// is no data, so a first-load failure left form null forever and the screen
// showed a spinner with no way out. The "not found" branch written to handle
// exactly that case was unreachable.
//
// The rule: a spinner is only ever legitimate while something is genuinely
// in flight. Once a query has settled, every path must terminate in content or
// an explanation — never in a spinner.
export type DetailScreenState = 'loading' | 'unavailable' | 'preparing' | 'ready';

export function detailScreenState({
  isLoading,
  isError,
  hasData,
  hasForm,
}: {
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
  hasForm: boolean;
}): DetailScreenState {
  if (isLoading) return 'loading';
  // Before the form check, always: a settled-but-failed query must not be able
  // to fall through into a spinner.
  if (isError || !hasData) return 'unavailable';
  // Bounded — data is present, so the effect that derives the form is
  // guaranteed to run on the next render.
  if (!hasForm) return 'preparing';
  return 'ready';
}
