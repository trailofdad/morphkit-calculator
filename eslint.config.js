// @ts-check
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'playground/dist'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}', 'playground/**/*.{ts,tsx}'],
    plugins: { prettier: prettierPlugin, 'react-hooks': reactHooks },
    rules: {
      ...prettierConfig.rules,
      ...reactHooks.configs.recommended.rules,
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}', 'playground/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/explicit-function-return-type': 'off' },
  },
);
