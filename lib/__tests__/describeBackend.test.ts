import { describeBackend } from '../describeBackend';

describe('describeBackend', () => {
  // The two that matter during the Railway → AWS migration: telling them apart
  // at a glance is the entire reason this exists.
  it('identifies a Lambda function URL as AWS', () => {
    const b = describeBackend('https://26op6fbi5rn5e4pvr4nzqexrcm0gypkv.lambda-url.us-east-1.on.aws/api/private');
    expect(b.provider).toBe('AWS');
    expect(b.label).toBe('AWS');
  });

  it('identifies Railway', () => {
    const b = describeBackend('https://flexion-labs-core-go-production.up.railway.app/api/private');
    expect(b.provider).toBe('Railway');
    expect(b.label).toBe('RAILWAY');
  });

  it.each([
    ['https://d27szop2zmrxmf.cloudfront.net/api', 'AWS'],
    ['https://irttbo76ic.execute-api.us-east-1.amazonaws.com/', 'AWS'],
  ])('treats other AWS fronts as AWS (%s)', (url, provider) => {
    expect(describeBackend(url).provider).toBe(provider);
  });

  it.each([
    'http://localhost:8081/api',
    'http://127.0.0.1:3000',
    'http://192.168.1.20:8081',
  ])('identifies local addresses (%s)', (url) => {
    expect(describeBackend(url).provider).toBe('Local');
  });

  // Matching on the host, not the raw string, is what stops a path segment from
  // flipping the label — an easy bug to write and a confusing one to see.
  it('does not match a provider name appearing in the path', () => {
    const b = describeBackend('https://api.flexionlabs.com/railway/api/private');
    expect(b.provider).toBe('Unknown');
    expect(b.host).toBe('api.flexionlabs.com');
  });

  // An unrecognised host shows itself rather than claiming a provider. If the
  // API base is somewhere unexpected, seeing where is the useful outcome.
  it('falls back to the host for an unknown provider', () => {
    const b = describeBackend('https://api.flexionlabs.com/api/private');
    expect(b.provider).toBe('Unknown');
    expect(b.label).toBe('api.flexionlabs.com');
  });

  it('tolerates a bare host with no scheme', () => {
    expect(describeBackend('flexion-labs-core-go-production.up.railway.app').provider).toBe('Railway');
  });

  // Missing config is its own state. Rendering an empty pill would read as
  // "fine", which is the opposite of true.
  it.each([undefined, null, '', '   '])('reports a missing API URL (%p)', (v) => {
    const b = describeBackend(v as string | undefined);
    expect(b.provider).toBe('Unknown');
    expect(b.label).toBe('no API URL');
  });

  it('does not throw on an unparseable value', () => {
    expect(() => describeBackend('ht!tp://:::')).not.toThrow();
    expect(describeBackend('ht!tp://:::').provider).toBe('Unknown');
  });
});
