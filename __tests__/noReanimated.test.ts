import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Guards the fix for the worst class of bug this package can produce.
//
// reanimated 4 requires `react-native-worklets`, a separate native module that
// Expo Go cannot load. Requiring it kills the app at IMPORT time — natively,
// with no JS error and nothing in the Metro logs. Because index.ts re-exports
// everything, a single animating primitive took down every screen in BOTH
// apps, and it presented as "the app crashes the instant the bundle reaches
// 100%".
//
// Nothing else catches this: it type-checks, it lints, every unit test passes
// (jest mocked reanimated), and CI is green. It only fails on a phone. So the
// guard has to be a source-level assertion.
//
// If you genuinely need reanimated back, deleting this test is the deliberate
// act that says so — and it means Expo Go stops working for both apps.

const ROOT = join(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', 'coverage', 'docs', '__tests__']);
const BANNED = ['react-native-reanimated', 'react-native-worklets'];

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      // Skip nested __tests__ dirs too — tests may reference the name in prose.
      if (entry === '__tests__') continue;
      sourceFiles(full, acc);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('no reanimated', () => {
  const files = sourceFiles(ROOT);

  it('finds source files to check (guards against a vacuous pass)', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(BANNED)('never imports %s', (pkg) => {
    const offenders = files.filter((f) => {
      const src = readFileSync(f, 'utf8');
      // Match real imports/requires, not the explanatory comments above.
      return (
        new RegExp(`from ['"]${pkg}(/[^'"]*)?['"]`).test(src) ||
        new RegExp(`require\\(['"]${pkg}(/[^'"]*)?['"]\\)`).test(src)
      );
    });
    expect(offenders.map((f) => f.replace(ROOT + '/', ''))).toEqual([]);
  });

  it('is not declared as a dependency of any kind', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    for (const section of ['dependencies', 'peerDependencies', 'devDependencies']) {
      for (const banned of BANNED) {
        expect(Object.keys(pkg[section] ?? {})).not.toContain(banned);
      }
    }
  });
});
