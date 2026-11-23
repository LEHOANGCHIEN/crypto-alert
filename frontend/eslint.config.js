import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import i18next from 'eslint-plugin-i18next';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // User-facing text must go through i18n (CLAUDE.md rule 2)
    files: ['src/**/*.tsx'],
    ignores: ['src/**/*.test.tsx'],
    ...i18next.configs['flat/recommended'],
    rules: { 'i18next/no-literal-string': ['error', { mode: 'jsx-text-only' }] },
  },
);
