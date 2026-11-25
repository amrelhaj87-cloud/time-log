import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';

/**
 * Flat ESLint config for the Time Log app.
 *
 * Scope notes:
 * - `react-hooks/exhaustive-deps` stays a WARNING: several effects intentionally
 *   run once on mount (refs guard them), so it reports rather than blocks.
 * - Prettier is configured but NOT applied to existing files in bulk; formatting
 *   is opt-in via `npm run format` so refactor diffs stay readable.
 */
export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**', 'scripts/**', 'coverage/**']
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: { 'react-hooks': reactHooks, 'unused-imports': unusedImports },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      // Replaced by the unused-imports variant below (it can auto-fix imports).
      '@typescript-eslint/no-unused-vars': 'off',
      // Auto-removable dead imports (safe: tsc/test/build verify the result).
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { args: 'after-used', argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }
      ],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-useless-escape': 'warn',
      'prefer-const': 'warn'
    }
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    languageOptions: { globals: { ...globals.node } }
  }
];
