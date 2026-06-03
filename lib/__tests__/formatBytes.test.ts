import { formatBytes } from '../formatBytes';

describe('formatBytes', () => {
  it('handles zero / invalid', () => {
    expect(formatBytes(0)).toBe('0 MB');
    expect(formatBytes(-5)).toBe('0 MB');
    expect(formatBytes(NaN)).toBe('0 MB');
  });
  it('formats MB and GB', () => {
    expect(formatBytes(500 * 1024)).toBe('<1 MB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2.0 GB');
  });
});
