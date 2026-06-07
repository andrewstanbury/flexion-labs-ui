import { effectiveScreenEdges } from '../Screen';

describe('effectiveScreenEdges', () => {
  it('keeps all edges when the top inset has not been consumed', () => {
    expect(effectiveScreenEdges(['top', 'bottom'], false)).toEqual(['top', 'bottom']);
  });

  it('drops the top edge when an ancestor already consumed the top inset', () => {
    expect(effectiveScreenEdges(['top', 'bottom'], true)).toEqual(['bottom']);
  });

  it('leaves edges untouched when there is no top edge to drop', () => {
    expect(effectiveScreenEdges(['bottom'], true)).toEqual(['bottom']);
    expect(effectiveScreenEdges([], true)).toEqual([]);
  });
});
