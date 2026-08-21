import eslint from '@eslint/js';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'node_modules/',
      'coverage/',
      'dist/',
      'build/',
      'uploads/',
      'storage/',
      'prisma/generated/',
      '.agents/',
      '.claude/',
      '.windsurf/',
    ],
  },

  {
    files: ['**/*.js'],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',

      globals: {
        ...globals.node,
      },
    },
  },

  {
    files: ['tests/**/*.js'],

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.vitest,
      },
    },
  },

  {
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],
    },
  },

  eslint.configs.recommended,
  prettierConfig,
];
