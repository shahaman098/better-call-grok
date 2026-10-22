import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'docs/**', 'supabase/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['bin/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        process: 'readonly',
        URL: 'readonly',
      },
    },
  },
  {
    files: ['src/**/*.ts', 'tests/**/*.ts', 'vitest.config.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
