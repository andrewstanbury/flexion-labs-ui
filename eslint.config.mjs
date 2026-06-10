// ESLint config for the design-system package itself. Unlike the app configs
// (which ban raw hex colors and bare react-native primitives so app code stays
// tokenized), THIS package is where tokens, raw primitives, and styling legally
// live — so those bans don't apply here. The config is just the JS +
// typescript-eslint recommended baselines, the react-hooks rules, and the same
// noise-reducing softenings the apps use.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    ignores: ['node_modules/**', 'eslint.config.mjs', 'jest.config.js'],
  },

  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  {
    rules: {
      // TS handles undefined-var; the base rule false-positives on type-only
      // references. Unused vars warn (prefix `_` opts out).
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // `any` is used deliberately in a few prop-cast / jest-mock spots. Warn,
      // don't block.
      '@typescript-eslint/no-explicit-any': 'warn',
      // RN loads static assets via require('./foo.png') — the standard pattern.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
